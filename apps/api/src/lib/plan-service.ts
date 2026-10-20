import { AppError, type ErrorCode } from '@eak/config';
import { type PrismaClient, SubscriptionStatus } from '@eak/db';

/**
 * Enforces plan limits before the actual action runs. The one place in the
 * codebase that answers "can this tenant do X right now".
 *
 * Non-negotiable (CLAUDE.md §9 + .claude/rules/product.md): subscription-only.
 * This service NEVER touches credit/wallet state — those don't exist.
 */
export type EnforceAction =
  | { kind: 'add_account' }
  | { kind: 'create_campaign' }
  | { kind: 'send_broadcast'; targetCount: number }
  | { kind: 'add_discovery_source' }
  | { kind: 'use_feature'; feature: 'autoDiscovery' | 'autoJoin' | 'autoBroadcast' | 'autoDm' };

export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActivePlan(tenantId: string): Promise<{
    planId: string;
    code: string;
    limits: {
      maxTelegramAccounts: number;
      maxConcurrentCampaigns: number;
      maxBroadcastsPerDay: number;
      maxDiscoverySources: number;
    };
    features: {
      autoDiscovery: boolean;
      autoJoin: boolean;
      autoBroadcast: boolean;
      autoDm: boolean;
    };
    expiresAt: Date | null;
  }> {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: SubscriptionStatus.active },
      include: { plan: true },
      orderBy: { endsAt: 'desc' },
    });
    if (!sub) {
      // Tenants without an active subscription fall back to the "free" plan.
      const free = await this.prisma.plan.findUnique({ where: { code: 'free' } });
      if (!free) throw new AppError('INTERNAL', 'free plan missing — run seed');
      return {
        planId: free.id,
        code: free.code,
        limits: {
          maxTelegramAccounts: free.maxTelegramAccounts,
          maxConcurrentCampaigns: free.maxConcurrentCampaigns,
          maxBroadcastsPerDay: free.maxBroadcastsPerDay,
          maxDiscoverySources: free.maxDiscoverySources,
        },
        features: {
          autoDiscovery: free.autoDiscoveryEnabled,
          autoJoin: free.autoJoinEnabled,
          autoBroadcast: free.autoBroadcastEnabled,
          autoDm: free.autoDmEnabled,
        },
        expiresAt: null,
      };
    }
    return {
      planId: sub.plan.id,
      code: sub.plan.code,
      limits: {
        maxTelegramAccounts: sub.plan.maxTelegramAccounts,
        maxConcurrentCampaigns: sub.plan.maxConcurrentCampaigns,
        maxBroadcastsPerDay: sub.plan.maxBroadcastsPerDay,
        maxDiscoverySources: sub.plan.maxDiscoverySources,
      },
      features: {
        autoDiscovery: sub.plan.autoDiscoveryEnabled,
        autoJoin: sub.plan.autoJoinEnabled,
        autoBroadcast: sub.plan.autoBroadcastEnabled,
        autoDm: sub.plan.autoDmEnabled,
      },
      expiresAt: sub.endsAt,
    };
  }

  async enforce(tenantId: string, action: EnforceAction): Promise<void> {
    const plan = await this.getActivePlan(tenantId);

    switch (action.kind) {
      case 'add_account': {
        const used = await this.prisma.telegramAccount.count({
          where: { tenantId, disabledByPlanLimit: false },
        });
        if (used >= plan.limits.maxTelegramAccounts) {
          throw this.limitError('PLAN_LIMIT_ACCOUNTS', 'Jumlah akun Telegram sudah mencapai batas paket', {
            used,
            limit: plan.limits.maxTelegramAccounts,
          });
        }
        return;
      }
      case 'create_campaign': {
        const used = await this.prisma.campaign.count({
          where: { tenantId, status: { in: ['draft', 'scheduled', 'running', 'paused'] } },
        });
        if (used >= plan.limits.maxConcurrentCampaigns) {
          throw this.limitError('PLAN_LIMIT_CAMPAIGNS', 'Jumlah campaign aktif sudah mencapai batas paket', {
            used,
            limit: plan.limits.maxConcurrentCampaigns,
          });
        }
        return;
      }
      case 'send_broadcast': {
        const since = startOfDayUtc(new Date());
        const sentToday = await this.prisma.broadcastTarget.count({
          where: {
            tenantId,
            status: { in: ['sent', 'sending', 'queued'] },
            createdAt: { gte: since },
          },
        });
        if (sentToday + action.targetCount > plan.limits.maxBroadcastsPerDay) {
          throw this.limitError('PLAN_LIMIT_BROADCASTS_PER_DAY', 'Kuota broadcast harian terlampaui', {
            sentToday,
            requested: action.targetCount,
            limit: plan.limits.maxBroadcastsPerDay,
          });
        }
        if (!plan.features.autoBroadcast) {
          throw this.limitError('PLAN_FEATURE_DISABLED', 'Fitur Auto Broadcast tidak termasuk paket aktif', {
            feature: 'autoBroadcast',
          });
        }
        return;
      }
      case 'add_discovery_source': {
        if (!plan.features.autoDiscovery) {
          throw this.limitError('PLAN_FEATURE_DISABLED', 'Auto Discovery tidak termasuk paket aktif', {
            feature: 'autoDiscovery',
          });
        }
        const used = await this.prisma.discoverySource.count({ where: { tenantId } });
        if (used >= plan.limits.maxDiscoverySources) {
          throw this.limitError('PLAN_LIMIT_DISCOVERY_SOURCES', 'Jumlah sumber discovery mencapai batas paket', {
            used,
            limit: plan.limits.maxDiscoverySources,
          });
        }
        return;
      }
      case 'use_feature': {
        if (!plan.features[action.feature]) {
          throw this.limitError('PLAN_FEATURE_DISABLED', `Fitur ${action.feature} tidak termasuk paket aktif`, {
            feature: action.feature,
          });
        }
        return;
      }
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  private limitError(code: ErrorCode, message: string, context: Record<string, unknown>): AppError {
    return new AppError(code, message, { context });
  }
}

function startOfDayUtc(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}
