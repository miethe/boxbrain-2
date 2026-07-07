---
name: instance-manager
description: |
  Manage SkillMeat instance lifecycle across all editions (local, enterprise) and deployment
  methods (Docker Compose, AWS EC2, AWS Fargate, Azure Container Apps). Use this skill when
  registering instances, deploying locally or to cloud, checking instance health, updating
  deployed instances, backing up or restoring PostgreSQL data, or tearing down environments.
  Covers local development with compose.sh, AWS Terraform (dev-ec2, dev-fargate, staging,
  production), and Azure Terraform (dev-container-apps, staging, production).
version: 0.1.0
updated: 2026-05-27
spec: ./SPEC.md
---

# Instance Manager Skill

Lifecycle routing for SkillMeat instances. This file routes to workflow docs.
Do not duplicate workflow steps here — open the matching workflow file only.

---

## Route Table

| User Intent | Workflow Doc | Key Config |
|---|---|---|
| Register a new instance (local or remote) | `./workflows/register-instance-workflow.md` | `./config/instances.json` |
| List or inspect registered instances | `./workflows/register-instance-workflow.md §List` | `./config/instances.json` |
| Deploy locally (any compose profile) | `./workflows/deploy-local-workflow.md` | `deploy/CLAUDE.md`, `docker-compose.yml` |
| Deploy to AWS EC2 (single-instance Compose) | `./workflows/deploy-aws-ec2-workflow.md` | `deploy/aws/terraform/envs/dev-ec2/` |
| Deploy to AWS Fargate + RDS (managed) | `./workflows/deploy-aws-fargate-workflow.md` | `deploy/aws/terraform/envs/dev-fargate/` |
| Deploy to Azure Container Apps + PostgreSQL | `./workflows/deploy-azure-workflow.md` | `deploy/azure/terraform/envs/dev-container-apps/` |
| Tear down an instance | `./workflows/teardown-workflow.md` | `./workflows/backup-restore-workflow.md §Pre-teardown` |
| Backup or restore PostgreSQL data | `./workflows/backup-restore-workflow.md` | `./scripts/backup-postgres.sh` |
| Check health of registered instances | `./workflows/health-check-workflow.md` | `./scripts/health-check.sh` |
| Update a deployed instance (image pull, migrations) | `./workflows/update-instance-workflow.md` | `deploy/docs/enterprise-rebuild-procedure.md` |

---

## Confidence Anchors

Resolve instance names before executing any workflow — ambiguous names cause data loss.

| Situation | Required Action |
|---|---|
| Instance name not in registry | Run `./scripts/manage-instances.py list` before any operation |
| Edition unclear | Check `instances.json` `edition` field: `"local"` or `"enterprise"` |
| Deployment method unclear | Check `deployment_method`: `compose`, `aws-ec2`, `aws-fargate`, `azure-aca` |
| Remote + Compose: which container runtime | Check host; demo box uses `docker`, dev workstations use `podman` |
| Cloud instance with no terraform_root | Block — request path before executing Terraform commands |
| enterprise edition, no database.connection | Block on PostgreSQL connection before running migrations |

---

## Registry

The instance registry lives at `.claude/skills/instance-manager/config/instances.json` (local path, not committed — see `.gitignore`). The example template is at `./config/instances.example.json`.

```bash
# List all instances
python .claude/skills/instance-manager/scripts/manage-instances.py list

# Get details for one instance
python .claude/skills/instance-manager/scripts/manage-instances.py get --name <INSTANCE>

# Register a new instance
python .claude/skills/instance-manager/scripts/manage-instances.py register \
  --name <NAME> --edition <local|enterprise> --method <compose|aws-ec2|aws-fargate|azure-aca> \
  --host <HOST> --api-port <PORT> --web-port <PORT>

# Update instance status
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name <NAME> --status <running|stopped|unknown>
```

---

## Permission Protocol

Require explicit confirmation before:
- Any teardown operation (with or without data wipe)
- Database backup operations targeting a production instance
- Terraform apply on staging or production environments
- Image rebuilds on the live demo box

Read-only operations (list, health-check, registry inspection) do not require confirmation.

---

## Edition × Deployment Compatibility

| Edition | compose | aws-ec2 | aws-fargate | azure-aca |
|---------|---------|---------|-------------|-----------|
| local | Yes | Yes | No | No |
| local-auth | Yes | Yes | No | No |
| enterprise | Yes | Yes | Yes | Yes |

Full matrix with cost and tradeoffs: `./references/deployment-matrix.md`

---

## Key File Locations

| File | Purpose |
|---|---|
| `deploy/CLAUDE.md` | Compose profiles, gotchas, Terraform quick reference |
| `deploy/docs/enterprise-rebuild-procedure.md` | End-to-end rebuild procedure for demo box |
| `deploy/aws/terraform/envs/dev-ec2/` | EC2 Terraform root |
| `deploy/aws/terraform/envs/dev-fargate/` | Fargate Terraform root |
| `deploy/aws/terraform/envs/staging/` | AWS staging root |
| `deploy/aws/terraform/envs/production/` | AWS production root |
| `deploy/azure/terraform/envs/dev-container-apps/` | Azure dev Terraform root |
| `deploy/azure/terraform/envs/staging/` | Azure staging root |
| `deploy/azure/terraform/envs/production/` | Azure production root |
| `docker-compose.yml` | Main compose file (all profiles) |
| `compose.sh` | Podman/Docker wrapper with NEXT_PUBLIC_* forwarding |
| `.env.*.example` | Profile-specific env templates |

---

## Do Not Say

- Do not say "I'll run `compose.sh` directly" — always show the full invocation with profile flag.
- Do not say "tear down the database" without confirming the user wants data deleted — `down -v` is destructive.
- Do not say "just run terraform apply" without showing the full `make terraform-plan TF_ENV=<env>` preview step first.
- Do not claim an instance is healthy based solely on the container being up — verify via `/health` endpoint path count.
- Do not combine `podman` and `docker` commands for the same instance — the demo box uses `docker`; dev workstations use `podman`. Verify before issuing container commands.
- Do not skip the pre-teardown backup recommendation for enterprise instances.
