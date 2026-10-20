import { Redis, type RedisOptions } from 'ioredis';

import type { Env } from './env.js';

export type RedisClient = Redis;

/**
 * Create an ioredis client wired to `REDIS_URL`. BullMQ requires
 * `maxRetriesPerRequest: null` and `enableReadyCheck: false` for its blocking
 * clients, so queue/worker factories pass `forBull: true`.
 */
export function createRedis(env: Env, opts: { forBull?: boolean; keyPrefix?: string } = {}): RedisClient {
  const options: RedisOptions = {
    lazyConnect: false,
    enableReadyCheck: !opts.forBull,
    maxRetriesPerRequest: opts.forBull ? null : 20,
  };
  if (opts.keyPrefix) options.keyPrefix = opts.keyPrefix;
  return new Redis(env.REDIS_URL, options);
}
