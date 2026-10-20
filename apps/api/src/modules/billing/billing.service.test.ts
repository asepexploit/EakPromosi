import { describe, expect, it, vi } from 'vitest';

import { AuditService } from '../../lib/audit-service.js';

import { BillingService } from './billing.service.js';

// Minimal prisma stub tailored to the subscription-only transitions
// (`pending → paid` activates/extends; everything else is a no-op).
function stubPrisma() {
  const invoice = {
    id: 'inv_1',
    tenantId: 't1',
    planId: 'plan_pro',
    pakasirInvoiceId: 'pakasir_1',
    period: 'monthly' as const,
    status: 'pending' as 'pending' | 'paid',
    plan: { id: 'plan_pro', code: 'pro' },
  };
  const client: Record<string, unknown> = {
    invoice: {
      findFirst: vi.fn().mockResolvedValue(invoice),
      update: vi.fn().mockImplementation(async ({ data }: { data: Partial<typeof invoice> }) => {
        if (data.status) invoice.status = data.status as 'paid';
        return invoice;
      }),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'sub_new' }),
      update: vi.fn(),
    },
    tenant: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  client.$transaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(client));
  return client as typeof client & {
    invoice: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    subscription: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  };
}

describe('BillingService.handlePaidEvent', () => {
  it('activates subscription on first payment (pending → paid)', async () => {
    const prisma = stubPrisma();
    const svc = new BillingService(prisma as never, { } as never, new AuditService(prisma as never), {} as never);
    await svc.handlePaidEvent({ invoiceId: 'pakasir_1', paidAt: new Date('2026-01-01T00:00:00Z') });
    expect(prisma.invoice.update).toHaveBeenCalled();
    expect(prisma.subscription.create).toHaveBeenCalled();
  });

  it('is a no-op on a replay for an already-paid invoice', async () => {
    const prisma = stubPrisma();
    const invoiceState = await prisma.invoice.findFirst();
    invoiceState.status = 'paid';
    prisma.invoice.findFirst = vi.fn().mockResolvedValue(invoiceState);
    const svc = new BillingService(prisma as never, {} as never, new AuditService(prisma as never), {} as never);
    await svc.handlePaidEvent({ invoiceId: 'pakasir_1', paidAt: new Date() });
    expect(prisma.subscription.create).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});
