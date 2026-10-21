import { pino, type Logger as PinoLogger } from 'pino';

import type { Env } from './env.js';

export type Logger = PinoLogger<string, boolean>;

/**
 * Pino root logger. JSON in production, pretty in dev when PRETTY_LOG=true.
 * Redacts fields that MUST never land in logs (see .claude/rules/security.md).
 */
export function createLogger(env: Env, bindings: Record<string, unknown> = {}): Logger {
  const base: Record<string, unknown> = { service: bindings.service ?? 'unknown', ...bindings };
  const options: Parameters<typeof pino>[0] = {
    level: env.LOG_LEVEL,
    base,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        '*.password',
        'newPassword',
        '*.newPassword',
        'currentPassword',
        '*.currentPassword',
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-csrf-token"]',
        'req.headers["x-pakasir-signature"]',
        'headers.authorization',
        'headers.cookie',
        'headers["x-csrf-token"]',
        'headers["x-pakasir-signature"]',
        'session',
        '*.session',
        'sessionString',
        '*.sessionString',
        'sessionCipher',
        '*.sessionCipher',
        'twoFaCipher',
        '*.twoFaCipher',
        'phone',
        '*.phone',
        'phoneNumber',
        '*.phoneNumber',
        'phoneCode',
        '*.phoneCode',
        'twoFactorPassword',
        '*.twoFactorPassword',
        'twoFaPassword',
        '*.twoFaPassword',
        'webhookPayload.raw',
        'rawBody',
        '*.rawBody',
        'signature',
        '*.signature',
        'PAKASIR_WEBHOOK_SECRET',
        'PAKASIR_API_KEY',
        'SESSION_SECRET',
        'CSRF_SECRET',
        'SESSION_ENCRYPTION_KEY',
        'TELEGRAM_API_HASH',
      ],
      censor: '[REDACTED]',
    },
  };
  if (env.PRETTY_LOG && env.NODE_ENV !== 'production') {
    (options as { transport?: unknown }).transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
    };
  }
  return pino(options) as unknown as Logger;
}
