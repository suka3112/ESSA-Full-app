#!/bin/bash
###############################################################################
#  GitHub Pull  –  double-click to get the latest "develop" code
#
#  - Warns you first if you have local work that is NOT pushed yet
#  - Backs up any local edits to _backup_local_changes/ (via ESSA.command pull)
#  - Re-applies the local-dev settings (ports, DB, password login)
#  - Installs new npm packages if package.json changed
###############################################################################
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
REPOS="vp-fe-essa vp-be-essa"
LOCAL_ONLY="^(\.env|\.env\.dev|src/index\.ts|src/components/Auth/Login/index\.jsx)$"

pause() { [ -t 0 ] && read -rp "Press Enter to close this window..." _ || true; }

# 1. Anything local that would be replaced?
pending=""
for name in $REPOS; do
  dir="$ROOT/$name"; [ -d "$dir/.git" ] || continue
  files="$(git -C "$dir" --no-optional-locks status --porcelain | awk '{print $NF}' | grep -Ev "$LOCAL_ONLY")"
  ahead="$(git -C "$dir" rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)"
  if [ -n "$files" ] || [ "${ahead:-0}" != "0" ]; then
    pending="yes"
    echo ""; echo "⚠️  $name has work that is not on GitHub yet:"
    [ -n "$files" ] && echo "$files" | sed 's/^/      /' | head -25
    [ "${ahead:-0}" != "0" ] && echo "      + $ahead local commit(s) not pushed"
  fi
done
if [ -n "$pending" ]; then
  echo ""
  echo "Pulling will REPLACE these files with GitHub's version."
  echo "(A copy is saved in _backup_local_changes/, but it is safer to push first with 'GitHub Push.command'.)"
  read -rp "Type PULL to continue anyway, or press Enter to cancel: " a
  [ "$a" = "PULL" ] || { echo "Cancelled – nothing changed."; pause; exit 0; }
fi

# 2. Pull (clone if missing, fetch, back up, reset to origin/develop, re-apply local patches)
[ -x "$ROOT/ESSA.command" ] || chmod +x "$ROOT/ESSA.command" 2>/dev/null
"$ROOT/ESSA.command" pull || { echo "❌ Pull failed – see messages above."; pause; exit 1; }

# 3. Install packages if needed
for name in $REPOS; do
  dir="$ROOT/$name"; [ -f "$dir/package.json" ] || continue
  if ( cd "$dir" && node -e 'const p=require("./package.json"),fs=require("fs");const a={...p.dependencies,...p.devDependencies};process.exit(Object.keys(a).some(x=>!fs.existsSync("node_modules/"+x))?0:1)' ) 2>/dev/null; then
    echo ">>> Installing new packages in $name..."
    ( cd "$dir" && npm install --no-audit --no-fund 2>&1 | tail -3 )
  fi
done

echo ""
for name in $REPOS; do
  [ -d "$ROOT/$name/.git" ] && echo "✅ $name @ $(git -C "$ROOT/$name" log -1 --format='%h  %s  (%cr)')"
done
echo "Next: double-click 'Run App.command' (it applies any new DB migrations)."
pause
