---
skill: instance-manager
workflow_id: update-instance
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/docs/enterprise-rebuild-procedure.md
  - deploy/CLAUDE.md
---

# Update Instance Workflow

Deploys a new version of SkillMeat to a running instance: image pull (or rebuild), Alembic
migrations, and container restart. Covers all deployment methods.

The canonical reference for the full rebuild procedure is `deploy/docs/enterprise-rebuild-procedure.md`.
This workflow summarizes the key steps and adds per-method instructions.

---

## Pre-Update Checklist

- [ ] Identify target version (git tag or branch)
- [ ] For enterprise: take a database backup before any destructive step
- [ ] For cloud deployments: confirm new images are published to the registry
- [ ] For staging/production: get human approval

---

## Update by Deployment Method

### compose (local workstation)

When source is bind-mounted (dev mode), just restart the API:

```bash
# Pull latest code
git pull origin main

# Restart API (migrations run in entrypoint)
./compose.sh --profile enterprise up -d --no-deps skillmeat-api

# Wait for health
sleep 10
curl -sf http://localhost:8080/health | python -m json.tool
```

When source is NOT bind-mounted (production image mode), rebuild:

```bash
git pull origin main
./compose.sh --profile enterprise up -d --build
```

If `pyproject.toml` changed (new dependencies), force no-cache:

```bash
podman build --no-cache -f Dockerfile -t skillmeat-api:local .
./compose.sh --profile enterprise up -d
```

### aws-ec2 (remote EC2 via SSH)

Follow `deploy/docs/enterprise-rebuild-procedure.md` for the full procedure.

Summary:

```bash
# 1. SSH in
ssh -p <SSH_PORT> -i <SSH_KEY> <SSH_USER>@<HOST>

# 2. Pull latest code
cd /opt/skillmeat/repo
sudo git fetch origin
sudo git checkout <BRANCH_OR_TAG>
sudo git pull

# 3. Rebuild and restart
# (back up DB first if enterprise)
COMPOSE_PROJECT_NAME=skillmeat sudo ./compose.sh --profile enterprise up -d --build

# 4. Verify
sleep 15
curl -sf http://localhost:8080/health | python -m json.tool
PATHS=$(curl -sS http://localhost:8080/api/v1/openapi.json | \
  python -c "import sys,json; print(len(json.load(sys.stdin).get('paths',{})))")
echo "Paths: $PATHS"
```

If Alembic migration fails during restart, see `deploy/CLAUDE.md §Fast Migration Fix Loop`.

### aws-fargate

Update the ECS service by forcing a new task deployment (for the same image version):

```bash
aws ecs update-service \
  --cluster skillmeat-dev-fargate \
  --service skillmeat-dev-fargate-api \
  --force-new-deployment \
  --profile skillmeat

aws ecs update-service \
  --cluster skillmeat-dev-fargate \
  --service skillmeat-dev-fargate-web \
  --force-new-deployment \
  --profile skillmeat
```

To update to a new image version, update `terraform.tfvars` and re-apply:

```bash
# Edit api_image and web_image in terraform.tfvars
make terraform-apply TF_ENV=dev-fargate

# Monitor rollout
aws ecs wait services-stable \
  --cluster skillmeat-dev-fargate \
  --services skillmeat-dev-fargate-api skillmeat-dev-fargate-web \
  --profile skillmeat
```

### azure-aca

Update image version in `terraform.tfvars` and re-apply:

```bash
# Edit api_image and web_image in terraform.tfvars
make terraform-apply TF_PROVIDER=azure TF_ENV=dev-container-apps

# Monitor rollout
az containerapp revision list \
  --name skillmeat-api \
  --resource-group skillmeat-dev-aca-rg \
  --output table
```

---

## Migration-Only Update

When only migration files changed (no code changes in the app layer), restart the API container
to trigger the entrypoint's `alembic upgrade heads`:

```bash
# Docker Compose
docker restart skillmeat_skillmeat-api_1

# Podman Compose
podman restart skillmeat_skillmeat-api_1

# Wait for migrations to complete
sleep 10
docker logs skillmeat_skillmeat-api_1 2>&1 | grep -E 'Alembic|startup complete' | tail -5
```

Note: `restart` only works when source is bind-mounted (dev mode). In production image mode, you
must rebuild the image (`--build`) for code changes to take effect.

---

## Rollback

If the new version has a critical bug:

### compose

```bash
# Revert to previous git state
git stash  # or git checkout <PREVIOUS_TAG>

# Rebuild with old code
./compose.sh --profile enterprise up -d --build
```

If migrations ran and the new schema is incompatible, restore from the pre-update backup:

```bash
./compose.sh --profile enterprise down -v  # wipe new data
# Restore from backup — see ./backup-restore-workflow.md §Restore
./compose.sh --profile enterprise up -d postgres
# Restore dump, then start API+web
```

### aws-fargate

ECS retains previous task definitions. Force deployment with the previous definition:

```bash
# Get previous task definition revision
aws ecs describe-task-definition \
  --task-definition skillmeat-dev-fargate-api \
  --profile skillmeat

# Update service to use previous revision
aws ecs update-service \
  --cluster skillmeat-dev-fargate \
  --service skillmeat-dev-fargate-api \
  --task-definition skillmeat-dev-fargate-api:<PREVIOUS_REVISION> \
  --profile skillmeat
```

---

## Post-Update Registry Update

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name <INSTANCE_NAME> \
  --status running \
  --last-deployed "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```
