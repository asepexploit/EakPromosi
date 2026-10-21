import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

/** Modul 06 — status per target broadcast (product-spec §7). */
export const BroadcastTargetStatusSchema = z.enum(['queued', 'sending', 'sent', 'failed', 'skipped']);
export type BroadcastTargetStatus = z.infer<typeof BroadcastTargetStatusSchema>;

/** Modul 07 — status campaign (product-spec §8). */
export const CampaignStatusSchema = z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'archived']);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  status: CampaignStatusSchema,
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  accountIds: z.array(IdSchema),
  targetCount: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  totalPlanned: z.number().int().nonnegative(),
});
export type CampaignSummary = z.infer<typeof CampaignSummarySchema>;
