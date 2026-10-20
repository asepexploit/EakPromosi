import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/**
 * Alias every route module uses so `req.body` / `req.query` / `req.params`
 * are inferred from the Zod schemas on `schema: { body, querystring, params }`.
 */
export type ApiPlugin = FastifyPluginAsyncZod;
