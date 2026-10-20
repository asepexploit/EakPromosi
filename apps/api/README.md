# @eak/api — HTTP API (Fastify)

Lihat `.claude/rules/api.md` sebelum menambah route.

## Target struktur

```
apps/api/
  package.json
  tsconfig.json
  src/
    server.ts                 # bootstrap: register plugins & modules
    plugins/
      auth.ts                 # session cookie + CSRF
      rbac.ts                 # permission decorator
      cors.ts
      logger.ts               # pino + correlation id
      rate-limit.ts
      zod.ts                  # fastify-type-provider-zod bootstrap
      queue.ts                # BullMQ producer (hanya enqueue)
    modules/
      auth/
      tenants/
      accounts/
      bots/
      groups/
      campaigns/
      broadcasts/
      dm/
      monitoring/
      reports/
      billing/
      webhooks/
        pakasir.ts
        telegram.ts
    lib/
      errors.ts
      pagination.ts
      http.ts
  test/                       # vitest + supertest
```

Setiap modul berisi: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts` (atau re-export dari `@eak/shared`).
