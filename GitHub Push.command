#!/bin/bash
###############################################################################
#  GitHub Push  –  double-click to push the whole ESSA "Full App" folder to
#                  https://github.com/suka3112/ESSA-Full-app
#
#  - Builds a clean snapshot in .essa-full-app-mirror/ (its own git repo) and
#    pushes that, so vp-fe-essa / vp-be-essa keep their own Aven-sys remotes
#  - From vp-fe-essa / vp-be-essa: only files git would track (respects their
#    .gitignore, so no node_modules / build / .env). Local-dev patched files
#    (src/index.ts, Login/index.jsx) are taken from the last commit instead.
#  - NEVER pushed: tokens, .env files, DB/ (SQL dump + user backups),
#    "Testing document " (real invoices), _backup_local_changes, .DS_Store
#  - Uses the token in .github-token-fullapp (or asks for one)
###############################################################################
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
REMOTE="github.com/suka3112/ESSA-Full-app.git"
BRANCH="main"
MIRROR="$ROOT/.essa-full-app-mirror"
TOKEN_FILE="$ROOT/.github-token-fullapp"
SUBREPOS="vp-fe-essa vp-be-essa"
LOCAL_PATCHED="^(src/index\.ts|src/components/Auth/Login/index\.jsx)$"
ENV_FILES="(^|/)\.env(\..*)?$"
# top-level items that are never pushed
EXCLUDE_TOP=".git .essa-full-app-mirror .github-token .github-token-fullapp DB _backup_local_changes .DS_Store $SUBREPOS"
MAX_MB=95   # GitHub rejects files over 100 MB

pause() { [ -t 0 ] && read -rp "Press Enter to close this window..." _ || true; }
die()   { echo "❌ $*"; pause; exit 1; }

# ---- token ------------------------------------------------------------------
TOKEN="${GITHUB_TOKEN:-}"
[ -z "$TOKEN" ] && [ -f "$TOKEN_FILE" ] && TOKEN="$(tr -d ' \t\r\n' < "$TOKEN_FILE")"
if [ -z "$TOKEN" ]; then
  printf "GitHub token (hidden): "; read -rs TOKEN; echo
  [ -n "$TOKEN" ] || die "No GitHub token."
  printf '%s' "$TOKEN" > "$TOKEN_FILE" && chmod 600 "$TOKEN_FILE"
fi
URL="https://x-access-token:${TOKEN}@${REMOTE}"

# ---- mirror repo ------------------------------------------------------------
if [ ! -d "$MIRROR/.git" ]; then
  mkdir -p "$MIRROR"
  git -C "$MIRROR" init -q -b "$BRANCH" || die "git init failed"
  # continue on top of whatever is already on GitHub (if anything)
  if git -C "$MIRROR" fetch -q "$URL" "$BRANCH" 2>/dev/null; then
    git -C "$MIRROR" reset -q FETCH_HEAD
  fi
fi
[ -f "$MIRROR/.git/index.lock" ] && ! pgrep -x git >/dev/null && rm -f "$MIRROR/.git/index.lock"

echo "Building snapshot..."
# wipe the working copy (keep .git), then copy fresh
find "$MIRROR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

skipped=""
copy() {  # copy <src> <dest-relative-to-mirror>
  local src="$1" dst="$MIRROR/$2" mb
  mb=$(( $(stat -f%z "$src" 2>/dev/null || echo 0) / 1048576 ))
  if [ "$mb" -ge "$MAX_MB" ]; then skipped="$skipped\n    $2 (${mb} MB)"; return; fi
  mkdir -p "$(dirname "$dst")" && cp -p "$src" "$dst"
}

# 1) top-level files & folders
for item in "$ROOT"/* "$ROOT"/.[!.]*; do
  [ -e "$item" ] || continue
  base="$(basename "$item")"
  case " $EXCLUDE_TOP " in *" $base "*) continue;; esac
  [ "$base" = "Testing document " ] && continue
  if [ -d "$item" ]; then
    while IFS= read -r -d '' f; do
      rel="${f#$ROOT/}"
      [[ "$rel" =~ $ENV_FILES ]] && continue
      [ "$(basename "$f")" = ".DS_Store" ] && continue
      copy "$f" "$rel"
    done < <(find "$item" -type f -print0)
  else
    [[ "$base" =~ $ENV_FILES ]] && continue
    copy "$item" "$base"
  fi
done

# 2) the two app repos – only files their own git would track
for name in $SUBREPOS; do
  dir="$ROOT/$name"; [ -d "$dir/.git" ] || continue
  while IFS= read -r -d '' rel; do
    [[ "$rel" =~ $ENV_FILES ]] && continue
    [ -f "$dir/$rel" ] || continue
    if [[ "$rel" =~ $LOCAL_PATCHED ]]; then
      # use the committed version, not the local-dev patch
      mkdir -p "$(dirname "$MIRROR/$name/$rel")"
      git -C "$dir" show "HEAD:$rel" > "$MIRROR/$name/$rel" 2>/dev/null || rm -f "$MIRROR/$name/$rel"
    else
      copy "$dir/$rel" "$name/$rel"
    fi
  done < <(git -C "$dir" ls-files -z --cached --others --exclude-standard)
done

# safety net: never commit anything that looks like a GitHub token
while IFS= read -r f; do
  echo "⚠️  excluded (looks like it contains a GitHub token): ${f#$MIRROR/}"; rm -f "$f"
done < <(grep -rIl --exclude-dir=.git -E "gh[pousr]_[A-Za-z0-9]{36}" "$MIRROR" 2>/dev/null)

# ---- show & confirm ---------------------------------------------------------
git -C "$MIRROR" add -A
echo ""
echo "================ What will be pushed to suka3112/ESSA-Full-app ================"
changes="$(git -C "$MIRROR" status --porcelain)"
if [ -n "$changes" ]; then
  echo "$(echo "$changes" | wc -l | tr -d ' ') file(s) changed:"
  echo "$changes" | head -60 | sed 's/^/    /'
  [ "$(echo "$changes" | wc -l)" -gt 60 ] && echo "    ... (more)"
else
  echo "    no changes"
fi
[ -n "$skipped" ] && printf "Skipped (over ${MAX_MB} MB):$skipped\n"
echo "==============================================================================="

if [ -z "$changes" ]; then
  read -rp "Nothing new. Push existing commits anyway? (y/N): " a
  [ "$a" = "y" ] || [ "$a" = "Y" ] || { pause; exit 0; }
else
  read -rp "Commit message: " msg
  [ -n "$msg" ] || msg="Update $(date '+%Y-%m-%d %H:%M')"
  read -rp "Commit & push? (y/N): " a
  [ "$a" = "y" ] || [ "$a" = "Y" ] || { echo "Cancelled."; pause; exit 0; }
  git -C "$MIRROR" commit -q -m "$msg" || die "Commit failed."
fi

echo "Pushing..."
git -C "$MIRROR" push "$URL" "HEAD:$BRANCH" 2>&1 | sed "s/${TOKEN}/***/g"
[ "${PIPESTATUS[0]}" -eq 0 ] || die "Push failed – see messages above."

echo ""
echo "✅ ESSA-Full-app @ $(git -C "$MIRROR" log -1 --format='%h  %s')"
echo "   https://github.com/suka3112/ESSA-Full-app"
pause
