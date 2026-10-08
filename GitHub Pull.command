#!/bin/bash
###############################################################################
#  GitHub Pull  –  double-click to get the latest "develop" code
#
#  If you have local work that is not on GitHub yet you can choose:
#    K = Keep my changes  (recommended) – pull GitHub's latest, then put your
#        changes back on top. Nothing is lost; conflicts (if any) are listed.
#    R = Replace          – throw local edits away and take GitHub's version
#        (a copy is still saved in _backup_local_changes/)
#  Afterwards: re-applies local-dev settings and installs new npm packages.
###############################################################################
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
REPOS="vp-fe-essa vp-be-essa"
GH_OWNER="Aven-sys"; BRANCH="develop"
LOCAL_ONLY="^(\.env|\.env\.dev|src/index\.ts|src/components/Auth/Login/index\.jsx)$"

pause() { [ -t 0 ] && read -rp "Press Enter to close this window..." _ || true; }
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]'; }

get_token() {
  TOKEN="${GITHUB_TOKEN:-}"
  [ -z "$TOKEN" ] && [ -f "$ROOT/.github-token" ] && TOKEN="$(tr -d ' \t\r\n' < "$ROOT/.github-token")"
  [ -z "$TOKEN" ] && { printf "GitHub token (hidden): "; read -rs TOKEN; echo; }
  [ -n "$TOKEN" ] || { echo "❌ No GitHub token."; pause; exit 1; }
}

backup_local() {   # same backup format as ESSA.command
  local name="$1" dir="$ROOT/$1"
  local bk="$ROOT/_backup_local_changes/$name-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$bk"
  git -C "$dir" diff HEAD > "$bk/tracked-changes.patch"
  ( cd "$dir" && git ls-files -m -o --exclude-standard | while IFS= read -r f; do mkdir -p "$bk/$(dirname "$f")"; cp -p "$f" "$bk/$f" 2>/dev/null; done )
  echo "    backup: _backup_local_changes/$(basename "$bk")"
}

# Clear a stale git lock left by a crashed git process (only if no git is running)
for name in $REPOS; do
  lock="$ROOT/$name/.git/index.lock"
  if [ -f "$lock" ] && ! pgrep -x git >/dev/null; then rm -f "$lock" && echo "(removed stale lock in $name)"; fi
done

# 1. Anything local that isn't on GitHub?
pending=""
for name in $REPOS; do
  dir="$ROOT/$name"; [ -d "$dir/.git" ] || continue
  files="$(git -C "$dir" --no-optional-locks status --porcelain | awk '{ $1=""; sub(/^ /,""); print }' | grep -Ev "$LOCAL_ONLY")"
  ahead="$(git -C "$dir" rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)"
  if [ -n "$files" ] || [ "${ahead:-0}" != "0" ]; then
    pending="yes"
    echo ""; echo "⚠️  $name has work that is not on GitHub yet:"
    [ -n "$files" ] && echo "$files" | sed 's/^/      /' | head -25
    [ "${ahead:-0}" != "0" ] && echo "      + $ahead local commit(s) not pushed"
  fi
done

MODE="keep"
if [ -n "$pending" ]; then
  echo ""
  echo "How do you want to pull?"
  echo "  K = Keep my changes and pull GitHub's latest underneath them   (recommended)"
  echo "  R = Replace my changes with GitHub's version (backup still saved)"
  echo "  Enter = cancel"
  read -rp "Choose K / R: " a
  case "$(lower "$a")" in
    k|keep) MODE="keep" ;;
    r|replace|pull) MODE="replace" ;;
    *) echo "Cancelled – nothing changed."; pause; exit 0 ;;
  esac
fi

# 2. Pull
if [ "$MODE" = "replace" ]; then
  [ -x "$ROOT/ESSA.command" ] || chmod +x "$ROOT/ESSA.command" 2>/dev/null
  "$ROOT/ESSA.command" pull || { echo "❌ Pull failed – see messages above."; pause; exit 1; }
else
  get_token
  problems=""
  for name in $REPOS; do
    dir="$ROOT/$name" clean="https://github.com/$GH_OWNER/$name.git" auth="https://$TOKEN@github.com/$GH_OWNER/$name.git"
    echo ""
    if [ ! -d "$dir/.git" ]; then
      echo ">>> Cloning $name ($BRANCH)"
      git clone -q -b "$BRANCH" "$auth" "$dir" && git -C "$dir" remote set-url origin "$clean"
      continue
    fi
    echo ">>> $name"
    git -C "$dir" remote set-url origin "$auth"
    if ! git -C "$dir" fetch -q origin "$BRANCH"; then
      echo "    ❌ could not reach GitHub"; problems="yes"; git -C "$dir" remote set-url origin "$clean"; continue
    fi
    before="$(git -C "$dir" rev-parse --short HEAD)"
    stashed=""
    if [ -n "$(git -C "$dir" status --porcelain)" ]; then
      backup_local "$name"
      git -C "$dir" stash push -q -u -m "GitHub Pull keep $(date +%Y-%m-%d_%H:%M)" && stashed="yes"
      echo "    your changes are set aside while pulling"
    fi
    current="$(git -C "$dir" rev-parse --abbrev-ref HEAD)"
    [ "$current" = "$BRANCH" ] || git -C "$dir" checkout -q "$BRANCH" 2>/dev/null || git -C "$dir" checkout -q -B "$BRANCH" "origin/$BRANCH"
    if git -C "$dir" merge -q --no-edit "origin/$BRANCH" >/dev/null 2>&1; then
      echo "    ✅ updated $before → $(git -C "$dir" log -1 --format='%h  %s')"
    else
      echo "    ⚠️  your local commits conflict with GitHub – resolve in VS Code, then commit:"
      git -C "$dir" diff --name-only --diff-filter=U | sed 's/^/        /'
      problems="yes"
    fi
    if [ -n "$stashed" ]; then
      if git -C "$dir" stash pop -q >/dev/null 2>&1; then
        echo "    ✅ your changes are back on top"
      else
        echo "    ⚠️  some of your changes overlap with GitHub's – open these files and fix the <<<<<<< / >>>>>>> parts:"
        git -C "$dir" diff --name-only --diff-filter=U | sed 's/^/        /'
        echo "       (your full set of changes is also kept in 'git stash list' and in _backup_local_changes/)"
        problems="yes"
      fi
    fi
    git -C "$dir" remote set-url origin "$clean"
  done
  echo ""
  echo ">>> Applying local-dev settings (ports, DB, password login)"
  python3 "$ROOT/scripts/apply-local-patches.py" || echo "⚠️  patch script failed – continuing"
fi

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
[ "${problems:-}" = "yes" ] && echo "⚠️  Some steps need attention – see the messages above."
echo "Next: double-click 'Run App.command' (it applies any new DB migrations)."
pause
