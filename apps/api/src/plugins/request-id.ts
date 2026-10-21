import { randomUUID } from 'node:crypto';

import type { FastifyTypedInstance } from '../plugin-types.js';

/**
 * Attach a request id for every request. Prefers an inbound `x-request-id`
 * header when present so correlation survives upstream hops.
 *
 * Typed via `FastifyTypedInstance` (ZodTypeProvider-aware) because app.ts
 * builds its instance with `.withTypeProvider<ZodTypeProvider>()` and
 * Fastify v5 is strict about mixing TypeProviders under
 * `exactOptionalPropertyTypes: true`.
 */
export async function registerRequestId(app: FastifyTypedInstance): Promise<void> {
  app.addHook('onRequest', async (req, reply) => {
    const incoming = req.headers['x-request-id'];
    req.requestId = typeof incoming === 'string' && incoming.length <= 64 ? incoming : randomUUID();
    reply.header('x-request-id', req.requestId);
  });

  app.addHook('onResponse', async (req, reply) => {
    req.log.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        tenantId: req.tenant?.id,
        userId: req.user?.id,
      },
      'request',
    );
  });
}
