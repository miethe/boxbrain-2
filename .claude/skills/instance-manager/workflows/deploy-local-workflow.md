---
skill: instance-manager
workflow_id: deploy-local
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
  - docker-compose.yml
  - compose.sh
---

# Deploy Local Workflow

Covers deploying SkillMeat on a local workstation or single server using Docker Compose via `compose.sh`.
Applicable deployment methods: `compose`, and `aws-ec2` when running Compose on EC2.

---

## Profile Selection

| Profile | Backend | Auth | Use When |
|---|---|---|---|
| `local` | SQLite | None | Development, demos, zero-config |
| `local-auth` | SQLite | Clerk | Testing Clerk auth locally |
| `enterprise` | PostgreSQL | Configurable | Enterprise features, full stack |
| `full` | PostgreSQL | Clerk | Everything including Backstage |

For the `enterprise` profile, PostgreSQL is co-located via Compose (not RDS).

---

## Step 1: Prepare Environment File

```bash
# Choose the right template for your profile
cp .env.local.example .env          # for local/local-auth
cp .env.enterprise.example .env     # for enterprise

# Fill in required values
# Minimum for enterprise:
#   DATABASE_URL=postgresql://skillmeat:PASSWORD@postgres:5432/skillmeat
#   SKILLMEAT_ENTERPRISE_PAT_SECRET=<secret>
```

Verify `NEXT_PUBLIC_*` vars are present if using Clerk or non-default API URL — these bake into
the Next.js bundle at build time. See `deploy/CLAUDE.md §NEXT_PUBLIC_* Vars Must Be Threaded`.

---

## Step 2: Start the Stack

```bash
# Local SQLite (no auth)
./compose.sh --profile local up -d --build

# Local SQLite + Clerk auth
./compose.sh --profile local-auth up -d --build

# Enterprise (PostgreSQL)
./compose.sh --profile enterprise up -d --build

# Enterprise with hot-reload (dev mode)
./compose.sh --dev --profile enterprise up -d --build
```

`compose.sh` auto-detects Docker vs Podman. It forwards all `NEXT_PUBLIC_*` vars from `.env`
as Docker build args automatically — no manual `--build-arg` required.

---

## Step 3: Wait for Health

```bash
# API health (wait ~10-15 seconds for migrations to complete)
curl -sf http://localhost:8080/health | python -m json.tool

# Verify OpenAPI path count (degraded if <350)
curl -sS http://localhost:8080/api/v1/openapi.json | \
  python -c "import sys,json; print('Paths:', len(json.load(sys.stdin).get('paths',{})))"

# Web (wait for Next.js startup)
curl -sf http://localhost:3000 -o /dev/null && echo "Web: UP"
```

A healthy enterprise build serves 424+ paths (as of v0.51.0). Local edition serves fewer due
to enterprise-only routers being inactive.

---

## Step 4: Enterprise Seeding (First Run Only)

After a fresh enterprise start or after `down -v`, seed bootstrap data:

```bash
python scripts/seed/run.py \
  --profile minimal \
  --edition enterprise \
  --clerk-user-id <YOUR_CLERK_USER_ID>
```

Validate seeding:

```bash
python scripts/seed/validate_enterprise_seed.py
```

Expected minimums: `enterprise_users >= 1`, `enterprise_collections (is_default=true) >= 1`,
`enterprise_artifacts >= 18`. See `deploy/CLAUDE.md §Enterprise Seeding` for details.

---

## Step 5: Register in Instance Registry

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name local-enterprise \
  --status running \
  --last-deployed "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Stopping the Stack

```bash
# Stop containers, preserve volumes
./compose.sh --profile enterprise down

# Stop and wipe all data (DESTRUCTIVE)
./compose.sh --profile enterprise down -v
```

Always back up PostgreSQL before `down -v`. See `./backup-restore-workflow.md`.

---

## Rebuilding a Single Service

```bash
# Rebuild API image only (after Python changes)
podman build --no-cache -f Dockerfile -t skillmeat-api:local .
./compose.sh --profile enterprise up -d

# Force-recreate after bind-mount file edits
./compose.sh --profile enterprise up -d --no-deps --no-build --force-recreate skillmeat-api
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| API crash-loops with Alembic error | Stale migration stamps or missing revision | See `deploy/CLAUDE.md §Alembic Migration Failures` |
| API reports healthy but serves 0 paths | Degraded startup (migrations ran but failed) | `./compose.sh --profile enterprise down && up -d --build` |
| `NEXT_PUBLIC_AUTH_ENABLED` bakes as `false` | Var missing from `.env` | Add to `.env`; rebuild with `--build` |
| Podman "name is already in use" | Stale pod state | `podman pod rm -f pod_skillmeat` then retry |
| `postgres` DNS resolves to wrong host | aardvark-dns stale state | See `deploy/CLAUDE.md §Podman DNS Resolves to Wrong Host` |
| `pnpm build` fails with EMFILE | Too many open files | `compose.sh` handles via `--ulimit nofile=524288:524288` — verify script is current |
