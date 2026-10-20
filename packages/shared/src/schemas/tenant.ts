import { z } from 'zod';

import { IdSchema, IsoDateTimeSchema, TenantRoleSchema } from './common';

export const TenantMemberSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  email: z.string().email(),
  displayName: z.string(),
  role: TenantRoleSchema,
  createdAt: IsoDateTimeSchema,
});
export type TenantMember = z.infer<typeof TenantMemberSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: TenantRoleSchema,
});
export type InviteMember = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({ role: TenantRoleSchema });
export type UpdateMemberRole = z.infer<typeof UpdateMemberRoleSchema>;
