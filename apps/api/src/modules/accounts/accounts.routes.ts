import {
  StartAccountLoginSchema,
  TelegramAccountSchema,
  UpdateAccountCapabilitiesSchema,
  VerifyAccountCodeSchema,
  envelope,
} from '@eak/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';
import { ok } from '../../lib/response.js';

import { AccountsService } from './accounts.service.js';

export async function registerAccountsModule(app: FastifyInstance): Promise<void> {
  const audit = new AuditService(app.prisma);
  const plans = new PlanService(app.prisma);
  const service = new AccountsService(app.prisma, app.queues, audit, plans, app.encryptionKeys);

  app.get(
    '/',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(z.array(TelegramAccountSchema)) } } },
    async (req) => ok(await service.list(req.tenant!.id)),
  );

  app.post(
    '/login/start',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: StartAccountLoginSchema, response: { 200: envelope(z.object({ loginId: z.string() })) } },
    },
    async (req) => ok(await service.startLogin(req.tenant!.id, req.user!.id, req.body)),
  );

  app.post(
    '/login/verify',
    {
      preHandler: app.requireRole(['owner', 'admin', 'operator']),
      schema: { body: VerifyAccountCodeSchema, response: { 200: envelope(z.object({ status: z.string() })) } },
    },
    async (req) => ok(await service.verifyCode(req.tenant!.id, req.user!.id, req.body)),
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
}
