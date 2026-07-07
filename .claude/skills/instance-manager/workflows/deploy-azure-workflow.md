---
skill: instance-manager
workflow_id: deploy-azure
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/CLAUDE.md
  - deploy/azure/terraform/envs/dev-container-apps/main.tf
  - deploy/azure/README.md
---

# Deploy Azure Workflow

Deploys SkillMeat to Azure Container Apps with Azure Database for PostgreSQL Flexible Server.
`enterprise` edition only.

Terraform root: `deploy/azure/terraform/envs/dev-container-apps/`
Staging root: `deploy/azure/terraform/envs/staging/`
Production root: `deploy/azure/terraform/envs/production/`

---

## Architecture

```
Internet → Container Apps Environment → skillmeat-web (Next.js, scale-to-zero)
                                      → skillmeat-api (FastAPI, scale-to-zero)
                                               → Azure DB for PostgreSQL Flexible Server (private VNet)
                                               → Azure Key Vault (app secrets)
                                               → Log Analytics Workspace
```

- `dev-container-apps`: scale-to-zero replicas (`min=0`), small PostgreSQL SKU (`B_Standard_B1ms`)
- No direct SSH/exec into containers — use Azure CLI `az containerapp exec` or Log Analytics
- Images pulled from GHCR (or Azure Container Registry)

---

## Prerequisites

- Azure CLI installed and authenticated: `az login`
- Target subscription selected: `az account set --subscription <SUBSCRIPTION_ID>`
- GHCR or ACR images published (see Fargate workflow §Step 2 for build pattern)
- Registry credentials available (`registry_server`, `registry_username`, `registry_password`)

---

## Step 1: Configure Terraform Variables

```bash
cd deploy/azure/terraform/envs/dev-container-apps
cp terraform.tfvars.example terraform.tfvars
```

Key variables:

| Variable | Notes |
|---|---|
| `api_image` | Full image URI with tag |
| `web_image` | Full image URI with tag |
| `registry_server` | Container registry server (`ghcr.io` or `<acr>.azurecr.io`) |
| `registry_username` | Registry pull username |
| `registry_password` | Registry pull password/token (sensitive) |
| `location` | Azure region, e.g. `australiaeast`, `eastus` |
| `allowed_cidrs` | CIDRs for Container Apps ingress (default open) |
| `app_secrets` | Map of secret name → value for app env vars |

For `app_secrets`, include:
- `DATABASE_URL` (constructed from PostgreSQL output — see post-deploy)
- `SKILLMEAT_ENTERPRISE_PAT_SECRET`
- `SKILLMEAT_ENTERPRISE_SERVICE_ACCOUNTS`

---

## Step 2: Initialize Terraform

```bash
cd deploy/azure/terraform/envs/dev-container-apps
terraform init
```

---

## Step 3: Plan and Review

```bash
make terraform-plan TF_PROVIDER=azure TF_ENV=dev-container-apps
```

Confirm:
- Container Apps environment in the correct region and resource group
- PostgreSQL Flexible Server SKU matches the environment tier
- Key Vault configured with correct soft-delete retention
- VNet integration for private PostgreSQL access

For staging/production: halt and get human approval before applying.

---

## Step 4: Apply

```bash
make terraform-apply TF_PROVIDER=azure TF_ENV=dev-container-apps
```

Terraform creates: Resource Group (or uses existing), VNet + subnets, Container Apps Environment,
Container App services (web, API), Azure DB for PostgreSQL Flexible Server, Azure Key Vault,
Log Analytics Workspace.

Initial provisioning takes 10–20 minutes (PostgreSQL Flexible Server is the longest step).

---

## Step 5: Retrieve Outputs and Update Secrets

After apply, retrieve outputs:

```bash
cd deploy/azure/terraform/envs/dev-container-apps
terraform output
```

Key outputs:
- `api_fqdn` — API Container App fully qualified domain name
- `web_fqdn` — Web Container App FQDN
- `postgres_host` — PostgreSQL server FQDN
- `postgres_admin_user` — PostgreSQL admin username

Construct and store the DATABASE_URL secret in Key Vault:

```bash
PG_HOST=$(terraform output -raw postgres_host)
PG_USER=$(terraform output -raw postgres_admin_user)
# PASSWORD is what you set in tfvars

az keyvault secret set \
  --vault-name <KEY_VAULT_NAME> \
  --name "DATABASE-URL" \
  --value "postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/skillmeat?sslmode=require"
```

If `app_secrets` was already populated with the correct DATABASE_URL before apply, skip this step.

---

## Step 6: Wait for Initial Startup

Container Apps pull images and start. Monitor via Log Analytics:

```bash
az containerapp logs show \
  --name skillmeat-api \
  --resource-group skillmeat-dev-aca-rg \
  --follow
```

Look for Alembic migration completion and `Application startup complete`.

---

## Step 7: Verify Health and Register

```bash
WEB_FQDN=$(cd deploy/azure/terraform/envs/dev-container-apps && terraform output -raw web_fqdn)
API_FQDN=$(cd deploy/azure/terraform/envs/dev-container-apps && terraform output -raw api_fqdn)

curl -sf "https://$API_FQDN/health" | python -m json.tool

python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name dev-azure \
  --host "$WEB_FQDN" \
  --api-url "https://$API_FQDN" \
  --web-url "https://$WEB_FQDN" \
  --status running \
  --last-deployed "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Updating Images

Update `terraform.tfvars` with new image tags, then re-apply. Container Apps performs a
rolling update automatically when the image reference changes.

```bash
# Edit tfvars: update api_image and web_image tags
make terraform-apply TF_PROVIDER=azure TF_ENV=dev-container-apps

# Monitor rollout
az containerapp revision list \
  --name skillmeat-api \
  --resource-group skillmeat-dev-aca-rg \
  --output table
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Container App scales to 0 and never starts | Cold start + health probe timeout | Check `min_replicas` setting and probe thresholds |
| PostgreSQL connection refused | VNet/subnet delegation not applied | Verify subnet delegated to `Microsoft.DBforPostgreSQL/flexibleServers` |
| Key Vault access denied | Managed identity missing Key Vault role | Assign `Key Vault Secrets User` to Container App managed identity |
| Registry pull fails | Wrong `registry_password` | Update Key Vault secret and restart Container App |
| NEXT_PUBLIC_* wrong in web bundle | Built with wrong vars | Rebuild web image with correct vars; update `web_image` in tfvars and re-apply |

---

## CI Validation

The Terraform CI pipeline validates Azure configurations without cloud credentials:

```bash
make terraform-validate TF_PROVIDER=azure TF_ENV=dev-container-apps
make terraform-fmt TF_PROVIDER=azure
```

See `.github/workflows/terraform.yml` for CI definition.
