---
skill: instance-manager
doc_type: reference
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
  - deploy/aws/README.md
  - deploy/azure/README.md
---

# Deployment Matrix

Full capability and compatibility matrix for SkillMeat deployment methods.

---

## Edition × Method Compatibility

| Edition | compose | aws-ec2 | aws-fargate | azure-aca |
|---|---|---|---|---|
| `local` (SQLite, no auth) | Yes | Yes | No | No |
| `local-auth` (SQLite + Clerk) | Yes | Yes | No | No |
| `enterprise` (PostgreSQL) | Yes | Yes | Yes | Yes |

**Rationale for limitations**:
- `local` and `local-auth` use SQLite, which is not suitable for multi-task managed deployments
  (aws-fargate, azure-aca use multiple container replicas and require a shared network-accessible DB).
- All managed cloud methods (`aws-fargate`, `azure-aca`) require `enterprise` edition with PostgreSQL.

---

## Method Characteristics

| Attribute | compose | aws-ec2 | aws-fargate | azure-aca |
|---|---|---|---|---|
| Infrastructure managed by | Developer/ops (manual) | Terraform (EC2) | Terraform (ECS+RDS) | Terraform (ACA+PG) |
| Database | SQLite or co-located PG | Co-located PG (Compose) | RDS PostgreSQL (managed) | Azure DB for PostgreSQL Flexible Server |
| Container runtime | Docker or Podman | Docker (Amazon Linux) | ECS (managed) | Azure Container Apps (managed) |
| SSH access | Yes (localhost or remote) | Yes (EC2 key pair) | No (ECS Exec only) | No (az containerapp exec) |
| Scale-to-zero | No | No (EC2 always on) | No (ECS min=1) | Yes (dev: min=0) |
| Hot-reload dev mode | Yes (`--dev` flag) | No | No | No |
| Horizontal scaling | No | No | Yes (ECS desired count) | Yes (Container Apps replicas) |
| Cold start | N/A | N/A | Moderate (ECS task launch) | High (scale-to-zero from 0) |
| Terraform required | No | Yes | Yes | Yes |
| Seeding required after fresh DB | Yes (enterprise) | Yes (enterprise) | Yes (via ECS Exec) | Yes (via az containerapp exec) |

---

## Network Topology

### compose (local)

```
localhost:3000  →  skillmeat-web (Next.js)
localhost:8080  →  skillmeat-api (FastAPI)
localhost:5432  →  postgres (enterprise only)
```

Internal service-to-service via Docker/Podman network: `http://skillmeat-api:8080`.

### aws-ec2

Same as compose but on a remote EC2 host. All services on one instance.
Exposed to internet via EC2 security groups on specified ports.

### aws-fargate

```
Internet → ALB (443) → Target Group → ECS web task (:3000)
                     → Target Group → ECS API task (:8080)
                                          → RDS private subnet (:5432)
```

API and web are separate ECS tasks in private subnets (dev) or private+public (prod).
ALB routes traffic by path or subdomain rules.

### azure-aca

```
Internet → Container Apps Environment ingress (443)
              → skillmeat-web Container App (:3000)
              → skillmeat-api Container App (:8080)
                                  → PostgreSQL Flexible Server (VNet-integrated, :5432)
```

Both Container Apps have external ingress. PostgreSQL uses VNet delegation for private access.

---

## Terraform Environment Inventory

### AWS

| Environment | Root Path | Purpose | Notes |
|---|---|---|---|
| `dev-ec2` | `deploy/aws/terraform/envs/dev-ec2/` | Single EC2, all compose profiles | Demo box path |
| `dev-fargate` | `deploy/aws/terraform/envs/dev-fargate/` | Disposable Fargate/RDS, cloud-parity | No NAT, public subnets, deletion protection off |
| `staging` | `deploy/aws/terraform/envs/staging/` | Pre-production Fargate/RDS | Private subnets, NAT, stricter security groups |
| `production` | `deploy/aws/terraform/envs/production/` | Production Fargate/RDS | Deletion protection on, multi-AZ RDS, WAF |

### Azure

| Environment | Root Path | Purpose | Notes |
|---|---|---|---|
| `dev-container-apps` | `deploy/azure/terraform/envs/dev-container-apps/` | Disposable ACA + PostgreSQL | Scale-to-zero, small SKU |
| `staging` | `deploy/azure/terraform/envs/staging/` | Pre-production ACA + PostgreSQL | Standard SKU, VNET, Key Vault |
| `production` | `deploy/azure/terraform/envs/production/` | Production ACA + PostgreSQL | HA, soft-delete, long log retention |

---

## Image Sourcing

All cloud deployments consume pre-published GHCR images:
- `ghcr.io/<OWNER>/skillmeat-api:<TAG>`
- `ghcr.io/<OWNER>/skillmeat-web:<TAG>`

Images are built and published by `release.yml` GitHub Actions workflow on tag push (`v*`).
The web image bakes `NEXT_PUBLIC_*` vars at build time — always publish environment-specific
images for cloud deployments with non-default API URLs.

---

## Security Group / Firewall Summary

| Method | Exposed Ports | Authentication |
|---|---|---|
| compose (local) | 3000, 8080, 5432 (optional) | None (local) / Clerk (local-auth, enterprise) |
| aws-ec2 | 3000, 8080 (configurable CIDRs) | SSH key (management) / Clerk (app auth) |
| aws-fargate | 443 (ALB, internet) | ACM certificate / Clerk |
| azure-aca | 443 (Container Apps ingress) | Azure AD or Clerk |

---

## Backup and Data Persistence

| Method | Data persistence | Backup mechanism |
|---|---|---|
| compose | Named Docker/Podman volumes | `pg_dump` via container exec |
| aws-ec2 | EBS volume (attached to EC2) | `pg_dump` via SSH, optional S3 upload |
| aws-fargate | RDS storage (auto-managed) | RDS automated snapshots + `pg_dump` via ECS Exec |
| azure-aca | Azure DB for PostgreSQL storage | Azure managed backups + `pg_dump` via Container Exec |
