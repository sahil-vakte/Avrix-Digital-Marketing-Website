#!/usr/bin/env bash
# Nightly PostgreSQL backup with 14-day retention.
# crontab -e →  15 2 * * * /var/www/avrix-europe/deploy/backup.sh >> /var/log/avrix-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
DEST="${BACKUP_DIR:-/var/backups/avrix}"
mkdir -p "$DEST"
FILE="$DEST/avrix-$(date +%Y%m%d-%H%M).sql.gz"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$FILE"
find "$DEST" -name 'avrix-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
# Copy off the server (recommended), e.g.:
# rclone copy "$FILE" remote:avrix-backups/   OR   scp "$FILE" backup@other-host:/backups/
