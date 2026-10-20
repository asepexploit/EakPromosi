import {
  BroadcastSummarySchema,
  BroadcastTemplateSchema,
  CreateBroadcastSchema,
  UpsertBroadcastTemplateSchema,
  envelope,
} from '@eak/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';

import { BroadcastsService } from './broadcasts.service.js';

export async function registerBroadcastsModule(app: FastifyInstance): Promise<void> {
  const audit = new AuditService(app.prisma);
  const plans = new PlanService(app.prisma);
  const service = new BroadcastsService(app.prisma, app.queues, plans, audit);

  app.get(
    '/',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(BroadcastSummarySchema)) } } },
    async (req) => {
      const rows = await app.prisma.broadcast.findMany({
        where: { tenantId: req.tenant!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return ok(rows.map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        accountId: b.accountId,
        totalTargets: b.totalTargets,
        sentCount: b.sentCount,
        failedCount: b.failedCount,
        scheduledAt: b.scheduledAt?.toISOString() ?? null,
        startedAt: b.startedAt?.toISOString() ?? null,
        completedAt: b.completedAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })));
    },
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: CreateBroadcastSchema, response: { 200: envelope(z.object({ id: z.string(), status: z.string(), totalTargets: z.number() })) } },
    },
    async (req) => ok(await service.create(req.tenant!.id, req.user!.id, req.body)),
  );

  for (const op of ['pause', 'resume', 'cancel'] as const) {
    app.post(
      `/:id/${op}`,
      {
        preHandler: app.requireRole(['owner', 'admin', 'operator']),
        schema: { params: z.object({ id: z.string() }) },
      },
      async (req, reply) => {
        await service.control(req.tenant!.id, req.user!.id, req.params.id, op);
        void reply.status(204).send();
      },
    );
  }

  // Templates
  app.get(
    '/templates',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(BroadcastTemplateSchema)) } } },
    async (req) => {
      const rows = await app.prisma.broadcastTemplate.findMany({
        where: { tenantId: req.tenant!.id },
        orderBy: { createdAt: 'desc' },
      });
      return ok(rows.map((r) => ({
        id: r.id,
        name: r.name,
        body: r.body,
        mediaUrl: r.mediaUrl,
        mediaKind: r.mediaKind as 'photo' | 'video' | 'document' | 'gif' | null,
        createdAt: r.createdAt.toISOString(),
      })));
    },
  );

  app.post(
    '/templates',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: UpsertBroadcastTemplateSchema, response: { 200: envelope(BroadcastTemplateSchema) } },
    },
    async (req) => {
      const r = await app.prisma.broadcastTemplate.create({
        data: { tenantId: req.tenant!.id, ...req.body },
      });
      return ok({
        id: r.id,
        name: r.name,
        body: r.body,
        mediaUrl: r.mediaUrl,
        mediaKind: r.mediaKind as 'photo' | 'video' | 'document' | 'gif' | null,
        createdAt: r.createdAt.toISOString(),
      });
    },
  );
}
