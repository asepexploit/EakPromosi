import { PrismaClient } from '@prisma/client';

/**
 * Single shared PrismaClient per process. In dev with HMR we stash it on
 * globalThis so hot-reload doesn't open a new pool on every change.
 */
declare global {
  // eslint-disable-next-line no-var
  var __eakPrisma: PrismaClient | undefined;
}

export function createPrisma(opts: { logLevel?: 'query' | 'info' | 'warn' | 'error' } = {}): PrismaClient {
  if (globalThis.__eakPrisma) return globalThis.__eakPrisma;
  const client = new PrismaClient({
    log: opts.logLevel ? [opts.logLevel] : ['warn', 'error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__eakPrisma = client;
  }
  return client;
}

/** Shortcut when callers don't need to configure logging. */
export const prisma = createPrisma();
