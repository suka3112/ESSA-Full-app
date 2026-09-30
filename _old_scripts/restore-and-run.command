#!/bin/bash
###############################################################################
# ESSA – ONE-SHOT: fix DB + restore backup + seed login + start app
###############################################################################
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BE_DIR="$SCRIPT_DIR/vp-be-essa"
BACKUP="$SCRIPT_DIR/DB/essa_backup_1609.sql"
CONTAINER="essa-pg"; DB="vendor_portal"; PGUSER="postgres"; PGPASS="root"
LOG="$SCRIPT_DIR/restore-and-run.log"
exec > >(tee "$LOG") 2>&1

echo "==================================================="
echo " ESSA – restore DB + start app   ($(date))"
echo "==================================================="

# 0. stop any running backend so it does not hold DB connections
pkill -f "ts-node src/index.ts" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
sleep 1

# 1. docker + container
docker info >/dev/null 2>&1 || { echo "❌ Docker Desktop is not running. Open it, then run this again."; read -rp "Press Enter..."; exit 1; }
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo ">>> starting existing $CONTAINER"; docker start "$CONTAINER" >/dev/null
  else
    echo ">>> creating $CONTAINER (postgres:16)"
    docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PGPASS" -e POSTGRES_DB="$DB" -p 5432:5432 postgres:16 >/dev/null
  fi
fi
echo -n ">>> waiting for postgres"
for i in $(seq 1 30); do docker exec "$CONTAINER" pg_isready -U "$PGUSER" >/dev/null 2>&1 && break; echo -n "."; sleep 2; done; echo

echo ">>> databases currently in $CONTAINER:"
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -Atc "SELECT datname FROM pg_database WHERE NOT datistemplate;" | sed 's/^/    /'

# 2. (re)create the database — force-disconnect anyone attached
echo ">>> recreating database $DB"
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB' AND pid<>pg_backend_pid();" >/dev/null
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $DB WITH (FORCE);"
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DB;" \
  || { echo "❌ could not create $DB"; read -rp "Press Enter..."; exit 1; }

# 3. restore the backup if present
if [ -f "$BACKUP" ]; then
  echo ">>> restoring $BACKUP (pg_dump custom format)"
  docker cp "$BACKUP" "$CONTAINER":/tmp/essa.dump
  docker exec "$CONTAINER" pg_restore -U "$PGUSER" -d "$DB" --no-owner --no-privileges /tmp/essa.dump 2>&1 | grep -v "already exists" | tail -15
  docker exec "$CONTAINER" rm -f /tmp/essa.dump
  echo ">>> tables restored:"
  docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | sed 's/^/    public tables: /'
else
  echo ">>> no backup at $BACKUP — running migrations instead"
  for f in $(ls "$BE_DIR/db/migrations" | grep -E '\.sql$' | sort); do
    echo "    -> $f"
    ( cd "$BE_DIR" && npx dotenv -e .env.dev -- npx ts-node db/run-sql-migration.ts "db/migrations/$f" ) >/dev/null 2>&1 || echo "       (warning: $f failed)"
  done
fi

# 4. make sure the local login user exists (idempotent)
echo ">>> seeding ESSA login users (ap.team@essa.com / Essa@2026)"
( cd "$BE_DIR" && npm run seed:essa-users 2>&1 | grep -E "created|skip|error|Error" | head -15 ) || echo "    (seed reported errors — login may still work if users came from the backup)"

echo ">>> users now in DB:"
docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -Atc \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND lower(table_name) IN ('user','users','vp_user','vp_users');" 2>/dev/null | while read -r t; do
    docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -Atc "SELECT \"Email\" FROM \"$t\" LIMIT 12;" 2>/dev/null \
    || docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -Atc "SELECT email FROM \"$t\" LIMIT 12;" 2>/dev/null
  done | sed 's/^/    /'

# 5. start the app (frees ports, launches BE 8095 + FE 9080, opens browser)
echo ">>> starting the app"
bash "$SCRIPT_DIR/fix-and-run.command" </dev/null &
sleep 1
echo ""
echo " Log saved to: $LOG"
read -rp "Press Enter to close this window..."
