# infra/

Infrastruktur sebagai kode untuk dev & deploy.

## Target isi

```
infra/
  docker-compose.yml          # postgres + redis + mailhog (dev)
  docker-compose.prod.yml     # tambahan: caddy reverse proxy
  Caddyfile
  dockerfiles/
    api.Dockerfile
    worker.Dockerfile
    web.Dockerfile
  scripts/
    backup-postgres.sh
    restore-postgres.sh
```

Lihat `.claude/rules/deployment.md`.
