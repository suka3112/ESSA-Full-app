#!/bin/bash
###############################################################################
#  ESSA – ONE script for everything (replaces all the old *.command files)
#
#  Double-click it in Finder  -> shows a menu
#  Or in Terminal:  ./ESSA.command start | stop | pull | push | restore | setup | check | sql "..."
#
#  Frontend  : http://localhost:9080   <- open this in the browser
#  Backend   : http://localhost:8095   (API base /vendor-portal)
#  Database  : Docker container "essa-pg" (postgres:16) -> db vendor_portal, user postgres / root
#  Login     : ap.team@essa.com / Essa@2026   ("Sign in with password")
###############################################################################
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BE_DIR="$ROOT/vp-be-essa";  FE_DIR="$ROOT/vp-fe-essa"
BE_PORT=8095;               FE_PORT=9080
CONTAINER="essa-pg";        DB="vendor_portal";  PGUSER="postgres";  PGPASS="root"
BACKUP_DEFAULT="$ROOT/DB/essa_backup_1609.sql"
GH_OWNER="Aven-sys";        BRANCH="develop"
REPOS="vp-fe-essa vp-be-essa"
# Files changed locally by scripts/apply-local-patches.py – never pushed to GitHub
LOCAL_ONLY_BE=".env.dev src/index.ts"
LOCAL_ONLY_FE=".env src/components/Auth/Login/index.jsx"

say()  { echo ">>> $*"; }
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }
die()  { echo "❌ $*"; pause; exit 1; }
pause(){ [ -t 0 ] && read -rp "Press Enter to continue..." _ || true; }

# ---------------------------------------------------------------- helpers ----
need_repos() { [ -d "$BE_DIR" ] && [ -d "$FE_DIR" ] || die "Code not found. Choose 'Pull latest code' first."; }
need_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed: https://www.docker.com/products/docker-desktop/"
  if ! docker info >/dev/null 2>&1; then
    say "Starting Docker Desktop..."; open -a Docker 2>/dev/null
    for i in $(seq 1 45); do docker info >/dev/null 2>&1 && break; sleep 2; done
    docker info >/dev/null 2>&1 || die "Docker Desktop is not running. Open it and try again."
  fi
}
ensure_pg() {   # start/create the essa-pg container and wait for it
  need_docker
  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
      say "Starting database container $CONTAINER"; docker start "$CONTAINER" >/dev/null
    else
      say "Creating database container $CONTAINER (postgres:16, first time only)"
      docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PGPASS" -e POSTGRES_DB="$DB" \
        -p 5432:5432 postgres:16 >/dev/null || die "Could not start PostgreSQL container."
    fi
  fi
  echo -n ">>> Waiting for PostgreSQL"
  for i in $(seq 1 30); do docker exec "$CONTAINER" pg_isready -U "$PGUSER" >/dev/null 2>&1 && break; echo -n "."; sleep 2; done; echo
  docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 \
    || docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "CREATE DATABASE $DB" >/dev/null
}
psql_db() { docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$DB" "$@"; }
patch_local() { say "Applying local-dev settings (ports, DB, password login)"; python3 "$ROOT/scripts/apply-local-patches.py" || warn "patch script failed – continuing"; }
install_deps() {
  for d in "$BE_DIR" "$FE_DIR"; do
    if [ ! -d "$d/node_modules" ] || ( cd "$d" && node -e 'const p=require("./package.json"),fs=require("fs");const a={...p.dependencies,...p.devDependencies};process.exit(Object.keys(a).some(x=>!fs.existsSync("node_modules/"+x))?0:1)' ); then
      say "Installing dependencies in $(basename "$d") (a few minutes the first time)..."
      ( cd "$d" && npm install --no-audit --no-fund 2>&1 | tail -3 )
    fi
  done
}
seed_users() { say "Seeding login users (safe to repeat)"; ( cd "$BE_DIR" && npm run seed:essa-users 2>&1 | grep -E "created|skip|Default password|rror" | head -12 ) || true; }
free_ports() {
  pkill -f "ts-node src/index.ts" 2>/dev/null; pkill -f "nodemon" 2>/dev/null; pkill -f "react-scripts start" 2>/dev/null
  for p in $BE_PORT $FE_PORT; do
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
      IDS="$(docker ps -q --filter "publish=$p")"; [ -n "$IDS" ] && { say "Stopping Docker container on port $p"; docker stop $IDS >/dev/null; }
    fi
    for pid in $(lsof -nP -tiTCP:$p -sTCP:LISTEN 2>/dev/null | sort -u); do
      say "Stopping $(ps -p "$pid" -o comm=) (pid $pid) on port $p"; kill -9 "$pid" 2>/dev/null
    done
  done
  sleep 1
}
open_term() { osascript -e "tell application \"Terminal\" to do script \"$1\"" -e 'tell application "Terminal" to activate' >/dev/null; }

# ---------------------------------------------------------------- actions ----
do_start() {
  need_repos
  command -v node >/dev/null 2>&1 || die "Node.js is not installed: https://nodejs.org"
  patch_local
  ensure_pg
  free_ports
  install_deps
  say "Starting BACKEND  (port $BE_PORT) in a new Terminal window"
  open_term "cd '$BE_DIR' && echo '=== ESSA BACKEND  http://localhost:$BE_PORT ===' && npm run dev"
  sleep 3
  say "Starting FRONTEND (port $FE_PORT) in a new Terminal window"
  open_term "cd '$FE_DIR' && echo '=== ESSA FRONTEND http://localhost:$FE_PORT ===' && PORT=$FE_PORT BROWSER=none npx react-scripts start"
  echo -n ">>> Waiting for backend"
  for i in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$BE_PORT/vendor-portal" && break; echo -n "."; sleep 2; done; echo
  seed_users
  ( sleep 12 && open "http://localhost:$FE_PORT/auth/login" ) &
  echo ""
  echo "==================================================="
  echo " Frontend -> http://localhost:$FE_PORT/auth/login  (opens shortly)"
  echo " Login    -> ap.team@essa.com / Essa@2026  (Sign in with password)"
  echo " Logs are in the two new Terminal windows. Use 'Stop app' to stop."
  echo "==================================================="
}

do_stop() { free_ports; ok "App stopped (database left running; 'docker stop $CONTAINER' to stop it too)."; }

do_restore() {
  need_repos
  local BACKUP="${1:-$BACKUP_DEFAULT}"
  [ -f "$BACKUP" ] || die "Backup not found: $BACKUP"
  echo "This will ERASE the local database '$DB' and load: $(basename "$BACKUP")"
  if [ -t 0 ]; then read -rp "Type YES to continue: " a; [ "$a" = "YES" ] || { echo "Cancelled."; return; }; fi
  patch_local; free_ports; ensure_pg
  say "Recreating database $DB"
  docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $DB WITH (FORCE);" >/dev/null
  docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "CREATE DATABASE $DB;" >/dev/null || die "Could not create $DB"
  docker cp "$BACKUP" "$CONTAINER":/tmp/essa.dump
  if [ "$(head -c 5 "$BACKUP")" = "PGDMP" ]; then
    say "Restoring (pg_dump custom format)..."
    docker exec "$CONTAINER" pg_restore -U "$PGUSER" -d "$DB" --no-owner --no-privileges /tmp/essa.dump 2>&1 | grep -v "already exists" | tail -10
  else
    say "Restoring (plain SQL)..."
    docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -q -f /tmp/essa.dump 2>&1 | tail -10
  fi
  docker exec "$CONTAINER" rm -f /tmp/essa.dump
  echo "    tables: $(psql_db -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
  install_deps; seed_users
  ok "Database restored. Now choose 'Start app'."
}

do_setup() {   # empty DB + migrations (only if you have NO backup)
  need_repos
  echo "Creates the database from migrations (no data). Use 'Restore' instead if you have a backup."
  if [ -t 0 ]; then read -rp "Continue? (y/N): " a; [ "$a" = "y" ] || [ "$a" = "Y" ] || return; fi
  patch_local; ensure_pg; install_deps
  for f in $(ls "$BE_DIR/db/migrations" | grep -E '\.sql$' | sort); do
    echo "  -> $f"
    ( cd "$BE_DIR" && npx dotenv -e .env.dev -- npx ts-node db/run-sql-migration.ts "db/migrations/$f" ) >/dev/null 2>&1 || warn "$f failed"
  done
  seed_users; ok "Database ready. Now choose 'Start app'."
}

get_token() {
  TOKEN="${GITHUB_TOKEN:-}"
  [ -z "$TOKEN" ] && [ -f "$ROOT/.github-token" ] && TOKEN="$(tr -d ' \t\r\n' < "$ROOT/.github-token")"
  [ -z "$TOKEN" ] && { printf "GitHub token (hidden): "; read -rs TOKEN; echo; }
  [ -n "$TOKEN" ] || die "No GitHub token."
}

do_pull() {
  get_token
  for name in $REPOS; do
    local dir="$ROOT/$name" clean="https://github.com/$GH_OWNER/$name.git" auth="https://$TOKEN@github.com/$GH_OWNER/$name.git"
    if [ ! -d "$dir/.git" ]; then
      say "Cloning $name ($BRANCH)"; git clone -b "$BRANCH" "$auth" "$dir" && git -C "$dir" remote set-url origin "$clean"; continue
    fi
    say "Updating $name ($BRANCH)"
    git -C "$dir" remote set-url origin "$auth"
    if git -C "$dir" fetch origin "$BRANCH"; then
      # keep a copy of any real local work (the local-dev patch files are re-applied, so not backed up)
      if [ -n "$(git -C "$dir" status --porcelain)" ]; then
        local bk="$ROOT/_backup_local_changes/$name-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$bk"
        git -C "$dir" diff HEAD > "$bk/tracked-changes.patch"
        ( cd "$dir" && git ls-files -m -o --exclude-standard | while IFS= read -r f; do mkdir -p "$bk/$(dirname "$f")"; cp -p "$f" "$bk/$f" 2>/dev/null; done )
        echo "    local changes backed up to _backup_local_changes/$(basename "$bk")"
      fi
      git -C "$dir" checkout -q -f -B "$BRANCH" "origin/$BRANCH" && git -C "$dir" clean -fdq
      ok "$name = origin/$BRANCH ($(git -C "$dir" log -1 --format='%h %s'))"
    else
      warn "fetch failed for $name"
    fi
    git -C "$dir" remote set-url origin "$clean"
  done
  patch_local
}

do_push() {
  get_token
  echo "Push which repo?  1) Frontend  2) Backend  3) Both"; read -rp "> " c
  case "$c" in 1) list="vp-fe-essa";; 2) list="vp-be-essa";; 3) list="$REPOS";; *) echo "Cancelled."; return;; esac
  read -rp "Commit message: " msg; [ -n "$msg" ] || { echo "Cancelled."; return; }
  for name in $list; do
    local dir="$ROOT/$name" clean="https://github.com/$GH_OWNER/$name.git"
    local skip="$LOCAL_ONLY_BE"; [ "$name" = "vp-fe-essa" ] && skip="$LOCAL_ONLY_FE"
    echo ""; say "$name  (branch $(git -C "$dir" rev-parse --abbrev-ref HEAD))"
    git -C "$dir" add -A
    # never push the local-only dev patches (ports / DB / password login)
    for f in $skip; do git -C "$dir" reset -q -- "$f" 2>/dev/null; done
    if git -C "$dir" diff --cached --quiet; then echo "    nothing new to commit"; else
      git -C "$dir" diff --cached --stat
      read -rp "Commit & push these files? (y/N): " a; [ "$a" = "y" ] || [ "$a" = "Y" ] || { git -C "$dir" reset -q; echo "    skipped"; continue; }
      git -C "$dir" commit -q -m "$msg"
    fi
    git -C "$dir" remote set-url origin "https://$TOKEN@github.com/$GH_OWNER/$name.git"
    git -C "$dir" push origin HEAD && ok "$name pushed"
    git -C "$dir" remote set-url origin "$clean"
  done
}

do_check() {
  echo "---------------- ESSA health check ----------------"
  command -v node >/dev/null && echo "Node        : $(node -v)" || echo "Node        : ❌ not installed"
  if docker info >/dev/null 2>&1; then echo "Docker      : running"
    if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
      echo "Database    : $CONTAINER running, $(psql_db -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo '?') tables in $DB"
    else echo "Database    : ❌ $CONTAINER not running (Start app will start it)"; fi
  else echo "Docker      : ❌ not running"; fi
  for p in $BE_PORT $FE_PORT; do
    who="$(lsof -nP -iTCP:$p -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $1" pid "$2}')"; echo "Port $p   : ${who:-free}"
  done
  for name in $REPOS; do [ -d "$ROOT/$name/.git" ] && echo "$name  : $(git -C "$ROOT/$name" rev-parse --abbrev-ref HEAD) @ $(git -C "$ROOT/$name" log -1 --format='%h %s')"; done
  echo "---------------------------------------------------"
}

do_sql() {
  ensure_pg
  local q="${1:-}"; [ -z "$q" ] && read -rp "SQL> " q
  [ -n "$q" ] && psql_db -c "$q"
}

# ------------------------------------------------------------------- main ----
run() {
  case "$1" in
    start) do_start;; stop) do_stop;; pull) do_pull;; push) do_push;;
    restore) shift; do_restore "$@";; setup) do_setup;; check) do_check;; sql) shift; do_sql "$@";;
    *) echo "Unknown: $1"; return 1;;
  esac
}
if [ $# -gt 0 ]; then run "$@"; exit $?; fi

while true; do
  echo ""
  echo "=============== ESSA ==============="
  echo "  1) Start app            (daily use)"
  echo "  2) Stop app"
  echo "  3) Pull latest code     (GitHub develop)"
  echo "  4) Push my changes      (GitHub)"
  echo "  5) Restore DB backup    (DB/essa_backup_1609.sql – erases local DB)"
  echo "  6) Fresh empty DB       (migrations only – rarely needed)"
  echo "  7) Health check"
  echo "  8) Run SQL"
  echo "  0) Exit"
  read -rp "Choose: " c
  case "$c" in
    1) run start;; 2) run stop;; 3) run pull;; 4) run push;; 5) run restore;;
    6) run setup;; 7) run check;; 8) run sql;; 0|q) exit 0;; *) echo "?";;
  esac
done
