import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const QueueNameSchema = z.enum([
  'telegram-auth',
  'telegram-join',
  'telegram-broadcast',
  'telegram-dm-reply',
  'telegram-link-detect',
  'telegram-membership-sync',
  'billing-webhook',
  'reports-aggregate',
  'campaigns-scheduler',
]);
export type QueueName = z.infer<typeof QueueNameSchema>;

export const QueueStatsSchema = z.object({
  name: QueueNameSchema,
  waiting: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  completed24h: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative(),
});
export type QueueStats = z.infer<typeof QueueStatsSchema>;

export const MonitoringSnapshotSchema = z.object({
  services: z.object({
    api: z.enum(['ok', 'degraded', 'down']),
    worker: z.enum(['ok', 'degraded', 'down']),
    postgres: z.enum(['ok', 'degraded', 'down']),
    redis: z.enum(['ok', 'degraded', 'down']),
    telegram: z.enum(['ok', 'degraded', 'down']),
  }),
  queues: z.array(QueueStatsSchema),
  recentErrors: z.array(
    z.object({
      id: IdSchema,
      at: IsoDateTimeSchema,
      queue: QueueNameSchema,
      message: z.string(),
      jobId: z.string().optional(),
    }),
  ),
});
export type MonitoringSnapshot = z.infer<typeof MonitoringSnapshotSchema>;

/** WebSocket push shape for live monitoring updates. */
export const LiveEventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('queue_stats'),
    at: IsoDateTimeSchema,
    stats: QueueStatsSchema,
  }),
  z.object({
    kind: z.literal('job_failed'),
    at: IsoDateTimeSchema,
    queue: QueueNameSchema,
    jobId: z.string(),
    message: z.string(),
  }),
  z.object({
    kind: z.literal('account_warning'),
    at: IsoDateTimeSchema,
    accountId: IdSchema,
    message: z.string(),
    severity: z.enum(['info', 'warn', 'critical']),
  }),
]);
export type LiveEvent = z.infer<typeof LiveEventSchema>;
