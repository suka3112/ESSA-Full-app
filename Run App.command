#!/bin/bash
###############################################################################
#  Run App  –  double-click to start ESSA locally
#
#  1. Starts the database (Docker "essa-pg"), frees ports, installs packages,
#     starts backend (8095) + frontend (9080) and opens the browser
#     (all via ESSA.command start)
#  2. Applies any new DB migrations the local DB doesn't have yet
#     (e.g. 030_AP_MATCH_RULE_PG.sql for N-Way Matching)
#
#  Login: ap.team@essa.com / Essa@2026  ("Sign in with password")
###############################################################################
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
CONTAINER="essa-pg"; DB="vendor_portal"; PGUSER="postgres"
MIG_DIR="$ROOT/vp-be-essa/db/migrations"

# Migrations to apply automatically when the table they create is missing.
# Format: "<migration file>:<table it creates>"
AUTO_MIGRATIONS="030_AP_MATCH_RULE_PG.sql:AP_MATCH_RULE"

pause() { [ -t 0 ] && read -rp "Press Enter to close this window..." _ || true; }

[ -x "$ROOT/ESSA.command" ] || chmod +x "$ROOT/ESSA.command" 2>/dev/null
"$ROOT/ESSA.command" start || { echo "❌ Start failed – see messages above."; pause; exit 1; }

echo ""
echo ">>> Checking database migrations"
for entry in $AUTO_MIGRATIONS; do
  file="${entry%%:*}"; table="${entry##*:}"
  [ -f "$MIG_DIR/$file" ] || { echo "    (skip) $file not in this code version"; continue; }
  exists="$(docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -Atc "SELECT to_regclass('public.\"$table\"') IS NOT NULL" 2>/dev/null)"
  if [ "$exists" = "t" ]; then
    echo "    ✓ $table already exists"
  else
    echo "    → applying $file"
    docker cp "$MIG_DIR/$file" "$CONTAINER":/tmp/migration.sql \
      && docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 -q -f /tmp/migration.sql \
      && echo "    ✅ $file applied" \
      || echo "    ⚠️  $file failed – run it manually: cd vp-be-essa && npm run migrate:sql -- db/migrations/$file"
    docker exec "$CONTAINER" rm -f /tmp/migration.sql >/dev/null 2>&1
  fi
done

echo ""
echo "✅ ESSA is starting. Frontend: http://localhost:9080/auth/login"
echo "   Backend and frontend logs are in the two new Terminal windows."
pause
