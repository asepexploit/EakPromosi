# tests/

Integration + E2E yang berdiri sendiri di luar paket. Unit tests tetap di dekat kode (`foo.ts` ↔ `foo.test.ts`), lihat `.claude/rules/testing.md`.

## Lokasi

- **Unit** di dekat kode: `foo.ts` ↔ `foo.test.ts` (vitest run otomatis).
- **Integration** di sebelah modul yang diuji, suffix `.integration.test.ts` — gated oleh `RUN_INTEGRATION=1` dan skip di suite unit default. Butuh Postgres + Redis service di CI.
  - `apps/api/src/modules/auth/auth.integration.test.ts`
  - `apps/api/src/modules/webhooks/webhooks.integration.test.ts`
- **E2E** di `tests/e2e/` sebagai workspace terpisah (`@eak/e2e`) dengan Playwright.
  - `smoke/login.spec.ts` — register → dashboard, invalid login.

Integration test di CI memakai service `postgres` + `redis` yang sudah disediakan di `.github/workflows/ci.yml`. E2E dijalankan nightly / di PR besar — tidak di setiap push (prototipe + butuh Playwright browsers).

## Konvensi

- `describe('<Subject>', ...)` + `it('should <behavior>', ...)` (bahasa boleh Indonesia untuk domain spesifik: "menolak", "menerima").
- Factory data via helper, bukan JSON fixture — lebih mudah di-refactor saat skema berubah.
- **Tidak ada panggilan Telegram atau Pakasir nyata** di CI — gunakan mock atau sandbox env (`TG_TEST_*`, `PAKASIR_SANDBOX_*`).

## Perintah

```bash
pnpm test                                   # unit tests semua workspace
pnpm --filter @eak/api test:integration     # integration (Postgres + Redis up)
pnpm --filter @eak/e2e install:browsers     # one-time
pnpm --filter @eak/e2e test                 # smoke (api + web harus jalan)
```
