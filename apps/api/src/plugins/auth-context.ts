import { createHash } from 'node:crypto';

import { AppError } from '@eak/config';
import type { FastifyInstance } from 'fastify';

/**
 * Reads session cookie, validates against `user_sessions`, hydrates
 * `req.user` and `req.tenant`. Routes opt in via `requireAuth`/`requireRole`
 * decorators rather than running auth globally.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerAuthContext(app: FastifyInstance<any, any, any, any, any>): Promise<void> {
  app.decorate('requireAuth', async function (req: Parameters<typeof hydrate>[1]) {
    await hydrate(app, req);
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Autentikasi diperlukan');
  });

  app.decorate('requireTenant', async function (req: Parameters<typeof hydrate>[1]) {
    await hydrate(app, req);
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Autentikasi diperlukan');
    if (!req.tenant) throw new AppError('FORBIDDEN', 'Tenant belum dipilih');
  });

  app.decorate('requireRole', function (roles: readonly ('owner' | 'admin' | 'operator' | 'viewer')[]) {
    return async (req: Parameters<typeof hydrate>[1]) => {
      await hydrate(app, req);
      if (!req.user) throw new AppError('UNAUTHORIZED', 'Autentikasi diperlukan');
      if (!req.tenant) throw new AppError('FORBIDDEN', 'Tenant belum dipilih');
      if (!roles.includes(req.tenant.role)) {
        throw new AppError('FORBIDDEN', 'Role tidak diizinkan', { context: { required: roles, actual: req.tenant.role } });
      }
    };
  });

  app.decorate('requirePlatformAdmin', async function (req: Parameters<typeof hydrate>[1]) {
    await hydrate(app, req);
    if (!req.user?.isPlatformAdmin) throw new AppError('FORBIDDEN', 'Platform admin only');
  });
}

export function hashSessionToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

async function hydrate(
  app: FastifyInstance,
  req: {
    cookies: Record<string, string | undefined>;
    headers: Record<string, string | string[] | undefined>;
    user?: { id: string; email: string; isPlatformAdmin: boolean };
    tenant?: { id: string; role: 'owner' | 'admin' | 'operator' | 'viewer' };
  },
): Promise<void> {
  if (req.user) return;
  const cookieName = app.env.SESSION_COOKIE_NAME;
  const raw = req.cookies[cookieName];
  if (!raw) return;
  const tokenHash = hashSessionToken(raw);
  const sess = await app.prisma.userSession.findUnique({
    where: { tokenHash },
    include: { user: { include: { memberships: true } } },
  });
  if (!sess || sess.revokedAt || sess.expiresAt < new Date()) return;
  req.user = {
    id: sess.user.id,
    email: sess.user.email,
    isPlatformAdmin: sess.user.isPlatformAdmin,
  };
  const headerTenant = pickHeader(req.headers['x-tenant-id']);
  const memberships = sess.user.memberships;
  const chosen = headerTenant ? memberships.find((m) => m.tenantId === headerTenant) : memberships[0];
  if (chosen) {
    req.tenant = { id: chosen.tenantId, role: chosen.role };
  }
  // Touch last-seen (best-effort, don't block)
  void app.prisma.userSession
    .update({ where: { id: sess.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);
}

function pickHeader(h: string | string[] | undefined): string | undefined {
  if (!h) return undefined;
  return Array.isArray(h) ? h[0] : h;
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: import('fastify').FastifyRequest) => Promise<void>;
    requireTenant: (req: import('fastify').FastifyRequest) => Promise<void>;
    requireRole: (
      roles: readonly ('owner' | 'admin' | 'operator' | 'viewer')[],
    ) => (req: import('fastify').FastifyRequest) => Promise<void>;
    requirePlatformAdmin: (req: import('fastify').FastifyRequest) => Promise<void>;
  }
}
