---
skill: instance-manager
workflow_id: teardown
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
  - deploy/docs/enterprise-rebuild-procedure.md
---

# Teardown Workflow

Covers tearing down SkillMeat instances across all deployment methods, with data preservation options.

**Teardown is destructive.** Always offer the user a backup step before proceeding. For enterprise
instances, execute `./backup-restore-workflow.md §Backup` before any teardown that removes data.

---

## Pre-Teardown Checklist

Before any teardown:
- [ ] Confirm the instance name from the registry: `python manage-instances.py get --name <NAME>`
- [ ] Confirm whether data must be preserved (ask if unclear)
- [ ] For enterprise instances: run backup (see `./backup-restore-workflow.md`)
- [ ] For cloud instances: confirm no dependent services point to this instance
- [ ] For staging/production: require explicit human confirmation

---

## Teardown by Deployment Method

### compose (local or aws-ec2 via SSH)

**Stop only (preserve data):**

```bash
./compose.sh --profile <PROFILE> down
```

Volumes remain intact. Restart later with `up -d`.

**Stop and wipe data (DESTRUCTIVE):**

```bash
# Show what volumes will be deleted before confirming
docker volume ls | grep skillmeat
# or
podman volume ls | grep skillmeat

# Then destroy:
./compose.sh --profile <PROFILE> down -v
```

`-v` removes named volumes including PostgreSQL data, filesystem storage, and all app state.
This cannot be undone without a backup.

**Remote EC2 teardown via SSH:**

```bash
# Get SSH details from registry
python .claude/skills/instance-manager/scripts/manage-instances.py get --name <NAME>

# SSH in
ssh -p <SSH_PORT> -i <SSH_KEY> <SSH_USER>@<HOST>

# On the remote host:
cd /opt/skillmeat/repo  # or wherever the repo is deployed
sudo ./compose.sh --profile enterprise down        # preserve data
# OR
sudo ./compose.sh --profile enterprise down -v     # destroy data
```

For the demo box specifically, set `COMPOSE_PROJECT_NAME=skillmeat` to avoid affecting Backstage:

```bash
COMPOSE_PROJECT_NAME=skillmeat sudo ./compose.sh --profile enterprise down
```

---

### aws-ec2 (Terraform-provisioned)

Terraform destroy removes the EC2 instance and all its associated resources. All data
in the instance's volumes is permanently lost unless a PostgreSQL dump was taken first.

```bash
# Plan what will be destroyed
make terraform-plan TF_ENV=dev-ec2   # review for unexpected resources

# Destroy
make terraform-destroy TF_ENV=dev-ec2
```

Confirm when Terraform prompts: type `yes`.

---

### aws-fargate

```bash
# Plan
make terraform-plan TF_ENV=dev-fargate

# Destroy (removes ECS services, ALB, RDS, VPC)
make terraform-destroy TF_ENV=dev-fargate
```

RDS data is permanently deleted (dev-fargate has `db_skip_final_snapshot = true` and
`db_deletion_protection = false`). Take an RDS snapshot before destroying if data must be kept:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier skillmeat-dev-fargate-db \
  --db-snapshot-identifier "skillmeat-pre-teardown-$(date +%Y%m%d)" \
  --profile skillmeat
```

---

### azure-aca

```bash
# Plan
make terraform-plan TF_PROVIDER=azure TF_ENV=dev-container-apps

# Destroy
make terraform-destroy TF_PROVIDER=azure TF_ENV=dev-container-apps
```

This removes the Container Apps Environment, PostgreSQL Flexible Server, Key Vault, and
Log Analytics Workspace. PostgreSQL data is permanently lost.

To preserve data, take a backup before destroy:

```bash
# Azure DB for PostgreSQL Flexible Server backup (managed snapshot)
az postgres flexible-server backup list \
  --resource-group skillmeat-dev-aca-rg \
  --name <PG_SERVER_NAME>
```

---

## Post-Teardown Registry Update

After successful teardown, update the registry to reflect the stopped state:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name <INSTANCE_NAME> \
  --status stopped
```

If the instance will not be used again, deregister it:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py deregister \
  --name <INSTANCE_NAME>
```

---

## Rollback (Compose only)

If a compose teardown was done without `-v`, the stack can be restored:

```bash
./compose.sh --profile <PROFILE> up -d
```

Volumes persist after `down` without `-v`. Data is intact.

If `-v` was used (volumes deleted), restoration requires a database backup. See
`./backup-restore-workflow.md §Restore`.

---

## Partial Teardown: Remove Containers but Keep DB Volume

To wipe containers and images while keeping the database volume (useful when resetting to a clean
app state while preserving user data):

```bash
# Down without -v preserves volumes
./compose.sh --profile enterprise down

# Remove images to force clean rebuild
docker rmi skillmeat-api:local skillmeat-web:local 2>/dev/null || true
podman rmi skillmeat-api:local skillmeat-web:local 2>/dev/null || true

# Restart (will rebuild images)
./compose.sh --profile enterprise up -d --build
```
