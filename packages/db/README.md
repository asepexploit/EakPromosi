# @eak/db — Prisma data layer

**Satu-satunya tempat** `schema.prisma` tinggal. API & worker import `prisma` dari sini.

## Konvensi

Lihat `.claude/rules/database.md`:
- Setiap tabel bisnis punya `tenant_id` + indeks di sana.
- `created_at` / `updated_at` default.
- Soft-delete via `deleted_at TIMESTAMPTZ` ketika diperlukan.
- `ON DELETE RESTRICT` default; `SetNull` hanya untuk relasi opsional.
- Pagination cursor-based (`id` + `created_at`).

## Perintah

```bash
pnpm --filter @eak/db exec prisma generate
pnpm --filter @eak/db migrate:dev --name <desc>
pnpm --filter @eak/db migrate:deploy      # production
pnpm --filter @eak/db run seed            # plans + optional admin bootstrap
```

## Seed

Membuat 3 paket default (free / pro / business). Jika env `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` diset, membuat user admin platform awal (password hash placeholder — WAJIB diganti lewat alur reset di aplikasi).

`SEED_DEMO=1` membuat tenant demo dengan paket Free aktif 30 hari.
