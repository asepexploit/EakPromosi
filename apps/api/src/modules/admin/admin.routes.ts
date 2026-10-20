import { AdminPlanInputSchema, AdminTenantSummarySchema, SuspendTenantSchema, envelope } from '@eak/shared';
import { TenantStatus } from '@eak/db';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { ok } from '../../lib/response.js';

import type { ApiPlugin } from '../../plugin-types.js';

/**
 * Platform admin panel. Routes live under `/admin/*` with
 * `requirePlatformAdmin` enforced on EVERY handler. See product-spec §16.
 * Every mutation here is audited (severity: info|warn|critical).
 */
export const registerAdminModule: ApiPlugin = async (app) => {
  const audit = new AuditService(app.prisma);

  // Guard the entire admin surface
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/admin')) return;
    await app.requirePlatformAdmin(req);
  });

  app.get(
    '/tenants',
    { schema: { response: { 200: envelope(z.array(AdminTenantSummarySchema)) } } },
    async () => {
      const rows = await app.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          plan: true,
          _count: { select: { members: true, telegramAccounts: true } },
          subscriptions: { where: { status: 'active' }, include: { plan: true }, take: 1 },
        },
      });
      return ok(rows.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        planCode: t.plan?.code ?? 'free',
        memberCount: t._count.members,
        accountCount: t._count.telegramAccounts,
        mrrIdr: t.subscriptions[0]?.plan.priceIdr ?? 0,
        createdAt: t.createdAt.toISOString(),
      })));
    },
  );

  app.post(
    '/tenants/:id/suspend',
    { schema: { params: z.object({ id: z.string() }), body: SuspendTenantSchema } },
    async (req, reply) => {
      const row = await app.prisma.tenant.findUnique({ where: { id: req.params.id } });
      if (!row) throw app.httpErrors.notFound();
      await app.prisma.tenant.update({
        where: { id: row.id },
        data: { status: TenantStatus.suspended },
      });
      await audit.log({
        tenantId: row.id,
        actorUserId: req.user!.id,
        action: 'admin.tenant.suspend',
        resource: 'tenant',
        resourceId: row.id,
        before: { status: row.status },
        after: { status: 'suspended' },
        severity: 'critical',
      });
      void reply.status(204).send();
    },
  );

  app.post(
    '/plans',
    { schema: { body: AdminPlanInputSchema } },
    async (req) => {
      const plan = await app.prisma.plan.upsert({
        where: { code: req.body.code },
        update: req.body,
        create: req.body,
      });
      await audit.log({
        actorUserId: req.user!.id,
        action: 'admin.plan.upsert',
        resource: 'plan',
        resourceId: plan.id,
        after: req.body as unknown as Record<string, unknown>,
      });
      return ok({ id: plan.id });
    },
  );

  app.get('/invoices', async () => {
    const rows = await app.prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { tenant: true, plan: true },
    });
    return ok(rows.map((i) => ({
      id: i.id,
      tenantSlug: i.tenant.slug,
      planCode: i.plan.code,
      amountIdr: i.amountIdr,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
    })));
  });
};
