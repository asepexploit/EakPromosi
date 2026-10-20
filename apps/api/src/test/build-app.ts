import { createLogger, loadEnv } from '@eak/config';

import { buildApp } from '../app.js';

/**
 * Helper for integration tests. Loads env (which is set by vitest.setup.ts),
 * builds a Fastify instance against a real Postgres + Redis (provided by
 * CI service containers), and returns it ready to `inject()`.
 *
 * Callers MUST `await app.close()` so the Redis / BullMQ clients drain.
 */
export async function buildTestApp() {
  const env = loadEnv();
  const logger = createLogger({ ...env, LOG_LEVEL: 'warn' as const }, { service: 'api-test' });
  const app = await buildApp({ env, logger });
  await app.ready();
  return app;
}
