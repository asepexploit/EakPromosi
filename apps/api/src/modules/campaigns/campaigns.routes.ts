import { CampaignSummarySchema, envelope } from '@eak/shared';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

const UpsertCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  goal: z.string().max(500).optional().nullable(),
  startsAt: z.string().datetime({ offset: true }).optional().nullable(),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
  templateId: z.string().nullable(),
  accountIds: z.array(z.string()).default([]),
  targetGroupIds: z.array(z.string()).default([]),
  schedules: z
    .array(z.object({ cron: z.string().min(1), timezone: z.string().default('UTC') }))
    .default([]),
});

export const registerCampaignsModule: ApiPlugin = async (app) => {
  const audit = new AuditService(app.prisma);
  const plans = new PlanService(app.prisma);

  app.get(
    '/',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(CampaignSummarySchema)) } } },
    async (req) => {
      const rows = await app.prisma.campaign.findMany({
        where: { tenantId: req.tenant!.id, archivedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      return ok(rows.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        startsAt: (c.startsAt ?? c.createdAt).toISOString(),
        endsAt: c.endsAt?.toISOString() ?? null,
        accountIds: c.accountIds,
        targetCount: c.targetGroupIds.length,
        sent: c.totalSent,
        failed: c.totalFailed,
        totalPlanned: c.totalPlanned,
      })));
    },
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: UpsertCampaignSchema, response: { 200: envelope(CampaignSummarySchema) } },
    },
    async (req) => {
      await plans.enforce(req.tenant!.id, { kind: 'create_campaign' });
      const c = await app.prisma.campaign.create({
        data: {
          tenantId: req.tenant!.id,
          name: req.body.name,
          description: req.body.description ?? null,
          goal: req.body.goal ?? null,
          startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
          endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
          templateId: req.body.templateId,
          accountIds: req.body.accountIds,
          targetGroupIds: req.body.targetGroupIds,
          totalPlanned: req.body.targetGroupIds.length,
          schedules: {
            createMany: {
              data: req.body.schedules.map((s) => ({ cron: s.cron, timezone: s.timezone })),
            },
          },
        },
      });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'campaign.create',
        resource: 'campaign',
        resourceId: c.id,
        after: { name: c.name },
      });
      return ok({
        id: c.id,
        name: c.name,
        status: c.status,
        startsAt: (c.startsAt ?? c.createdAt).toISOString(),
        endsAt: c.endsAt?.toISOString() ?? null,
        accountIds: c.accountIds,
        targetCount: c.targetGroupIds.length,
        sent: 0,
        failed: 0,
        totalPlanned: c.totalPlanned,
      });
    },
  );

  for (const op of ['start', 'pause', 'resume', 'stop', 'archive'] as const) {
    app.post(
      `/:id/${op}`,
      {
        preHandler: app.requireRole(['owner', 'admin', 'operator']),
        schema: { params: z.object({ id: z.string() }) },
      },
      async (req, reply) => {
        const c = await app.prisma.campaign.findFirst({ where: { id: req.params.id, tenantId: req.tenant!.id } });
        if (!c) throw app.httpErrors.notFound();
        const nextStatus = {
          start: 'scheduled',
          pause: 'paused',
          resume: 'running',
          stop: 'completed',
          archive: 'archived',
        }[op] as 'scheduled' | 'paused' | 'running' | 'completed' | 'archived';
        await app.prisma.campaign.update({
          where: { id: c.id },
          data: { status: nextStatus, archivedAt: op === 'archive' ? new Date() : null },
        });
        await audit.log({
          tenantId: req.tenant!.id,
          actorUserId: req.user!.id,
          action: `campaign.${op}`,
          resource: 'campaign',
          resourceId: c.id,
          before: { status: c.status },
          after: { status: nextStatus },
        });
        void reply.status(204).send();
      },
    );
  }
};
