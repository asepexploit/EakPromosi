import { QUEUE_NAMES } from '@eak/config';
import { BroadcastStatus, BroadcastTargetStatus } from '@eak/db';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import { ensureOnce } from '../../lib/idempotency.js';
import { RetryableJobError, isPermanentSendFailure, jitterMs, runTelegramCall } from '../../telegram/safety.js';
import { UserbotAdapter } from '../../telegram/userbot.adapter.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  broadcastId: z.string(),
});

/**
 * Broadcast orchestrator. One job per broadcast — the worker iterates
 * targets, sends with a jittered delay, and updates broadcast + target
 * rows row-by-row.
 *
 * Guards:
 *   - respects pause/cancel between targets (re-reads broadcast row)
 *   - allow_promotion / exclusion revalidated at send time
 *   - flood-wait aborts the loop and reschedules the whole broadcast
 *   - permanent send errors flip the target without retrying
 */
export function registerTelegramBroadcastWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:broadcast' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramBroadcast,
    async (job: Job) => {
      const { tenantId, broadcastId } = Payload.parse(job.data);
      const dedup = await ensureOnce(deps.prisma, {
        queueName: QUEUE_NAMES.telegramBroadcast,
        idempotencyKey: `broadcast-start:${broadcastId}`,
        tenantId,
        jobId: job.id ?? null,
      });
      if (dedup.alreadyProcessed) return { skipped: 'already_processed' };

      const broadcast = await deps.prisma.broadcast.findFirst({
        where: { id: broadcastId, tenantId },
        include: { account: true },
      });
      if (!broadcast || !broadcast.account.sessionCipher) return { skipped: 'not_found_or_no_session' };

      await deps.prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: BroadcastStatus.sending, startedAt: new Date() },
      });

      const targets = await deps.prisma.broadcastTarget.findMany({
        where: { broadcastId: broadcast.id, status: BroadcastTargetStatus.queued },
        include: { group: { include: { exclusions: { where: { tenantId } } } } },
      });

      const userbot = new UserbotAdapter({
        env: deps.env,
        encryptionKeys: deps.encryptionKeys,
        deviceModel: broadcast.account.deviceModel,
        systemVersion: broadcast.account.systemVersion,
        appVersion: broadcast.account.appVersion,
      });

      try {
        await userbot.connectWithCipher(broadcast.account.sessionCipher);

        for (const target of targets) {
          // Honor pause / cancel without draining the queue
          const current = await deps.prisma.broadcast.findUnique({ where: { id: broadcast.id } });
          if (!current || current.status === BroadcastStatus.paused || current.status === BroadcastStatus.canceled) {
            log.info({ broadcastId: broadcast.id, state: current?.status }, 'broadcast halted');
            return { halted: current?.status };
          }

          if (!target.group.allowPromotion || target.group.exclusions.length > 0) {
            await deps.prisma.broadcastTarget.update({
              where: { id: target.id },
              data: { status: BroadcastTargetStatus.skipped, errorMessage: 'allow_promotion_false_or_excluded' },
            });
            continue;
          }

          try {
            const telegramMessageId = await runTelegramCall(async () => {
              if (broadcast.mediaUrl) {
                return userbot.sendMedia(target.group.telegramChatId, broadcast.mediaUrl, broadcast.body);
              }
              return userbot.sendMessage(target.group.telegramChatId, broadcast.body);
            });
            await deps.prisma.$transaction([
              deps.prisma.broadcastTarget.update({
                where: { id: target.id },
                data: {
                  status: BroadcastTargetStatus.sent,
                  sentAt: new Date(),
                  messageId: telegramMessageId,
                  attempts: { increment: 1 },
                },
              }),
              deps.prisma.broadcast.update({
                where: { id: broadcast.id },
                data: { sentCount: { increment: 1 } },
              }),
            ]);
          } catch (err) {
            if (err instanceof RetryableJobError) {
              await job.moveToDelayed(Date.now() + err.delayMs);
              return { requeued: true, delayMs: err.delayMs };
            }
            const permanent = isPermanentSendFailure(err);
            await deps.prisma.$transaction([
              deps.prisma.broadcastTarget.update({
                where: { id: target.id },
                data: {
                  status: BroadcastTargetStatus.failed,
                  errorMessage: err instanceof Error ? err.message : String(err),
                  errorCode: permanent ? 'permanent' : 'transient',
                  attempts: { increment: 1 },
                },
              }),
              deps.prisma.broadcast.update({
                where: { id: broadcast.id },
                data: { failedCount: { increment: 1 } },
              }),
            ]);
            if (!permanent) throw err;
          }

          // honor per-account rate limit: 20–60s jitter between messages
          await new Promise((r) => setTimeout(r, jitterMs(broadcast.minDelaySec, broadcast.maxDelaySec)));
        }

        await deps.prisma.broadcast.update({
          where: { id: broadcast.id },
          data: { status: BroadcastStatus.completed, completedAt: new Date() },
        });
        return { ok: true };
      } finally {
        await userbot.disconnect().catch(() => undefined);
      }
    },
    { concurrency: 2 },
  );
}
