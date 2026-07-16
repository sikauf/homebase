#!/usr/bin/env bash
set -euo pipefail

# Pulls the production database down over the local one (full replace, not a
# merge — prod is the source of truth). The local DB is backed up first.
# Usage: npm run pull-db

cd "$(dirname "$0")/.."
APP=sam-homebase
LOCAL=server/data/homebase.db

echo "Waking the machine..."
curl -sf -o /dev/null "https://${APP}.fly.dev/" || true

echo "Checkpointing prod WAL so the file on disk is complete..."
fly ssh console -a "$APP" -C "node --experimental-sqlite -e \"const{DatabaseSync}=require('node:sqlite');new DatabaseSync('/data/homebase.db').exec('PRAGMA wal_checkpoint(TRUNCATE)')\""

echo "Downloading prod DB..."
TMP="$(mktemp -d)"
echo "get /data/homebase.db ${TMP}/homebase.db" | fly ssh sftp shell -a "$APP" > /dev/null
[ -s "${TMP}/homebase.db" ] || { echo "Download failed (empty file)" >&2; exit 1; }
sqlite3 "${TMP}/homebase.db" 'PRAGMA integrity_check;' | grep -q '^ok$' || {
  echo "Downloaded DB failed integrity check — local DB untouched" >&2
  exit 1
}

if [ -f "$LOCAL" ]; then
  BACKUP="server/data/homebase.backup.$(date +%Y%m%d-%H%M%S).db"
  cp "$LOCAL" "$BACKUP"
  echo "Local DB backed up to ${BACKUP}"
fi

mkdir -p server/data
mv "${TMP}/homebase.db" "$LOCAL"
rm -f "${LOCAL}-wal" "${LOCAL}-shm"
rmdir "$TMP" 2>/dev/null || true

echo "Done — local DB now matches prod. Restart the dev server if it's running."
