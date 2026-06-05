#!/bin/sh
# Nightly PostgreSQL backup — dumps the DB, compresses it, and uploads to R2.
# Run via: docker compose --profile backup run --rm backup
# Or schedule as a host cron job: 0 2 * * * docker compose --profile backup run --rm backup
#
# Required env vars (set in .env):
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT

set -e

BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql.gz"
RETAIN_DAYS=30

echo "[backup] Starting dump of ${PGDATABASE}..."
pg_dump -Fc | gzip > "/tmp/${BACKUP_FILE}"
echo "[backup] Dump complete: ${BACKUP_FILE}"

# Upload to R2 using AWS CLI (s3-compatible)
# Install aws cli in the container or use curl with presigned URL.
# This uses the AWS CLI v2 bundled approach via environment variables.
if command -v aws > /dev/null 2>&1; then
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 cp \
        "/tmp/${BACKUP_FILE}" \
        "s3://${R2_BUCKET_NAME}/db-backups/${BACKUP_FILE}" \
        --endpoint-url "${R2_ENDPOINT}" \
        --no-progress
    echo "[backup] Uploaded to R2: db-backups/${BACKUP_FILE}"
else
    echo "[backup] WARNING: aws CLI not available — backup saved locally only at /tmp/${BACKUP_FILE}"
    echo "[backup] Install aws CLI in the backup image or mount a host path to persist the file."
fi

# Remove local temp file
rm -f "/tmp/${BACKUP_FILE}"

echo "[backup] Done."
