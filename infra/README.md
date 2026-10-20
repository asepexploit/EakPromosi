# infra/

Infrastruktur sebagai kode untuk dev & deploy. See `.claude/rules/deployment.md`.

## Isi

```
infra/
  docker-compose.yml         # dev: postgres + redis
  docker-compose.prod.yml    # prod: postgres + redis + api + worker + web + caddy
  Caddyfile                  # reverse proxy + TLS (ACME) untuk app.* & api.*
  web.Caddyfile              # SPA server inside apps/web runtime image
  deploy.sh                  # build + (optional push) + compose up
  scripts/
    backup-postgres.sh
    restore-postgres.sh
```

Dockerfiles tinggal di app masing-masing (`apps/api/Dockerfile`, `apps/worker/Dockerfile`, `apps/web/Dockerfile`) sehingga tiap aplikasi self-contained.

## Alur

- **Dev**: `docker compose -f infra/docker-compose.yml up -d` menyalakan Postgres + Redis. API & worker dijalankan dari host via `pnpm dev:*` sambil migrasi via `pnpm db:migrate`.
- **Prod**: provision VPS, letakkan env di `/etc/eak/.env` (chmod 600), lalu `IMAGE_TAG=vX.Y.Z ./infra/deploy.sh`. Script build 3 image, (optional) push ke registry, kemudian `compose up -d`. Service `migrate` berjalan sekali sebelum `api` + `worker` (dependency `service_completed_successfully`).

## Backup

- `scripts/backup-postgres.sh` dump harian ke bucket S3-compatible.
- Retensi minimum 7 hari (prod); test restore minimal kuartalan.
