import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, TenantRoleSchema } from './common.js';

export const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(80),
  tenantName: z.string().min(1).max(80),
});
export type Register = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});
export type Login = z.infer<typeof LoginSchema>;

export const AuthUserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  displayName: z.string(),
  isPlatformAdmin: z.boolean(),
  timezone: z.string(),
  locale: z.string(),
  lastLoginAt: IsoDateTimeSchema.nullable(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthTenantSchema = z.object({
  id: IdSchema,
  slug: z.string(),
  name: z.string(),
  role: TenantRoleSchema,
  status: z.enum(['active', 'suspended', 'deleted']),
  planCode: z.string(),
});
export type AuthTenant = z.infer<typeof AuthTenantSchema>;

export const SessionBundleSchema = z.object({
  user: AuthUserSchema,
  tenants: z.array(AuthTenantSchema),
  activeTenantId: IdSchema.nullable(),
  csrfToken: z.string(),
});
export type SessionBundle = z.infer<typeof SessionBundleSchema>;

export const SwitchTenantSchema = z.object({ tenantId: IdSchema });
export type SwitchTenant = z.infer<typeof SwitchTenantSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10).max(200),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Konfirmasi berbeda' });
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
