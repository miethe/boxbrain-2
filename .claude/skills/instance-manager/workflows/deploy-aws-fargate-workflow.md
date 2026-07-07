---
skill: instance-manager
workflow_id: deploy-aws-fargate
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
  - deploy/aws/terraform/envs/dev-fargate/main.tf
  - deploy/aws/README.md
---

# Deploy AWS Fargate Workflow

Deploys SkillMeat to AWS ECS Fargate with managed ALB and private RDS PostgreSQL. This is the
cloud-parity managed path. `enterprise` edition only.

Terraform root: `deploy/aws/terraform/envs/dev-fargate/`
Staging root: `deploy/aws/terraform/envs/staging/`
Production root: `deploy/aws/terraform/envs/production/`

---

## Architecture

```
Internet → ALB (port 443) → ECS Fargate web (Next.js :3000)
                           → ECS Fargate API (FastAPI :8080)
                                          → RDS PostgreSQL (private)
                                          → Secrets Manager (app secrets)
                                          → CloudWatch Logs
```

- ECS tasks pull images from GHCR (configured via `api_image`, `web_image` Terraform vars)
- No SSH access to containers — use ECS Exec or CloudWatch Logs for debugging
- `dev-fargate`: public subnets, no NAT gateway, deletion protection off, minimal storage

---

## Prerequisites

- AWS CLI configured: `aws configure --profile skillmeat` (or set `AWS_PROFILE=skillmeat`)
- GHCR images published: `ghcr.io/owner/skillmeat-api:TAG` and `ghcr.io/owner/skillmeat-web:TAG`
- GHCR pull credentials stored as a Secrets Manager secret ARN
- ACM certificate ARN for HTTPS (if custom domain required)

---

## Step 1: Configure Terraform Variables

```bash
cd deploy/aws/terraform/envs/dev-fargate
cp terraform.tfvars.example terraform.tfvars
```

Key variables:

| Variable | Notes |
|---|---|
| `api_image` | Full GHCR image URI with tag, e.g. `ghcr.io/owner/skillmeat-api:v0.51.0` |
| `web_image` | Full GHCR image URI with tag |
| `repository_credentials_secret_arn` | Secrets Manager ARN for GHCR pull creds |
| `allowed_cidrs` | CIDRs for ALB access (default open: `["0.0.0.0/0"]`) |
| `certificate_arn` | ACM cert ARN for HTTPS listener (optional for dev) |
| `domain_name` | Custom domain (optional for dev) |
| `app_secrets` | Map of secret name → Secrets Manager ARN for app env vars |

For `app_secrets`, create Secrets Manager secrets for:
- `SKILLMEAT_ENTERPRISE_PAT_SECRET`
- `SKILLMEAT_ENTERPRISE_SERVICE_ACCOUNTS`
- Database password (set on RDS via `db_password` var)

---

## Step 2: Publish Images First

Images must be published to GHCR before Terraform apply — ECS will pull them at task launch.

```bash
# Build and push (from repo root, after version bump)
docker build -f Dockerfile -t ghcr.io/<OWNER>/skillmeat-api:<TAG> \
  --build-arg BUILD_SHA=$(git rev-parse HEAD) .
docker push ghcr.io/<OWNER>/skillmeat-api:<TAG>

docker build -f skillmeat/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://<ALB_DNS> \
  --build-arg NEXT_PUBLIC_SKILLMEAT_EDITION=enterprise \
  --build-arg NEXT_PUBLIC_AUTH_ENABLED=true \
  -t ghcr.io/<OWNER>/skillmeat-web:<TAG> skillmeat/web
docker push ghcr.io/<OWNER>/skillmeat-web:<TAG>
```

NEXT_PUBLIC_* vars bake into the web bundle at build time — set them to match the target
environment before building. See `deploy/CLAUDE.md §NEXT_PUBLIC_* Vars Must Be Threaded`.

---

## Step 3: Initialize Terraform

```bash
cd deploy/aws/terraform/envs/dev-fargate
terraform init
```

---

## Step 4: Plan and Review

```bash
make terraform-plan TF_ENV=dev-fargate
```

Confirm:
- ECS task definitions reference the correct image URIs
- RDS instance class and storage match the environment tier
- ALB listeners and target groups configured correctly

For staging/production: halt and get human approval before applying.

---

## Step 5: Apply

```bash
make terraform-apply TF_ENV=dev-fargate
```

Terraform creates: VPC (or uses existing), ECS cluster, ECS services, ALB, RDS, IAM roles,
Secrets Manager references, CloudWatch log groups.

Initial deployment takes 10–15 minutes (RDS provisioning is the longest step).

---

## Step 6: Post-Deployment Database Initialization

On first deploy, Alembic runs automatically in the API container entrypoint. Verify via logs:

```bash
# Get the ECS cluster and task
aws ecs list-tasks --cluster skillmeat-dev-fargate --profile skillmeat

# Stream API logs from CloudWatch
aws logs tail /ecs/skillmeat-dev-fargate-api \
  --follow \
  --profile skillmeat \
  --since 15m
```

Look for `[entrypoint] Alembic upgrade completed` and `Application startup complete`.

For enterprise edition, seed after migrations complete:

```bash
# ECS Exec into the API task
aws ecs execute-command \
  --cluster skillmeat-dev-fargate \
  --task <TASK_ARN> \
  --container skillmeat-api \
  --interactive \
  --command "/bin/bash" \
  --profile skillmeat

# Inside container:
python scripts/seed/run.py --profile minimal --edition enterprise \
  --clerk-user-id <YOUR_CLERK_USER_ID>
```

---

## Step 7: Verify Health and Register

```bash
ALB_DNS=$(cd deploy/aws/terraform/envs/dev-fargate && terraform output -raw alb_dns_name)

curl -sf "https://$ALB_DNS/health" | python -m json.tool

python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name dev-fargate \
  --host "$ALB_DNS" \
  --api-url "https://$ALB_DNS" \
  --web-url "https://$ALB_DNS" \
  --status running \
  --last-deployed "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Updating Images (Rolling Restart)

To deploy a new image version without reprovisioning:

```bash
# Update terraform.tfvars with new image tags
# Then:
make terraform-apply TF_ENV=dev-fargate
```

Terraform triggers an ECS service update (rolling deployment). Monitor via:

```bash
aws ecs wait services-stable \
  --cluster skillmeat-dev-fargate \
  --services skillmeat-dev-fargate-api skillmeat-dev-fargate-web \
  --profile skillmeat
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Tasks fail to start | Image pull error | Check GHCR credentials in Secrets Manager |
| API task healthy but 0 paths | Migration failed at startup | Check CloudWatch logs for Alembic errors |
| Web serves wrong edition | NEXT_PUBLIC_* baked incorrectly | Rebuild web image with correct vars; force new ECS deployment |
| RDS connection refused | Security group gap | Verify API task SG has inbound 5432 from RDS SG |
