# @eak/worker — BullMQ consumers

Lihat `.claude/rules/queue.md` dan `.claude/rules/telegram.md` sebelum menyentuh folder ini.

## Target struktur

```
apps/worker/
  package.json
  tsconfig.json
  src/
    index.ts                  # bootstrap: register semua worker
    runtime/
      logger.ts
      redis.ts
      shutdown.ts             # graceful SIGTERM
      idempotency.ts
      lock.ts                 # Redis distributed lock per akun
    queues/
      telegram/
        auth.processor.ts
        join.processor.ts
        broadcast.processor.ts
        dm-reply.processor.ts
        link-detect.processor.ts
        index.ts              # register worker + concurrency
      billing/
        webhook.processor.ts
        index.ts
      reports/
        aggregate.processor.ts
        index.ts
    telegram/
      userbot/
        client.factory.ts
        session.cipher.ts
        errors.ts
        actions/              # send, join, resolve-link
      bot/
        bot.factory.ts
        handlers/
  test/
```

## Kontrak processor

```ts
export const broadcastProcessor: Processor<BroadcastJob> = async (job) => {
  const payload = BroadcastJobSchema.parse(job.data);
  await idempotency.guard(payload.idempotencyKey, async () => {
    // ... panggil action, log hasil
  });
};
```
