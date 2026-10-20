import type { PrismaClient } from '@eak/db';

/**
 * Truncates every business table between tests. Faster than migrate reset
 * and keeps the schema intact. The order matters because of FK constraints —
 * children first, then parents.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = [
    'processed_jobs',
    'webhook_events',
    'audit_logs',
    'support_tickets',
    'dm_responses',
    'dm_rules',
    'campaign_runs',
    'campaign_schedules',
    'campaigns',
    'broadcast_targets',
    'broadcasts',
    'broadcast_templates',
    'join_jobs',
    'group_exclusions',
    'group_memberships',
    'groups',
    'discovered_links',
    'discovery_sources',
    'tenant_bots',
    'telegram_accounts',
    'invoices',
    'subscriptions',
    'tenant_members',
    'tenants',
    'user_sessions',
    'users',
    'plans',
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
  }
}
