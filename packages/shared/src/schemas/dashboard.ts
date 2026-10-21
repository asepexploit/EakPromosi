import { z } from 'zod';

import { TelegramAccountStatusSchema } from './account.js';
import { IsoDateSchema, IsoDateTimeSchema } from './common.js';

/** Modul 01 — ringkasan tenant (product-spec §2). */
export const QueueCountersSchema = z.object({
  pending: z.number().int().nonnegative(),
  processing: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type QueueCounters = z.infer<typeof QueueCountersSchema>;

export const ActivityLevelSchema = z.enum(['info', 'success', 'warning', 'error']);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const ActivityDomainSchema = z.enum(['account', 'discovery', 'join', 'broadcast', 'campaign', 'dm', 'billing', 'system']);
export type ActivityDomain = z.infer<typeof ActivityDomainSchema>;

export const ActivityItemSchema = z.object({
  id: z.string(),
  at: IsoDateTimeSchema,
  domain: ActivityDomainSchema,
  level: ActivityLevelSchema,
  message: z.string(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const DashboardSummarySchema = z.object({
  accounts: z.object({
    total: z.number().int().nonnegative(),
    byStatus: z.record(TelegramAccountStatusSchema, z.number().int().nonnegative()),
  }),
  discovery: z.object({ linksFound: z.number().int().nonnegative(), queue: QueueCountersSchema }),
  join: z.object({ joinedGroups: z.number().int().nonnegative(), queue: QueueCountersSchema }),
  campaigns: z.object({ running: z.number().int().nonnegative(), scheduled: z.number().int().nonnegative() }),
  broadcast7d: z.object({
    sent: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    daily: z.array(z.object({ day: IsoDateSchema, sent: z.number().int().nonnegative(), failed: z.number().int().nonnegative() })),
  }),
  activity: z.array(ActivityItemSchema),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
