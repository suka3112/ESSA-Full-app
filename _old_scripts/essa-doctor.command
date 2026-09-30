#!/bin/bash
###############################################################################
# ESSA – Doctor
# Tells you WHY login is failing: is a database configured and reachable?
# Double-click this file (or run ./essa-doctor.command in Terminal).
###############################################################################
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVFILE="$SCRIPT_DIR/vp-be-essa/.env.dev"

echo "==============================================="
echo " ESSA Doctor"
echo "==============================================="

if [ ! -f "$ENVFILE" ]; then
  echo "RESULT: No backend env file found at vp-be-essa/.env.dev"
  echo "        The backend has no database settings at all."
  read -rp "Press Enter to close..."; exit 0
fi

# pull values (strip quotes/spaces)
get() { grep -E "^$1=" "$ENVFILE" | head -1 | sed "s/^$1=//" | tr -d '"'"'"' ' ; }
HOST="$(get DB_HOST)"
PORT="$(get DB_PORT)"
DBNAME="$(get DATABASE_NAME)"
USERNAME="$(get DB_USER_NAME)"

echo "Configured in vp-be-essa/.env.dev:"
echo "  DB_HOST        = ${HOST:-(empty)}"
echo "  DB_PORT        = ${PORT:-(empty)}"
echo "  DATABASE_NAME  = ${DBNAME:-(empty)}"
echo "  DB_USER_NAME   = ${USERNAME:-(empty)}"
echo ""

# still placeholders?
case "$HOST" in
  ""|*"<REQUIRED"*)
    echo "RESULT: ❌ No real database configured — DB_HOST is still a placeholder."
    echo "        This is why every login fails: there is no database to check users against."
    echo "        NEXT: you need database details (or a backup) from your team, OR set up a local DB."
    read -rp "Press Enter to close..."; exit 0 ;;
esac

echo "Testing if that database is reachable (10s)..."
node -e '
const net=require("net");
const host=process.argv[1], port=parseInt(process.argv[2]||"1433",10);
const s=net.connect({host,port});
let done=false;
const end=(ok,msg)=>{if(done)return;done=true;console.log(ok?"REACHABLE":"NOT REACHABLE","-",msg);try{s.destroy()}catch(e){};process.exit(ok?0:1)};
s.setTimeout(10000);
s.on("connect",()=>end(true,`connected to ${host}:${port}`));
s.on("timeout",()=>end(false,`timed out connecting to ${host}:${port}`));
s.on("error",e=>end(false,e.message));
' "$HOST" "${PORT:-1433}"
RC=$?

echo ""
if [ $RC -eq 0 ]; then
  echo "RESULT: ✅ A database IS configured and the server is reachable."
  echo "        If login still fails, the users just need to be seeded into it."
  echo "        NEXT: tell Claude 'DB is reachable' and it will seed the login user."
else
  echo "RESULT: ⚠️  A database is configured but the server did NOT respond."
  echo "        Either the host/credentials are wrong, or that database isn't running."
  echo "        NEXT: confirm the details with your team, or set up a local DB."
fi
echo ""
echo "Copy everything above and paste it back to Claude."
read -rp "Press Enter to close..."
