import { defineConfig } from 'vitest/config';

/**
 * Integration test files hit a shared Postgres + Redis. Vitest's default
 * `fileParallelism: true` runs them concurrently in isolated workers which
 * then race on the DB (one file's `resetDatabase` truncates another's seed).
 *
 * We serialize fully when `RUN_INTEGRATION=1`, which is a tiny performance
 * tradeoff but eliminates the entire category of flakes those tests ship with.
 * Unit tests still enjoy the default parallelism.
 */
const isIntegration = process.env.RUN_INTEGRATION === '1';

export default defineConfig({
  test: {
    fileParallelism: !isIntegration,
    pool: isIntegration ? 'forks' : 'threads',
    poolOptions: isIntegration
      ? { forks: { singleFork: true } }
      : {},
  },
});
