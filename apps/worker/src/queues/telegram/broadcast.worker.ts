import { QUEUE_NAMES } from '@eak/config';
import { BroadcastStatus, BroadcastTargetStatus } from '@eak/db';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import { ensureOnce } from '../../lib/idempotency.js';
import { RetryableJobError, isPermanentSendFailure, jitterMs } from '../../telegram/safety.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  broadcastId: z.string(),
});

/**
 * Broadcast orchestrator. One job per broadcast — the worker then iterates
 * targets, sends with a jittered delay (20-60s default per rule), and
 * updates the broadcast + target rows row-by-row.
 *
 * Guards:
 *   - respects pause/cancel between targets (re-reads broadcast row)
 *   - allow_promotion / exclusion revalidated at send time (not just create)
 *   - flood-wait aborts the loop and reschedules the whole broadcast
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
      });
      if (!broadcast) return { skipped: 'not_found' };

      await deps.prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: BroadcastStatus.sending, startedAt: new Date() },
      });

      const targets = await deps.prisma.broadcastTarget.findMany({
        where: { broadcastId: broadcast.id, status: BroadcastTargetStatus.queued },
        include: { group: { include: { exclusions: { where: { tenantId } } } } },
      });

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
          // Full implementation: open userbot, send message, store Telegram message_id.
          const telegramMessageId = await simulatedSend();
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
    },
    { concurrency: 2 },
  );
}

async function simulatedSend(): Promise<string> {
  await new Promise((r) => setTimeout(r, 10));
  return `tgmsg_${Math.random().toString(36).slice(2, 10)}`;
}
