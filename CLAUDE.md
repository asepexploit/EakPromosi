# CLAUDE.md — Telegram Auto Promotion SaaS

Pedoman utama untuk Claude Code saat bekerja di repository ini. Setiap sesi WAJIB membaca file ini terlebih dahulu, lalu memuat rules modular dari `.claude/rules/` sesuai konteks tugas.

---

## 1. Ringkasan Produk

**Nama kerja:** EakPromosi — Telegram Auto Promotion SaaS.
**Target pengguna:** admin pemasaran, agency, dan reseller yang mempromosikan produk di ekosistem Telegram.

**Fitur & struktur menu lengkap:** lihat `.claude/product-spec.md` (sumber kebenaran produk).

**Ringkasan 15 modul:**

WORKSPACE — 01 Dashboard · 02 Telegram Accounts · 05 Group & Channel Inventory
AUTOMATION — 03 Auto Discovery · 04 Auto Join & Membership Sync · 06 Auto Broadcast · 07 Campaign Management · 08 Auto-DM & Auto Reply
MONITORING — 09 Live Monitoring · 10 Task Queue & Activity Logs · 11 Statistics & Reports
BILLING & ACCOUNT — 12 Subscription & Plans · 13 Payment History · 14 Settings & Support
ADMIN (panel terpisah) — 15 Admin Panel

**Model billing:** subscription-only (Free/Pro/Business). TIDAK ADA wallet / credit / top-up / pemotongan saldo per operasi. Pembayaran via **Pakasir**.

---

## 2. Prinsip Operasional untuk Claude

* **Jangan membuat implementasi fitur aplikasi** sampai pengguna meminta. Fase saat ini: hanya fondasi (dokumentasi + konfigurasi `.claude/` + blueprint folder).
* **Sumber kebenaran produk:** `.claude/product-spec.md`. Baca sebelum merancang modul apa pun.
* Baca `CLAUDE.md` → muat rule yang relevan dari `.claude/rules/` sebelum menulis kode.
* Patuhi **STANDAR WAJIB**: TypeScript strict, separation of concerns, SOLID, secure-by-default, validasi input, RBAC, isolasi data per-tenant, structured error handling, logging, idempotent jobs, retry aman, DB migrations, testing, env vars tanpa hardcoded secrets.
* Hormati batas Telegram: tidak membypass rate-limit, hormati flood-wait, lindungi sesi, hindari pola spam yang melanggar ToS Telegram.
* Pakai dedicated tools (Read/Edit/Grep/Glob) alih-alih Bash untuk operasi file.
* Komentar hanya untuk WHY yang non-obvious, bukan WHAT.

---

## 3. Tech Stack (wajib)

| Layer | Teknologi |
|---|---|
| Frontend | React 18, TypeScript strict, Vite, Tailwind CSS, Radix UI, React Flow, TanStack Query, Zustand |
| Backend API | Node.js 20, TypeScript strict, Fastify |
| Workers | Node.js 20, BullMQ (Redis), job runners untuk Telegram & broadcast |
| Database | PostgreSQL + Prisma |
| Cache / Queue | Redis |
| Telegram | GramJS (MTProto userbot), Telegraf (Bot API) |
| Payment | Pakasir |
| Observability | pino (JSON logs), OpenTelemetry (opsional fase 2) |
| Testing | Vitest (unit), Playwright (e2e web), supertest (API) |

---

## 4. Struktur Monorepo (ringkas — detail di `docs/architecture.md`)

```
apps/
  web/        # React 18 + Vite SPA
  api/        # Fastify HTTP + WebSocket
  worker/     # BullMQ consumers (telegram, broadcast, billing)
packages/
  shared/     # Zod schemas, DTO types, konstanta lintas-service
  db/         # Prisma schema, migrations, seed
  config/     # env loader, logger, redis & queue factories
infra/        # docker-compose, deployment manifests
docs/         # arsitektur, fitur, integrasi, runbook
tests/        # e2e & integration (per aplikasi punya unit test sendiri)
.claude/      # konfigurasi Claude Code
```

Package manager: **pnpm workspaces**. Node runtime: **20 LTS** (`.nvmrc`).

---

## 5. Batas Tanggung Jawab per Service

* **apps/web** — UI only. Tidak boleh memegang kredensial MTProto. Komunikasi hanya via REST/WebSocket ke `apps/api`.
* **apps/api** — autentikasi user SaaS, RBAC, validasi, orkestrasi (enqueue job), billing, webhook Pakasir. **Tidak** melakukan panggilan Telegram sinkron selain health check cepat.
* **apps/worker** — semua interaksi berdurasi panjang / rate-limited dengan Telegram (join, broadcast, DM reply, link detection). Idempotent. Honor flood-wait.
* **packages/shared** — satu-satunya sumber kebenaran untuk DTO & Zod schema.
* **packages/db** — satu-satunya tempat `schema.prisma`.
* **packages/config** — env loader (Zod-validated), logger, Redis/BullMQ factory.

---

## 6. Standar Kualitas

* `tsconfig` strict + `noUncheckedIndexedAccess`.
* ESLint + Prettier (preset single sumber).
* Semua input eksternal (HTTP, webhook, queue payload) divalidasi dengan Zod.
* Error terstruktur: `AppError { code, httpStatus, cause, context }`.
* Log JSON terstruktur (`pino`) + correlation id per request/job.
* Tidak ada `console.log` di source code.
* Tidak ada secret di repo. Semua lewat `.env` + validator.

---

## 7. Keamanan (ringkas, detail di `.claude/rules/security.md`)

* Session string MTProto dienkripsi (AES-256-GCM) sebelum disimpan ke DB; kunci dari KMS/env.
* 2FA MTProto didukung; password tidak pernah dilog.
* RBAC: `owner`, `admin`, `operator`, `viewer` per tenant.
* Row-level isolation per `tenant_id` (enforced di repository layer + middleware).
* Rate-limit API publik; CORS whitelist.
* Webhook Pakasir memverifikasi signature + idempotency key.

---

## 8. Konvensi Claude di Repo Ini

* Rules modular ada di `.claude/rules/*.md`. Muat yang relevan saja per tugas.
* Slash commands tersedia di `.claude/commands/*.md`.
* Skills proyek ada di `.claude/skills/*/SKILL.md`.
* Settings & permissions di `.claude/settings.json`.

**Alur saat memulai tugas baru:**

1. Baca `CLAUDE.md` (file ini).
2. Baca `.claude/product-spec.md` + `.claude/rules/product.md` jika tugas menyentuh keputusan domain/fitur.
3. Identifikasi domain tugas (api / web / worker / db / telegram / payment / infra).
4. Baca `.claude/rules/<domain>.md` yang relevan.
5. Jika tugas menyentuh Telegram → wajib baca `.claude/rules/telegram.md`.
6. Jika tugas menyentuh DB → wajib baca `.claude/rules/database.md`.
7. Jika tugas menyentuh payment/webhook → wajib baca `.claude/rules/payment.md`.
8. Jika tugas di panel admin → ingat: route `/admin/*`, middleware `requirePlatformAdmin`, audit wajib.

---

## 9. Status Saat Ini

Repository baru. Fondasi dibuat; **tidak ada implementasi fitur**. Semua direktori aplikasi masih kosong (hanya `README.md` placeholder). Langkah berikutnya menunggu instruksi eksplisit dari pengguna.
