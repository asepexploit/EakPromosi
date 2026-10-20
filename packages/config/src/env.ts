import { z } from 'zod';

const bool = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  PRETTY_LOG: bool.default(false),
  TZ: z.string().default('UTC'),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  PUBLIC_WEB_ORIGIN: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default('eak_session'),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  TRUST_PROXY: bool.default(false),

  DATABASE_URL: z.string().url().startsWith('postgres'),

  REDIS_URL: z.string().url().startsWith('redis'),

  SESSION_ENCRYPTION_KEY: z.string().refine(
    (v) => {
      try {
        return Buffer.from(v, 'base64').length === 32;
      } catch {
        return false;
      }
    },
    { message: 'SESSION_ENCRYPTION_KEY must be base64 of 32 bytes' },
  ),
  SESSION_ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),

  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  PAKASIR_BASE_URL: z.string().url(),
  PAKASIR_API_KEY: z.string().min(1),
  PAKASIR_PROJECT: z.string().min(1),
  PAKASIR_WEBHOOK_SECRET: z.string().min(16),

  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(10).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/**
 * Loads and validates process.env once. Throws on first access if invalid —
 * the service refuses to boot rather than running with partial config.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    // eslint-disable-next-line no-console
    console.error(`[config] Invalid environment:\n${details}`);
    throw new Error('Environment validation failed');
  }
  cached = parsed.data;
  return cached;
}

/** Test helper — reset the cached env (never call in app code). */
export function __resetEnvForTests(): void {
  cached = null;
}

/** Returns the parsed CORS_ORIGINS whitelist. */
export function corsOrigins(env: Env): string[] {
  return env.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
