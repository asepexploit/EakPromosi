import { LoginSchema, RegisterSchema, SessionBundleSchema, SwitchTenantSchema, envelope } from '@eak/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { ok } from '../../lib/response.js';
import { hashSessionToken } from '../../plugins/auth-context.js';

import { AuthService } from './auth.service.js';

export async function registerAuthModule(app: FastifyInstance): Promise<void> {
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
}
