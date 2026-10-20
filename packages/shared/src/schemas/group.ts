import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common';

/** Modul 04 — status job join (product-spec §5). */
export const JoinJobStatusSchema = z.enum(['queued', 'joining', 'joined', 'failed', 'approval_required', 'skipped']);
export type JoinJobStatus = z.infer<typeof JoinJobStatusSchema>;

/** Modul 05 — grup & membership dipisah (product-spec §6). */
export const GroupTypeSchema = z.enum(['group', 'supergroup', 'channel']);
export type GroupType = z.infer<typeof GroupTypeSchema>;

export const MembershipStatusSchema = z.enum(['member', 'left', 'kicked', 'banned', 'pending']);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const GroupSchema = z.object({
  id: IdSchema,
  telegramChatId: z.string(),
  title: z.string(),
  username: z.string().nullable(),
  type: GroupTypeSchema,
  memberCount: z.number().int().nonnegative().nullable(),
  allowPromotion: z.boolean(),
  excluded: z.boolean(),
  firstDiscoveredAt: IsoDateTimeSchema,
  lastSyncedAt: IsoDateTimeSchema.nullable(),
});
export type Group = z.infer<typeof GroupSchema>;

export const GroupMembershipSchema = z.object({
  groupId: IdSchema,
  accountId: IdSchema,
  status: MembershipStatusSchema,
  joinedAt: IsoDateTimeSchema.nullable(),
  leftAt: IsoDateTimeSchema.nullable(),
  lastCheckedAt: IsoDateTimeSchema.nullable(),
});
export type GroupMembership = z.infer<typeof GroupMembershipSchema>;
