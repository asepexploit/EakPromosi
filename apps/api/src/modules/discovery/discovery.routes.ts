import { AppError, QUEUE_NAMES } from '@eak/config';
import { DiscoveredLinkSchema, DiscoverySourceSchema, envelope } from '@eak/shared';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(120),
  accountId: z.string().min(1),
  telegramChatId: z.string().min(1),
  mentionEnabled: z.boolean().default(false),
  dailyLimit: z.number().int().min(1).max(10_000).default(500),
});

export const registerDiscoveryModule: ApiPlugin = async (app) => {
  const plans = new PlanService(app.prisma);
  const audit = new AuditService(app.prisma);

  app.get(
    '/sources',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(DiscoverySourceSchema)) } } },
    async (req) => {
      const rows = await app.prisma.discoverySource.findMany({
        where: { tenantId: req.tenant!.id },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { discoveredLinks: true } } },
      });
      return ok(
        rows.map((r) => ({
          id: r.id,
          title: r.name,
          accountId: '', // historical: sources attach to accounts via a separate pivot in later phase
          enabled: r.status === 'active',
          detectMentions: r.mentionEnabled,
          maxLinksPerDay: r.dailyLimit,
          linksFound: r._count.discoveredLinks,
          lastScannedAt: r.lastRunAt?.toISOString() ?? null,
        })),
      );
    },
  );

  app.post(
    '/sources',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: CreateSourceSchema, response: { 200: envelope(DiscoverySourceSchema) } },
    },
    async (req) => {
      await plans.enforce(req.tenant!.id, { kind: 'add_discovery_source' });
      // Confirm the account belongs to this tenant
      const acc = await app.prisma.telegramAccount.findFirst({
        where: { id: req.body.accountId, tenantId: req.tenant!.id },
      });
      if (!acc) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan');
      const row = await app.prisma.discoverySource.create({
        data: {
          tenantId: req.tenant!.id,
          name: req.body.name,
          telegramChatId: req.body.telegramChatId,
          kind: 'group',
          mentionEnabled: req.body.mentionEnabled,
          dailyLimit: req.body.dailyLimit,
        },
      });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'discovery.source.create',
        resource: 'discovery_source',
        resourceId: row.id,
        after: req.body as unknown as Record<string, unknown>,
      });
      return ok({
        id: row.id,
        title: row.name,
        accountId: req.body.accountId,
        enabled: true,
        detectMentions: row.mentionEnabled,
        maxLinksPerDay: row.dailyLimit,
        linksFound: 0,
        lastScannedAt: null,
      });
    },
  );

  app.post(
    '/sources/:id/run',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { params: z.object({ id: z.string() }) },
    },
    async (req, reply) => {
      const row = await app.prisma.discoverySource.findFirst({
        where: { id: req.params.id, tenantId: req.tenant!.id },
      });
      if (!row) throw app.httpErrors.notFound();
      await app.queues.queue(QUEUE_NAMES.telegramLinkDetect).add(
        'discovery.scan',
        { tenantId: req.tenant!.id, sourceId: row.id, triggeredBy: req.user!.id },
        { jobId: `discovery-run:${row.id}:${Date.now()}` },
      );
      void reply.status(202).send({ data: { queued: true } });
    },
  );

  app.get(
    '/links',
    {
      preHandler: app.requireTenant,
      schema: {
        querystring: z.object({ status: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }),
        response: { 200: envelope(z.array(DiscoveredLinkSchema)) },
      },
    },
    async (req) => {
      const rows = await app.prisma.discoveredLink.findMany({
        where: {
          tenantId: req.tenant!.id,
          ...(req.query.status ? { status: req.query.status as 'pending' } : {}),
        },
        orderBy: { lastSeenAt: 'desc' },
        take: req.query.limit,
      });
      return ok(
        rows.map((l) => ({
          id: l.id,
          url: l.rawUrl,
          kind: l.kind,
          status: l.status,
          sourceId: l.sourceId ?? '',
          foundByAccountId: '',
          seenCount: 1,
          firstSeenAt: l.firstSeenAt.toISOString(),
          lastSeenAt: l.lastSeenAt.toISOString(),
        })),
      );
    },
  );
};
