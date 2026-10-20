---
description: Tambah route Fastify baru di apps/api dengan pola modul (routes/controller/service/repository + Zod schema).
---

Argumen: `$ARGUMENTS` = `<METHOD> <path>` + ringkasan.

Langkah:

1. Baca `.claude/rules/api.md`, `.claude/rules/coding.md`, dan `.claude/rules/security.md`.
2. Tentukan modul domain. Jika belum ada, buat folder `apps/api/src/modules/<domain>/` dengan 4 file wajib + schema.
3. Zod schema di `packages/shared/src/schemas/<domain>.ts` (sumber kebenaran), re-export di modul.
4. Daftarkan route via `fastify-type-provider-zod`.
5. Permission RBAC eksplisit lewat decorator plugin auth.
6. Tulis minimal 1 integration test di `tests/integration/<domain>/`.
7. Konfirmasi sebelum mengubah `packages/shared` jika breaking.
