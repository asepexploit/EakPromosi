import { z } from 'zod';

import { BillingPeriodSchema, PlanCodeSchema } from './billing.js';
import { IdSchema, IsoDateTimeSchema } from './common.js';

export const AdminPlanInputSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(80),
  priceIdr: z.number().int().nonnegative(),
  period: BillingPeriodSchema,
  maxTelegramAccounts: z.number().int().positive(),
  maxConcurrentCampaigns: z.number().int().positive(),
  maxBroadcastsPerDay: z.number().int().positive(),
  maxDiscoverySources: z.number().int().positive(),
  autoDiscoveryEnabled: z.boolean(),
  autoJoinEnabled: z.boolean(),
  autoBroadcastEnabled: z.boolean(),
  autoDmEnabled: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number().int(),
});
export type AdminPlanInput = z.infer<typeof AdminPlanInputSchema>;

export const AdminTenantSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended', 'deleted']),
  planCode: PlanCodeSchema.or(z.string()),
  memberCount: z.number().int().nonnegative(),
  accountCount: z.number().int().nonnegative(),
  mrrIdr: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});
export type AdminTenantSummary = z.infer<typeof AdminTenantSummarySchema>;

export const SuspendTenantSchema = z.object({ reason: z.string().min(5).max(500) });
export type SuspendTenant = z.infer<typeof SuspendTenantSchema>;
