# Rule — Database (PostgreSQL + Prisma)

## Lokasi

* `schema.prisma` **hanya** di `packages/db/prisma/schema.prisma`.
* Migrations di `packages/db/prisma/migrations/`.
* Seed di `packages/db/seed/`.

## Konvensi skema

* Nama tabel plural, snake_case via `@@map`.
* Kolom snake_case via `@map`.
* Setiap tabel bisnis: `id` (cuid), `tenant_id`, `created_at`, `updated_at`.
* Soft-delete bila diperlukan: `deleted_at TIMESTAMPTZ NULL`.
* Index: `tenant_id` + kolom filter umum.
* Foreign key eksplisit; `ON DELETE` dipikir per relasi (biasanya `RESTRICT`).

## Migrasi

* **Setiap** perubahan skema → `prisma migrate dev --name <desc>`.
* Jangan edit migrasi lama yang sudah di-apply di shared env.
* Breaking migration (drop/rename kolom) → tulis dua langkah: additive dulu, cleanup di rilis berikut.

## Query

* Tidak ada Prisma client di luar `packages/db` dan `apps/*/src/repositories/`.
* Repository method menerima `tenantId` sebagai parameter wajib untuk tabel bisnis.
* Pagination default: cursor-based (`id` + `created_at`), bukan offset.

## Backup & integritas

* Backup harian di production (minimal 7 hari retensi).
* Tabel sensitif (sesi MTProto) direplikasi encrypted; test restore minimal kuartalan.
