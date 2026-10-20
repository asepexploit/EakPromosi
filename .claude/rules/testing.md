# Rule — Testing

## Pyramid

* **Unit (banyak)** — service & util murni. Vitest. Target >80% branch coverage di modul kritis (billing, telegram adapter, rbac).
* **Integration (sedang)** — API routes + DB (Testcontainers Postgres + Redis). Supertest.
* **E2E (sedikit)** — Playwright, happy-path web (login, buat campaign, lihat monitor).

## Lokasi

* Unit test berdampingan: `foo.ts` ↔ `foo.test.ts`.
* Integration & E2E di `tests/` root.

## Konvensi

* `describe('<Unit>', ...)` + `it('should <behavior>', ...)`.
* Factory data di `tests/factories/` (bukan fixture JSON manual).
* Tidak ada network call nyata ke Telegram / Pakasir di CI. Pakai mock atau sandbox.

## CI gates

* Lint, typecheck, unit, integration wajib hijau sebelum merge.
* E2E dijalankan di PR besar / nightly.
