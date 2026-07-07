---
skill: instance-manager
workflow_id: deploy-aws-ec2
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
  - deploy/aws/terraform/envs/dev-ec2/main.tf
  - deploy/aws/README.md
---

# Deploy AWS EC2 Workflow

Deploys SkillMeat to a single EC2 instance running Docker Compose. Suitable for dev and demo
environments. The EC2 instance runs `compose.sh` profiles directly; PostgreSQL for enterprise
edition is co-located (not RDS).

Terraform root: `deploy/aws/terraform/envs/dev-ec2/`

---

## Editions Supported

`local`, `local-auth`, `enterprise` — all compose profiles run on the single EC2 host.
The `compose_profile` Terraform variable controls which profile is active.

---

## Step 1: Configure Terraform Variables

```bash
cd deploy/aws/terraform/envs/dev-ec2
cp terraform.tfvars.example terraform.tfvars
```

Fill in `terraform.tfvars`:

| Variable | Required | Notes |
|---|---|---|
| `name_prefix` | Yes | E.g. `skillmeat-dev` |
| `environment` | Yes | E.g. `dev` |
| `key_name` | Yes | EC2 key pair name in your AWS account |
| `instance_type` | Yes | `t3.medium` minimum for enterprise |
| `compose_profile` | Yes | `local`, `local-auth`, or `enterprise` |
| `allowed_cidrs` | Yes | CIDRs allowed to reach web/API ports |
| `ssh_allowed_cidrs` | Yes | CIDRs allowed SSH access |
| `repo_url` | Yes | GitHub URL to clone SkillMeat |
| `repo_ref` | Yes | Branch or tag to deploy |

For `env_vars` and `secret_env_vars`, populate with the same vars as your local `.env`
(particularly `DATABASE_URL`, `SKILLMEAT_ENTERPRISE_PAT_SECRET` for enterprise).

---

## Step 2: Initialize Terraform

```bash
cd deploy/aws/terraform/envs/dev-ec2
terraform init
```

Or via Makefile:

```bash
make terraform-init TF_ENV=dev-ec2
```

---

## Step 3: Plan and Review

```bash
make terraform-plan TF_ENV=dev-ec2
```

Review the plan output carefully. Confirm:
- EC2 instance type matches intent
- Security groups expose only required ports
- No unexpected resources being destroyed

For staging/production: halt here and get human approval before proceeding to apply.

---

## Step 4: Apply

```bash
make terraform-apply TF_ENV=dev-ec2
```

Terraform user-data bootstraps the instance: installs Docker, clones the repo, writes `.env`
from `env_vars`/`secret_env_vars`, runs `compose.sh --profile <profile> up -d --build`.

Wait 5–10 minutes for initial build completion.

---

## Step 5: Verify Health

Get the instance IP/DNS from Terraform output:

```bash
cd deploy/aws/terraform/envs/dev-ec2
terraform output
```

Then check health:

```bash
INSTANCE_HOST=$(terraform output -raw public_ip_or_dns)

# API health
curl -sf "http://$INSTANCE_HOST:8080/health" | python -m json.tool

# Path count
curl -sS "http://$INSTANCE_HOST:8080/api/v1/openapi.json" | \
  python -c "import sys,json; print('Paths:', len(json.load(sys.stdin).get('paths',{})))"
```

---

## Step 6: Register in Instance Registry

```bash
INSTANCE_HOST=$(cd deploy/aws/terraform/envs/dev-ec2 && terraform output -raw public_ip)

python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name demo-ec2 \
  --host "$INSTANCE_HOST" \
  --api-url "http://$INSTANCE_HOST:8080" \
  --web-url "http://$INSTANCE_HOST:3000" \
  --status running \
  --last-deployed "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Accessing the Instance

For the demo box (standard EC2 key + socat forwarder on port 2222):

```bash
ssh -p 2222 -i ~/.ssh/skillmeat-demo.pem ec2-user@<HOST>
```

For standard EC2 deployments (port 22):

```bash
ssh -i ~/.ssh/skillmeat-aws.pem ec2-user@<HOST>
```

---

## Rebuilding Without Terraform

To redeploy from a new code version without reprovisioning infrastructure:

1. Follow `deploy/docs/enterprise-rebuild-procedure.md` for the full procedure.
2. Key points:
   - Backup DB first (`Phase 1: Backup Current Data`)
   - `COMPOSE_PROJECT_NAME=skillmeat` required if multiple projects on the box
   - Docker (not Podman) on Amazon Linux EC2

```bash
ssh -p 2222 -i ~/.ssh/skillmeat-demo.pem ec2-user@<HOST>
cd /opt/skillmeat/repo
sudo git pull origin main
sudo ./compose.sh --profile enterprise up -d --build
```

---

## Teardown

```bash
make terraform-destroy TF_ENV=dev-ec2
```

This destroys the EC2 instance and all associated resources. Back up PostgreSQL first if
data must be preserved. See `./teardown-workflow.md`.

---

## Known Gotchas

| Issue | Fix |
|---|---|
| Demo box SSH on port 2222 | Pass `-p 2222` to ssh; not the default 22 |
| Multiple compose projects on same box | Always set `COMPOSE_PROJECT_NAME=skillmeat` |
| `down` leaves orphan volumes | Use `docker volume rm skillmeat_*` after confirming new stack is stable |
| Alembic FK DatatypeMismatch | See `deploy/CLAUDE.md §Alembic FK DatatypeMismatch` |
| NEXT_PUBLIC_* bakes to wrong value | Check `.env` on box; vars must be present at build time |
