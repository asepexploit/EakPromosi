import { describe, expect, it, vi } from 'vitest';

import { PlanService } from './plan-service.js';

function stubPrisma(overrides: Partial<Record<string, unknown>>): unknown {
  return {
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    plan: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'free_1',
        code: 'free',
        maxTelegramAccounts: 1,
        maxConcurrentCampaigns: 1,
        maxBroadcastsPerDay: 20,
        maxDiscoverySources: 1,
        autoDiscoveryEnabled: true,
        autoJoinEnabled: true,
        autoBroadcastEnabled: true,
        autoDmEnabled: false,
      }),
    },
    telegramAccount: { count: vi.fn().mockResolvedValue(0) },
    campaign: { count: vi.fn().mockResolvedValue(0) },
    discoverySource: { count: vi.fn().mockResolvedValue(0) },
    broadcastTarget: { count: vi.fn().mockResolvedValue(0) },
    ...overrides,
  };
}

describe('PlanService.enforce', () => {
  it('rejects adding a second account on the Free plan', async () => {
    const prisma = stubPrisma({
      telegramAccount: { count: vi.fn().mockResolvedValue(1) },
    });
    const svc = new PlanService(prisma as never);
    await expect(svc.enforce('t1', { kind: 'add_account' })).rejects.toMatchObject({
      code: 'PLAN_LIMIT_ACCOUNTS',
      httpStatus: 402,
    });
  });

  it('rejects a broadcast exceeding daily quota', async () => {
    const prisma = stubPrisma({
      broadcastTarget: { count: vi.fn().mockResolvedValue(18) },
    });
    const svc = new PlanService(prisma as never);
    await expect(svc.enforce('t1', { kind: 'send_broadcast', targetCount: 5 })).rejects.toMatchObject({
      code: 'PLAN_LIMIT_BROADCASTS_PER_DAY',
      httpStatus: 402,
    });
  });

  it('rejects auto-DM feature when the Free plan disables it', async () => {
    const prisma = stubPrisma({});
    const svc = new PlanService(prisma as never);
    await expect(svc.enforce('t1', { kind: 'use_feature', feature: 'autoDm' })).rejects.toMatchObject({
      code: 'PLAN_FEATURE_DISABLED',
    });
  });

  it('allows actions within the plan', async () => {
    const prisma = stubPrisma({});
    const svc = new PlanService(prisma as never);
    await expect(svc.enforce('t1', { kind: 'add_account' })).resolves.toBeUndefined();
    await expect(svc.enforce('t1', { kind: 'send_broadcast', targetCount: 10 })).resolves.toBeUndefined();
  });
});
