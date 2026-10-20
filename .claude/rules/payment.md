# Rule — Payment (Pakasir)

## Model billing

* **Subscription-only.** Paket Free / Pro / Business (lihat `.claude/product-spec.md` §13).
* **TIDAK ADA** wallet, balance credit, top-up, atau pemotongan saldo per operasi.
* Enforcement pemakaian = batas paket (jumlah akun aktif, kuota broadcast/hari, dsb) via `PlanService.enforce(tenantId, action, context)`. Error dipetakan ke HTTP 402.

## Integrasi Pakasir

* Semua panggilan Pakasir lewat `apps/api/src/modules/billing/pakasir.adapter.ts`.
* Base URL, API key, dan merchant ID dari env (`PAKASIR_*`).
* Create invoice → simpan `invoice_id`, `amount`, `status=pending`, kembalikan `redirect_url` ke web.
* Polling TIDAK dipakai; andalkan webhook.

## Webhook

* Endpoint: `POST /webhooks/pakasir`.
* Verifikasi signature (HMAC) + timestamp window (5 menit) + idempotency key.
* Simpan raw payload (`webhook_events` table) sebelum memproses.
* Proses via queue `billing:webhook` (bukan di request thread) agar Pakasir dapat 200 cepat.
* Transisi status: `pending → paid | failed | expired`. Hanya `pending → paid` yang memicu aktivasi/perpanjangan paket. (Subscription-only — tidak ada credit/saldo yang ditambah.)

## Idempotency

* `event_id` Pakasir unik di `webhook_events`; event sama diproses sekali.
* Aktivasi/perpanjangan langganan transisi state hanya `pending → paid`. Transisi lain (`paid → paid`) adalah no-op.

## Audit

* Semua perubahan langganan (upgrade, downgrade, aktivasi, pembatalan) dicatat di `audit_logs` dengan `actor_user_id`, `action`, `resource`, `before`, `after`.
