/* eslint-disable no-console */
import { createHash, randomBytes } from 'node:crypto';

import { PrismaClient, BillingPeriod, TenantStatus, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Argon2 lives in apps/api; for seed we use a deterministic placeholder hash
// prefixed so prod can't accidentally log in with it.
function placeholderPasswordHash(email: string): string {
  return `seed:${createHash('sha256').update(email).digest('hex')}`;
}

async function seedPlans() {
  const plans = [
    {
      code: 'free',
      name: 'Free',
      priceIdr: 0,
      period: BillingPeriod.monthly,
      maxTelegramAccounts: 1,
      maxConcurrentCampaigns: 1,
      maxBroadcastsPerDay: 20,
      maxDiscoverySources: 1,
      autoDiscoveryEnabled: true,
      autoJoinEnabled: true,
      autoBroadcastEnabled: true,
      autoDmEnabled: false,
      isPublic: true,
      sortOrder: 10,
    },
    {
      code: 'pro',
      name: 'Pro',
      priceIdr: 149_000,
      period: BillingPeriod.monthly,
      maxTelegramAccounts: 5,
      maxConcurrentCampaigns: 10,
      maxBroadcastsPerDay: 500,
      maxDiscoverySources: 10,
      autoDiscoveryEnabled: true,
      autoJoinEnabled: true,
      autoBroadcastEnabled: true,
      autoDmEnabled: true,
      isPublic: true,
      sortOrder: 20,
    },
    {
      code: 'business',
      name: 'Business',
      priceIdr: 499_000,
      period: BillingPeriod.monthly,
      maxTelegramAccounts: 20,
      maxConcurrentCampaigns: 50,
      maxBroadcastsPerDay: 5000,
      maxDiscoverySources: 50,
      autoDiscoveryEnabled: true,
      autoJoinEnabled: true,
      autoBroadcastEnabled: true,
      autoDmEnabled: true,
      isPublic: true,
      sortOrder: 30,
    },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({ where: { code: p.code }, update: p, create: p });
  }
  console.log('[seed] plans upserted');
}

async function seedAdminBootstrap() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log('[seed] ADMIN_BOOTSTRAP_EMAIL / _PASSWORD not set — skipping admin bootstrap');
    return;
  }
  await prisma.user.upsert({
    where: { email },
    update: { isPlatformAdmin: true },
    create: {
      email,
      displayName: 'Platform Admin',
      passwordHash: placeholderPasswordHash(email),
      isPlatformAdmin: true,
    },
  });
  console.log('[seed] admin user ensured — reset password through app before using');
}

async function seedDemoTenant() {
  if (process.env.SEED_DEMO !== '1') return;
  const freePlan = await prisma.plan.findUnique({ where: { code: 'free' } });
  if (!freePlan) throw new Error('free plan missing');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: { planId: freePlan.id, status: TenantStatus.active },
    create: { name: 'Demo Tenant', slug: 'demo', planId: freePlan.id, status: TenantStatus.active },
  });
  const now = new Date();
  const ends = new Date(now.getTime() + 30 * 86_400_000);
  await prisma.subscription.upsert({
    where: { id: `sub-${tenant.id}` },
    update: {},
    create: {
      id: `sub-${tenant.id}`,
      tenantId: tenant.id,
      planId: freePlan.id,
      status: SubscriptionStatus.active,
      startsAt: now,
      endsAt: ends,
    },
  });
  console.log('[seed] demo tenant ensured');
}

async function main() {
  await seedPlans();
  await seedAdminBootstrap();
  await seedDemoTenant();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });

// silence unused-import warning for ESLint when the file is parsed standalone
void randomBytes;
