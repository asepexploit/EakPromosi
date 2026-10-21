import { DmRuleSchema, UpsertDmRuleSchema, envelope } from '@eak/shared';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';
import type { ApiPlugin } from '../../plugin-types.js';

export const registerDmModule: ApiPlugin = async (app) => {
  const plans = new PlanService(app.prisma);
  const audit = new AuditService(app.prisma);

  app.get(
    '/rules',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(DmRuleSchema)) } } },
    async (req) => {
      const rows = await app.prisma.dmRule.findMany({
        where: { tenantId: req.tenant!.id },
        orderBy: { createdAt: 'desc' },
      });
      return ok(rows.map((r) => ({
        id: r.id,
        name: r.name,
        triggerType: r.triggerType,
        keywords: r.keywords,
        responseType: r.responseType,
        responseBody: r.responseBody,
        responseMedia: r.responseMedia,
        cooldownMinutes: r.cooldownMinutes,
        activeHoursStart: r.activeHoursStart,
        activeHoursEnd: r.activeHoursEnd,
        timezone: r.timezone,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
      })));
    },
  );

  app.post(
    '/rules',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: UpsertDmRuleSchema, response: { 200: envelope(DmRuleSchema) } },
    },
    async (req) => {
      await plans.enforce(req.tenant!.id, { kind: 'use_feature', feature: 'autoDm' });
      const r = await app.prisma.dmRule.create({ data: { tenantId: req.tenant!.id, ...req.body } });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'dm_rule.create',
        resource: 'dm_rule',
        resourceId: r.id,
        after: { name: r.name },
      });
      return ok({
        id: r.id,
        name: r.name,
        triggerType: r.triggerType,
        keywords: r.keywords,
        responseType: r.responseType,
        responseBody: r.responseBody,
        responseMedia: r.responseMedia,
        cooldownMinutes: r.cooldownMinutes,
        activeHoursStart: r.activeHoursStart,
        activeHoursEnd: r.activeHoursEnd,
        timezone: r.timezone,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
      });
    },
  );

  app.delete(
    '/rules/:id',
    { preHandler: app.requireRole(['owner', 'admin']), schema: { params: z.object({ id: z.string() }) } },
    async (req, reply) => {
      await app.prisma.dmRule
        .deleteMany({ where: { id: req.params.id, tenantId: req.tenant!.id } });
      void reply.status(204).send();
    },
  );
};
