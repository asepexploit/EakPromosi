import { randomBytes } from 'node:crypto';

import { AppError } from '@eak/config';
import { type PrismaClient, TenantRole, TenantStatus, SubscriptionStatus } from '@eak/db';
import type { Register, Login, SessionBundle } from '@eak/shared';
import * as argon2 from 'argon2';

import { AuditService } from '../../lib/audit-service.js';
import { hashSessionToken } from '../../plugins/auth-context.js';

/**
 * Owns registration, login, logout, session issuance. Password hashes use
 * argon2id with reasonable defaults; CSRF token is minted during login and
 * returned alongside the session cookie so the SPA can set the header.
 */
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
    private readonly sessionTtlDays = 7,
  ) {}

  async register(input: Register, ctx: { ipAddress: string | null; userAgent: string | null }): Promise<{
    userId: string;
    tenantId: string;
    rawToken: string;
    expiresAt: Date;
  }> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new AppError('CONFLICT', 'Email sudah terdaftar');
    const freePlan = await this.prisma.plan.findUnique({ where: { code: 'free' } });
    if (!freePlan) throw new AppError('INTERNAL', 'free plan missing — run seed');

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const slug = this.slugify(input.tenantName);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          displayName: input.displayName,
        },
      });
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug: await this.uniqueSlug(tx, slug),
          planId: freePlan.id,
          status: TenantStatus.active,
        },
      });
      await tx.tenantMember.create({
        data: { tenantId: tenant.id, userId: user.id, role: TenantRole.owner },
      });
      const now = new Date();
      const ends = new Date(now.getTime() + 30 * 86_400_000);
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          status: SubscriptionStatus.active,
          startsAt: now,
          endsAt: ends,
        },
      });
      return { userId: user.id, tenantId: tenant.id };
    });

    const sess = await this.issueSession(result.userId, ctx);
    await this.audit.log({
      tenantId: result.tenantId,
      actorUserId: result.userId,
      action: 'auth.register',
      resource: 'user',
      resourceId: result.userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { ...result, ...sess };
  }

  async login(input: Login, ctx: { ipAddress: string | null; userAgent: string | null }): Promise<{
    userId: string;
    rawToken: string;
    expiresAt: Date;
  }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummy'; // avoid user-enumeration timing
    const hash = user?.passwordHash ?? dummyHash;
    const match = await argon2.verify(hash, input.password).catch(() => false);
    if (!user || !match) throw new AppError('UNAUTHORIZED', 'Email atau password salah');

    const sess = await this.issueSession(user.id, ctx);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({
      actorUserId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { userId: user.id, ...sess };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashSessionToken(rawToken);
    await this.prisma.userSession
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  async buildSessionBundle(userId: string, activeTenantId: string | null): Promise<SessionBundle> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { tenant: { include: { plan: true } } } },
      },
    });
    if (!user) throw new AppError('UNAUTHORIZED', 'Session invalid');
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isPlatformAdmin: user.isPlatformAdmin,
        timezone: user.timezone,
        locale: user.locale,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      tenants: user.memberships.map((m) => ({
        id: m.tenant.id,
        slug: m.tenant.slug,
        name: m.tenant.name,
        role: m.role,
        status: m.tenant.status,
        planCode: m.tenant.plan?.code ?? 'free',
      })),
      activeTenantId: activeTenantId ?? user.memberships[0]?.tenantId ?? null,
      csrfToken: '', // filled by caller after cookies are set
    };
  }

  private async issueSession(
    userId: string,
    ctx: { ipAddress: string | null; userAgent: string | null },
  ): Promise<{ rawToken: string; expiresAt: Date }> {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + this.sessionTtlDays * 86_400_000);
    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt,
      },
    });
    return { rawToken, expiresAt };
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  private async uniqueSlug(tx: PrismaClient | Prisma.TransactionClient, base: string): Promise<string> {
    const prefix = base || 'tenant';
    let candidate = prefix;
    for (let i = 2; i < 50; i += 1) {
      const taken = await tx.tenant.findUnique({ where: { slug: candidate } });
      if (!taken) return candidate;
      candidate = `${prefix}-${i}`;
    }
    return `${prefix}-${randomBytes(3).toString('hex')}`;
  }
}

// re-export the transaction type so the private helper above compiles
import type { Prisma } from '@eak/db';
