---
schema_version: 2
doc_type: skill_spec
skill_name: instance-manager
skill_version: 0.1.0
status: draft
created: 2026-05-27
updated: 2026-05-27
owner: nick
aligned_app_version: "0.51.0"
source_docs:
  - deploy/CLAUDE.md
  - deploy/docs/enterprise-rebuild-procedure.md
  - deploy/aws/terraform/envs/dev-ec2/main.tf
  - deploy/aws/terraform/envs/dev-fargate/main.tf
  - deploy/azure/terraform/envs/dev-container-apps/main.tf
related_skills:
  - skillmeat-cli
  - dev-execution
affects_commands: []
---

# instance-manager — Skill Specification

> **Reading this file**: Versioned capability contract for the `instance-manager` skill.
> For invocation-time routing, see `SKILL.md` in this same directory.

---

## 1. Purpose & Scope

**Mission**: Agents use this skill to manage the full lifecycle of SkillMeat instances — from
registration and initial deployment through health monitoring, updates, backups, and teardown —
across all supported editions and deployment methods.

This skill provides a single routing surface for instance management work that spans the local
Docker Compose path and the two cloud Terraform paths (AWS and Azure). It codifies the deployment
topology, confirms compatibility between editions and deployment methods, and routes to
workflow-specific docs that contain step-by-step execution guidance.

**In scope**:
- Registering and maintaining the local instance registry (`instances.json`)
- Deploying SkillMeat locally with any compose profile (`local`, `local-auth`, `enterprise`)
- Deploying to AWS EC2 via Terraform (`dev-ec2`, `staging`, `production`)
- Deploying to AWS Fargate + RDS via Terraform (`dev-fargate`, `staging`, `production`)
- Deploying to Azure Container Apps + PostgreSQL via Terraform (`dev-container-apps`, `staging`, `production`)
- Health checks across all registered instances
- Rolling updates to deployed instances (image pull, Alembic migrations, container restart)
- PostgreSQL backup (pg_dump, S3 upload) and restore (pg_restore, RDS snapshot import)
- Teardown with configurable data preservation

**Out of scope**:
- Managing the SkillMeat application itself (artifact CRUD, bundle operations) — use `skillmeat-cli`
- Kubernetes or Helm deployments — no Helm chart exists; use cloud-managed container services
- Multi-region active-active setups — single-region only in current Terraform modules
- CI/CD pipeline authoring (GitHub Actions) — reference `.github/workflows/` directly
- Production database schema migrations authored by agents — Alembic handles this at startup

---

## 2. Capability Coverage

| Intent | Workflow / Section | Canonical Doc |
|---|---|---|
| Register a new SkillMeat instance | `workflows/register-instance-workflow.md` | `./config/instances-schema.json` |
| List all registered instances with status | `workflows/register-instance-workflow.md §List Instances` | — |
| Deregister an instance from the registry | `workflows/register-instance-workflow.md §Deregister` | — |
| Deploy locally with Docker Compose | `workflows/deploy-local-workflow.md` | `deploy/CLAUDE.md §Compose Profiles` |
| Deploy to AWS EC2 (single-instance Compose) | `workflows/deploy-aws-ec2-workflow.md` | `deploy/CLAUDE.md §AWS Terraform`, `deploy/aws/README.md` |
| Deploy to AWS Fargate + RDS | `workflows/deploy-aws-fargate-workflow.md` | `deploy/CLAUDE.md §AWS Terraform`, `deploy/aws/README.md` |
| Deploy to Azure Container Apps + PostgreSQL | `workflows/deploy-azure-workflow.md` | `deploy/CLAUDE.md §Azure Terraform`, `deploy/azure/README.md` |
| Tear down an instance (with data options) | `workflows/teardown-workflow.md` | `deploy/CLAUDE.md §Known Gotchas` |
| Backup PostgreSQL to local or S3 | `workflows/backup-restore-workflow.md §Backup` | `deploy/docs/enterprise-rebuild-procedure.md §Phase 1` |
| Restore PostgreSQL from dump or snapshot | `workflows/backup-restore-workflow.md §Restore` | `deploy/docs/enterprise-rebuild-procedure.md §Phase 5` |
| Check health of registered instances | `workflows/health-check-workflow.md` | `deploy/CLAUDE.md §Known Gotchas (Stale Image)` |
| Update a deployed instance (rolling restart) | `workflows/update-instance-workflow.md` | `deploy/docs/enterprise-rebuild-procedure.md` |

---

## 3. Invariants & Constraints

1. **Registry-first**: Every instance operation must resolve an instance from the registry before
   executing commands. Agents must not hardcode hostnames, ports, or SSH keys — read them from
   `instances.json` via `manage-instances.py get`.

2. **Backup before teardown**: Any teardown of an enterprise instance must offer a backup step.
   Agents must not skip or auto-dismiss the backup prompt, even when `--force` is requested.

3. **Terraform plan before apply**: For any cloud deployment, the `make terraform-plan TF_ENV=<env>`
   command must be shown and its output reviewed before a `terraform-apply` step. Agents must
   never emit an apply command without the preceding plan step.

4. **Edition-method compatibility enforced**: `local` and `local-auth` editions are only deployable
   via `compose` and `aws-ec2`. `enterprise` is deployable via all four methods. Agents must reject
   requests that violate this matrix (see `SKILL.md §Edition × Deployment Compatibility`).

5. **Container runtime consistency**: `docker` is used on the demo EC2 box (`ec2-user`); `podman`
   is used on development workstations. Agents must not mix the two for the same instance.

6. **Health check is path-count-based**: An instance is only confirmed healthy when
   `GET /health` returns 200 AND `GET /api/v1/openapi.json` returns a path count > 350.
   Container-up status alone is insufficient.

7. **Staging and production Terraform requires human confirmation**: Agents operating on
   `staging` or `production` TF environments must surface the plan output and halt for explicit
   user approval before proceeding to apply. This cannot be bypassed autonomously.

8. **`instances.json` is gitignored**: The live registry file contains credentials and must
   never be committed. Only `instances.example.json` is committed. Agents must not `git add`
   `instances.json`.

---

## 4. Enhancement Backlog

- **[BL-1] Automated health polling**: Add a daemon mode to `health-check.sh` that polls all
  registered instances on a configurable interval and writes status back to `instances.json`.
  _Status_: candidate
  _Rationale_: Currently requires manual invocation; polling would enable proactive alerting.

- **[BL-2] Terraform state inspection**: Add workflow for reading Terraform output variables
  (ALB DNS, RDS endpoint, ECS service ARN) into the registry automatically post-apply.
  _Status_: candidate
  _Rationale_: Manual registry update after Terraform apply is error-prone.

- **[BL-3] RDS snapshot support in backup workflow**: Current backup workflow covers `pg_dump`;
  extend to trigger and describe RDS automated snapshots for Fargate deployments.
  _Status_: candidate
  _Rationale_: RDS snapshots are faster and built-in, but require AWS CLI integration not yet coded.

- **[BL-4] Azure Key Vault secret sync**: Workflow for syncing `.env` secrets to Azure Key Vault
  before Terraform apply, replacing manual `app_secrets` var population.
  _Status_: deferred
  _Rationale_: Requires Key Vault CLI tooling; blocked on enterprise Azure rollout prioritization.

- **[BL-5] Multi-instance batch health check with JSON report**: `health-check.sh` currently
  emits human-readable text; add `--json` flag for structured output consumable by monitoring tools.
  _Status_: candidate
  _Rationale_: Enables integration with Grafana dashboards or alerting pipelines.

- **[BL-6] Rolling update with zero-downtime for Fargate**: Current update workflow restarts ECS
  tasks which causes brief downtime. Add support for ECS rolling deployment with minimum healthy
  percent configuration.
  _Status_: deferred
  _Rationale_: Requires ECS service update API integration; current Fargate usage is dev/staging only.

---

## 5. Changelog

### v0.1.0 — 2026-05-27
- Initial SPEC.md drafted
- Capability coverage matrix: 12 intents across 9 workflows
- Status: draft

---

## 6. Integration Points

| Agent / Command | Invocation Pattern | Notes |
|---|---|---|
| `platform-engineer` | `Skill("instance-manager")` | Primary consumer for deployment orchestration |
| `python-backend-engineer` | `Skill("instance-manager")` | References update/migration workflows during backend releases |
| No current `/dev:*` commands load this skill | — | Manual invocation only in v0.1 |

**Co-loaded with**: None required. `skillmeat-cli` is a peer skill for application-layer operations.

---

## 7. Success Signals

- Agents load exactly one workflow file per intent rather than all nine simultaneously.
- The `manage-instances.py` script is invoked before any host-specific command, eliminating
  hardcoded connection strings in agent outputs.
- Teardown workflows always surface the backup prompt before issuing `down -v` or Terraform destroy.
- Cloud deployments always show a `terraform-plan` step before any apply — no bare `apply` in output.
- Health checks return a pass/fail verdict based on OpenAPI path count, not container status alone.
- The `instances.json` file never appears in `git status` (gitignore is effective).
