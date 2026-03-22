#!/usr/bin/env bash
# ============================================================
#  Gamers Hub — Database Backup
#  Keeps last 7 daily backups
# ============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="gamers_hub_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup: $FILENAME"

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-gamers_hub}" \
  "${POSTGRES_DB:-gamers_hub}" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "✅ Backup saved: ${BACKUP_DIR}/${FILENAME}"
echo "   Size: $(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1)"

# Keep only last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
ls -t "${BACKUP_DIR}"/gamers_hub_*.sql.gz 2>/dev/null \
  | tail -n +8 \
  | xargs -r rm --
echo "   Backups remaining: $(ls "${BACKUP_DIR}"/gamers_hub_*.sql.gz 2>/dev/null | wc -l)"
