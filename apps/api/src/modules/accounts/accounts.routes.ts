import {
  AccountLoginStatusSchema,
  StartAccountLoginSchema,
  TelegramAccountSchema,
  UpdateAccountCapabilitiesSchema,
  VerifyAccountCodeSchema,
  envelope,
} from '@eak/shared';
import { z } from 'zod';

import { AccountsService } from './accounts.service.js';
import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';
import type { ApiPlugin } from '../../plugin-types.js';

export const registerAccountsModule: ApiPlugin = async (app) => {
  const audit = new AuditService(app.prisma);
  const plans = new PlanService(app.prisma);
  const service = new AccountsService(app.prisma, app.queues, audit, plans, app.encryptionKeys, app.redis);

  app.get(
    '/',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(TelegramAccountSchema)) } } },
    async (req) => ok(await service.list(req.tenant!.id)),
  );

  app.post(
    '/login/start',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      // Starting an MTProto login triggers an SMS / Telegram-code hit for the
      // target phone number — a loose limit here means an abuser could spam
      // codes to arbitrary phones even behind our RBAC. Pair IP with user id.
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 minutes',
          keyGenerator: (req) => `${req.ip}|${(req as unknown as { user?: { id: string } }).user?.id ?? 'anon'}`,
        },
      },
      schema: { body: StartAccountLoginSchema, response: { 200: envelope(z.object({ loginId: z.string() })) } },
    },
    async (req) => ok(await service.startLogin(req.tenant!.id, req.user!.id, req.body)),
  );

  app.post(
    '/login/verify',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '10 minutes',
          keyGenerator: (req) => `${req.ip}|${(req as unknown as { user?: { id: string } }).user?.id ?? 'anon'}`,
        },
      },
      schema: { body: VerifyAccountCodeSchema, response: { 200: envelope(z.object({ status: z.string() })) } },
    },
    async (req) => ok(await service.verifyCode(req.tenant!.id, req.user!.id, req.body)),
  );

  // Lightweight poll endpoint the SPA uses between POSTs to drive the add-
  // account wizard. Reads from Redis (set by the worker) so we don't block
  // on a DB round-trip while the user is actively waiting.
  app.get(
    '/login/:loginId/status',
    {
      preHandler: app.requireTenant,
      schema: {
        params: z.object({ loginId: z.string().min(1) }),
        response: { 200: envelope(AccountLoginStatusSchema) },
      },
    },
    async (req) => ok(await service.getLoginStatus(req.params.loginId)),
  );

  // Idempotent cancel for an in-flight login attempt. Clears Redis state so
  // the worker's waitCode poll bails with "canceled by newer attempt" and the
  // SPA's status poll gets a clean `failed` + AUTH_USER_CANCEL.
  app.post(
    '/login/:loginId/cancel',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { params: z.object({ loginId: z.string().min(1) }) },
    },
    async (req, reply) => {
      await service.cancelLogin(req.tenant!.id, req.user!.id, req.params.loginId);
      void reply.status(204).send();
    },
  );

  app.patch(
    '/:id/capabilities',
    {
      preHandler: app.requireRole(['owner', 'admin']),
      schema: {
        params: z.object({ id: z.string() }),
        body: UpdateAccountCapabilitiesSchema,
      },
    },
    async (req, reply) => {
      const row = await app.prisma.telegramAccount.findFirst({
        where: { id: req.params.id, tenantId: req.tenant!.id },
      });
      if (!row) throw app.httpErrors.notFound();
      await app.prisma.telegramAccount.update({
        where: { id: row.id },
        data: { capabilities: req.body.capabilities as never[] },
      });
      void reply.status(204).send();
    },
  );

  app.post(
    '/:id/disconnect',
    {
      preHandler: app.requireRole(['owner', 'admin']),
      schema: { params: z.object({ id: z.string() }) },
    },
    async (req, reply) => {
      await service.disconnect(req.tenant!.id, req.user!.id, req.params.id);
      void reply.status(204).send();
    },
  );

  app.delete(
    '/:id',
    { preHandler: app.requireRole(['owner']), schema: { params: z.object({ id: z.string() }) } },
    async (req, reply) => {
      await service.delete(req.tenant!.id, req.user!.id, req.params.id);
      void reply.status(204).send();
    },
  );
};
