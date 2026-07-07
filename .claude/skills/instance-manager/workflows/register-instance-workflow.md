---
skill: instance-manager
workflow_id: register-instance
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - .claude/skills/instance-manager/config/instances-schema.json
  - .claude/skills/instance-manager/config/instances.example.json
---

# Register Instance Workflow

Covers: register, deregister, list, and inspect instances in the local registry.

---

## Prerequisites

Ensure `instances.json` exists. If not, copy the example:

```bash
cp .claude/skills/instance-manager/config/instances.example.json \
   .claude/skills/instance-manager/config/instances.json
```

The file is gitignored — it will not appear in `git status`.

---

## List Instances

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py list
```

Output columns: name, edition, deployment_method, host, status, last_deployed.

To get full JSON for a single instance:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py get --name <NAME>
```

---

## Register a New Instance

### Step 1: Gather required fields

| Field | Notes |
|---|---|
| `name` | Unique slug, lowercase, hyphens only (e.g. `prod-fargate`) |
| `edition` | `local`, `local-auth`, or `enterprise` |
| `deployment_method` | `compose`, `aws-ec2`, `aws-fargate`, `azure-aca` |
| `host` | Hostname or IP; `localhost` for local compose |
| `api_port` | Typically `8080` |
| `web_port` | Typically `3000` (compose) or `443` (cloud) |
| `api_url` | Full URL including scheme |
| `web_url` | Full URL including scheme |

### Step 2: Confirm edition × method compatibility

| Edition | compose | aws-ec2 | aws-fargate | azure-aca |
|---|---|---|---|---|
| local | Yes | Yes | No | No |
| local-auth | Yes | Yes | No | No |
| enterprise | Yes | Yes | Yes | Yes |

If incompatible, block and explain.

### Step 3: Register via CLI

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py register \
  --name <NAME> \
  --edition <EDITION> \
  --method <METHOD> \
  --host <HOST> \
  --api-port <PORT> \
  --web-port <PORT> \
  --api-url <URL> \
  --web-url <URL>
```

Optional flags for remote instances:

```bash
  --terraform-root deploy/aws/terraform/envs/dev-ec2 \
  --ssh-key ~/.ssh/skillmeat-aws.pem \
  --ssh-port 2222 \
  --ssh-user ec2-user \
  --aws-profile skillmeat \
  --aws-region ap-southeast-1 \
  --compose-project-name skillmeat \
  --container-runtime docker
```

For enterprise instances, add database config:

```bash
  --db-type postgresql \
  --db-connection "postgres://skillmeat:PASSWORD@HOST:5432/skillmeat" \
  --db-backup-bucket skillmeat-backups
```

### Step 4: Verify registration

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py get --name <NAME>
```

Confirm all fields are present and the entry validates against the schema.

---

## Update Instance Fields

Update status or last_deployed after a deployment:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name <NAME> \
  --status running \
  --last-deployed "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Update the database last_backup timestamp:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name <NAME> \
  --db-last-backup "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Deregister an Instance

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py deregister \
  --name <NAME>
```

The script prompts for confirmation. This only removes the registry entry — it does not stop or
destroy the actual deployment.

---

## Schema Validation

Validate the registry against the JSON schema:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py validate
```

Exits nonzero with schema errors if `instances.json` does not match `instances-schema.json`.
Run this after manual edits to catch typos.

---

## Security Notes

- `instances.json` contains database connection strings and may reference SSH key paths. It is gitignored.
- Do not log or echo the full `database.connection` field — it may contain plaintext passwords.
- For production instances, consider storing the connection string as an environment variable
  and setting `database.connection` to `"${SKILLMEAT_PROD_DB_URL}"` as a reference marker.
