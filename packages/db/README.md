# @eak/db — Prisma schema + migrations + seed

Lihat `.claude/rules/database.md`.

## Target struktur

```
packages/db/
  package.json
  tsconfig.json
  prisma/
    schema.prisma
    migrations/
  src/
    index.ts                  # export PrismaClient singleton
    client.ts                 # instansiasi (log, error format)
  seed/
    index.ts
    data/
```

## Tabel awal (ditulis saat implementasi dimulai)

* `tenants`, `users`, `tenant_members`
* `telegram_accounts`, `tenant_bots`
* `groups`, `discovered_groups`
* `campaigns`, `campaign_targets`, `broadcast_results`
* `dm_rules`
* `invoices`, `billing_ledger`, `webhook_events`
* `processed_jobs` (idempotency)
* `audit_logs`

## Aturan

* Satu-satunya tempat `schema.prisma`.
* Setiap migrasi dibuat via `prisma migrate dev --name <desc>`.
* Backward compatible di satu rilis (lihat `.claude/rules/database.md`).
