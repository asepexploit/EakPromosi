---
description: Tambah model Prisma baru dengan konvensi EakPromosi (tenant scoping, timestamps, index).
---

Argumen: `$ARGUMENTS` = nama model + ringkasan field.

Langkah:

1. Baca `.claude/rules/database.md`.
2. Edit `packages/db/prisma/schema.prisma`:
   * Tambah model dengan `id` (cuid), `tenantId`, `createdAt`, `updatedAt`.
   * `@@map` snake_case plural, `@map` snake_case kolom.
   * Index `tenantId` + kolom filter yang disebut.
3. Jalankan `pnpm --filter @eak/db prisma migrate dev --name <slug>`.
4. Jangan menulis repository/service kecuali diminta eksplisit.
5. Laporkan nama migrasi yang dihasilkan.
