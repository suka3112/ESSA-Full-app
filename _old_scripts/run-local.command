#!/bin/bash
###############################################################################
# ESSA – RUN LOCALLY (Full App build)
#
# Actual ports for this build:
#   Backend  -> http://localhost:8095   (API base: /vendor-portal)
#   Frontend -> http://localhost:9080   ← open THIS in your browser
#
# HOW TO RUN:
#   • Double-click this file in Finder, OR
#   • In Terminal:  ./run-local.command
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FE_DIR="$SCRIPT_DIR/vp-fe-essa"
BE_DIR="$SCRIPT_DIR/vp-be-essa"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed. Install it from https://nodejs.org first."
  read -rp "Press Enter to close..."; exit 1
fi

if [ ! -d "$FE_DIR" ] || [ ! -d "$BE_DIR" ]; then
  echo "ERROR: Repos not found. Run github-pull.command first."
  read -rp "Press Enter to close..."; exit 1
fi

if [ ! -f "$BE_DIR/.env.dev" ]; then
  echo "WARNING: vp-be-essa/.env.dev is missing."
  echo "  The current repo ships this file. Run github-pull again, or restore it."
  read -rp "Press Enter to continue anyway..."
fi

# Warn if Postgres doesn't seem to be reachable on 5432 (best-effort, non-fatal).
if command -v nc >/dev/null 2>&1; then
  if ! nc -z localhost 5432 >/dev/null 2>&1; then
    echo ""
    echo "*********************************************************************"
    echo " WARNING: nothing is listening on localhost:5432 (PostgreSQL)."
    echo " The backend will start but DB calls will fail."
    echo " Run  ./setup-local-db.command  first, or start your own Postgres."
    echo "*********************************************************************"
    echo ""
  fi
fi

if [ ! -d "$BE_DIR/node_modules" ]; then
  echo ">>> Installing backend dependencies (first run, this can take a while)..."
  ( cd "$BE_DIR" && npm install )
fi
if [ ! -d "$FE_DIR/node_modules" ]; then
  echo ">>> Installing frontend dependencies (first run, this can take a while)..."
  ( cd "$FE_DIR" && npm install )
fi

echo ">>> Starting backend in a new Terminal window..."
osascript <<EOF
tell application "Terminal"
    do script "cd \"$BE_DIR\" && echo '=== ESSA BACKEND (http://localhost:8095) ===' && npm run dev"
    activate
end tell
EOF

echo ">>> Starting frontend in a new Terminal window..."
osascript <<EOF
tell application "Terminal"
    do script "cd \"$FE_DIR\" && echo '=== ESSA FRONTEND (http://localhost:9080) ===' && PORT=9080 BROWSER=none npx react-scripts start"
    activate
end tell
EOF

# Give the frontend a moment, then open the browser to the FE (not the BE).
( sleep 6 && open "http://localhost:9080" ) &

echo ""
echo "==============================================="
echo " Backend  -> http://localhost:8095   (API)"
echo " Frontend -> http://localhost:9080   ← open THIS one"
echo ""
echo " Two new Terminal windows opened with the logs."
echo " Close them to stop the servers."
echo ""
echo " NOTE: do NOT open localhost:8095/vendor-portal/...  directly."
echo "       That is the backend API + Entra SSO endpoints; it will look"
echo "       blank in a browser."
echo "==============================================="
read -rp "Press Enter to close this window..."
