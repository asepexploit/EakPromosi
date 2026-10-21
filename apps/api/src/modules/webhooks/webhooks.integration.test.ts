import { createHmac } from 'node:crypto';


import { prisma } from '@eak/db';
import { BillingPeriod, InvoiceStatus } from '@eak/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../test/build-app.js';
import { resetDatabase } from '../../test/db-reset.js';

const SHOULD_RUN = process.env.RUN_INTEGRATION === '1';
const d = SHOULD_RUN ? describe : describe.skip;

d('pakasir webhook integration', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    await resetDatabase(prisma);
    await prisma.plan.upsert({
      where: { code: 'pro' },
      update: {},
      create: {
        code: 'pro',
        name: 'Pro',
        priceIdr: 149_000,
        period: BillingPeriod.monthly,
        maxTelegramAccounts: 5,
        maxConcurrentCampaigns: 10,
        maxBroadcastsPerDay: 500,
        maxDiscoverySources: 10,
      },
    });
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.webhookEvent.deleteMany({});
    await prisma.invoice.deleteMany({});
  });

  it('rejects a missing signature with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/pakasir',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a well-formed webhook and persists it idempotently', async () => {
    const plan = await prisma.plan.findUnique({ where: { code: 'pro' } });
    const tenant = await prisma.tenant.create({ data: { name: 'T1', slug: 't1-webhook', planId: plan!.id } });
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        planId: plan!.id,
        pakasirInvoiceId: 'pakasir_test_1',
        amountIdr: 149_000,
        period: BillingPeriod.monthly,
        status: InvoiceStatus.pending,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      type: 'invoice.paid',
      data: { invoice_id: invoice.pakasirInvoiceId, status: 'paid', paid_at: new Date().toISOString() },
    });
    const signature = createHmac('sha256', process.env.PAKASIR_WEBHOOK_SECRET!)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    const first = await app.inject({
      method: 'POST',
      url: '/webhooks/pakasir',
      headers: {
        'x-pakasir-signature': signature,
        'x-pakasir-timestamp': timestamp,
        'x-pakasir-event-id': 'evt_test_1',
        'content-type': 'application/json',
      },
      payload: body,
    });
    expect(first.statusCode).toBe(200);
    expect((first.json() as { replay: boolean }).replay).toBe(false);

    const stored = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: 'pakasir', eventId: 'evt_test_1' } },
    });
    expect(stored?.eventType).toBe('invoice.paid');

    const replay = await app.inject({
      method: 'POST',
      url: '/webhooks/pakasir',
      headers: {
        'x-pakasir-signature': signature,
        'x-pakasir-timestamp': timestamp,
        'x-pakasir-event-id': 'evt_test_1',
        'content-type': 'application/json',
      },
      payload: body,
    });
    expect(replay.statusCode).toBe(200);
    expect((replay.json() as { replay: boolean }).replay).toBe(true);
  });
});
