import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

/**
 * Attach a request id for every request. Prefers an inbound `x-request-id`
 * header when present so correlation survives upstream hops.
 *
 * Typed as `FastifyInstance<any>` so it composes with the ZodTypeProvider
 * instance in app.ts without re-declaring every generic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerRequestId(app: FastifyInstance<any, any, any, any, any>): Promise<void> {
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
