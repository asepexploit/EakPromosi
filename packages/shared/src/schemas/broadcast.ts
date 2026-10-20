import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common';

export const BroadcastStatusSchema = z.enum([
  'draft',
  'queued',
  'sending',
  'completed',
  'failed',
  'paused',
  'canceled',
]);
export type BroadcastStatus = z.infer<typeof BroadcastStatusSchema>;

export const BroadcastTemplateSchema = z.object({
  id: IdSchema,
  name: z.string(),
  body: z.string(),
  mediaUrl: z.string().url().nullable(),
  mediaKind: z.enum(['photo', 'video', 'document', 'gif']).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type BroadcastTemplate = z.infer<typeof BroadcastTemplateSchema>;

export const UpsertBroadcastTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  body: z.string().min(1).max(4000),
  mediaUrl: z.string().url().nullable().default(null),
  mediaKind: z.enum(['photo', 'video', 'document', 'gif']).nullable().default(null),
});
export type UpsertBroadcastTemplate = z.infer<typeof UpsertBroadcastTemplateSchema>;

export const CreateBroadcastSchema = z.object({
  accountId: IdSchema,
  templateId: IdSchema.nullable(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  mediaUrl: z.string().url().nullable().default(null),
  mediaKind: z.enum(['photo', 'video', 'document', 'gif']).nullable().default(null),
  targetGroupIds: z.array(IdSchema).min(1).max(2000),
  scheduledAt: IsoDateTimeSchema.nullable().default(null),
  minDelaySec: z.number().int().min(5).max(600).default(20),
  maxDelaySec: z.number().int().min(5).max(600).default(60),
});
export type CreateBroadcast = z.infer<typeof CreateBroadcastSchema>;

export const BroadcastSummarySchema = z.object({
  id: IdSchema,
  title: z.string(),
  status: BroadcastStatusSchema,
  accountId: IdSchema,
  totalTargets: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  scheduledAt: IsoDateTimeSchema.nullable(),
  startedAt: IsoDateTimeSchema.nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type BroadcastSummary = z.infer<typeof BroadcastSummarySchema>;
