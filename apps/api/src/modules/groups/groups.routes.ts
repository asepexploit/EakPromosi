import { GroupSchema, GroupMembershipSchema, CursorPageQuerySchema, CursorPageMetaSchema, envelope } from '@eak/shared';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { decodeCursor, nextCursor } from '../../lib/pagination.js';
import { okPage, ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

export const registerGroupsModule: ApiPlugin = async (app) => {
  const audit = new AuditService(app.prisma);

  app.get(
    '/',
    {
      preHandler: app.requireTenant,
      schema: {
        querystring: CursorPageQuerySchema.extend({
          search: z.string().optional(),
          allowPromotion: z.coerce.boolean().optional(),
        }),
        response: { 200: envelope(z.array(GroupSchema), CursorPageMetaSchema) },
      },
    },
    async (req) => {
      const cur = decodeCursor(req.query.cursor);
      const rows = await app.prisma.group.findMany({
        where: {
          tenantId: req.tenant!.id,
          ...(req.query.allowPromotion !== undefined ? { allowPromotion: req.query.allowPromotion } : {}),
          ...(req.query.search ? { OR: [
            { title: { contains: req.query.search, mode: 'insensitive' } },
            { username: { contains: req.query.search, mode: 'insensitive' } },
          ] } : {}),
          ...(cur ? { OR: [
            { createdAt: { lt: new Date(cur.createdAt) } },
            { AND: [{ createdAt: new Date(cur.createdAt) }, { id: { lt: cur.id } }] },
          ] } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: req.query.limit,
        include: { exclusions: { where: { tenantId: req.tenant!.id } } },
      });
      const data = rows.map((g) => ({
        id: g.id,
        telegramChatId: g.telegramChatId,
        title: g.title,
        username: g.username,
        type: g.kind,
        memberCount: g.memberCount ?? null,
        allowPromotion: g.allowPromotion,
        excluded: g.exclusions.length > 0,
        firstDiscoveredAt: g.firstDiscoveredAt.toISOString(),
        lastSyncedAt: g.lastSyncedAt?.toISOString() ?? null,
      }));
      return okPage(data, nextCursor(rows, req.query.limit), req.query.limit);
    },
  );

  app.get(
    '/:id/memberships',
    {
      preHandler: app.requireTenant,
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: envelope(z.array(GroupMembershipSchema)) },
      },
    },
    async (req) => {
      const rows = await app.prisma.groupMembership.findMany({
        where: { groupId: req.params.id, tenantId: req.tenant!.id },
      });
      return ok(rows.map((m) => ({
        groupId: m.groupId,
        accountId: m.accountId,
        status: m.status,
        joinedAt: m.joinedAt?.toISOString() ?? null,
        leftAt: m.leftAt?.toISOString() ?? null,
        lastCheckedAt: m.lastCheckedAt?.toISOString() ?? null,
      })));
    },
  );

  app.patch(
    '/:id/promotion',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ allowPromotion: z.boolean() }),
      },
    },
    async (req, reply) => {
      const row = await app.prisma.group.findFirst({ where: { id: req.params.id, tenantId: req.tenant!.id } });
      if (!row) throw app.httpErrors.notFound();
      await app.prisma.group.update({ where: { id: row.id }, data: { allowPromotion: req.body.allowPromotion } });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'group.promotion_toggle',
        resource: 'group',
        resourceId: row.id,
        before: { allowPromotion: row.allowPromotion },
        after: { allowPromotion: req.body.allowPromotion },
      });
      void reply.status(204).send();
    },
  );

  app.post(
    '/:id/exclude',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ reason: z.string().max(500).optional() }),
      },
    },
    async (req, reply) => {
      const row = await app.prisma.group.findFirst({ where: { id: req.params.id, tenantId: req.tenant!.id } });
      if (!row) throw app.httpErrors.notFound();
      await app.prisma.groupExclusion.upsert({
        where: { tenantId_groupId: { tenantId: req.tenant!.id, groupId: row.id } },
        update: { reason: req.body.reason ?? null },
        create: { tenantId: req.tenant!.id, groupId: row.id, reason: req.body.reason ?? null },
      });
      void reply.status(204).send();
    },
  );

  app.delete(
    '/:id/exclude',
    { preHandler: app.requireRole(['owner', 'admin', 'operator']), schema: { params: z.object({ id: z.string() }) } },
    async (req, reply) => {
      await app.prisma.groupExclusion
        .delete({ where: { tenantId_groupId: { tenantId: req.tenant!.id, groupId: req.params.id } } })
        .catch(() => undefined);
      void reply.status(204).send();
    },
  );
};
