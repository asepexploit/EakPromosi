# Rule — Coding Standards

## TypeScript

* `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
* Tidak ada `any` kecuali di adapter third-party yang terdokumentasi, dibungkus wrapper typesafe.
* Prefer `type` untuk shape, `interface` untuk extension API publik.
* Error class turun dari satu base `AppError`.

## SOLID & separation of concerns

* **Controller/route** → parse & validate input, panggil service, format response. Tidak boleh akses DB.
* **Service** → logika domain. Tidak tahu HTTP/queue.
* **Repository** → akses DB (Prisma). Satu-satunya tempat Prisma client dipakai.
* **Adapter** → wrapper untuk Telegram, Pakasir, Redis.

## Lint & format

* ESLint dengan `@typescript-eslint/recommended-type-checked`.
* Prettier dengan konfigurasi tunggal di root.
* Import sorting via `eslint-plugin-import`.

## Testing minimum

* Unit test untuk service & repository (Vitest).
* API test untuk setiap route (supertest).
* E2E happy-path untuk broadcast lifecycle (Playwright).

## Larangan

* `console.log` di source (gunakan logger).
* Secret / token hardcoded.
* Query SQL raw tanpa alasan + review.
* `any` tersembunyi via `as unknown as T`.
