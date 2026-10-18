#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

docker exec letstalk-postgres-1 pg_dump -U postgres letstalk_db > "$BACKUP_DIR/letstalk-$TIMESTAMP.sql"

printf "Backup created: %s\n" "$BACKUP_DIR/letstalk-$TIMESTAMP.sql"
