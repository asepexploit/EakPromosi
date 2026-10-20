---
name: pakasir-webhook
description: Panduan menerima & memproses webhook Pakasir dengan benar (signature, idempotency, queue, ledger). Muat sebelum menyentuh apps/api/src/modules/webhooks/ atau apps/worker/src/queues/billing/.
---

# Pakasir Webhook Skill

## Flow kanonik

```
Pakasir → POST /webhooks/pakasir
  ├─ 1. verifyHmac(headers['x-pakasir-signature'], rawBody, PAKASIR_WEBHOOK_SECRET)
  ├─ 2. verifyTimestamp(headers['x-pakasir-timestamp'], window=300s)
  ├─ 3. insert webhook_events (idempotent by headers['x-pakasir-event-id'])
  ├─ 4. enqueue billing:webhook { eventId }
  └─ 5. respond 200 { received: true }  // SELALU cepat
```

Worker `billing:webhook`:

```
load webhook_events[eventId]
if event.processed_at → return
load invoices[invoice_id]
process by event.type:
  invoice.paid → if invoice.status == 'pending':
                   invoice.status = 'paid'
                   subscription.activateOrExtend(tenantId, invoice.plan_id, invoice.period)
                   audit_log('subscription.activate', before, after)
  invoice.failed  → invoice.status = 'failed'
  invoice.expired → invoice.status = 'expired'
mark event.processed_at = now
```

## Aturan

1. **Tidak pernah** memproses billing di request handler. Request hanya menyimpan event + enqueue.
2. **Tidak ada ledger / balance.** Model subscription-only — webhook hanya mengubah status invoice & aktivasi/perpanjangan langganan.
3. **Idempotent by eventId** — bukan oleh `invoice_id` (satu invoice bisa punya banyak event). Transisi state invoice hanya `pending → paid|failed|expired`; event ulang pada invoice `paid` adalah no-op.
4. Signature verification pakai `crypto.timingSafeEqual`.
5. Simpan raw payload (JSONB) untuk audit; jangan parse-and-discard.

## Testing

* Fixture `tests/fixtures/pakasir/*.json`.
* Test: signature invalid → 401; signature valid tapi event lama → dicatat & diproses sekali.
