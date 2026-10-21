import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

export const AuditSeveritySchema = z.enum(['info', 'warn', 'critical']);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

export const AuditLogSchema = z.object({
  id: IdSchema,
  tenantId: IdSchema.nullable(),
  actorUserId: IdSchema.nullable(),
  actorEmail: z.string().email().nullable(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  severity: AuditSeveritySchema,
  ipAddress: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
