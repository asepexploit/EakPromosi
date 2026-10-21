import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const DmTriggerTypeSchema = z.enum(['keyword_match', 'new_dm', 'mention', 'group_join_event']);
export type DmTriggerType = z.infer<typeof DmTriggerTypeSchema>;

export const DmResponseTypeSchema = z.enum(['template_text', 'template_media', 'tag_only', 'forward_to_bot']);
export type DmResponseType = z.infer<typeof DmResponseTypeSchema>;

export const DmRuleSchema = z.object({
  id: IdSchema,
  name: z.string(),
  triggerType: DmTriggerTypeSchema,
  keywords: z.array(z.string()),
  responseType: DmResponseTypeSchema,
  responseBody: z.string().nullable(),
  responseMedia: z.string().nullable(),
  cooldownMinutes: z.number().int().positive(),
  activeHoursStart: z.number().int().min(0).max(23).nullable(),
  activeHoursEnd: z.number().int().min(0).max(23).nullable(),
  timezone: z.string(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type DmRule = z.infer<typeof DmRuleSchema>;

export const UpsertDmRuleSchema = z.object({
  name: z.string().min(1).max(80),
  triggerType: DmTriggerTypeSchema,
  keywords: z.array(z.string().min(1).max(100)).max(50).default([]),
  responseType: DmResponseTypeSchema,
  responseBody: z.string().max(4000).nullable().default(null),
  responseMedia: z.string().url().nullable().default(null),
  cooldownMinutes: z.number().int().min(1).max(10_080).default(60),
  activeHoursStart: z.number().int().min(0).max(23).nullable().default(null),
  activeHoursEnd: z.number().int().min(0).max(23).nullable().default(null),
  timezone: z.string().default('UTC'),
  isActive: z.boolean().default(true),
});
export type UpsertDmRule = z.infer<typeof UpsertDmRuleSchema>;
