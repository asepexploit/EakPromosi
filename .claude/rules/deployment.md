# Rule — Deployment & Ops

## Target awal (biaya rendah)

* 1 VPS (4 vCPU / 8GB) menjalankan: `api`, `worker`, Postgres, Redis via `docker compose` (lihat `infra/docker-compose.yml` yang akan dibuat).
* Reverse proxy: Caddy (TLS otomatis).
* Backup Postgres harian ke S3-compatible (Wasabi / Idcloudhost).

## Image

* Multi-stage Dockerfile per app (`apps/api`, `apps/worker`, `apps/web`).
* Base: `node:20-alpine`.
* Non-root user.
* Healthcheck.

## Env

* `.env.production` di server, dilindungi permission 600.
* Secrets rotasi minimal 90 hari.

## Observability minimum

* Log JSON ke stdout, agregasi via `vector` / `promtail` → Loki (opsional fase 2).
* Metrics: `/metrics` Prometheus di API & worker (opsional).
* Alert kritis: queue depth > N, akun Telegram banned, webhook Pakasir gagal berturut.

## Release

* `main` = production. Tag `vX.Y.Z` untuk release.
* Migrasi DB dijalankan sebelum deploy app baru (`prisma migrate deploy`).
* Rollback: image sebelumnya tetap tersedia; migrasi dirancang backward-compatible dalam satu rilis.
