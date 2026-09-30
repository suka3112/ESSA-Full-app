#!/bin/bash
###############################################################################
# ESSA – GitHub PUSH
#
# Stages, commits and pushes your local changes for the frontend and/or
# backend repo.
#
# HOW TO RUN:
#   • Double-click this file in Finder, OR
#   • In Terminal:  ./github-push.command "your commit message"
#
# It will:
#   • ask which repo(s) to push (frontend / backend / both),
#   • ask for a commit message (or use the one you passed as an argument),
#   • show you the changes, commit, and push to the current branch.
#
# Token resolution is the same as github-pull.command:
#   GITHUB_TOKEN env var  ->  .github-token file  ->  prompt.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FE_NAME="vp-fe-essa"
BE_NAME="vp-be-essa"
GH_OWNER="Aven-sys"

COMMIT_MSG="${1:-}"

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

# --- choose which repos ------------------------------------------------------
echo "Which repo do you want to push?"
echo "  1) Frontend ($FE_NAME)"
echo "  2) Backend  ($BE_NAME)"
echo "  3) Both"
read -rp "Enter 1, 2 or 3: " CHOICE

REPOS=()
case "$CHOICE" in
  1) REPOS=("$FE_NAME") ;;
  2) REPOS=("$BE_NAME") ;;
  3) REPOS=("$FE_NAME" "$BE_NAME") ;;
  *) echo "Invalid choice. Aborting."; read -rp "Press Enter to close..."; exit 1 ;;
esac

# --- commit message ----------------------------------------------------------
if [ -z "$COMMIT_MSG" ]; then
  read -rp "Enter a commit message: " COMMIT_MSG
fi
if [ -z "$COMMIT_MSG" ]; then
  echo "ERROR: Commit message cannot be empty. Aborting."
  read -rp "Press Enter to close..."
  exit 1
fi

push_repo () {
  local name="$1"
  local dir="$SCRIPT_DIR/$name"
  local clean_url="https://github.com/${GH_OWNER}/${name}.git"
  local auth_url="https://${TOKEN}@github.com/${GH_OWNER}/${name}.git"

  if [ ! -d "$dir/.git" ]; then
    echo ">>> SKIPPING $name — not found. Run github-pull first."
    return
  fi

  echo ""
  echo "==============================================="
  echo " Repo: $name"
  echo "==============================================="

  local branch
  branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD)"
  echo "Current branch: $branch"

  # Nothing to commit?
  if [ -z "$(git -C "$dir" status --porcelain)" ]; then
    echo "No local changes to commit. Pushing any un-pushed commits anyway..."
  else
    echo "Changes to be committed:"
    git -C "$dir" status --short
    git -C "$dir" add -A
    git -C "$dir" commit -m "$COMMIT_MSG"
  fi

  echo ">>> Pushing $name ($branch) ..."
  git -C "$dir" remote set-url origin "$auth_url"
  git -C "$dir" push origin "$branch"
  git -C "$dir" remote set-url origin "$clean_url"
  echo ">>> $name pushed."
}

for r in "${REPOS[@]}"; do
  push_repo "$r"
done

echo ""
echo "Done."
read -rp "Press Enter to close..."
