import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common';

/**
 * Modul 12 & 13 — subscription-only (product-spec §13–14).
 * Tidak ada wallet / credit / top-up / pemotongan saldo per operasi.
 */
export const PlanCodeSchema = z.enum(['free', 'pro', 'business']);
export type PlanCode = z.infer<typeof PlanCodeSchema>;

export const BillingPeriodSchema = z.enum(['monthly', 'yearly']);
export type BillingPeriod = z.infer<typeof BillingPeriodSchema>;

/** Tingkat fitur untuk tampilan perbandingan paket. */
export const FeatureLevelSchema = z.enum(['none', 'limited', 'basic', 'full']);
export type FeatureLevel = z.infer<typeof FeatureLevelSchema>;

export const PlanSchema = z.object({
  id: IdSchema,
  code: PlanCodeSchema,
  name: z.string(),
  prices: z.object({ monthly: z.number().int().nonnegative(), yearly: z.number().int().nonnegative() }),
  limits: z.object({
    maxTelegramAccounts: z.number().int().positive(),
    maxConcurrentCampaigns: z.number().int().positive(),
    maxBroadcastsPerDay: z.number().int().positive(),
    maxDiscoverySources: z.number().int().positive(),
  }),
  features: z.object({
    autoDiscovery: FeatureLevelSchema,
    autoJoin: FeatureLevelSchema,
    autoBroadcast: FeatureLevelSchema,
    campaignManagement: FeatureLevelSchema,
    monitoring: FeatureLevelSchema,
  }),
});
export type Plan = z.infer<typeof PlanSchema>;

export const SubscriptionStatusSchema = z.enum(['active', 'expired', 'pending', 'canceled']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: IdSchema,
  planId: IdSchema,
  planCode: PlanCodeSchema,
  period: BillingPeriodSchema,
  status: SubscriptionStatusSchema,
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  /** Downgrade dijadwalkan untuk awal periode berikutnya. */
  scheduledPlanCode: PlanCodeSchema.nullable(),
  usage: z.object({
    telegramAccounts: z.number().int().nonnegative(),
    concurrentCampaigns: z.number().int().nonnegative(),
    broadcastsToday: z.number().int().nonnegative(),
    discoverySources: z.number().int().nonnegative(),
  }),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const InvoiceStatusSchema = z.enum(['pending', 'paid', 'expired', 'failed']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceSchema = z.object({
  id: IdSchema,
  pakasirInvoiceId: z.string(),
  planCode: PlanCodeSchema,
  period: BillingPeriodSchema,
  amount: z.number().int().nonnegative(),
  status: InvoiceStatusSchema,
  periodStart: IsoDateTimeSchema,
  periodEnd: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  paidAt: IsoDateTimeSchema.nullable(),
  expiresAt: IsoDateTimeSchema,
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CreateInvoiceSchema = z.object({
  planCode: PlanCodeSchema,
  period: BillingPeriodSchema,
});
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;

export const CreateInvoiceResultSchema = z.object({
  invoice: InvoiceSchema,
  /** Checkout Pakasir; web hanya me-redirect, tidak memanggil Pakasir langsung. */
  redirectUrl: z.string().url(),
});
export type CreateInvoiceResult = z.infer<typeof CreateInvoiceResultSchema>;
