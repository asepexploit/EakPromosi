import { QUEUE_NAMES } from '@eak/config';
import type { Worker } from 'bullmq';

import type { WorkerDeps } from '../../types.js';

/**
 * Campaign scheduler. Fires on a repeating 1-min cron:
 *  - for every `scheduled` campaign whose schedule cron matches, create
 *    a `campaign_runs` row and enqueue a broadcast for each account.
 *  - periodically enqueue membership-sync + reports-aggregate ticks.
 *
 * We keep repeatable jobs here (addJobScheduler/upsert) rather than external
 * cron so operators only need to run the worker container.
 */
export function registerCampaignsSchedulerWorker(deps: WorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'campaigns:scheduler' });
  const queue = deps.queues.queue(QUEUE_NAMES.campaignsScheduler);

  // Idempotent: upserting the same repeatable job key is a no-op
  void queue.add('tick', { kind: 'tick' }, { repeat: { pattern: '* * * * *' }, jobId: 'campaigns-scheduler-tick' });

  return deps.queues.worker(QUEUE_NAMES.campaignsScheduler, async () => {
    const dueCampaigns = await deps.prisma.campaign.findMany({
      where: { status: 'scheduled' },
      include: { schedules: { where: { isActive: true } } },
    });
    for (const c of dueCampaigns) {
      // Real cron matching is deferred to a later phase. Until then we DO NOT
      // create a CampaignRun on every tick — that produced one row every 60s
      // per scheduled campaign and quickly swamped the table. Skipping here
      // keeps the plumbing live without the runaway writes.
      if (c.schedules.length === 0) continue;
      log.debug({ campaignId: c.id }, 'campaign scheduled, cron eval deferred');
    }
    return { campaigns: dueCampaigns.length };
  });
}
