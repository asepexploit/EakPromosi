import { DashboardSummarySchema, envelope } from '@eak/shared';

import { ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

export const registerDashboardModule: ApiPlugin = async (app) => {
  app.get(
    '/summary',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(DashboardSummarySchema) } } },
    async (req) => {
      const tenantId = req.tenant!.id;
      const [accounts, campaignsRunning, campaignsScheduled, discoveredLinks, joinedGroups] = await Promise.all([
        app.prisma.telegramAccount.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { _all: true },
        }),
        app.prisma.campaign.count({ where: { tenantId, status: 'running' } }),
        app.prisma.campaign.count({ where: { tenantId, status: 'scheduled' } }),
        app.prisma.discoveredLink.count({ where: { tenantId } }),
        app.prisma.groupMembership.count({ where: { tenantId, status: 'member' } }),
      ]);

      const byStatus = Object.fromEntries(accounts.map((a) => [a.status, a._count._all])) as Record<string, number>;
      const totalAccounts = accounts.reduce((s, a) => s + a._count._all, 0);

      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
      const sent7d = await app.prisma.broadcastTarget.count({
        where: { tenantId, status: 'sent', sentAt: { gte: sevenDaysAgo } },
      });
      const failed7d = await app.prisma.broadcastTarget.count({
        where: { tenantId, status: 'failed', updatedAt: { gte: sevenDaysAgo } },
      });

      return ok({
        accounts: {
          total: totalAccounts,
          byStatus: {
            active: byStatus.active ?? 0,
            warming: byStatus.warming ?? 0,
            flood_wait: byStatus.flood_wait ?? 0,
            disconnected: byStatus.disconnected ?? 0,
            banned: byStatus.banned ?? 0,
            error: byStatus.error ?? 0,
          },
        },
        discovery: { linksFound: discoveredLinks, queue: { pending: 0, processing: 0, failed: 0 } },
        join: { joinedGroups, queue: { pending: 0, processing: 0, failed: 0 } },
        campaigns: { running: campaignsRunning, scheduled: campaignsScheduled },
        broadcast7d: {
          sent: sent7d,
          failed: failed7d,
          daily: [],
        },
        activity: [],
      });
    },
  );
};
