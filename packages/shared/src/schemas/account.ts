import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema } from './common.js';

/** Modul 02 — status koneksi akun (product-spec §3). */
export const TelegramAccountStatusSchema = z.enum(['active', 'warming', 'flood_wait', 'disconnected', 'banned', 'error']);
export type TelegramAccountStatus = z.infer<typeof TelegramAccountStatusSchema>;

/** Penugasan akun per operasi (opt-in per akun). */
export const AccountCapabilitySchema = z.enum(['discovery', 'broadcast', 'dm']);
export type AccountCapability = z.infer<typeof AccountCapabilitySchema>;

export const TelegramAccountSchema = z.object({
  id: IdSchema,
  displayName: z.string(),
  username: z.string().nullable(),
  phoneMasked: z.string(),
  telegramUserId: z.string(),
  status: TelegramAccountStatusSchema,
  capabilities: z.array(AccountCapabilitySchema),
  disabledByPlanLimit: z.boolean(),
  floodWaitUntil: IsoDateTimeSchema.nullable(),
  lastError: z.string().nullable(),
  joinedGroupsCount: z.number().int().nonnegative(),
  sentToday: z.number().int().nonnegative(),
  lastActiveAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type TelegramAccount = z.infer<typeof TelegramAccountSchema>;

export const UpdateAccountCapabilitiesSchema = z.object({
  capabilities: z.array(AccountCapabilitySchema),
});
export type UpdateAccountCapabilities = z.infer<typeof UpdateAccountCapabilitiesSchema>;

/**
 * Alur login MTProto: nomor → kode → 2FA opsional. Password 2FA tidak pernah dilog.
 *
 * Phone format: E.164-ish — mandatory `+` country-code prefix followed by 8–15
 * digits, first digit != 0. Keeps parity with the client-side validator in the
 * add-account dialog so the API never has to reject a value that already looked
 * fine in the UI.
 */
export const PhoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Nomor telepon tidak valid (format: +kodenegara + nomor, misal +6281234567890)');
export const StartAccountLoginSchema = z.object({
  phone: PhoneNumberSchema,
});
export type StartAccountLogin = z.infer<typeof StartAccountLoginSchema>;

export const VerifyAccountCodeSchema = z.object({
  loginId: IdSchema,
  code: z.string().regex(/^\d{5,6}$/, 'Kode harus 5–6 digit'),
  password: z.string().min(1).optional(),
});
export type VerifyAccountCode = z.infer<typeof VerifyAccountCodeSchema>;

export const AccountLoginStepSchema = z.object({
  loginId: IdSchema,
  step: z.enum(['code_sent', 'password_required', 'completed']),
  account: TelegramAccountSchema.optional(),
});
export type AccountLoginStep = z.infer<typeof AccountLoginStepSchema>;

/**
 * Live progress of an MTProto login attempt, served by
 * `GET /accounts/login/:loginId/status`. The SPA polls this to drive the
 * add-account wizard — it covers both the happy path (progressing stages)
 * and failure (`stage: 'failed'` with a human-friendly message).
 */
export const AccountLoginStatusSchema = z.object({
  stage: z.enum(['pending', 'connecting', 'code_sent', 'password_required', 'completed', 'failed']),
  errorCode: z.string().optional(),
  message: z.string().optional(),
  retryable: z.boolean().optional(),
  at: z.number().int().nonnegative(),
});
export type AccountLoginStatus = z.infer<typeof AccountLoginStatusSchema>;
