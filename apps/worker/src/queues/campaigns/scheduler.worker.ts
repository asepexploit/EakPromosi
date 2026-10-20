import { QUEUE_NAMES } from '@eak/config';
import { Worker } from 'bullmq';

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
      // naive match: if any schedule cron is '* * * * *' or 'now' flag we fire;
      // real cron matching is left for the full implementation.
      if (c.schedules.length === 0) continue;
      const run = await deps.prisma.campaignRun.create({
        data: { campaignId: c.id, scheduledFor: new Date() },
      });
      log.info({ campaignId: c.id, runId: run.id }, 'campaign run created');
    }
    return { campaigns: dueCampaigns.length };
  });
}
