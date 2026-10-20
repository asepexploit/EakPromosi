import { AppError, isAppError } from '@eak/config';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

/**
 * Global error handler. Everything thrown or passed to `reply.send` of an
 * Error ends up here. Shape of the response body is locked by
 * `.claude/rules/api.md`: `{ error: { code, message, details? } }`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerErrorHandler(app: FastifyInstance<any, any, any, any, any>): Promise<void> {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      void reply.status(422).send({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Payload gagal validasi',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })),
        },
      });
      return;
    }

    if (isAppError(err)) {
      req.log.warn({ requestId: req.requestId, code: err.code, context: err.context }, err.message);
      void reply.status(err.httpStatus).send({
        error: { code: err.code, message: err.message, details: err.context },
      });
      return;
    }

    // Fastify validation (JSON schema) and native errors
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) {
      void reply.status(status).send({ error: { code: 'VALIDATION_FAILED', message: err.message } });
      return;
    }

    req.log.error({ requestId: req.requestId, err }, 'unhandled error');
    void reply.status(500).send({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });

  app.setNotFoundHandler((req, reply) => {
    void reply.status(404).send({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.url}` } });
  });

  app.addHook('onReady', async () => {
    // ensure AppError type reachable even without an explicit import in handlers
    void AppError;
  });
}
