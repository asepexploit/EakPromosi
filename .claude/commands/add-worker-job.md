---
description: Tambah job BullMQ baru di apps/worker dengan idempotency + retry policy sesuai rule queue/telegram.
---

Argumen: `$ARGUMENTS` = `<queue>.<action>` + ringkasan.

Langkah:

1. Baca `.claude/rules/queue.md`. Jika job menyentuh Telegram, baca juga `.claude/rules/telegram.md`.
2. Zod schema payload di `packages/shared/src/jobs/<queue>.ts`.
3. Processor di `apps/worker/src/queues/<queue>/<action>.processor.ts`.
4. Register di `apps/worker/src/queues/<queue>/index.ts` (concurrency, backoff, timeout).
5. Idempotency: cek `processed_jobs` table sebelum eksekusi, insert setelah sukses (transaksi).
6. Flood-wait handling (jika Telegram): catch → delay = `seconds + jitter`.
7. Tulis unit test processor dengan mock adapter.
