import { ChangePasswordSchema, LoginSchema, RegisterSchema, SessionBundleSchema, SwitchTenantSchema, envelope } from '@eak/shared';
import { AppError } from '@eak/config';
import * as argon2 from 'argon2';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { ok } from '../../lib/response.js';
import { hashSessionToken } from '../../plugins/auth-context.js';

import { AuthService } from './auth.service.js';

import type { ApiPlugin } from '../../plugin-types.js';

export const registerAuthModule: ApiPlugin = async (app) => {
  const auth = new AuthService(app.prisma, new AuditService(app.prisma));

  const sessionCookieOptions = {
    httpOnly: true as const,
    secure: app.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    signed: false,
  };

  app.post(
    '/register',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: RegisterSchema, response: { 200: envelope(SessionBundleSchema) } },
    },
    async (req, reply) => {
      const ctx = {
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
      };
      const { userId, tenantId, rawToken, expiresAt } = await auth.register(req.body, ctx);
      void reply.setCookie(app.env.SESSION_COOKIE_NAME, rawToken, { ...sessionCookieOptions, expires: expiresAt });
      const bundle = await auth.buildSessionBundle(userId, tenantId);
      bundle.csrfToken = app.issueCsrfToken(hashSessionToken(rawToken));
      return ok(bundle);
    },
  );

  app.post(
    '/login',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: { body: LoginSchema, response: { 200: envelope(SessionBundleSchema) } },
    },
    async (req, reply) => {
      const ctx = {
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
      };
      const { userId, rawToken, expiresAt } = await auth.login(req.body, ctx);
      void reply.setCookie(app.env.SESSION_COOKIE_NAME, rawToken, { ...sessionCookieOptions, expires: expiresAt });
      const bundle = await auth.buildSessionBundle(userId, null);
      bundle.csrfToken = app.issueCsrfToken(hashSessionToken(rawToken));
      return ok(bundle);
    },
  );

  app.post(
    '/logout',
    { preHandler: app.requireAuth, schema: { response: { 204: z.object({}).optional() } } },
    async (req, reply) => {
      const raw = req.cookies[app.env.SESSION_COOKIE_NAME];
      if (raw) await auth.logout(raw);
      void reply.clearCookie(app.env.SESSION_COOKIE_NAME, sessionCookieOptions);
      void reply.status(204).send();
    },
  );

  app.get(
    '/me',
    { preHandler: app.requireAuth, schema: { response: { 200: envelope(SessionBundleSchema) } } },
    async (req) => {
      const bundle = await auth.buildSessionBundle(req.user!.id, req.tenant?.id ?? null);
      const raw = req.cookies[app.env.SESSION_COOKIE_NAME];
      bundle.csrfToken = raw ? app.issueCsrfToken(hashSessionToken(raw)) : '';
      return ok(bundle);
    },
  );

  app.post(
    '/change-password',
    {
      preHandler: app.requireAuth,
      schema: { body: ChangePasswordSchema, response: { 204: z.object({}).optional() } },
    },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) throw new AppError('UNAUTHORIZED', 'Session invalid');
      const ok = await argon2.verify(user.passwordHash, req.body.currentPassword).catch(() => false);
      if (!ok) throw new AppError('UNAUTHORIZED', 'Password saat ini salah');
      const nextHash = await argon2.hash(req.body.newPassword, { type: argon2.argon2id });
      await app.prisma.user.update({ where: { id: user.id }, data: { passwordHash: nextHash } });
      // Revoke every other session so a stolen cookie can't survive the rotation.
      const currentRaw = req.cookies[app.env.SESSION_COOKIE_NAME];
      const currentHash = currentRaw ? hashSessionToken(currentRaw) : null;
      await app.prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null, ...(currentHash ? { NOT: { tokenHash: currentHash } } : {}) },
        data: { revokedAt: new Date() },
      });
      await new AuditService(app.prisma).log({
        actorUserId: user.id,
        action: 'auth.password_changed',
        resource: 'user',
        resourceId: user.id,
        severity: 'warn',
      });
      void reply.status(204).send();
    },
  );

  app.post(
    '/switch-tenant',
    {
      preHandler: app.requireAuth,
      schema: { body: SwitchTenantSchema, response: { 200: envelope(SessionBundleSchema) } },
    },
    async (req) => {
      const membership = await app.prisma.tenantMember.findFirst({
        where: { userId: req.user!.id, tenantId: req.body.tenantId },
      });
      if (!membership) {
        throw app.httpErrors.forbidden('Bukan anggota tenant tersebut');
      }
      const bundle = await auth.buildSessionBundle(req.user!.id, req.body.tenantId);
      const raw = req.cookies[app.env.SESSION_COOKIE_NAME];
      bundle.csrfToken = raw ? app.issueCsrfToken(hashSessionToken(raw)) : '';
      return ok(bundle);
    },
  );
};
