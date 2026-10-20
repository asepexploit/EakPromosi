# Rule — Queue & Workers (BullMQ)

## Queue list (fase 1)

| Queue | Isi job | Concurrency awal |
|---|---|---|
| `telegram:auth` | Login MTProto, send code, 2FA | 1 per akun |
| `telegram:join` | Join grup/channel | 1 per akun |
| `telegram:broadcast` | Kirim pesan campaign | 1 per akun |
| `telegram:dm-reply` | Auto DM / Auto Reply | 2 per akun |
| `telegram:link-detect` | Parse link dari pesan | 5 per akun |
| `billing:webhook` | Proses webhook Pakasir | 10 global |
| `reports:aggregate` | Agregasi statistik | 2 global |

## Konvensi job

* Nama job: `<domain>.<action>` (contoh `broadcast.send`).
* Payload divalidasi Zod sebelum di-process.
* **Idempotent**: setiap job menerima `idempotencyKey`; worker cek `processed_jobs` table sebelum eksekusi.
* Retry: backoff eksponensial, maks 5 attempt kecuali ada aturan domain (flood-wait → delay = `floodWaitSeconds + jitter`).
* Timeout per job eksplisit.
* Dead-letter queue: `<queue>:dlq`, dengan alert.

## Rate limit per akun

* Satu akun Telegram = satu "pipeline" worker. Jangan jalankan 2 broadcast paralel untuk 1 akun.
* Gunakan BullMQ `groupKey` (atau queue per akun via pattern `telegram:broadcast:<accountId>`).

## Shutdown

* Trap SIGTERM, finish job berjalan, flush log, exit.
