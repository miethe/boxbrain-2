---
skill: instance-manager
workflow_id: health-check
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
---

# Health Check Workflow

Verifies the health of one or all registered SkillMeat instances. Health is declared only when
both conditions hold: `GET /health` returns 200 AND `GET /api/v1/openapi.json` returns path count > 350.
Container-running status is insufficient.

---

## Quick Health Check (All Instances)

```bash
bash .claude/skills/instance-manager/scripts/health-check.sh
```

Checks every instance in `instances.json` and prints a status table. Updates `last_health_check`
and `status` in the registry for each instance checked.

---

## Single Instance Health Check

```bash
bash .claude/skills/instance-manager/scripts/health-check.sh --instance <NAME>
```

---

## Manual Health Verification

### Step 1: API health endpoint

```bash
API_URL="http://localhost:8080"  # replace with instance api_url

curl -sf "$API_URL/health" | python -m json.tool
```

Expected response fields:

| Field | Healthy Value |
|---|---|
| `status` | `"healthy"` or `"ok"` |
| `database` | `"connected"` (enterprise) |
| `build_sha` | Non-empty SHA (confirms image provenance) |

### Step 2: OpenAPI path count

```bash
PATHS=$(curl -sS "$API_URL/api/v1/openapi.json" | \
  python -c "import sys,json; print(len(json.load(sys.stdin).get('paths',{})))")
echo "Paths: $PATHS"

# Thresholds (as of v0.51.0):
#   enterprise: >= 424 paths
#   local:      >= 350 paths
#   degraded:   < 10 (migration failure or container restart loop)
```

### Step 3: Detect degraded startup (migration failure)

If path count is near 0 or single-digit, check for a restart loop:

```bash
# Docker
docker logs <API_CONTAINER> 2>&1 | grep -E '\[entrypoint\]|Alembic|ERROR|CRITICAL' | tail -20

# Podman
podman logs skillmeat_skillmeat-api_1 2>&1 | grep -E '\[entrypoint\]|Alembic|ERROR|CRITICAL' | tail -20
```

Repeated `[entrypoint] Starting` lines indicate a crash-restart loop.
See `deploy/CLAUDE.md §Stale Image Can Pass Healthchecks While Serving Degraded Surface` for fix.

### Step 4: Check Alembic migration state

```bash
# Verify current migration head matches expectations
docker exec <API_CONTAINER> \
  alembic -c skillmeat/cache/migrations/alembic.ini current

# Verify all heads are in sync
docker exec <API_CONTAINER> \
  alembic -c skillmeat/cache/migrations/alembic.ini heads
```

If heads show `(head)` next to the current revision, migrations are up to date.

### Step 5: Version endpoint

```bash
curl -sS "$API_URL/api/v1/version" | python -m json.tool
```

Returns app version and build SHA. Useful for confirming which release is deployed.

---

## Web Health Check

```bash
WEB_URL="http://localhost:3000"  # replace with instance web_url

# Returns 200 for the root page
curl -sf "$WEB_URL" -o /dev/null -w "%{http_code}" && echo " Web: OK"

# Check that Clerk auth branch survived tree-shaking (enterprise+auth only)
docker exec <WEB_CONTAINER> sh -c \
  'grep -l ClerkProvider /app/.next/static/chunks/*.js | wc -l'
# Nonzero count means Clerk branch is present in the bundle
```

---

## Cloud Instance Health

### AWS ECS (Fargate)

```bash
# Check ECS service stability
aws ecs describe-services \
  --cluster skillmeat-dev-fargate \
  --services skillmeat-dev-fargate-api skillmeat-dev-fargate-web \
  --profile skillmeat \
  --query 'services[*].{name:serviceName,status:status,running:runningCount,desired:desiredCount}'

# Then curl the ALB endpoint
curl -sf "https://<ALB_DNS>/health" | python -m json.tool
```

### Azure Container Apps

```bash
# Check replica status
az containerapp revision list \
  --name skillmeat-api \
  --resource-group skillmeat-dev-aca-rg \
  --output table

# Then curl the FQDN
curl -sf "https://<ACA_FQDN>/health" | python -m json.tool
```

---

## Interpreting Results

| API Result | Path Count | Diagnosis |
|---|---|---|
| HTTP 200, status=healthy | >= 350 | Healthy |
| HTTP 200, status=healthy | < 10 | Degraded — migration failure or restart loop |
| HTTP 200, status=healthy | 1-3 | Degraded — only healthcheck + version + catch-all route active |
| HTTP 000 (connection refused) | — | Down or unreachable |
| HTTP 5xx | — | App error; check logs |

---

## Updating Registry After Health Check

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name <NAME> \
  --status <running|stopped|error> \
  --last-health-check "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```
