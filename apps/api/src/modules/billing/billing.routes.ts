import { CreateInvoiceSchema, CreateInvoiceResultSchema, InvoiceSchema, envelope } from '@eak/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { ok } from '../../lib/response.js';

import { BillingService } from './billing.service.js';
import { PakasirAdapter } from './pakasir.adapter.js';

export async function registerBillingModule(app: FastifyInstance): Promise<void> {
  const adapter = new PakasirAdapter(app.env);
  const audit = new AuditService(app.prisma);
  const service = new BillingService(app.prisma, adapter, audit, app.env);

  app.post(
    '/checkout',
    {
      preHandler: app.requireRole(['owner', 'admin']),
      schema: { body: CreateInvoiceSchema, response: { 200: envelope(CreateInvoiceResultSchema) } },
    },
    async (req) => {
      const result = await service.createCheckout({
        tenantId: req.tenant!.id,
        actorUserId: req.user!.id,
        planCode: req.body.planCode,
        period: req.body.period,
        userEmail: req.user!.email,
      });
      // Fetch the created invoice to shape the response
      const invoice = await app.prisma.invoice.findUnique({
        where: { id: result.invoiceId },
        include: { plan: true },
      });
      if (!invoice) throw app.httpErrors.internalServerError();
      return ok({
        invoice: {
          id: invoice.id,
          pakasirInvoiceId: invoice.pakasirInvoiceId,
          planCode: invoice.plan.code as 'free' | 'pro' | 'business',
          period: invoice.period,
          amount: invoice.amountIdr,
          status: invoice.status,
          periodStart: invoice.createdAt.toISOString(),
          periodEnd: invoice.expiresAt.toISOString(),
          createdAt: invoice.createdAt.toISOString(),
          paidAt: invoice.paidAt?.toISOString() ?? null,
          expiresAt: invoice.expiresAt.toISOString(),
        },
        redirectUrl: result.redirectUrl,
      });
    },
  );

  app.get(
    '/history',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(InvoiceSchema)) } } },
    async (req) => {
      const rows = await app.prisma.invoice.findMany({
        where: { tenantId: req.tenant!.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return ok(rows.map((i) => ({
        id: i.id,
        pakasirInvoiceId: i.pakasirInvoiceId,
        planCode: i.plan.code as 'free' | 'pro' | 'business',
        period: i.period,
        amount: i.amountIdr,
        status: i.status,
        periodStart: i.createdAt.toISOString(),
        periodEnd: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
        paidAt: i.paidAt?.toISOString() ?? null,
        expiresAt: i.expiresAt.toISOString(),
      })));
    },
  );
}
