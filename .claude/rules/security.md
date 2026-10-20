# Rule — Security

## Secrets

* Semua secret via env, divalidasi `packages/config/env.ts` (Zod).
* `.env` TIDAK pernah di-commit. `.env.example` wajib dijaga sinkron.
* Session string MTProto dienkripsi AES-256-GCM dengan kunci dari `SESSION_ENCRYPTION_KEY` (32 bytes, base64). Rotasi kunci dirancang sejak awal (field `keyVersion`).

## Auth & RBAC

* Auth user SaaS: email + password (argon2id) + optional TOTP.
* Session via httpOnly cookie + CSRF token untuk mutation.
* Role: `owner`, `admin`, `operator`, `viewer`. Permission matrix di `docs/rbac.md`.
* Setiap route API wajib menyatakan permission minimum via decorator Fastify.

## Tenant isolation

* Setiap row di tabel bisnis punya `tenant_id NOT NULL`.
* Repository layer menolak query tanpa `tenantId`.
* Review: tiap PR yang menambah tabel wajib mencantumkan strategi scoping.

## Input validation

* Semua payload HTTP divalidasi Zod sebelum masuk service.
* Webhook Pakasir memverifikasi HMAC signature + replay-protection (nonce + timestamp window 5 menit).
* File upload: whitelist MIME, limit size, scan nama.

## Logging

* Jangan log: password, session string, token, nomor telepon lengkap (mask), isi pesan DM pengguna (hanya metadata).
* Correlation id (`x-request-id`) di tiap log line.

## Jaringan

* CORS whitelist domain web resmi.
* Rate-limit per IP + per user untuk endpoint sensitif (login, send-code).
* HTTPS wajib di production; HSTS; secure cookies.
