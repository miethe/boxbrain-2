---
skill: instance-manager
workflow_id: backup-restore
version: 0.1.0
updated: 2026-05-27
canonical_docs:
  - deploy/docs/enterprise-rebuild-procedure.md
  - deploy/CLAUDE.md
---

# Backup and Restore Workflow

Covers PostgreSQL backup (pg_dump, S3 upload) and restore (pg_restore) for all deployment methods.
Applies to `enterprise` edition only — `local` and `local-auth` use SQLite, which is backed up
by copying the database file.

---

## SQLite Backup (local / local-auth editions)

```bash
# Find the SQLite file (default: ~/.skillmeat/cache/cache.db)
ls -lh ~/.skillmeat/cache/cache.db

# Simple copy backup
cp ~/.skillmeat/cache/cache.db \
   ~/skillmeat-backup-$(date +%Y%m%d-%H%M%S).db

# Restore: stop the stack, replace the file, restart
./compose.sh --profile local down
cp ~/skillmeat-backup-DATE.db ~/.skillmeat/cache/cache.db
./compose.sh --profile local up -d
```

---

## Backup

### Quick Backup (Local or Remote via SSH)

Use the bundled script for consistent output:

```bash
# Local compose instance
bash .claude/skills/instance-manager/scripts/backup-postgres.sh \
  --instance local-enterprise \
  --output-dir ~/skillmeat-backups

# Remote EC2 instance (dumps remotely, copies to local)
bash .claude/skills/instance-manager/scripts/backup-postgres.sh \
  --instance demo-ec2 \
  --output-dir ~/skillmeat-backups \
  --remote
```

The script reads connection and SSH details from `instances.json`.

### Manual Backup (Docker Compose)

```bash
BACKUP_DIR="/opt/skillmeat/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Custom format (faster restore, recommended)
docker exec skillmeat_postgres_1 pg_dump \
  -U skillmeat -d skillmeat \
  --format=custom \
  > "$BACKUP_DIR/skillmeat.dump"

# Plain SQL (fallback, human-readable)
docker exec skillmeat_postgres_1 pg_dump \
  -U skillmeat -d skillmeat \
  > "$BACKUP_DIR/skillmeat.sql"

echo "Backup complete: $BACKUP_DIR"
ls -lah "$BACKUP_DIR"
```

For Podman:

```bash
podman exec skillmeat_skillmeat-api_1 pg_dump \
  -U skillmeat -d skillmeat \
  --format=custom \
  > "$BACKUP_DIR/skillmeat.dump"
```

Use the container exec path as container-to-host piping varies by runtime.

### Backup to S3

```bash
BACKUP_FILE="$BACKUP_DIR/skillmeat.dump"
BUCKET="skillmeat-backups"
PREFIX="backups/demo-ec2"
DATE=$(date +%Y%m%d-%H%M%S)

aws s3 cp "$BACKUP_FILE" \
  "s3://$BUCKET/$PREFIX/skillmeat-$DATE.dump" \
  --profile skillmeat

# Verify upload
aws s3 ls "s3://$BUCKET/$PREFIX/" --profile skillmeat
```

Update the registry after a successful backup:

```bash
python .claude/skills/instance-manager/scripts/manage-instances.py update \
  --name demo-ec2 \
  --db-last-backup "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

### RDS Snapshot (Fargate instances)

```bash
aws rds create-db-snapshot \
  --db-instance-identifier skillmeat-dev-fargate-db \
  --db-snapshot-identifier "skillmeat-$(date +%Y%m%d-%H%M%S)" \
  --profile skillmeat

# Wait for snapshot to complete
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier "skillmeat-$(date +%Y%m%d-%H%M%S)" \
  --profile skillmeat
```

---

## Restore

### Restore to Docker Compose Instance

Follow `deploy/docs/enterprise-rebuild-procedure.md §Phase 5` for the full procedure.

Quick reference:

```bash
# Ensure postgres container is running and healthy
docker exec <POSTGRES_CONTAINER> pg_isready -U skillmeat -d skillmeat

# Restore from custom format dump (preferred)
docker exec -i <POSTGRES_CONTAINER> pg_restore \
  -U skillmeat -d skillmeat \
  --no-privileges --no-owner \
  < /path/to/skillmeat.dump

# If custom format restore fails, use plain SQL fallback
docker exec -i <POSTGRES_CONTAINER> psql -U skillmeat -d skillmeat \
  < /path/to/skillmeat.sql
```

Postgres container name depends on compose project:
- Default project (`repo` basename): `repo_postgres_1`
- Named project (`COMPOSE_PROJECT_NAME=skillmeat`): `skillmeat_postgres_1`

Get the correct name:

```bash
docker ps --format '{{.Names}}' | grep postgres
```

### Restore from S3

```bash
# Download from S3
aws s3 cp \
  "s3://skillmeat-backups/backups/demo-ec2/skillmeat-TIMESTAMP.dump" \
  /tmp/skillmeat-restore.dump \
  --profile skillmeat

# Restore
docker exec -i <POSTGRES_CONTAINER> pg_restore \
  -U skillmeat -d skillmeat \
  --no-privileges --no-owner \
  < /tmp/skillmeat-restore.dump
```

### Restore from RDS Snapshot (Fargate)

RDS restores create a new DB instance from the snapshot — they do not overwrite in-place:

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier skillmeat-dev-fargate-db-restored \
  --db-snapshot-identifier <SNAPSHOT_ID> \
  --db-instance-class db.t4g.micro \
  --profile skillmeat
```

Then update the ECS task definition to point to the restored instance's endpoint. This typically
requires a Terraform variable update and re-apply.

---

## Backup Verification

After any backup, verify the dump is usable:

```bash
# Test dump is readable (does not restore data)
pg_restore --list /path/to/skillmeat.dump | head -20

# Get row counts from dump metadata
pg_restore --schema-only /path/to/skillmeat.dump | grep -c "CREATE TABLE"
```

---

## Retention Policy (Recommended)

For the demo/dev box:
- Keep last 5 daily backups locally
- Keep last 7 days in S3
- Delete older than 30 days

```bash
# Delete local backups older than 7 days
find ~/skillmeat-backups -name "*.dump" -mtime +7 -delete

# S3 lifecycle policy: configure via Terraform or AWS console on the backup bucket
# Recommended: transition to Glacier after 7 days, expire after 30 days
```
