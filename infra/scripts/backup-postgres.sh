#!/usr/bin/env bash
# =============================================================================
# Postgres daily backup → S3-compatible bucket.
# Call from a nightly cron / systemd timer on the VPS.
# =============================================================================
set -euo pipefail

: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_S3_ENDPOINT:=}"
: "${POSTGRES_CONTAINER:=eak-postgres}"
: "${DB_NAME:=eakpromosi}"
: "${DB_USER:=eak}"
: "${RETENTION_DAYS:=7}"

TS="$(date -u +%Y-%m-%dT%H%M%SZ)"
FILE="eak-pg-${TS}.sql.gz"
TMP="/tmp/${FILE}"

echo "==> dumping ${DB_NAME} from ${POSTGRES_CONTAINER}"
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip -9 > "$TMP"

echo "==> uploading to s3://${BACKUP_S3_BUCKET}/${FILE}"
aws s3 cp "$TMP" "s3://${BACKUP_S3_BUCKET}/${FILE}" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}

echo "==> pruning backups older than ${RETENTION_DAYS} days"
aws s3 ls "s3://${BACKUP_S3_BUCKET}/" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} \
  | awk '{print $4}' \
  | while read -r key; do
    [[ -z "$key" ]] && continue
    # extract date part from filename "eak-pg-YYYY-MM-DDTHHMMSSZ.sql.gz"
    ts="${key#eak-pg-}"; ts="${ts%%T*}"
    age=$(( ( $(date -u +%s) - $(date -u -d "$ts" +%s) ) / 86400 ))
    if (( age > RETENTION_DAYS )); then
      echo "   deleting $key (${age}d)"
      aws s3 rm "s3://${BACKUP_S3_BUCKET}/${key}" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}
    fi
  done

rm -f "$TMP"
echo "==> backup complete"
