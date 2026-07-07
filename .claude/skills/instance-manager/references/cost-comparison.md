---
skill: instance-manager
doc_type: reference
version: 0.1.0
updated: 2026-05-27
---

# Cost Comparison

Estimated monthly costs for SkillMeat deployment methods. All figures in USD.
Estimates reflect light-to-moderate usage for a small team (1–10 users).

**Disclaimer**: Cloud prices change. Verify current pricing at cloud provider pricing pages.

---

## Summary Table

| Method | Est. Monthly (USD) | Use Case | Key Cost Drivers |
|---|---|---|---|
| `compose` (local) | $0 | Development, demos | None (developer hardware) |
| `aws-ec2` (dev) | $15–30 | Demo, single-env testing | EC2 instance, EBS storage, data transfer |
| `aws-fargate` (dev-fargate) | $40–80 | Cloud-parity dev, QA | ECS Fargate (CPU/memory), RDS t4g.micro |
| `aws-fargate` (staging) | $100–200 | Pre-production | ECS (more tasks), RDS t3.small, NAT gateway |
| `aws-fargate` (production) | $300–700+ | Production | RDS multi-AZ, more ECS tasks, WAF, CloudFront |
| `azure-aca` (dev) | $25–50 | Azure dev, QA | Container Apps (consumption), PostgreSQL B1ms |
| `azure-aca` (staging) | $80–150 | Pre-production | Container Apps (dedicated), PostgreSQL standard |
| `azure-aca` (production) | $250–600+ | Production | HA PostgreSQL, large Container Apps plan |

---

## AWS EC2 (`dev-ec2`)

| Resource | Type | Est. Cost |
|---|---|---|
| EC2 instance | t3.medium (2 vCPU, 4 GB) | $30/month |
| EC2 instance | t3.small (2 vCPU, 2 GB) | $15/month |
| EBS root volume | 20 GB gp3 | $1.60/month |
| Elastic IP | 1 IP (attached) | $0/month |
| Data transfer | 10 GB/month out | ~$0.90/month |
| CloudWatch Logs | 1 GB/month | ~$0.50/month |

**Savings tips**:
- Use `t3.small` for local-only or light demo traffic; `t3.medium` for enterprise with real PostgreSQL load.
- Stop the instance when not in use to eliminate EC2 charges (EBS storage persists).
- Reserved instances (1-year) save ~40% vs on-demand.

---

## AWS Fargate (`dev-fargate`)

Resource pricing based on us-east-1 (2026 estimates):

| Resource | Specification | Est. Cost |
|---|---|---|
| ECS Fargate API task | 0.5 vCPU, 1 GB, 720 h/month | ~$14/month |
| ECS Fargate Web task | 0.5 vCPU, 1 GB, 720 h/month | ~$14/month |
| RDS PostgreSQL | db.t4g.micro, 20 GB, single-AZ | ~$14/month |
| ALB | 1 LCU/hour, 720 h/month | ~$16/month |
| CloudWatch Logs | 1 GB ingestion, 3 days retention | ~$0.50/month |
| Data transfer | 10 GB out | ~$0.90/month |
| **Total (dev-fargate)** | | **~$60/month** |

**Savings tips**:
- `dev-fargate` has no NAT gateway (saves ~$32/month) — suitable for disposable dev environments.
- ECS Fargate Spot pricing can reduce task costs by 70% for dev/QA (interruption-tolerant).
- RDS Aurora Serverless v2 can scale to near-zero for intermittent dev workloads (~$0.06/ACU-hour).

---

## AWS Fargate (staging / production)

Additional costs vs `dev-fargate`:

| Resource | Staging Add-on | Production Add-on |
|---|---|---|
| NAT Gateway | +$32/month | +$32/month |
| RDS instance | t3.small single-AZ (~$28/month) | t3.medium multi-AZ (~$100/month) |
| More ECS tasks | API×2, Web×2 (+100%) | API×3+, Web×3+ (+200%+) |
| WAF | — | +$10/month base |
| CloudFront | — | Usage-based |

---

## Azure Container Apps (`dev-container-apps`)

Based on West Europe pricing (2026 estimates):

| Resource | Specification | Est. Cost |
|---|---|---|
| Container Apps (API) | scale-to-zero, 0.5 vCPU/1 GB when active | ~$5–15/month |
| Container Apps (Web) | scale-to-zero, 0.5 vCPU/1 GB when active | ~$5–15/month |
| PostgreSQL Flexible Server | B_Standard_B1ms, 32 GB | ~$15/month |
| Log Analytics | 1 GB/month ingestion | ~$2.30/month |
| Key Vault | 10K operations | ~$0.03/month |
| VNet | Basic | ~$2/month |
| **Total (dev)** | | **~$30–50/month** |

**Savings tips**:
- Scale-to-zero Container Apps have near-zero cost when idle — ideal for dev environments with
  intermittent use.
- Standard_B2ms PostgreSQL SKU (~$35/month) provides better performance if needed.
- Dev environments can be destroyed and recreated via Terraform (`terraform destroy` + `apply`)
  to eliminate costs between sprints.

---

## Break-Even Analysis

| Scenario | Recommendation |
|---|---|
| Solo developer, local only | `compose` — no cloud cost |
| Demo for prospects (always-on) | `aws-ec2` — simplest, ~$20/month |
| CI/CD parity testing | `aws-fargate` dev — spin up per test run via Terraform |
| Team of 3–10 + staging | `aws-fargate` staging — shared, ~$130/month |
| Multi-cloud POC | `azure-aca` dev — comparable to Fargate dev cost |
| Production SaaS | `aws-fargate` production — full managed stack |

---

## Data Transfer Costs (Often Missed)

- AWS: $0.09/GB out to internet (first 10 TB/month); free between regions same account (mostly)
- Azure: $0.087/GB out to internet (first 10 TB/month; zone 1 — West Europe, East US, etc.)
- Both: free inbound data transfer

For API-heavy deployments (frequent artifact downloads), data transfer can exceed compute costs
at scale. Consider CloudFront (AWS) or Azure CDN for static asset delivery.
