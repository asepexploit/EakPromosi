#!/usr/bin/env bash
# =============================================================================
# One-shot deploy to the VPS.
# Usage: IMAGE_TAG=v0.1.0 ./infra/deploy.sh
# =============================================================================
set -euo pipefail

: "${IMAGE_TAG:=latest}"
: "${REGISTRY:=ghcr.io/your-org}"

cd "$(dirname "$0")/.."

echo "==> Building images (tag: $IMAGE_TAG)"
docker build -t "eak-api:$IMAGE_TAG" -f apps/api/Dockerfile .
docker build -t "eak-worker:$IMAGE_TAG" -f apps/worker/Dockerfile .
docker build -t "eak-web:$IMAGE_TAG" -f apps/web/Dockerfile .

if [[ "${PUSH:-0}" == "1" ]]; then
  echo "==> Pushing to $REGISTRY"
  for img in api worker web; do
    docker tag "eak-$img:$IMAGE_TAG" "$REGISTRY/eak-$img:$IMAGE_TAG"
    docker push "$REGISTRY/eak-$img:$IMAGE_TAG"
  done
fi

echo "==> Deploying stack"
IMAGE_TAG="$IMAGE_TAG" docker compose -f infra/docker-compose.prod.yml --env-file /etc/eak/.env up -d
echo "==> Done. Tailing api logs for 30s:"
timeout 30 docker compose -f infra/docker-compose.prod.yml logs -f api || true
