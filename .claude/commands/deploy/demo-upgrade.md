---
description: In-place upgrade of the live demo EC2 box to a new release on main — pre-flight gate, backup, rebuild, and authed smoke
allowed-tools: Bash, Read, Task
argument-hint: "[version] [--dry-run]"
---

# Demo Upgrade

Load the `enterprise-demo-deploy` skill and run the in-place upgrade procedure for the demo box: `$ARGUMENTS`

## Invocation

Use the `enterprise-demo-deploy` skill to:

1. Run pre-flight checks (confirm release is on `origin/main`, audit migration delta, check env-validator changes)
2. SSH to the box and take the mandatory backup (pg_dump + `.env` + git HEAD + alembic heads)
3. Update the repo, rebuild via `compose.sh`, and restart the stack detached
4. Verify health: path count, alembic heads, log scan, and authenticated smoke
5. Confirm Backstage is untouched

Pass the target `[version]` (e.g. `v0.55.1`) to set `VERSION` in backup dir naming and smoke assertions.

Pass `--dry-run` to execute Phase 0 (pre-flight) only — no SSH, no backup, no cutover.

## Skill

Load `enterprise-demo-deploy` before proceeding. It contains:

- All safety invariants and compose project-pin rules
- Exact commands for each phase (backup, deploy, verify)
- The rollback decision tree (when to restore from pg_dump vs restart)
- The v0.55.0 → v0.55.1 reference example

## Key Invariants

- Always deploy from `main`. Fixes on `development` do not ship until merged.
- Take the backup before any `docker compose` command. Migrations are forward-only.
- All compose ops use `COMPOSE_PROJECT_NAME=skillmeat` (or `-p skillmeat`).
- Authenticated smoke is mandatory — `/health` passing is not sufficient.
