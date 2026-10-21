import { AppError, type Env } from '@eak/config';
import { type PrismaClient, InvoiceStatus, SubscriptionStatus, BillingPeriod } from '@eak/db';

import type { PakasirAdapter } from './pakasir.adapter.js';
import type { AuditService } from '../../lib/audit-service.js';


/**
 * Billing orchestration. Subscription-only: an invoice is either `paid`
 * (which activates/extends the subscription) or it isn't — no credit
 * balance accounting. See `.claude/rules/payment.md`.
 */
export class BillingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pakasir: PakasirAdapter,
    private readonly audit: AuditService,
    private readonly env: Env,
  ) {}

  async createCheckout(input: {
    tenantId: string;
    actorUserId: string;
    planCode: string;
    period: BillingPeriod;
    userEmail: string;
  }): Promise<{ invoiceId: string; redirectUrl: string }> {
    const plan = await this.prisma.plan.findUnique({ where: { code: input.planCode } });
    if (!plan) throw new AppError('NOT_FOUND', 'Paket tidak ditemukan');
    if (plan.period !== input.period) {
      throw new AppError('VALIDATION_FAILED', 'Periode tidak didukung oleh paket');
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: input.tenantId,
        planId: plan.id,
        pakasirInvoiceId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amountIdr: plan.priceIdr,
        period: plan.period,
        status: InvoiceStatus.pending,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    const vendor = await this.pakasir.createInvoice({
      invoiceReference: invoice.id,
      amountIdr: plan.priceIdr,
      description: `${plan.name} subscription (${plan.period})`,
      callbackUrl: `${this.env.PUBLIC_WEB_ORIGIN.replace(/\/$/, '')}/webhooks/pakasir`,
      redirectUrl: `${this.env.PUBLIC_WEB_ORIGIN.replace(/\/$/, '')}/billing/history`,
      customerEmail: input.userEmail,
    });

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pakasirInvoiceId: vendor.invoiceId,
        checkoutUrl: vendor.checkoutUrl,
        expiresAt: new Date(vendor.expiresAt),
      },
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: 'billing.invoice.created',
      resource: 'invoice',
      resourceId: updated.id,
      after: { planCode: plan.code, period: plan.period, amount: plan.priceIdr },
    });

    return { invoiceId: updated.id, redirectUrl: vendor.checkoutUrl };
  }

  /**
   * Transition an invoice `pending → paid` and activate / extend the
   * subscription. Any other transition is a no-op (idempotent replay).
   */
  async handlePaidEvent(input: { invoiceId: string; paidAt: Date }): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { pakasirInvoiceId: input.invoiceId },
      include: { plan: true },
    });
    if (!invoice) throw new AppError('NOT_FOUND', 'Invoice tidak ditemukan');
    if (invoice.status !== InvoiceStatus.pending) return; // idempotent replay

    const periodDays = invoice.period === BillingPeriod.monthly ? 30 : 365;
    const now = input.paidAt;
    const activeSub = await this.prisma.subscription.findFirst({
      where: { tenantId: invoice.tenantId, status: SubscriptionStatus.active },
      orderBy: { endsAt: 'desc' },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.paid, paidAt: now },
      });
      if (activeSub && activeSub.planId === invoice.planId) {
        // renewal: extend ends_at from the later of now or current ends_at
        const base = activeSub.endsAt > now ? activeSub.endsAt : now;
        await tx.subscription.update({
          where: { id: activeSub.id },
          data: { endsAt: new Date(base.getTime() + periodDays * 86_400_000) },
        });
      } else {
        // upgrade / fresh sub
        if (activeSub) {
          await tx.subscription.update({
            where: { id: activeSub.id },
            data: { status: SubscriptionStatus.canceled, canceledAt: now },
          });
        }
        await tx.subscription.create({
          data: {
            tenantId: invoice.tenantId,
            planId: invoice.planId,
            status: SubscriptionStatus.active,
            startsAt: now,
            endsAt: new Date(now.getTime() + periodDays * 86_400_000),
          },
        });
        await tx.tenant.update({ where: { id: invoice.tenantId }, data: { planId: invoice.planId } });
      }
    });

    await this.audit.log({
      tenantId: invoice.tenantId,
      action: 'billing.subscription.activated',
      resource: 'subscription',
      resourceId: invoice.id,
      after: { planId: invoice.planId, period: invoice.period },
      severity: 'info',
    });
  }
}
