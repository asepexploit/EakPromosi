# Rule — HTTP API (Fastify)

## Struktur

```
apps/api/src/
  server.ts            # bootstrap Fastify
  plugins/             # fastify plugins (auth, cors, rate-limit, logger)
  modules/
    <domain>/
      <domain>.routes.ts
      <domain>.controller.ts
      <domain>.service.ts
      <domain>.repository.ts
      <domain>.schema.ts   # Zod schemas (atau re-export dari packages/shared)
  lib/                 # util internal
```

## Konvensi

* Satu modul = satu domain bisnis (`accounts`, `campaigns`, `broadcasts`, `billing`, `webhooks`).
* Route file hanya mendaftarkan handler + skema; logika di service.
* Semua request body & query divalidasi Zod. Pakai `fastify-type-provider-zod`.
* Response envelope konsisten: `{ data, meta }` untuk sukses, `{ error: { code, message, details? } }` untuk gagal.
* Status code: 200/201/204/400/401/403/404/409/422/429/500. Jangan 200-untuk-semua.
* Pagination: `?cursor=&limit=` (max 100).

## Error handling

* `AppError` → mapped ke HTTP via `errorHandler` global.
* Unexpected error → log stack + correlation id, return 500 generic (tidak expose internal).

## Observability

* Middleware correlation id (`x-request-id` masuk/keluar).
* Access log terstruktur (method, path, status, durationMs, tenantId, userId).

## Rate limit

* `@fastify/rate-limit` per IP + per user untuk endpoint sensitif.

## Webhook

* Endpoint webhook (Pakasir, Telegram) dipisah di `modules/webhooks/` dengan middleware verifikasi signature khusus. Tidak share middleware auth user.
