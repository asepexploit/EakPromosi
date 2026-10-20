import { AppError, QUEUE_NAMES, type QueueFactory } from '@eak/config';
import { type PrismaClient, BroadcastStatus } from '@eak/db';
import type { CreateBroadcast } from '@eak/shared';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';

export class BroadcastsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queues: QueueFactory,
    private readonly plans: PlanService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorUserId: string, input: CreateBroadcast): Promise<{ id: string; status: BroadcastStatus; totalTargets: number }> {
    // Resolve + validate target groups: must be in tenant, allowPromotion=true, not excluded
    const groups = await this.prisma.group.findMany({
      where: {
        id: { in: input.targetGroupIds },
        tenantId,
        allowPromotion: true,
        exclusions: { none: { tenantId } },
      },
    });
    if (groups.length === 0) {
      throw new AppError('VALIDATION_FAILED', 'Tidak ada target grup yang memenuhi syarat (allow_promotion + bukan excluded)');
    }
    await this.plans.enforce(tenantId, { kind: 'send_broadcast', targetCount: groups.length });

    const account = await this.prisma.telegramAccount.findFirst({ where: { id: input.accountId, tenantId } });
    if (!account) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan');

    const broadcast = await this.prisma.$transaction(async (tx) => {
      const b = await tx.broadcast.create({
        data: {
          tenantId,
          accountId: input.accountId,
          templateId: input.templateId,
          title: input.title,
          body: input.body,
          mediaUrl: input.mediaUrl,
          mediaKind: input.mediaKind,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          totalTargets: groups.length,
          status: input.scheduledAt ? BroadcastStatus.queued : BroadcastStatus.queued,
          minDelaySec: input.minDelaySec,
          maxDelaySec: input.maxDelaySec,
        },
      });
      await tx.broadcastTarget.createMany({
        data: groups.map((g) => ({ tenantId, broadcastId: b.id, groupId: g.id })),
      });
      return b;
    });

    await this.queues.queue(QUEUE_NAMES.telegramBroadcast).add(
      'broadcast.start',
      { tenantId, broadcastId: broadcast.id },
      {
        jobId: `broadcast:${broadcast.id}`,
        delay: input.scheduledAt ? Math.max(0, new Date(input.scheduledAt).getTime() - Date.now()) : 0,
      },
    );
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'broadcast.create',
      resource: 'broadcast',
      resourceId: broadcast.id,
      after: { title: input.title, targets: groups.length },
    });
    return { id: broadcast.id, status: broadcast.status, totalTargets: groups.length };
  }

  async control(tenantId: string, actorUserId: string, id: string, action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    const b = await this.prisma.broadcast.findFirst({ where: { id, tenantId } });
    if (!b) throw new AppError('NOT_FOUND', 'Broadcast tidak ditemukan');
    const next = action === 'pause' ? BroadcastStatus.paused : action === 'resume' ? BroadcastStatus.queued : BroadcastStatus.canceled;
    await this.prisma.broadcast.update({ where: { id: b.id }, data: { status: next } });
    await this.audit.log({
      tenantId,
      actorUserId,
      action: `broadcast.${action}`,
      resource: 'broadcast',
      resourceId: b.id,
      before: { status: b.status },
      after: { status: next },
    });
  }
}
