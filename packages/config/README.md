# @eak/config — Env, logger, Redis & queue factory

## Target struktur

```
packages/config/
  package.json
  tsconfig.json
  src/
    index.ts
    env.ts                    # Zod-validated env loader
    logger.ts                 # pino factory + child logger
    redis.ts                  # ioredis factory (connection pool)
    queue.ts                  # BullMQ Queue & Worker factory + default options
    crypto.ts                 # AES-256-GCM helper (session cipher)
```

## Aturan

* Env dibaca sekali di startup. Modul lain impor `env` dari sini — tidak boleh `process.env` langsung di luar file ini.
* Logger default-nya pino dengan `redact` untuk field sensitif (`password`, `session*`, `token*`, `authorization`).
* `queue.ts` menyediakan default: `removeOnComplete: { age: 86400, count: 10000 }`, `removeOnFail: { age: 7 * 86400 }`.
