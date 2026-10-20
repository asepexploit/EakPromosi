#!/usr/bin/env bash
# =============================================================================
# Postgres restore from a backup file in the S3-compatible bucket.
# Usage: KEY=eak-pg-2025-01-01T000000Z.sql.gz ./infra/scripts/restore-postgres.sh
# =============================================================================
set -euo pipefail

: "${KEY:?KEY of the backup to restore is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_S3_ENDPOINT:=}"
: "${POSTGRES_CONTAINER:=eak-postgres}"
: "${DB_NAME:=eakpromosi}"
: "${DB_USER:=eak}"

TMP="/tmp/${KEY}"

echo "==> downloading s3://${BACKUP_S3_BUCKET}/${KEY}"
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${KEY}" "$TMP" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}

echo "!! WARNING: this will DROP and recreate database ${DB_NAME}. Press Ctrl+C within 5s to cancel."
sleep 5

docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};"
gunzip -c "$TMP" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
rm -f "$TMP"
echo "==> restore complete"
