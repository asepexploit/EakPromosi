import { AuditLogSchema, CursorPageMetaSchema, CursorPageQuerySchema, envelope } from '@eak/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { decodeCursor, nextCursor } from '../../lib/pagination.js';
import { okPage } from '../../lib/response.js';

export async function registerAuditModule(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      preHandler: app.requireRole(['owner', 'admin']),
      schema: {
        querystring: CursorPageQuerySchema.extend({ action: z.string().optional(), resource: z.string().optional() }),
        response: { 200: envelope(z.array(AuditLogSchema), CursorPageMetaSchema) },
      },
    },
    async (req) => {
      const cur = decodeCursor(req.query.cursor);
      const rows = await app.prisma.auditLog.findMany({
        where: {
          tenantId: req.tenant!.id,
          ...(req.query.action ? { action: req.query.action } : {}),
          ...(req.query.resource ? { resource: req.query.resource } : {}),
          ...(cur ? { createdAt: { lt: new Date(cur.createdAt) } } : {}),
        },
        include: { actor: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: req.query.limit,
      });
      const data = rows.map((l) => ({
        id: l.id,
        tenantId: l.tenantId,
        actorUserId: l.actorUserId,
        actorEmail: l.actor?.email ?? null,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        before: l.before,
        after: l.after,
        severity: l.severity,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
      }));
      return okPage(data, nextCursor(rows, req.query.limit), req.query.limit);
    },
  );
}
