#!/bin/bash
###############################################################################
# ESSA – FIX PORT CONFLICTS + RUN
#
# 1. Shows what is currently holding ports 8090 (BE) and 9080 (FE)
# 2. Stops any Docker container publishing those ports (other projects)
# 3. Kills any stray local node/react processes on those ports
# 4. Starts the Full App backend + frontend fresh
# 5. Opens http://localhost:9080/auth/login
###############################################################################
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BE_DIR="$SCRIPT_DIR/vp-be-essa"
FE_DIR="$SCRIPT_DIR/vp-fe-essa"
BE_PORT=8095
FE_PORT=9080

echo "==================================================="
echo " ESSA – fixing port conflicts, then starting app"
echo "==================================================="

# --- 0. re-apply local patches (survives git pull / reset) ---------------
echo ">>> applying local dev patches..."
python3 "$SCRIPT_DIR/apply-local-patches.py" || echo "   (patch script failed — continuing)"

# --- 0b. make sure the DB the backend expects really exists in essa-pg ---
if docker info >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx essa-pg; then
  docker exec essa-pg psql -U postgres -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='vendor_portal'" | grep -q 1 \
    || { echo ">>> creating vendor_portal in essa-pg"; docker exec essa-pg psql -U postgres -d postgres -c "CREATE DATABASE vendor_portal" >/dev/null; }
fi

# --- 1. report -------------------------------------------------------------
for p in $BE_PORT $FE_PORT 9081; do
  echo ""
  echo ">>> Port $p is held by:"
  lsof -nP -iTCP:$p -sTCP:LISTEN 2>/dev/null || echo "    (nothing)"
done

# --- 2. stop docker containers that publish these ports --------------------
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  for p in $BE_PORT $FE_PORT; do
    IDS="$(docker ps -q --filter "publish=$p" 2>/dev/null)"
    if [ -n "$IDS" ]; then
      echo ""
      echo ">>> Docker container(s) publishing port $p — stopping them:"
      docker ps --filter "publish=$p" --format '    {{.Names}}  ({{.Image}})  {{.Ports}}'
      docker stop $IDS >/dev/null && echo "    stopped."
    fi
  done
else
  echo ""
  echo "(Docker not running — skipping container check)"
fi

# --- 3. kill stray local processes on these ports (not Docker itself) ------
for p in $BE_PORT $FE_PORT 9081; do
  PIDS="$(lsof -nP -tiTCP:$p -sTCP:LISTEN 2>/dev/null | sort -u)"
  for pid in $PIDS; do
    CMD="$(ps -p "$pid" -o comm= 2>/dev/null)"
    case "$CMD" in
      *docker*|*Docker*) echo ">>> Port $p held by Docker ($CMD) — container should already be stopped above." ;;
      *) echo ">>> Killing $CMD (pid $pid) on port $p"; kill -9 "$pid" 2>/dev/null ;;
    esac
  done
done
# also kill any orphan ESSA dev servers
pkill -f "ts-node src/index.ts" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
sleep 2

# --- 4. verify ports are free ----------------------------------------------
for p in $BE_PORT $FE_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    echo ""
    echo "❌ Port $p is STILL in use:"
    lsof -nP -iTCP:$p -sTCP:LISTEN
    echo "   Stop that process/container manually, then run this again."
    read -rp "Press Enter to close..."; exit 1
  fi
done
echo ""
echo "✅ Ports $BE_PORT and $FE_PORT are free."

# --- 5. sanity: Postgres up? ----------------------------------------------
if ! lsof -nP -iTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  Nothing on port 5432 — start Postgres:  docker start essa-pg"
  docker start essa-pg >/dev/null 2>&1 && echo "   started essa-pg." || echo "   could not start essa-pg (run setup-local-db.command)."
  sleep 3
fi

# --- 6. launch -------------------------------------------------------------
deps_missing () {  # $1 = project dir ; exit 0 if something from package.json is not installed
  ( cd "$1" && node -e 'const p=require("./package.json"),fs=require("fs");const a={...p.dependencies,...p.devDependencies};process.exit(Object.keys(a).some(d=>!fs.existsSync("node_modules/"+d))?0:1)' )
}
for d in "$BE_DIR" "$FE_DIR"; do
  if [ ! -d "$d/node_modules" ] || deps_missing "$d"; then
    echo ">>> installing dependencies in $(basename "$d") (can take a few minutes)..."
    ( cd "$d" && npm install --no-audit --no-fund 2>&1 | tail -3 )
  fi
done

echo ">>> Starting backend (port $BE_PORT) in a new Terminal window..."
osascript <<EOF
tell application "Terminal"
    do script "cd \"$BE_DIR\" && echo '=== ESSA BACKEND (http://localhost:$BE_PORT) ===' && npm run dev"
    activate
end tell
EOF

sleep 4
echo ">>> Starting frontend (port $FE_PORT) in a new Terminal window..."
osascript <<EOF
tell application "Terminal"
    do script "cd \"$FE_DIR\" && echo '=== ESSA FRONTEND (http://localhost:$FE_PORT) ===' && PORT=$FE_PORT BROWSER=none npx react-scripts start"
    activate
end tell
EOF

# --- 7. wait for BE, then prove it's OURS ---------------------------------
echo -n ">>> Waiting for backend"
for i in $(seq 1 40); do
  if curl -s -o /dev/null http://localhost:$BE_PORT/vendor-portal 2>/dev/null; then break; fi
  echo -n "."; sleep 2
done
echo ""
echo ">>> seeding local login users (idempotent)..."
( cd "$BE_DIR" && npm run seed:essa-users 2>&1 | grep -E "created|skip|Default password|rror" | head -12 )

echo ">>> CORS check (must echo localhost:$FE_PORT, NOT 7000):"
curl -s -o /dev/null -D - -H "Origin: http://localhost:$FE_PORT" \
  -H "Content-Type: application/json" \
  -d '{"email":"ap.team@essa.com","password":"Essa@2026"}' \
  http://localhost:$BE_PORT/vendor-portal/users/login 2>/dev/null | grep -i "access-control-allow-origin\|^HTTP" || echo "    (backend not answering yet — check its Terminal window)"

( sleep 15 && open "http://localhost:$FE_PORT/auth/login" ) &

echo ""
echo "==================================================="
echo " Backend  -> http://localhost:$BE_PORT"
echo " Frontend -> http://localhost:$FE_PORT/auth/login   (opens shortly)"
echo " Login    -> ap.team@essa.com / Essa@2026  (Sign in with password)"
echo "==================================================="
read -rp "Press Enter to close this window..."
