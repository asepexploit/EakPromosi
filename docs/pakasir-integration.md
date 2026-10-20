# Integrasi Pakasir

> Dokumen ini merangkum kontrak integrasi dari sisi aplikasi. Rujuk dokumentasi resmi Pakasir untuk nama field terbaru dan sesuaikan adapter saat implementasi.

## Variabel environment

```
PAKASIR_BASE_URL=
PAKASIR_API_KEY=
PAKASIR_MERCHANT_ID=
PAKASIR_WEBHOOK_SECRET=
PAKASIR_RETURN_URL=      # URL web setelah checkout
```

## Create invoice

```
POST {PAKASIR_BASE_URL}/invoices
Authorization: Bearer {PAKASIR_API_KEY}

{
  "merchant_id": "...",
  "external_id": "<invoiceId internal>",
  "amount": 150000,
  "currency": "IDR",
  "description": "Paket Pro - 1 bulan",
  "customer": { "email": "...", "name": "..." },
  "return_url": "{PAKASIR_RETURN_URL}?invoice=<invoiceId>",
  "callback_url": "https://<domain>/webhooks/pakasir"
}
→ 200 { id, redirect_url, status: "pending" }
```

Simpan: `invoices.external_id = <invoiceId internal>`, `invoices.provider_id = <id dari Pakasir>`.

## Webhook

```
POST /webhooks/pakasir
Headers:
  x-pakasir-event-id: <uuid>
  x-pakasir-timestamp: <unix seconds>
  x-pakasir-signature: hex HMAC-SHA256(timestamp + "." + rawBody, PAKASIR_WEBHOOK_SECRET)

Body:
{
  "event": "invoice.paid" | "invoice.failed" | "invoice.expired",
  "data": { "id": "...", "external_id": "...", "amount": ..., "paid_at": "..." }
}
```

Prosedur handler ada di `.claude/skills/pakasir-webhook/SKILL.md`.

## Mapping produk

**Subscription-only.** Semua invoice adalah pembelian / perpanjangan paket.

| Produk internal | Field Pakasir |
|---|---|
| Paket Free (tidak di-invoice; free tier) | — |
| Paket Pro / Business (monthly / yearly) | `description="<Plan> - <period>"`, metadata `{ plan_id, period: "monthly"\|"yearly" }` |
| Upgrade mid-period | invoice baru dengan amount selisih prorata; metadata `{ plan_id, period, upgrade_from: <plan_id> }` |

TIDAK ADA: top-up credit, wallet, pay-as-you-go. Enforcement pemakaian = batas paket.

## Idempotency

* Primary key dedup: `x-pakasir-event-id` → tabel `webhook_events`.
* Secondary guard: `invoices.status` transition hanya diperbolehkan `pending → paid | failed | expired`.
