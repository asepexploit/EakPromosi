# EakPromosi

Telegram Auto Promotion SaaS — fondasi awal.

> Status: fase fondasi. Sudah ada: skema Zod awal di `packages/shared`, kerangka konfigurasi `apps/web` (Vite/React/Tailwind/Radix) + design token, dan referensi desain UI di `docs/design/`. Belum ada implementasi fitur end-to-end; `apps/api`, `apps/worker`, `packages/db`, `packages/config` masih placeholder. Detail status di `CLAUDE.md §9`.

## Prasyarat (saat implementasi dimulai)

* Node.js 20 LTS
* pnpm 9+
* Docker (untuk Postgres + Redis via `infra/docker-compose.yml` yang akan dibuat)

## Dokumentasi

* `CLAUDE.md` — pedoman utama untuk Claude Code.
* `docs/architecture.md` — arsitektur sistem & alur data.
* `docs/features.md` — daftar fitur fase 1.
* `docs/telegram-integration.md` — GramJS + Telegraf.
* `docs/pakasir-integration.md` — kontrak Pakasir.
* `docs/rbac.md` — matrix role.
* `docs/runbook.md` — ops.
* `docs/design/` — referensi desain UI `apps/web`: sistem desain (`ui-design-system.md`) + kode prototipe dashboard (`prototype/`, mockup acuan visual, bukan kode produksi).

## Struktur

```
apps/
  web/      - React 18 + Vite SPA
  api/      - Fastify HTTP + WS
  worker/   - BullMQ consumers (Telegram, billing, reports)
packages/
  shared/   - Zod schema + DTO lintas-service
  db/       - Prisma schema + migrations + seed
  config/   - env loader, logger, Redis/BullMQ factory
infra/      - docker-compose, deployment manifests
docs/       - dokumen arsitektur & integrasi
tests/      - integration & e2e
.claude/    - konfigurasi Claude Code (settings, rules, commands, skills)
```

## Langkah selanjutnya

Urutan yang disarankan (✓ = sudah mulai):

1. `packages/config` + `packages/db` (skema awal: `tenants`, `users`, `tenant_members`).
2. `apps/api` bootstrap + auth + RBAC.
3. `packages/shared` (schema lintas-service). ✓ skema awal sudah ada, masih bisa dilengkapi.
4. `apps/worker` bootstrap + queue skeleton.
5. Modul `accounts` (Telegram MTProto login) end-to-end.
6. Modul `campaigns` + `broadcasts`.
7. Modul `billing` + Pakasir.
8. `apps/web`. ✓ kerangka konfigurasi + design token sudah ada; komponen & halaman belum.
