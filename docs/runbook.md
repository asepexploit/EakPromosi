# Runbook (fase 1)

## Insiden umum

### Akun Telegram massal ke-flood-wait
* Cek `telegram_accounts.flood_wait_until` + grafik queue depth.
* Pause campaign aktif di akun tsb.
* Review rate-limit config; naikkan jitter.

### Webhook Pakasir backlog
* Cek `webhook_events.processed_at IS NULL`.
* Jalankan replay: `pnpm --filter @eak/worker replay:pakasir --since=<time>`.

### DB migration gagal di prod
* `prisma migrate status` → identifikasi migrasi gagal.
* Jangan `migrate reset` di production.
* Rollback deploy app ke versi sebelumnya; buat migrasi perbaikan additive.

## Rutin

* **Harian**: cek backup Postgres selesai; cek jumlah akun `banned` baru.
* **Mingguan**: review akun warming yang stuck; rotate log; review alert noise.
* **Bulanan**: test restore DB dari backup; audit secret rotation.
