import { z } from 'zod';

export const IdSchema = z.string().min(1);
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CursorPageMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  limit: z.number().int().min(1).max(100),
});
export type CursorPageMeta = z.infer<typeof CursorPageMetaSchema>;

export const CursorPageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorPageQuery = z.infer<typeof CursorPageQuerySchema>;

/** Response envelope sukses: `{ data, meta }` (lihat .claude/rules/api.md). */
export const envelope = <T extends z.ZodTypeAny, M extends z.ZodTypeAny = z.ZodUndefined>(data: T, meta?: M) =>
  z.object({ data, meta: (meta ?? z.undefined()) as M });

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

/** Kode error enforcement paket, dipetakan ke HTTP 402 oleh API. */
export const PlanLimitCodeSchema = z.enum([
  'PLAN_LIMIT_ACCOUNTS',
  'PLAN_LIMIT_CAMPAIGNS',
  'PLAN_LIMIT_BROADCASTS_PER_DAY',
  'PLAN_LIMIT_DISCOVERY_SOURCES',
  'PLAN_FEATURE_DISABLED',
]);
export type PlanLimitCode = z.infer<typeof PlanLimitCodeSchema>;

export const TenantRoleSchema = z.enum(['owner', 'admin', 'operator', 'viewer']);
export type TenantRole = z.infer<typeof TenantRoleSchema>;
