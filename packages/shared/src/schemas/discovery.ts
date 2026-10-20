import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common';

/** Modul 03 — klasifikasi & status link (product-spec §4). */
export const LinkKindSchema = z.enum(['public_username', 'private_invite', 'public_mention']);
export type LinkKind = z.infer<typeof LinkKindSchema>;

export const LinkStatusSchema = z.enum(['pending', 'valid', 'invalid', 'duplicate', 'expired']);
export type LinkStatus = z.infer<typeof LinkStatusSchema>;

export const DiscoverySourceSchema = z.object({
  id: IdSchema,
  title: z.string(),
  accountId: IdSchema,
  enabled: z.boolean(),
  detectMentions: z.boolean(),
  maxLinksPerDay: z.number().int().positive(),
  linksFound: z.number().int().nonnegative(),
  lastScannedAt: IsoDateTimeSchema.nullable(),
});
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;

export const DiscoveredLinkSchema = z.object({
  id: IdSchema,
  url: z.string(),
  kind: LinkKindSchema,
  status: LinkStatusSchema,
  sourceId: IdSchema,
  foundByAccountId: IdSchema,
  seenCount: z.number().int().positive(),
  firstSeenAt: IsoDateTimeSchema,
  lastSeenAt: IsoDateTimeSchema,
});
export type DiscoveredLink = z.infer<typeof DiscoveredLinkSchema>;
