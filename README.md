# ESSA — Full App (local)

**There is only ONE script: `ESSA.command`.** Double-click it and pick from the menu.

| # | Menu option | When |
|---|---|---|
| 1 | Start app | Every day. Starts DB, frees ports, starts backend + frontend, opens the browser |
| 2 | Stop app | When you're done |
| 3 | Pull latest code | Get newest `develop` from GitHub (your local edits are backed up to `_backup_local_changes/`) |
| 4 | Push my changes | Commit + push. Local-dev patch files (`.env`, `.env.dev`, `src/index.ts`, Login) are never pushed |
| 5 | Restore DB backup | Load `DB/essa_backup_1609.sql` (erases local DB) |
| 6 | Fresh empty DB | Only if you have no backup |
| 7 | Health check | Something isn't working |
| 8 | Run SQL | Quick query against the local DB |

Terminal shortcuts: `./ESSA.command start | stop | pull | push | restore | check | sql "SELECT 1"`

## Quick buttons (double-click)
| File | Does |
|---|---|
| `Run App.command` | Starts everything (same as ESSA → 1) **and** applies new DB migrations the local DB is missing (e.g. `030_AP_MATCH_RULE_PG.sql` for N-Way Matching) |
| `GitHub Pull.command` | Warns if you have unpushed work, then pulls `develop` (backs up local edits), re-applies local-dev settings, installs new packages |
| `GitHub Push.command` | Lists what changed in each repo, then commits + pushes. Local-dev files (`.env`, `.env.dev`, `src/index.ts`, Login) are never pushed |

All three use `ESSA.command` underneath, so keep it in this folder.

## First time on a new Mac
1. Install **Node.js** and **Docker Desktop**.
2. `ESSA.command` → **3 Pull** → **5 Restore DB** → **1 Start**.

## URLs & login
- Frontend (open this): **http://localhost:9080/auth/login**
- Backend API: http://localhost:8095/vendor-portal (blank in a browser — that's normal)
- Login: **ap.team@essa.com / Essa@2026** → "Sign in with password"
- DB: Docker container `essa-pg`, localhost:5432, postgres / root, db `vendor_portal`

## Folders
- `scripts/` — helpers used by ESSA.command (`apply-local-patches.py`), plus `encrypt-db-password.js`
- `_old_scripts/` — the old scripts this replaces. Safe to delete once you're happy.
- `_backup_local_changes/` — automatic backups made before each pull.
