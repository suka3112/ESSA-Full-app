#!/bin/bash
###############################################################################
# ESSA – One-time LOCAL DATABASE setup  (PostgreSQL, for the Full App build)
#
# Stands up a PostgreSQL 16 container via Docker with:
#   host=localhost  port=5432  user=postgres  password=root  database=vendor_portal
#
# Then runs every SQL migration in vp-be-essa/db/migrations/ (in order),
# and seeds the ESSA login users.
#
# HOW TO RUN: double-click this file, or ./setup-local-db.command
# REQUIREMENT: Docker Desktop installed and running.
###############################################################################
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BE_DIR="$SCRIPT_DIR/vp-be-essa"

CONTAINER="essa-pg"
PG_PASSWORD="root"
DB_NAME="vendor_portal"
DB_USER="postgres"
IMAGE="postgres:16"

echo "==================================================="
echo " ESSA – local PostgreSQL setup"
echo "==================================================="

# --- 0. checks ---
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed."
  echo "   Install Docker Desktop (free): https://www.docker.com/products/docker-desktop/"
  read -rp "Press Enter to close..."; exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is installed but not running. Open Docker Desktop and try again."
  read -rp "Press Enter to close..."; exit 1
fi
if [ ! -d "$BE_DIR" ]; then
  echo "❌ vp-be-essa not found. Run github-pull.command first."
  read -rp "Press Enter to close..."; exit 1
fi

# --- 1. start (or reuse) container ---
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' exists — starting it..."
  docker start "$CONTAINER" >/dev/null
else
  echo "Pulling PostgreSQL image (first time only)..."
  docker pull "$IMAGE" || { echo "❌ Failed to pull image."; read -rp "Press Enter..."; exit 1; }
  echo "Starting PostgreSQL..."
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p 5432:5432 "$IMAGE" >/dev/null \
    || { echo "❌ Failed to start container."; read -rp "Press Enter..."; exit 1; }
fi

# --- 2. wait for PG ---
echo -n "Waiting for PostgreSQL to be ready"
READY=0
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    READY=1; break
  fi
  echo -n "."; sleep 2
done
echo ""
[ "$READY" != "1" ] && { echo "❌ PostgreSQL did not become ready in time."; read -rp "Press Enter..."; exit 1; }
echo "✅ PostgreSQL is up."

# --- 3. ensure DB exists (safety, in case of an old container) ---
docker exec "$CONTAINER" psql -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || docker exec "$CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

# --- 4. install BE deps if needed ---
if [ ! -d "$BE_DIR/node_modules" ]; then
  echo "Installing backend dependencies (first run, a few minutes)..."
  ( cd "$BE_DIR" && npm install )
fi

# --- 5. run every migration in order ---
MIG_DIR="$BE_DIR/db/migrations"
if [ -d "$MIG_DIR" ]; then
  echo "Applying migrations from $MIG_DIR ..."
  # Sort by numeric prefix, then filename
  mapfile -t MIGS < <(ls "$MIG_DIR" | grep -E '\.sql$' | sort)
  for f in "${MIGS[@]}"; do
    echo "  -> $f"
    ( cd "$BE_DIR" && npx dotenv -e .env.dev -- npx ts-node db/run-sql-migration.ts "db/migrations/$f" ) \
      || { echo "❌ Migration failed: $f — scroll up for the error."; read -rp "Press Enter..."; exit 1; }
  done
else
  echo "(no migrations folder found, skipping)"
fi

# --- 6. seed ESSA users ---
echo "Seeding ESSA login users..."
( cd "$BE_DIR" && npm run seed:essa-users ) || echo "⚠️  seed:essa-users returned non-zero (may already be seeded)"

echo ""
echo "==================================================="
echo " ✅ DONE. Your local PostgreSQL is ready."
echo ""
echo "   host=localhost  port=5432  db=$DB_NAME  user=$DB_USER  pwd=$PG_PASSWORD"
echo ""
echo " NEXT: run  run-local.command  to start the app."
echo " Then open  http://localhost:9080  (frontend)."
echo "==================================================="
read -rp "Press Enter to close..."
