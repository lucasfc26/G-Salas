#!/usr/bin/env bash
# Postgres backup (roadmap section 17/53 checklist — "Backup do PostgreSQL").
#
# Not run automatically by any container — wire this into a scheduled CI/CD
# job or host cron, e.g.:
#   0 3 * * * DATABASE_URL=postgresql://... BACKUP_DIR=/backups \
#       /app/scripts/backup-postgres.sh
#
# Requires: pg_dump (matching the server's major version), and either
# DATABASE_URL or the standard PG* env vars set.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/room_rental_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[backup-postgres] Dumping to $FILE"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "${DATABASE_URL:?DATABASE_URL is required}"

echo "[backup-postgres] Pruning dumps older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'room_rental_*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup-postgres] Done: $(du -h "$FILE" | cut -f1)"

# Restore with:
#   pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$FILE"
