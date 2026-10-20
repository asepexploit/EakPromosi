import { pino, type Logger as PinoLogger } from 'pino';

import type { Env } from './env.js';

export type Logger = PinoLogger;

/**
 * Pino root logger. JSON in production, pretty in dev when PRETTY_LOG=true.
 * Redacts fields that MUST never land in logs (see .claude/rules/security.md).
 */
export function createLogger(env: Env, bindings: Record<string, unknown> = {}): Logger {
  const base: Record<string, unknown> = { service: bindings.service ?? 'unknown', ...bindings };
  return pino({
    level: env.LOG_LEVEL,
    base,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        '*.password',
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        'session',
        '*.session',
        'sessionString',
        '*.sessionString',
        'phone',
        '*.phone',
        'twoFactorPassword',
        'webhookPayload.raw',
      ],
      censor: '[REDACTED]',
    },
    transport:
      env.PRETTY_LOG && env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
          }
        : undefined,
  });
}
