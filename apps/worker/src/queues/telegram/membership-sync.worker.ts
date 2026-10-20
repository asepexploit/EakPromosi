import { QUEUE_NAMES } from '@eak/config';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  accountId: z.string(),
});

/**
 * Periodic sweep: for each account, re-check membership status against
 * Telegram. If an account was kicked / banned from a group, flip the
 * membership row and record an activity event.
 *
 * Scheduled by `campaigns:scheduler` on a cron (per-account every N hours).
 */
export function registerTelegramMembershipSyncWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:membership-sync' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramMembershipSync,
    async (job: Job) => {
      const payload = Payload.parse(job.data);
      // Full impl: iterate memberships, fetch channel info, patch status.
      log.info({ accountId: payload.accountId }, 'membership sync tick (deferred impl)');
      return { ok: true };
    },
    { concurrency: 3 },
  );
}
