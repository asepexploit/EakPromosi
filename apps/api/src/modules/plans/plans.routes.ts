import { PlanSchema, envelope } from '@eak/shared';
import { z } from 'zod';

import { ok } from '../../lib/response.js';
import type { ApiPlugin } from '../../plugin-types.js';

export const registerPlansModule: ApiPlugin = async (app) => {
  app.get(
    '/',
    { schema: { response: { 200: envelope(z.array(PlanSchema)) } } },
    async () => {
      const rows = await app.prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: 'asc' } });
      return ok(rows.map((p) => ({
        id: p.id,
        code: p.code as 'free' | 'pro' | 'business',
        name: p.name,
        prices: { monthly: p.period === 'monthly' ? p.priceIdr : 0, yearly: p.period === 'yearly' ? p.priceIdr : 0 },
        limits: {
          maxTelegramAccounts: p.maxTelegramAccounts,
          maxConcurrentCampaigns: p.maxConcurrentCampaigns,
          maxBroadcastsPerDay: p.maxBroadcastsPerDay,
          maxDiscoverySources: p.maxDiscoverySources,
        },
        features: {
          autoDiscovery: p.autoDiscoveryEnabled ? 'full' : 'none',
          autoJoin: p.autoJoinEnabled ? 'full' : 'none',
          autoBroadcast: p.autoBroadcastEnabled ? 'full' : 'none',
          campaignManagement: p.autoBroadcastEnabled ? 'full' : 'basic',
          monitoring: 'full',
        } as const,
      })));
    },
  );
};
