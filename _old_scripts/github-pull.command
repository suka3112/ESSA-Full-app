#!/bin/bash
###############################################################################
# ESSA – GitHub PULL (develop branch)
#
# Clones vp-fe-essa and vp-be-essa (develop branch) into this folder if they
# are not there yet, otherwise checks out develop and pulls the latest changes
# for both.
#
# HOW TO RUN:
#   • Double-click this file in Finder, OR
#   • In Terminal:  ./github-pull.command
#
# The GitHub token is read (in this order):
#   1. GITHUB_TOKEN environment variable, else
#   2. a local file named ".github-token" sitting next to this script, else
#   3. it will prompt you to type/paste it.
###############################################################################
set -euo pipefail

# Always work from the folder this script lives in (the ESSA folder).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FE_NAME="vp-fe-essa"
BE_NAME="vp-be-essa"
GH_OWNER="Aven-sys"
BRANCH="develop"

# --- resolve the token -------------------------------------------------------
TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f "$SCRIPT_DIR/.github-token" ]; then
  TOKEN="$(tr -d ' \t\r\n' < "$SCRIPT_DIR/.github-token")"
fi
if [ -z "$TOKEN" ]; then
  printf "Enter your GitHub token (input hidden): "
  read -rs TOKEN
  echo
fi
if [ -z "$TOKEN" ]; then
  echo "ERROR: No GitHub token provided. Aborting."
  read -rp "Press Enter to close..."
  exit 1
fi

# --- helper: clone if missing, else pull (always on develop) -----------------
sync_repo () {
  local name="$1"
  local clean_url="https://github.com/${GH_OWNER}/${name}.git"
  local auth_url="https://${TOKEN}@github.com/${GH_OWNER}/${name}.git"

  if [ -d "$SCRIPT_DIR/$name/.git" ]; then
    echo ""
    echo ">>> Pulling latest for $name ($BRANCH) ..."
    # Inject the token only for this operation, then wipe it from git config.
    git -C "$SCRIPT_DIR/$name" remote set-url origin "$auth_url"

    # Fetch the develop branch from origin.
    git -C "$SCRIPT_DIR/$name" fetch origin "$BRANCH"

    # Back up any local changes (tracked + untracked) before we discard them,
    # since GitHub is the source of truth for this pull.
    local repo_dir="$SCRIPT_DIR/$name"
    local has_changes=0
    if ! git -C "$repo_dir" diff --quiet --ignore-submodules HEAD 2>/dev/null; then
      has_changes=1
    fi
    if [ -n "$(git -C "$repo_dir" ls-files --others --exclude-standard)" ]; then
      has_changes=1
    fi
    if [ "$has_changes" -eq 1 ]; then
      local stamp
      stamp="$(date +%Y%m%d-%H%M%S)"
      local backup_dir="$SCRIPT_DIR/_backup_local_changes/${name}-${stamp}"
      mkdir -p "$backup_dir"
      echo ">>> Local changes detected in $name — backing up to:"
      echo "    $backup_dir"
      # Save a patch of tracked changes.
      git -C "$repo_dir" diff HEAD > "$backup_dir/tracked-changes.patch" 2>/dev/null || true
      # Copy any changed / untracked files (excluding .git) into the backup.
      # -z / xargs -0 handles spaces in filenames safely.
      {
        git -C "$repo_dir" ls-files -m -o --exclude-standard -z
      } | (cd "$repo_dir" && xargs -0 -I{} sh -c '
        f="$1"; dest="$2/$f"
        mkdir -p "$(dirname "$dest")"
        cp -p "$f" "$dest" 2>/dev/null || true
      ' _ {} "$backup_dir") || true
    fi

    # Discard local changes now (already backed up above) so the checkout
    # cannot be blocked by modified files.
    git -C "$repo_dir" reset --hard HEAD
    git -C "$repo_dir" clean -fd

    # Force local state to match origin/develop exactly.
    if git -C "$repo_dir" show-ref --verify --quiet "refs/heads/$BRANCH"; then
      git -C "$repo_dir" checkout -f "$BRANCH"
    else
      git -C "$repo_dir" checkout -f -B "$BRANCH" "origin/$BRANCH"
    fi
    git -C "$repo_dir" reset --hard "origin/$BRANCH"
    git -C "$repo_dir" clean -fd

    git -C "$repo_dir" remote set-url origin "$clean_url"
    echo ">>> $name is up to date on $BRANCH (forced to match origin)."
  else
    echo ""
    echo ">>> Cloning $name ($BRANCH) ..."
    git clone -b "$BRANCH" --single-branch "$auth_url" "$SCRIPT_DIR/$name"
    # Remove the token from the stored remote so it is not saved on disk.
    git -C "$SCRIPT_DIR/$name" remote set-url origin "$clean_url"
    echo ">>> Cloned $name on $BRANCH."
  fi
}

echo "==============================================="
echo " ESSA – pulling code from GitHub ($BRANCH)"
echo " Target folder: $SCRIPT_DIR"
echo "==============================================="

sync_repo "$FE_NAME"
sync_repo "$BE_NAME"

echo ""
echo "==============================================="
echo " Done. Both repos are on '$BRANCH' in:"
echo "   $SCRIPT_DIR/$FE_NAME"
echo "   $SCRIPT_DIR/$BE_NAME"
echo "==============================================="
read -rp "Press Enter to close..."
