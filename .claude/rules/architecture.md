# Rule — Architecture

Muat rule ini untuk setiap tugas yang menambah/memindah modul lintas-service.

## Layering wajib

```
UI (apps/web)
  └── HTTP/WebSocket ──► API (apps/api, Fastify)
                           ├── Prisma (packages/db)
                           ├── Enqueue (BullMQ) ──► Workers (apps/worker)
                           └── Pakasir webhook handler
Workers (apps/worker)
  ├── GramJS (MTProto userbot)
  ├── Telegraf (Bot API)
  └── Prisma (packages/db)
```

## Aturan

1. **UI tidak pernah memanggil Telegram langsung.** Semua lewat API → Worker.
2. **API tidak melakukan I/O panjang.** Panggilan Telegram sinkron hanya untuk health check (<2s). Operasi berdurasi lama → enqueue BullMQ.
3. **Worker idempotent.** Setiap job punya `idempotencyKey`. Retry aman.
4. **Shared types satu sumber.** DTO & Zod schema hanya di `packages/shared`. API, worker, dan web import dari sana.
5. **Tenant isolation di repository layer.** Setiap query Prisma menerima `tenantId` eksplisit. Tidak ada query global tanpa scope.
6. **Dependency direction:** `web → shared`, `api → shared, db, config`, `worker → shared, db, config`. Tidak boleh circular.
7. **Config terpusat.** Env loader + logger + Redis factory hanya di `packages/config`.

## Keputusan arsitektur yang sudah final

* **pnpm workspaces** untuk monorepo (ringan, cepat, caching baik).
* **Fastify** bukan Express (performa, schema-first, plugin ecosystem).
* **BullMQ** untuk queue (bukan RabbitMQ) — cukup untuk fase 1, biaya rendah, Redis sudah dipakai.
* **GramJS** untuk userbot (akun user asli), **Telegraf** untuk bot (via `@BotFather`). Dua paradigma, dua modul terpisah di worker.
* **Prisma** sebagai ORM tunggal (migrasi, type-safe).
* **Zod** sebagai validator tunggal di semua boundary.
