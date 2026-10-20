# EakPromosi

Telegram Auto Promotion SaaS — monorepo end-to-end (API + worker + web + infra).

> **Status:** fondasi production-ready. API, worker (BullMQ), SPA React, Prisma schema untuk semua domain, Dockerfiles + docker-compose prod, Caddy reverse proxy, CI GitHub Actions, test suite unit, dan runbook ops sudah ada. Integrasi Telegram MTProto / Pakasir dirangkai lewat adapter — bagian yang perlu akses live (login MTProto full-flow, send message real) diberi tanda jelas di source dan siap diisi tanpa mengubah struktur.

## Prasyarat

- Node.js 20 LTS (`.nvmrc`)
- pnpm 9+
- Docker & Docker Compose (postgres + redis)

## Mulai cepat (dev)

```bash
# 1. install deps
pnpm install

# 2. salin env — lihat docs/env-reference.md untuk template
cp docs/env-reference.md -> .env  # edit secrets

# 3. nyalakan Postgres + Redis
docker compose -f infra/docker-compose.yml up -d

# 4. migrasi + seed plans
pnpm db:migrate
pnpm db:seed

# 5. jalankan ketiganya paralel
pnpm dev     # api :4000, worker, web :5173
```

Login awal: register di `http://localhost:5173/register` — tenant pertama otomatis mendapat paket **Free**.

## Struktur

```
apps/
  web/      React 18 + Vite SPA (15 modul + admin panel)
  api/      Fastify 5 (auth, tenants, accounts, groups, discovery,
            broadcasts, campaigns, dm, billing, Pakasir webhook,
            dashboard, monitoring, audit, admin)
  worker/   BullMQ (telegram:{auth,join,broadcast,dm-reply,link-detect,
            membership-sync}, billing:webhook, reports:aggregate,
            campaigns:scheduler)
packages/
  shared/   Zod schemas lintas-service
  db/       Prisma schema + migrations + seed (plans)
  config/   env loader, logger, Redis/BullMQ factory, AppError, AES-GCM
infra/      docker-compose dev + prod, Caddyfile, deploy script, backup
docs/       architecture, env reference, rbac, runbook, design system
.claude/    pedoman Claude (rules, product-spec, skills, commands)
tests/      integration + e2e (rencana)
```

## Model billing

**Subscription-only** (Free / Pro / Business via Pakasir). TIDAK ADA wallet, credit, atau top-up — batas pemakaian adalah batas paket (jumlah akun, kuota harian). Enforcement terpusat di `PlanService.enforce(...)` → HTTP 402.

## Keamanan

- Session MTProto AES-256-GCM dengan key version embedded untuk rotasi.
- Argon2id untuk password user; session cookie + CSRF double-submit untuk SPA.
- Tenant isolation enforced di repository layer (`tenant_id` wajib tiap query).
- Webhook Pakasir: HMAC + timestamp window 5 menit + dedup via `webhook_events.event_id`.

## Dokumentasi

- `CLAUDE.md` — pedoman utama untuk Claude Code (wajib dibaca sebelum tugas apa pun).
- `.claude/product-spec.md` — sumber kebenaran produk & modul.
- `.claude/rules/` — rules modular (api, database, telegram, payment, deployment, …).
- `docs/architecture.md` — arsitektur & alur data.
- `docs/env-reference.md` — template env lengkap.
- `docs/rbac.md` — matriks role per tenant.
- `docs/runbook.md` — ops: deploy, rotate key, backup, incident.
- `docs/design/` — referensi desain UI (`ui-design-system.md` + `prototype/`).
- `infra/README.md` — compose, Dockerfiles, deploy, backup.

## Perintah utama

```bash
pnpm typecheck            # strict TypeScript lintas workspace
pnpm lint                 # eslint
pnpm test                 # unit test lintas workspace
pnpm db:migrate           # prisma migrate dev
pnpm db:deploy            # prisma migrate deploy (prod)
pnpm db:seed              # seed plans + optional admin bootstrap

./infra/deploy.sh         # build & compose up (prod)
```

## Komitmen non-negotiable

Dari `.claude/rules/product.md`:

1. Subscription-only (bukan credit/wallet).
2. Groups unik by `telegram_chat_id`; memberships N:M.
3. Campaign TIDAK duplikasi logika kirim — reuse Broadcast.
4. Discovery tidak auto-join dalam satu transaksi.
5. Admin Panel terpisah (`/admin/*`, `requirePlatformAdmin`).
6. Enforcement paket di API (bukan hanya UI).
7. Broadcast hanya ke `allow_promotion=true` + bukan excluded.
8. Status enums sesuai product-spec.
