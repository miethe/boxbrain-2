---
name: enterprise-demo-deploy
description: "Guides the in-place upgrade of the live SkillMeat demo EC2 box to a new release on main. Use when running /deploy:demo-upgrade, deploying a new release to the enterprise demo box, performing a pre-flight migration audit, backing up the demo database, or verifying a post-deploy authed smoke path. Third person: this skill encodes the decision and safety logic for idempotent, repeatable in-place upgrades — not net-new EC2 provisioning."
---

# Enterprise Demo Deploy Skill

Canonical in-place upgrade procedure for the SkillMeat demo box (`i-0fb181930b52ce243`, EIP `16.59.188.76`). Covers pre-flight gating, backup-as-rollback, deploy, and verified post-deploy smoke. The detailed instance facts, network wiring, and rollback restore commands live in the authoritative ops docs — this skill provides the decision logic those docs do not centralize.

## Authoritative References

| Doc | Read for |
|-----|----------|
| `deploy/docs/aws-ec2-deployment-facts.md` | Instance IDs, EIP, 3-stack inventory, `.env` handling, storage constraints, security carry-forwards |
| `deploy/docs/enterprise-rebuild-procedure.md` | Phase-by-phase rebuild (pg_dump format, pg_restore, volume namespacing) — the rollback path for failed migrations |
| `deploy/CLAUDE.md` | `compose.sh` gotchas, `NEXT_PUBLIC_*` build-arg threading, Alembic failure modes, ulimit, degraded-surface diagnosis |

Do not duplicate content from those docs. Reference them by path.

---

## Box Identity (Fixed Facts)

```
Instance:   i-0fb181930b52ce243  (t3.xlarge, us-east-2a)
EIP:        16.59.188.76
SSH:        ssh -p 2222 -i ~/.ssh/skillmeat-demo.pem ec2-user@16.59.188.76
Runtime:    docker (rootless, ec2-user)
Repo:       /opt/skillmeat/repo   (root-owned; use sudo for git ops)
Env file:   /opt/skillmeat/repo/.env  (ec2-user-owned, 600)
```

**Compose project is `skillmeat`** — all compose ops MUST use `-p skillmeat` or `COMPOSE_PROJECT_NAME=skillmeat`. An unscoped `docker compose down` from `/opt/skillmeat/repo` kills Backstage (project `repo`). See `deploy/docs/aws-ec2-deployment-facts.md` §3-Stack Inventory.

---

## When to Use This Skill

- Deploying a tagged release to the demo box
- Running a dry-run audit of migration/env delta before touching the box
- Recovering from a failed deploy (migration crash-loop, API won't boot)
- Verifying post-deploy box health (authed smoke, OpenAPI path count)

**Not this skill**: net-new EC2 provisioning, EIP reassociation, AMI snapshots, Backstage wiring. See `deploy/docs/aws-ec2-deployment-facts.md` §EIP / Same-IP Replacement Procedure.

---

## Safety Invariants

1. **Deploys from `main` only.** Fixes on `development` do not ship until merged. Verify the target release is on `origin/main` before SSHing.
2. **Migrations are forward-only.** `git checkout` rollback does NOT work once the DB is stamped at new heads. The only rollback is pg_dump restore (see §Rollback).
3. **Backup before cutover.** Take pg_dump + record HEAD + alembic heads before any `docker compose` changes. No exceptions.
4. **Authenticated smoke is mandatory.** A stale/degraded image can pass `/health` while serving a broken auth surface. Always hit an authed path post-deploy.
5. **Backstage must remain up.** After every compose operation, confirm `repo-backstage-1` is still `Up`.

---

## Phase 0: Pre-flight (Gate — Run Locally)

Do NOT SSH to the box until these pass.

### 0.1 Confirm release is on main

```bash
git fetch origin --tags
git log origin/main -1 --oneline          # Must show target release commit
git ls-remote origin | grep <version>     # Must show the tag
```

If the commit is only on `development` → stop. Merge to main first.

### 0.2 Migration delta audit

Compute migration files added since the box's current HEAD:

```bash
# Substitute <box_HEAD> with the SHA recorded in the last backup, or get it via SSH:
#   ssh ... "cd /opt/skillmeat/repo && sudo git rev-parse HEAD"
git diff --name-only <box_HEAD>..origin/main | grep migrations/versions
```

For each new migration file, read the header and verify:
- **Dialect guard**: does it have `dialect_compatibility = "postgresql_only"`? (OK if yes — the entrypoint already filters by dialect.)
- **Idempotency**: `IF NOT EXISTS` guards or conditional logic?
- **Head count**: How many `Revisions` are declared? The entrypoint runs `alembic upgrade heads` (plural) so multiple heads are fine on the box. Note: `deploy/production/deploy.sh` uses singular `head` — irrelevant to the box but worth noting if this migration targets production later.
- **FK column types**: Enterprise FK columns must use `postgresql.UUID`, not `sa.Text()`. See `deploy/CLAUDE.md` §Alembic FK DatatypeMismatch.

Trigger for elevated caution: any migration that ALTERs a table shared between local and enterprise schema, adds a `NOT NULL` column without a `server_default`, or touches `enterprise_users`.

### 0.3 Env-validator delta

```bash
git diff <box_HEAD>..origin/main -- skillmeat/api/config.py
```

Since v0.54, startup has **strict enterprise validators** that crash-loop the API after migrations succeed:
- `SKILLMEAT_CORS_ORIGINS` must be an explicit JSON allowlist — wildcards are rejected.
- A Redis coordination store is required UNLESS `SKILLMEAT_REDIS_HOST_PROVIDED=true` is set in `.env`.

If `config.py` changed in the delta: diff the validators, then SSH to the box and pre-check `.env` before cutover:

```bash
ssh -p 2222 -i ~/.ssh/skillmeat-demo.pem ec2-user@16.59.188.76
grep -E "SKILLMEAT_CORS_ORIGINS|SKILLMEAT_REDIS" /opt/skillmeat/repo/.env
```

If either key is missing or wrong, fix `.env` on the box before proceeding. A crash-loop after migrations have committed is the worst outcome.

---

## Phase 1: Backup (Mandatory — the Only Rollback Path)

```bash
ssh -p 2222 -i ~/.ssh/skillmeat-demo.pem ec2-user@16.59.188.76

VERSION="<target-version>"   # e.g. v0.55.1
BACKUP_DIR="/opt/skillmeat/upgrade-backup-$(date +%Y%m%d-%H%M%S)-${VERSION}"
sudo mkdir -p "$BACKUP_DIR"

# Custom-format dump (faster restore)
sudo docker exec skillmeat-skillmeat-api-1 \
  bash -c "pg_dump -U skillmeat -d skillmeat --format=custom" \
  > "$BACKUP_DIR/skillmeat.dump"

# Plain SQL fallback
sudo docker exec skillmeat-skillmeat-api-1 \
  bash -c "pg_dump -U skillmeat -d skillmeat" \
  > "$BACKUP_DIR/skillmeat.sql"

# Env snapshot
sudo cp /opt/skillmeat/repo/.env "$BACKUP_DIR/.env.bak"

# Record current state
cd /opt/skillmeat/repo
sudo git rev-parse HEAD > "$BACKUP_DIR/git-head.txt"
sudo docker exec skillmeat-skillmeat-api-1 \
  alembic -c skillmeat/cache/migrations/alembic.ini current \
  > "$BACKUP_DIR/alembic-heads.txt"

echo "Backup complete: $BACKUP_DIR"
ls -lah "$BACKUP_DIR"
```

Verify the dump is non-empty (`ls -lh "$BACKUP_DIR/skillmeat.dump"` should be several MB). An empty dump means the exec failed silently.

> The `pg_dump` exec target is `skillmeat-skillmeat-api-1` because it carries the psql client and the `DATABASE_URL` env. Alternatively target `skillmeat-postgres-1` directly with `-U skillmeat`. Both reach the same DB.

---

## Phase 2: Deploy

### 2.1 Update the repo

```bash
cd /opt/skillmeat/repo
sudo git fetch origin --tags
sudo git reset --hard origin/main
sudo git log --oneline -1   # Confirm HEAD == release commit
sudo git status             # Should be clean
# Confirm new migration files are present:
ls skillmeat/cache/migrations/versions/ | sort | tail -5
```

### 2.2 Rebuild and restart (detached, SSH-drop-safe)

Use `compose.sh` — not raw `docker compose build`. It threads `BUILD_SHA` (so `/health.build_sha` populates), forwards all `NEXT_PUBLIC_*` build args, and sets the nofile ulimit for the Next.js build:

```bash
LOGFILE="/opt/skillmeat/upgrade-$(date +%Y%m%d-%H%M%S).log"

sudo bash -c "setsid env COMPOSE_PROJECT_NAME=skillmeat \
  /opt/skillmeat/repo/compose.sh --profile enterprise up -d --build \
  > $LOGFILE 2>&1 < /dev/null &"

echo "Build running in background, PID $!"
echo "Tail log: tail -f $LOGFILE"
```

The `setsid` + redirected stdin ensures the build survives an SSH disconnect.

### 2.3 Monitor until complete

```bash
tail -f $LOGFILE
# In a second terminal:
watch -n 10 "sudo docker ps --filter 'name=skillmeat' --format 'table {{.Names}}\t{{.Status}}'"
```

Migrations auto-run in the API entrypoint (`alembic upgrade heads`). A failed migration exits the container — the container will enter a restart loop rather than come up healthy. That is your failure signal.

Expected final state: all four containers (`skillmeat-skillmeat-api-1`, `-web-1`, `skillmeat-postgres-1`, `-docs-1`) show `Up ... (healthy)`.

---

## Phase 3: Verify

**All steps are required.** Do not mark the deploy complete until authed smoke passes.

### 3.1 Basic health

```bash
curl -s http://16.59.188.76:8080/health | python -m json.tool
```

Check: `status == "healthy"`, `version == "<target-version>"`.

> **`build_sha` is unreliable on this box** — it reads `"unknown"` even when built via `compose.sh` (a known, unresolved quirk; `git rev-parse HEAD` returns empty inside the sudo'd build, likely a git `safe.directory` issue on the root-owned repo). Do **not** treat `build_sha` as the provenance check here. The source of truth is `/health.version` plus the box's `git rev-parse HEAD` (which must equal the release commit). `build_sha` populating is a bonus, not a gate.

### 3.2 OpenAPI path count (degraded-surface detector)

```bash
PATHS=$(curl -s http://16.59.188.76:8080/api/v1/openapi.json | \
  python -c "import sys,json; print(len(json.load(sys.stdin).get('paths',{})))")
echo "OpenAPI paths: $PATHS"
```

A healthy enterprise build serves **450+** paths. Single digits or zero = degraded (migrations failed, uvicorn is up on a catch-all surface only). See `deploy/CLAUDE.md` §Stale Image Can Pass Healthchecks.

### 3.3 Alembic heads

```bash
sudo docker exec skillmeat-skillmeat-api-1 \
  alembic -c skillmeat/cache/migrations/alembic.ini current
```

Output must include all expected new head revision IDs. If you see old heads only, migrations did not run (image cache issue or entrypoint never reached alembic).

### 3.4 Log scan

```bash
sudo docker logs skillmeat-skillmeat-api-1 2>&1 | grep -E "Alembic|ERROR|CRITICAL" | tail -20
```

Repeated `[entrypoint] Starting` lines = restart loop. `ERROR` or `CRITICAL` lines indicate post-migration startup failures (often env-validator rejections).

### 3.5 Authenticated smoke (mandatory)

Log in as the demo admin via the web UI at `http://16.59.188.76:3000` and confirm that artifacts load. This catches auth-surface failures that pass `/health` (see the v0.52 cutover history in `deploy/docs/aws-ec2-deployment-facts.md` §Cutover Log for why this is mandatory).

### 3.6 Backstage isolation check

```bash
sudo docker ps --filter "name=repo-backstage-1" --format "{{.Names}}\t{{.Status}}"
```

Must show `Up`. If missing, Backstage was accidentally stopped by an unscoped `compose down`. Restart: `sudo docker compose -p repo --profile backstage-only up -d`.

---

## Rollback (If Migrations Fail or API Won't Boot)

Migrations are forward-only. Once the DB is stamped at new heads, `git checkout` does not help. The only rollback is a fresh stack from pg_dump:

1. Follow `deploy/docs/enterprise-rebuild-procedure.md` Phase 5 (pg_restore into a fresh postgres volume).
2. Bring up the stack at the previous release commit before starting Phase 5.

The backup taken in Phase 1 of this skill is the restore artifact. Do not delete it until the deploy is confirmed stable.

---

## Post-Deploy

- Retain the backup dir for ~1 week, then `sudo rm -rf "$BACKUP_DIR"`.
- **Security carry-forward** (standing known issue, do not fix inline): the on-instance git remote URL embeds a plaintext GitHub PAT, and the legacy `/opt/skillmeat/docker-compose.yml` contains plaintext secrets. Both are tracked in `deploy/docs/aws-ec2-deployment-facts.md` §3-Stack Inventory. Do not duplicate or remediate here — rotate the PAT when convenient via a dedicated effort.

---

## Reference Example: v0.55.0 → v0.55.1 Upgrade

Worked example so future runs have a reference pattern.

| Field | Value |
|-------|-------|
| Box HEAD before upgrade | `f554d14c5` |
| Target HEAD on main | `471fa9593` |
| Migration delta | 2 files: `ent_082_reconcile_carryforward_enterprise_project_schema`, `20260615_0002_merge_repo_deploy_uuid_default` |
| Migration character | Both idempotent (`IF NOT EXISTS` guards); `ent_082` is `postgresql_only` + reconciles carry-forward schema gaps (adds 4 missing `enterprise_project_*` tables + `enterprise_projects.deleted_at` / `enterprise_deployments.project_branch_id`); `20260615_0002` is a no-op merge migration |
| Box alembic state before | heads `ent_081_merge_uuid_default` + `20260615_0001_repo_deployments` → after: `ent_082...` + `20260615_0002...` (both applied via `upgrade heads`) |
| `config.py` changed? | No — env-validator check was a no-op (`.env` already had `SKILLMEAT_CORS_ORIGINS` + `SKILLMEAT_REDIS_HOST_PROVIDED`) |
| `build_sha` populated? | No — stayed `"unknown"` even via `compose.sh` (known box quirk; verified via `/health.version` + git HEAD instead) |
| Post-deploy path count | 461 (up from 459 pre-deploy) |
| Authed smoke | postgres volume never recreated → data intact (`enterprise_users=7`, `enterprise_artifacts=33`, `artifacts=39`); authed API returns `401` (not `500` — auth path healthy); `ClerkProvider` baked into the web bundle. Final interactive admin login is the human confirmation step. |
| Backstage | `repo-backstage-1` remained `Up` throughout |
| Build time | ~6 min on the `t3.xlarge` (Next.js compile dominates); run detached |

---

## Progressive Disclosure

Exhaustive phase detail and pg_restore commands: `deploy/docs/enterprise-rebuild-procedure.md`

Verification checklist (standalone copy for quick reference without reading SKILL.md): `./reference/verify.md`
