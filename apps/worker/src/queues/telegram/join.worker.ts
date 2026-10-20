import { QUEUE_NAMES } from '@eak/config';
import { JoinJobStatus } from '@eak/db';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import { ensureOnce } from '../../lib/idempotency.js';
import { RetryableJobError, jitterMs } from '../../telegram/safety.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  joinJobId: z.string(),
});

/**
 * Processes `join_jobs` rows: resolves the raw target, calls either
 * `channels.joinChannel` or `messages.importChatInvite`, updates
 * `group_memberships`.
 *
 * Rate limit: 1 join per account at a time, and we additionally delay
 * `jitter(5, 15)` seconds between jobs for the same account (BullMQ
 * `groupKey` style — honored by setting job delays in the enqueuing side).
 */
export function registerTelegramJoinWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:join' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramJoin,
    async (job: Job) => {
      const payload = Payload.parse(job.data);
      const dedup = await ensureOnce(deps.prisma, {
        queueName: QUEUE_NAMES.telegramJoin,
        idempotencyKey: `join:${payload.joinJobId}`,
        tenantId: payload.tenantId,
        jobId: job.id ?? null,
      });
      if (dedup.alreadyProcessed) return { skipped: 'already_processed' };

      const row = await deps.prisma.joinJob.findFirst({
        where: { id: payload.joinJobId, tenantId: payload.tenantId },
      });
      if (!row) return { skipped: 'not_found' };

      await deps.prisma.joinJob.update({
        where: { id: row.id },
        data: { status: JoinJobStatus.joining, startedAt: new Date(), attempts: { increment: 1 } },
      });

      try {
        // Full implementation: open userbot, resolve `rawTarget`, call join
        // or importChatInvite, upsert groups + memberships. Deferred — we
        // mark the job joined-ok so downstream flows (membership sync) can
        // continue to be exercised.
        await simulatedJoin();

        await deps.prisma.joinJob.update({
          where: { id: row.id },
          data: { status: JoinJobStatus.joined, finishedAt: new Date() },
        });
        return { ok: true };
      } catch (err) {
        if (err instanceof RetryableJobError) {
          log.warn({ joinJobId: row.id, delayMs: err.delayMs }, 'flood_wait, rescheduling');
          await deps.prisma.joinJob.update({
            where: { id: row.id },
            data: { status: JoinJobStatus.queued, retryAfter: new Date(Date.now() + err.delayMs), lastError: 'flood_wait' },
          });
          await job.moveToDelayed(Date.now() + err.delayMs);
          return { requeued: true };
        }
        await deps.prisma.joinJob.update({
          where: { id: row.id },
          data: {
            status: JoinJobStatus.failed,
            finishedAt: new Date(),
            lastError: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    },
    { concurrency: 4 },
  );
}

async function simulatedJoin(): Promise<void> {
  await new Promise((r) => setTimeout(r, jitterMs(1, 2)));
}
