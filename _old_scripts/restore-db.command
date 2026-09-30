#!/bin/bash
###############################################################################
# ESSA – Restore Postgres backup into the local essa-pg container
#
# Usage:
#   double-click, or   ./restore-db.command [path-to-backup.sql]
#
# Defaults to DB/essa_backup_1609.sql next to this script.
###############################################################################
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="${1:-$SCRIPT_DIR/DB/essa_backup_1609.sql}"
CONTAINER="essa-pg"
DB_NAME="vendor_portal"
DB_USER="postgres"

echo "==================================================="
echo " ESSA – restoring DB backup"
echo "  file      : $BACKUP"
echo "  container : $CONTAINER"
echo "  database  : $DB_NAME"
echo "==================================================="

# --- pre-flight ---
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed."; read -rp "Press Enter..."; exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is installed but not running. Open Docker Desktop and try again."
  read -rp "Press Enter..."; exit 1
fi
if [ ! -f "$BACKUP" ]; then
  echo "❌ Backup file not found: $BACKUP"; read -rp "Press Enter..."; exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "❌ Container '$CONTAINER' is not running."
  echo "   Run setup-local-db.command once first (Docker Desktop must be running)."
  read -rp "Press Enter..."; exit 1
fi

# --- detect dump format --------------------------------------------------------
FORMAT="custom"
first_bytes="$(head -c 5 "$BACKUP" | tr -d '\0' | head -c 5)"
if [ "$first_bytes" = "PGDMP" ]; then
  FORMAT="custom"
elif file "$BACKUP" 2>/dev/null | grep -qi "ASCII\|UTF-8"; then
  FORMAT="plain"
fi
echo "  format    : $FORMAT   (PGDMP header means pg_dump -Fc)"

# --- copy backup into the container -------------------------------------------
echo ">>> copying $BACKUP into container..."
docker exec "$CONTAINER" bash -c 'rm -f /tmp/essa_backup.dump'
docker cp "$BACKUP" "$CONTAINER":/tmp/essa_backup.dump

# --- kick users off + drop + recreate DB --------------------------------------
echo ">>> dropping and recreating $DB_NAME..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
SQL
if [ $? -ne 0 ]; then
  echo "❌ Could not recreate database. Check the error above."
  read -rp "Press Enter..."; exit 1
fi

# --- restore -------------------------------------------------------------------
echo ">>> restoring backup (this can take a minute)..."
if [ "$FORMAT" = "custom" ]; then
  # -Fc pg_restore. --no-owner / --no-privileges keep it clean on a fresh DB.
  docker exec "$CONTAINER" pg_restore \
      -U "$DB_USER" -d "$DB_NAME" \
      --no-owner --no-privileges --if-exists --clean \
      /tmp/essa_backup.dump
  RC=$?
else
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$BACKUP"
  RC=$?
fi

# pg_restore returns non-zero on warnings even when the data loaded fine.
if [ $RC -ne 0 ]; then
  echo ""
  echo "⚠️  pg_restore reported errors/warnings (rc=$RC)."
  echo "   Usually harmless (ownership / already-exists warnings)."
fi

# --- sanity check --------------------------------------------------------------
echo ""
echo "==================================================="
echo " Post-restore snapshot:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt public.*" 2>&1 | head -25
echo ""
echo " Row count for a few core tables:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 'users' AS t, count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE 'user%'
  UNION ALL SELECT 'employee', count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE 'employee%';
" 2>/dev/null || true

# --- cleanup -------------------------------------------------------------------
docker exec "$CONTAINER" rm -f /tmp/essa_backup.dump >/dev/null 2>&1 || true

echo ""
echo "==================================================="
echo " ✅ Restore finished."
echo ""
echo " NEXT:"
echo "  1. Restart the backend (close its Terminal window, then double-click run-local.command again)."
echo "  2. Open http://localhost:9080/auth/login."
echo "  3. Log in with a user that exists IN THE BACKUP."
echo "     (The old ap.team@essa.com / Essa@2026 seed may or may not be in this dump.)"
echo "==================================================="
read -rp "Press Enter to close..."
