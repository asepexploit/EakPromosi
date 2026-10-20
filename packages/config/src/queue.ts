import { Queue, QueueEvents, Worker, type JobsOptions, type Processor, type WorkerOptions } from 'bullmq';

import type { Env } from './env.js';
import { createRedis, type RedisClient } from './redis.js';

/**
 * Queue names used across workers. Each queue has its own dedicated worker
 * process (or at least its own `Worker` instance). See .claude/rules/queue.md.
 */
export const QUEUE_NAMES = {
  telegramAuth: 'telegram-auth',
  telegramJoin: 'telegram-join',
  telegramBroadcast: 'telegram-broadcast',
  telegramDmReply: 'telegram-dm-reply',
  telegramLinkDetect: 'telegram-link-detect',
  telegramMembershipSync: 'telegram-membership-sync',
  billingWebhook: 'billing-webhook',
  reportsAggregate: 'reports-aggregate',
  campaignsScheduler: 'campaigns-scheduler',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
};

export interface QueueFactoryDeps {
  env: Env;
  connection?: RedisClient;
}

/**
 * Thin BullMQ facade so apps never instantiate `new Queue(...)` directly —
 * every queue gets the same defaults, same Redis client, same prefix.
 */
export class QueueFactory {
  readonly connection: RedisClient;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly events = new Map<QueueName, QueueEvents>();

  constructor(private readonly deps: QueueFactoryDeps) {
    this.connection = deps.connection ?? createRedis(deps.env, { forBull: true });
  }

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
      this.queues.set(name, q);
    }
    return q;
  }

  queueEvents(name: QueueName): QueueEvents {
    let qe = this.events.get(name);
    if (!qe) {
      qe = new QueueEvents(name, { connection: this.connection });
      this.events.set(name, qe);
    }
    return qe;
  }

  worker<T = unknown, R = unknown>(
    name: QueueName,
    processor: Processor<T, R, string>,
    options: Omit<WorkerOptions, 'connection'> = {},
  ): Worker<T, R> {
    return new Worker<T, R>(name, processor, { ...options, connection: this.connection });
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await Promise.all([...this.events.values()].map((e) => e.close()));
    await this.connection.quit();
  }
}
