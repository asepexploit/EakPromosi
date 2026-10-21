import type {
  BroadcastStatus,
  BroadcastTargetStatus,
  CampaignStatus,
  InvoiceStatus,
  JoinJobStatus,
  LinkStatus,
  MembershipStatus,
  SubscriptionStatus,
  TelegramAccountStatus,
} from '@eak/shared';

import type { BadgeTone } from '../components/ui/Badge';

/** Status enum → Indonesian label + badge tone. */
export const ACCOUNT_STATUS: Record<TelegramAccountStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Aktif', tone: 'ok' },
  warming: { label: 'Warming', tone: 'info' },
  flood_wait: { label: 'Flood wait', tone: 'warn' },
  disconnected: { label: 'Terputus', tone: 'default' },
  banned: { label: 'Banned', tone: 'bad' },
  error: { label: 'Error', tone: 'bad' },
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'default' },
  scheduled: { label: 'Terjadwal', tone: 'info' },
  running: { label: 'Berjalan', tone: 'ok' },
  paused: { label: 'Dijeda', tone: 'warn' },
  completed: { label: 'Selesai', tone: 'violet' },
  failed: { label: 'Gagal', tone: 'bad' },
  archived: { label: 'Arsip', tone: 'default' },
};

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Aktif', tone: 'ok' },
  pending: { label: 'Menunggu', tone: 'warn' },
  expired: { label: 'Kedaluwarsa', tone: 'bad' },
  canceled: { label: 'Dibatalkan', tone: 'default' },
};

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Menunggu', tone: 'warn' },
  paid: { label: 'Lunas', tone: 'ok' },
  expired: { label: 'Kedaluwarsa', tone: 'default' },
  failed: { label: 'Gagal', tone: 'bad' },
};

export const LINK_STATUS: Record<LinkStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Menunggu', tone: 'warn' },
  valid: { label: 'Valid', tone: 'ok' },
  invalid: { label: 'Tidak valid', tone: 'bad' },
  duplicate: { label: 'Duplikat', tone: 'default' },
  expired: { label: 'Kedaluwarsa', tone: 'default' },
};

export const JOIN_STATUS: Record<JoinJobStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: 'Antre', tone: 'default' },
  joining: { label: 'Memproses', tone: 'info' },
  joined: { label: 'Bergabung', tone: 'ok' },
  failed: { label: 'Gagal', tone: 'bad' },
  approval_required: { label: 'Menunggu persetujuan', tone: 'violet' },
  skipped: { label: 'Dilewati', tone: 'default' },
};

export const MEMBERSHIP_STATUS: Record<MembershipStatus, { label: string; tone: BadgeTone }> = {
  member: { label: 'Anggota', tone: 'ok' },
  left: { label: 'Keluar', tone: 'default' },
  kicked: { label: 'Dikeluarkan', tone: 'bad' },
  banned: { label: 'Diblokir', tone: 'bad' },
  pending: { label: 'Menunggu', tone: 'warn' },
};

export const BROADCAST_STATUS: Record<BroadcastStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'default' },
  queued: { label: 'Antre', tone: 'info' },
  sending: { label: 'Mengirim', tone: 'info' },
  completed: { label: 'Selesai', tone: 'ok' },
  failed: { label: 'Gagal', tone: 'bad' },
  paused: { label: 'Dijeda', tone: 'warn' },
  canceled: { label: 'Dibatalkan', tone: 'default' },
};

export const BROADCAST_TARGET_STATUS: Record<BroadcastTargetStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: 'Antre', tone: 'default' },
  sending: { label: 'Mengirim', tone: 'info' },
  sent: { label: 'Terkirim', tone: 'ok' },
  failed: { label: 'Gagal', tone: 'bad' },
  skipped: { label: 'Dilewati', tone: 'default' },
};
