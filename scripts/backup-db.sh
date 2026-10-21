#!/usr/bin/env bash
# Bash PostgreSQL Backup Script with 30-Day Retention Policy
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${2:-30}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/lms_backup_${TIMESTAMP}.sql"

DB_NAME="${PGDATABASE:-library_management}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

echo "Starting backup for database '${DB_NAME}' to '${BACKUP_FILE}'..."

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -F c -b -v -f "${BACKUP_FILE}" "${DB_NAME}"

echo "Backup completed successfully: ${BACKUP_FILE}"

echo "Cleaning up backups older than ${RETENTION_DAYS} days in '${BACKUP_DIR}'..."
find "${BACKUP_DIR}" -name "lms_backup_*.sql" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} +

echo "Backup and retention maintenance completed."
