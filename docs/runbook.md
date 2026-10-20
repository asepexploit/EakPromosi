# Runbook — EakPromosi

Panduan ops untuk hari ke hari. Lihat juga `.claude/rules/deployment.md`.

## Quick status

```bash
# containers up?
docker compose -f infra/docker-compose.prod.yml ps

# tail api / worker
docker compose -f infra/docker-compose.prod.yml logs -f api
docker compose -f infra/docker-compose.prod.yml logs -f worker
```

Health endpoints:

- `GET https://api.example.com/health` → `{status: "ok"}`
- `GET https://api.example.com/ready` → 200 ketika DB + Redis ok, 503 jika salah satu down

Monitoring UI: `/monitoring` di SPA — status queue, counter, dan WS live events.

## Deploy

Lihat `infra/README.md`. Satu perintah:

```bash
IMAGE_TAG=v0.1.0 ./infra/deploy.sh
```

Migrasi berjalan sebagai service `migrate` dengan `prisma migrate deploy`; `api` dan `worker` baru naik setelah migrasi selesai (`service_completed_successfully`).

## Rotasi encryption key

1. Generate kunci baru: `openssl rand -base64 32`.
2. Tambahkan ke `.env` sebagai `SESSION_ENCRYPTION_KEY` + bump `SESSION_ENCRYPTION_KEY_VERSION`.
3. Deploy; API & worker akan ENKRIPSI pakai kunci baru dan DEKRIPSI pakai kunci lama & baru (version prefix di ciphertext).
4. Setelah semua session string tersimpan dengan kunci baru (bisa dicek via query `telegram_accounts.session_key_version`), hapus kunci lama dari deployment.

## Alur jika akun Telegram banned massal

1. Buka `/monitoring` → cek banner "Account warning".
2. `/accounts` → akun dengan status `banned` otomatis `disabled_by_plan_limit=false`; tidak akan dipakai worker.
3. Audit log di `/queue` tunjukkan event `telegram.account.banned` (dari skill telegram-safety).
4. Jika banned terjadi karena fingerprint seragam: diversifikasi `device_model` / `system_version` per akun baru — JANGAN ganti pada akun yang sudah aktif (ToS).

## Webhook Pakasir tidak masuk

1. Periksa `webhook_events` tabel: `SELECT event_id, status, error_message FROM webhook_events ORDER BY created_at DESC LIMIT 20;`.
2. Jika status tetap `received`, cek log worker `billing:webhook`.
3. Signature mismatch → `.claude/skills/pakasir-webhook` + verify `PAKASIR_WEBHOOK_SECRET` konsisten dengan dashboard Pakasir.
4. Replay / timestamp window: pastikan jam server sinkron (ntp) — window 5 menit.

## Backup / restore DB

```bash
# nightly, cronned
./infra/scripts/backup-postgres.sh

# ad-hoc restore
KEY=eak-pg-2026-01-01T000000Z.sql.gz ./infra/scripts/restore-postgres.sh
```

Test restore minimum kuartalan di staging.

## Darurat

- Pause semua broadcast: set tenant status ke `suspended` via admin panel (`/admin/tenants/:id/suspend`) atau SQL:
  `UPDATE tenants SET status='suspended' WHERE id=...;` — worker memverifikasi tenant status per job.
- Hentikan satu worker tanpa drain: `docker compose -f infra/docker-compose.prod.yml stop worker`.
