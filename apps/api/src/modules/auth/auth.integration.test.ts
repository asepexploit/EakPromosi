
import { prisma } from '@eak/db';
import { BillingPeriod } from '@eak/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../test/build-app.js';
import { resetDatabase } from '../../test/db-reset.js';

/**
 * Integration test gated by RUN_INTEGRATION=1 — needs a real Postgres and
 * Redis (CI provides both via docker services). Verifies the full register
 * → me → change-password → logout flow end-to-end.
 */
const SHOULD_RUN = process.env.RUN_INTEGRATION === '1';
const d = SHOULD_RUN ? describe : describe.skip;

d('auth integration', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    await resetDatabase(prisma);
    await prisma.plan.upsert({
      where: { code: 'free' },
      update: {},
      create: {
        code: 'free',
        name: 'Free',
        priceIdr: 0,
        period: BillingPeriod.monthly,
        maxTelegramAccounts: 1,
        maxConcurrentCampaigns: 1,
        maxBroadcastsPerDay: 20,
        maxDiscoverySources: 1,
      },
    });
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenantMember.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  it('registers → me → change-password → login with new password', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'alice@example.test',
        password: 'original-password-10+',
        displayName: 'Alice',
        tenantName: 'Alice Co',
      },
    });
    expect(reg.statusCode).toBe(200);
    const regBody = reg.json() as { data: { user: { email: string }; csrfToken: string } };
    expect(regBody.data.user.email).toBe('alice@example.test');
    const cookie = reg.cookies.find((c) => c.name === 'eak_session')?.value;
    expect(cookie).toBeDefined();

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { eak_session: cookie! },
    });
    expect(me.statusCode).toBe(200);

    const change = await app.inject({
      method: 'POST',
      url: '/auth/change-password',
      cookies: { eak_session: cookie! },
      headers: { 'x-csrf-token': regBody.data.csrfToken },
      payload: {
        currentPassword: 'original-password-10+',
        newPassword: 'new-password-value-10+',
        confirmPassword: 'new-password-value-10+',
      },
    });
    expect(change.statusCode).toBe(204);

    const relogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.test', password: 'new-password-value-10+' },
    });
    expect(relogin.statusCode).toBe(200);

    const reloginOld = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'alice@example.test', password: 'original-password-10+' },
    });
    expect(reloginOld.statusCode).toBe(401);
  });

  it('refuses a duplicate email', async () => {
    await prisma.user.create({
      data: { email: 'bob@example.test', passwordHash: 'x', displayName: 'Bob' },
    });
    const dup = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'bob@example.test',
        password: 'password-ten-plus',
        displayName: 'Bob 2',
        tenantName: 'Bob Co',
      },
    });
    expect(dup.statusCode).toBe(409);
    expect((dup.json() as { error: { code: string } }).error.code).toBe('CONFLICT');
  });
});
