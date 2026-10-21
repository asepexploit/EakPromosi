import type { Logger } from '@eak/config';
import type {
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { FastifyPluginAsyncZod, ZodTypeProvider } from 'fastify-type-provider-zod';

/**
 * Alias every route module uses so `req.body` / `req.query` / `req.params`
 * are inferred from the Zod schemas on `schema: { body, querystring, params }`.
 */
export type ApiPlugin = FastifyPluginAsyncZod;

/**
 * The exact instance shape returned by `Fastify({loggerInstance: pino, ...}).withTypeProvider<ZodTypeProvider>()`.
 * Plugins decorate THIS so Fastify v5 under `exactOptionalPropertyTypes:true`
 * doesn't collide with the default TypeProvider or default logger on reassignment.
 */
export type FastifyTypedInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  ZodTypeProvider
>;
