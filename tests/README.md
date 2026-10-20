# tests/

Integration + E2E yang berdiri sendiri di luar paket. Unit tests tetap di dekat kode (`foo.ts` ↔ `foo.test.ts`), lihat `.claude/rules/testing.md`.

## Rencana

```
tests/
  integration/
    api/
      auth.test.ts         # register → login → me → logout dengan supertest + testcontainers
      billing-webhook.test.ts  # end-to-end webhook Pakasir masuk, event tersimpan, worker memproses
  e2e/
    playwright.config.ts
    smoke/
      login.spec.ts        # happy path register → dashboard
      broadcast.spec.ts    # create broadcast → kirim stub → status terupdate
  factories/
    user.ts
    tenant.ts
    plan.ts
```

Integration test di CI memakai service `postgres` + `redis` yang sudah disediakan di `.github/workflows/ci.yml`. E2E dijalankan nightly / di PR besar — tidak di setiap push (prototipe + butuh Playwright browsers).

## Konvensi

- `describe('<Subject>', ...)` + `it('should <behavior>', ...)` (bahasa boleh Indonesia untuk domain spesifik: "menolak", "menerima").
- Factory data via helper, bukan JSON fixture — lebih mudah di-refactor saat skema berubah.
- **Tidak ada panggilan Telegram atau Pakasir nyata** di CI — gunakan mock atau sandbox env (`TG_TEST_*`, `PAKASIR_SANDBOX_*`).

## Perintah

```bash
pnpm --filter @eak/api test     # unit
pnpm test                       # semua workspace
# integration (planned):
pnpm --filter @eak/api test:integration
# e2e (planned):
pnpm --filter @eak/web test:e2e
```
