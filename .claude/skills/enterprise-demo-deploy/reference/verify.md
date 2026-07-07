# Post-Deploy Verification Checklist

Quick reference for the verification phase without re-reading SKILL.md. All commands target the live demo box (`16.59.188.76`). Run in order — each check gates the next.

---

## Quick Commands

```bash
BOX="16.59.188.76"
VERSION="<target-version>"   # e.g. v0.55.1

# 3.1 — Health + version
curl -s http://$BOX:8080/health | python -m json.tool
# PASS: status=healthy, version=$VERSION, build_sha non-empty

# 3.2 — Path count (degraded-surface detector)
curl -s http://$BOX:8080/api/v1/openapi.json | \
  python -c "import sys,json; print('paths:', len(json.load(sys.stdin).get('paths',{})))"
# PASS: 450+  |  FAIL: <10 → migrations failed, degraded surface

# 3.3 — Alembic heads (run on box)
sudo docker exec skillmeat-skillmeat-api-1 \
  alembic -c skillmeat/cache/migrations/alembic.ini current
# PASS: new head revision IDs present

# 3.4 — Log scan (run on box)
sudo docker logs skillmeat-skillmeat-api-1 2>&1 | grep -E "Alembic|ERROR|CRITICAL" | tail -20
# PASS: no restart loops, no CRITICAL errors

# 3.5 — Authed smoke: manual
#   Open http://$BOX:3000, log in as demo admin, confirm artifacts page loads

# 3.6 — Backstage isolation (run on box)
sudo docker ps --filter "name=repo-backstage-1" --format "{{.Names}}\t{{.Status}}"
# PASS: Up (not missing, not Exited)
```

---

## Pass / Fail Criteria

| Check | Pass | Fail → Action |
|-------|------|---------------|
| `/health` | `status=healthy`, correct version | Restart loop or crash → check logs §3.4 |
| `build_sha` | — | Reads `"unknown"` on this box even via `compose.sh` (known quirk) — NOT a gate. Use `/health.version` + box `git rev-parse HEAD` as provenance truth. |
| Path count | 450+ | <10 → degraded surface; migrations failed → rollback |
| Alembic heads | New rev IDs present | Old heads only → image cache stale, force `--no-cache` rebuild |
| Log scan | No CRITICAL | CRITICAL lines → usually strict env-validator; fix `.env` then restart API |
| Authed smoke | Artifacts load post-login | 401 loop → auth surface broken despite healthy `/health` → check `enterprise_user_repository.py` |
| Backstage | `Up` | Missing → restart: `sudo docker compose -p repo --profile backstage-only up -d` |

---

## Degraded Surface Diagnosis

If path count is <10 but `/health` is 200:
```bash
# On box — look for repeated entrypoint restarts
sudo docker logs skillmeat-skillmeat-api-1 2>&1 | grep "\[entrypoint\]" | tail -20

# Confirm migration error
sudo docker logs skillmeat-skillmeat-api-1 2>&1 | grep -E "alembic|Can't locate revision" | tail -10
```

Full diagnosis procedure: `deploy/CLAUDE.md` §Stale Image Can Pass Healthchecks While Serving Degraded Surface.

---

## Rollback Trigger

Trigger rollback (restore from Phase 1 pg_dump) if ANY of:
- Path count <10 AND migrations failed (log evidence)
- API won't boot after 2 full restart cycles
- Authed smoke fails with `401` on every request (auth surface broken, not a config tweak)

Rollback procedure: `deploy/docs/enterprise-rebuild-procedure.md` Phase 5.
