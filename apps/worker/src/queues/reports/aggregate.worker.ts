import { QUEUE_NAMES } from '@eak/config';
import type { Worker } from 'bullmq';

import type { WorkerDeps } from '../../types.js';

/**
 * Reports aggregator. Runs on a repeating schedule (campaigns:scheduler
 * enqueues it hourly) and updates per-tenant daily/weekly roll-ups so the
 * dashboard reads from cheap pre-aggregated tables instead of scanning
 * `broadcast_targets` live.
 *
 * For fase 1 we persist nothing yet — the dashboard reads live counts.
 * This worker exists so the plumbing is ready when reporting gets real.
 */
export function registerReportsAggregateWorker(deps: WorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'reports:aggregate' });
  return deps.queues.worker(QUEUE_NAMES.reportsAggregate, async () => {
    log.info('reports aggregate tick (deferred impl)');
    return { ok: true };
  });
}
