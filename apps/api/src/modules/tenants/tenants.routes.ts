import { InviteMemberSchema, TenantMemberSchema, UpdateMemberRoleSchema, envelope } from '@eak/shared';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

export const registerTenantsModule: ApiPlugin = async (app) => {
  const audit = new AuditService(app.prisma);

  app.get(
    '/members',
    {
      preHandler: app.requireTenant,
      schema: { response: { 200: envelope(z.array(TenantMemberSchema)) } },
    },
    async (req) => {
      const rows = await app.prisma.tenantMember.findMany({
        where: { tenantId: req.tenant!.id },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      return ok(
        rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          email: r.user.email,
          displayName: r.user.displayName,
          role: r.role,
          createdAt: r.createdAt.toISOString(),
        })),
      );
    },
  );

  app.post(
    '/members',
    {
      preHandler: app.requireRole(['owner', 'admin']),
      schema: { body: InviteMemberSchema, response: { 200: envelope(TenantMemberSchema) } },
    },
    async (req) => {
      const user = await app.prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
      if (!user) throw app.httpErrors.notFound('User belum terdaftar — minta mereka register dulu');
      const existing = await app.prisma.tenantMember.findUnique({
        where: { tenantId_userId: { tenantId: req.tenant!.id, userId: user.id } },
      });
      if (existing) throw app.httpErrors.conflict('User sudah menjadi anggota');
      const created = await app.prisma.tenantMember.create({
        data: { tenantId: req.tenant!.id, userId: user.id, role: req.body.role },
        include: { user: true },
      });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'tenant.member.invited',
        resource: 'tenant_member',
        resourceId: created.id,
        after: { email: user.email, role: req.body.role },
      });
      return ok({
        id: created.id,
        userId: created.userId,
        email: created.user.email,
        displayName: created.user.displayName,
        role: created.role,
        createdAt: created.createdAt.toISOString(),
      });
    },
  );

  app.patch(
    '/members/:id',
    {
      preHandler: app.requireRole(['owner', 'admin']),
      schema: {
        params: z.object({ id: z.string() }),
        body: UpdateMemberRoleSchema,
        response: { 200: envelope(TenantMemberSchema) },
      },
    },
    async (req) => {
      const row = await app.prisma.tenantMember.findFirst({
        where: { id: req.params.id, tenantId: req.tenant!.id },
      });
      if (!row) throw app.httpErrors.notFound('Member tidak ditemukan');
      if (row.role === 'owner' && req.body.role !== 'owner') {
        throw app.httpErrors.forbidden('Owner tidak bisa diturunkan di sini');
      }
      const updated = await app.prisma.tenantMember.update({
        where: { id: row.id },
        data: { role: req.body.role },
        include: { user: true },
      });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'tenant.member.role_changed',
        resource: 'tenant_member',
        resourceId: row.id,
        before: { role: row.role },
        after: { role: req.body.role },
      });
      return ok({
        id: updated.id,
        userId: updated.userId,
        email: updated.user.email,
        displayName: updated.user.displayName,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
      });
    },
  );

  app.delete(
    '/members/:id',
    {
      preHandler: app.requireRole(['owner']),
      schema: { params: z.object({ id: z.string() }) },
    },
    async (req, reply) => {
      const row = await app.prisma.tenantMember.findFirst({
        where: { id: req.params.id, tenantId: req.tenant!.id },
      });
      if (!row) throw app.httpErrors.notFound('Member tidak ditemukan');
      if (row.role === 'owner') throw app.httpErrors.forbidden('Tidak bisa hapus owner');
      await app.prisma.tenantMember.delete({ where: { id: row.id } });
      await audit.log({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        action: 'tenant.member.removed',
        resource: 'tenant_member',
        resourceId: row.id,
        before: { userId: row.userId, role: row.role },
      });
      void reply.status(204).send();
    },
  );
};
