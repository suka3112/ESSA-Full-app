#!/bin/bash
###############################################################################
# ESSA – run SQL against the local Postgres (Docker container essa-pg)
#
#   double-click            -> runs the DEFAULT_SQL below
#   ./run-sql.command "SQL" -> runs the SQL you pass
###############################################################################
set -uo pipefail
CONTAINER="essa-pg"; DB="vendor_portal"; PGUSER="postgres"

DEFAULT_SQL='update "USERS" set "Email"='"'"'suganth@aven-sys.com'"'"' where "Email" = '"'"'admin@essa.com'"'"';'
SQL="${1:-$DEFAULT_SQL}"

if ! docker info >/dev/null 2>&1; then echo "❌ Docker Desktop is not running."; read -rp "Press Enter..."; exit 1; fi
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then echo "❌ container $CONTAINER not running (docker start $CONTAINER)"; read -rp "Press Enter..."; exit 1; fi

echo "==================================================="
echo " SQL -> $CONTAINER / $DB"
echo "==================================================="
echo "$SQL"
echo

echo ">>> BEFORE:"
docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -c \
  'SELECT "ID","Email","Role_id","Is_Active" FROM "USERS" WHERE "Email" IN ('"'"'admin@essa.com'"'"','"'"'suganth@aven-sys.com'"'"');'

echo ">>> RUN:"
docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 -c "$SQL"
RC=$?

echo ">>> AFTER:"
docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -c \
  'SELECT "ID","Email","Role_id","Is_Active" FROM "USERS" WHERE "Email" IN ('"'"'admin@essa.com'"'"','"'"'suganth@aven-sys.com'"'"');'

[ $RC -eq 0 ] && echo "✅ done" || echo "❌ query failed (rc=$RC) — see error above"
read -rp "Press Enter to close..."
