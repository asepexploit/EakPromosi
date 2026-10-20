import { SubscriptionSchema, envelope } from '@eak/shared';

import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

export const registerSubscriptionsModule: ApiPlugin = async (app) => {
  const plans = new PlanService(app.prisma);

  app.get(
    '/current',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(SubscriptionSchema) } } },
    async (req) => {
      const sub = await app.prisma.subscription.findFirst({
        where: { tenantId: req.tenant!.id, status: 'active' },
        include: { plan: true },
        orderBy: { endsAt: 'desc' },
      });
      const plan = await plans.getActivePlan(req.tenant!.id);
      const accounts = await app.prisma.telegramAccount.count({ where: { tenantId: req.tenant!.id } });
      const campaigns = await app.prisma.campaign.count({
        where: { tenantId: req.tenant!.id, status: { in: ['draft', 'scheduled', 'running'] } },
      });
      const discoverySources = await app.prisma.discoverySource.count({ where: { tenantId: req.tenant!.id } });
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const broadcastsToday = await app.prisma.broadcastTarget.count({
        where: { tenantId: req.tenant!.id, createdAt: { gte: since } },
      });

      return ok({
        id: sub?.id ?? 'virtual-free',
        planId: plan.planId,
        planCode: plan.code as 'free' | 'pro' | 'business',
        period: 'monthly' as const,
        status: sub?.status ?? 'active',
        startsAt: (sub?.startsAt ?? new Date()).toISOString(),
        endsAt: (sub?.endsAt ?? null)?.toISOString() ?? null,
        scheduledPlanCode: null,
        usage: {
          telegramAccounts: accounts,
          concurrentCampaigns: campaigns,
          broadcastsToday,
          discoverySources,
        },
      });
    },
  );
};
