# tests/

Integration & E2E test lintas-aplikasi. Unit test tetap di masing-masing paket (`apps/*/test/`, `packages/*/test/`).

## Target struktur

```
tests/
  integration/
    api/
      auth.test.ts
      campaigns.test.ts
      billing-webhook.test.ts
    worker/
      broadcast.test.ts
  e2e/
    web/
      login.spec.ts
      campaign-flow.spec.ts
  factories/
    tenant.factory.ts
    account.factory.ts
    campaign.factory.ts
  fixtures/
    pakasir/
```

## Aturan

* Integration pakai Testcontainers (Postgres + Redis) atau `docker-compose.test.yml` yang akan dibuat.
* E2E pakai Playwright, dijalankan terhadap `apps/web` + `apps/api` yang di-start lewat script.
* Tidak ada panggilan network nyata ke Telegram / Pakasir di CI.
