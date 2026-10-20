# Environment Variables Reference

Copy the sample below into `.env` at repo root. **Do not commit real values.**
The Zod loader in `packages/config/src/env.ts` is the source of truth — if a
variable is missing or malformed the app refuses to start.

> `.env.example` is intentionally not committed here; use this doc as the
> canonical template. Generate secrets with `openssl rand -base64 32`.

```dotenv
# ============================================================================
# EakPromosi — env template
# ============================================================================

NODE_ENV=development
LOG_LEVEL=debug
PRETTY_LOG=true
TZ=Asia/Jakarta

# ---- API --------------------------------------------------------------------
API_PORT=4000
API_HOST=0.0.0.0
PUBLIC_WEB_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
SESSION_COOKIE_NAME=eak_session
SESSION_SECRET=change-me-at-least-32-bytes-of-random-ascii-base64
CSRF_SECRET=change-me-at-least-32-bytes-of-random-ascii-base64
TRUST_PROXY=false

# ---- Database ---------------------------------------------------------------
DATABASE_URL=postgresql://eak:eak@localhost:5432/eakpromosi?schema=public

# ---- Redis / BullMQ ---------------------------------------------------------
REDIS_URL=redis://localhost:6379

# ---- Encryption (AES-256-GCM for MTProto sessions) --------------------------
# 32-byte key, base64-encoded. Generate with: openssl rand -base64 32
SESSION_ENCRYPTION_KEY=
SESSION_ENCRYPTION_KEY_VERSION=1

# ---- Telegram MTProto (GramJS userbot) --------------------------------------
# Obtain at https://my.telegram.org
TELEGRAM_API_ID=0
TELEGRAM_API_HASH=

# ---- Telegram Bot API (Telegraf) -------------------------------------------
TELEGRAM_BOT_TOKEN=

# ---- Pakasir ----------------------------------------------------------------
PAKASIR_BASE_URL=https://api.pakasir.com
PAKASIR_API_KEY=
PAKASIR_PROJECT=
PAKASIR_WEBHOOK_SECRET=

# ---- Admin bootstrap (optional) --------------------------------------------
# Used by packages/db/seed to create the first platform admin.
ADMIN_BOOTSTRAP_EMAIL=
ADMIN_BOOTSTRAP_PASSWORD=
```

## Groups & required scopes

| Variable                           | Service   | Required | Notes                                            |
| ---------------------------------- | --------- | -------- | ------------------------------------------------ |
| `NODE_ENV`                         | all       | yes      | `development` / `production` / `test`            |
| `LOG_LEVEL`                        | all       | yes      | `trace` → `fatal`                                |
| `DATABASE_URL`                     | api, worker | yes    | Postgres                                         |
| `REDIS_URL`                        | api, worker | yes    | Redis / BullMQ                                   |
| `SESSION_SECRET`                   | api       | yes      | ≥ 32 chars                                       |
| `CSRF_SECRET`                      | api       | yes      | ≥ 32 chars                                       |
| `SESSION_ENCRYPTION_KEY`           | api, worker | yes    | base64 of 32 random bytes                        |
| `SESSION_ENCRYPTION_KEY_VERSION`   | api, worker | yes    | integer; bump on rotation                        |
| `TELEGRAM_API_ID` / `_HASH`        | worker    | yes      | per-platform credential for MTProto              |
| `PAKASIR_*`                        | api, worker | yes    | integration & webhook signing                    |
| `CORS_ORIGINS`                     | api       | yes      | comma-separated whitelist                        |
