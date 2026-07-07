#!/usr/bin/env bash
# backup-postgres.sh — PostgreSQL backup for SkillMeat instances
#
# Usage:
#   bash backup-postgres.sh --instance <NAME> --output-dir <DIR>
#   bash backup-postgres.sh --instance <NAME> --output-dir <DIR> --s3
#   bash backup-postgres.sh --instance <NAME> --output-dir <DIR> --remote
#
# Options:
#   --instance <NAME>       Instance name from instances.json (required)
#   --output-dir <DIR>      Local directory to write dump files (required)
#   --s3                    Upload to S3 after local dump (uses backup_bucket from registry)
#   --remote                Connect to instance via SSH, dump remotely, scp to local
#   --format <custom|plain> Dump format. Default: custom (faster restore)
#   --dry-run               Print commands without executing
#
# Requirements (local backup): pg_dump, docker or podman
# Requirements (S3 upload): aws cli, bucket in registry
# Requirements (remote backup): ssh, scp, pg_dump on remote

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$SKILL_DIR/config"
REGISTRY_FILE="$CONFIG_DIR/instances.json"
MANAGE_PY="$SCRIPT_DIR/manage-instances.py"

# Parse arguments
INSTANCE_NAME=""
OUTPUT_DIR=""
UPLOAD_S3=false
REMOTE=false
DUMP_FORMAT="custom"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --instance)   INSTANCE_NAME="$2"; shift 2 ;;
        --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
        --s3)         UPLOAD_S3=true; shift ;;
        --remote)     REMOTE=true; shift ;;
        --format)     DUMP_FORMAT="$2"; shift 2 ;;
        --dry-run)    DRY_RUN=true; shift ;;
        -h|--help)
            head -25 "$0" | grep "^#" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

if [[ -z "$INSTANCE_NAME" ]]; then
    echo "Error: --instance is required" >&2; exit 1
fi
if [[ -z "$OUTPUT_DIR" ]]; then
    echo "Error: --output-dir is required" >&2; exit 1
fi

if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo "Error: instances.json not found at $REGISTRY_FILE" >&2; exit 1
fi

# Read instance details
read_field() {
    python3 -c "
import json
with open('$REGISTRY_FILE') as f:
    data = json.load(f)
inst = data['instances'].get('$INSTANCE_NAME', {})
val = inst
for key in '$1'.split('.'):
    val = val.get(key, {}) if isinstance(val, dict) else None
print(val or '')
"
}

EDITION=$(read_field "edition")
DB_TYPE=$(read_field "database.type")
DB_CONNECTION=$(read_field "database.connection")
BACKUP_BUCKET=$(read_field "database.backup_bucket")
BACKUP_PREFIX=$(read_field "database.backup_prefix")
SSH_KEY=$(read_field "ssh_key")
SSH_PORT=$(read_field "ssh_port")
SSH_USER=$(read_field "ssh_user")
HOST=$(read_field "host")
COMPOSE_PROJECT=$(read_field "compose_project_name")
CONTAINER_RUNTIME=$(read_field "container_runtime")
AWS_PROFILE=$(read_field "aws_profile")

if [[ "$DB_TYPE" != "postgresql" ]]; then
    echo "Error: instance '$INSTANCE_NAME' uses $DB_TYPE database. This script only backs up PostgreSQL." >&2
    echo "For SQLite, simply copy ~/.skillmeat/cache/cache.db" >&2
    exit 1
fi

# Defaults
SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-ec2-user}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-$(basename "$(pwd)")}"
BACKUP_PREFIX="${BACKUP_PREFIX:-backups/$INSTANCE_NAME}"
AWS_PROFILE="${AWS_PROFILE:-default}"

# Timestamp
NOW=$(date +%Y%m%d-%H%M%S)
DUMP_EXT="dump"
[[ "$DUMP_FORMAT" == "plain" ]] && DUMP_EXT="sql"
DUMP_FILENAME="skillmeat-${INSTANCE_NAME}-${NOW}.${DUMP_EXT}"

mkdir -p "$OUTPUT_DIR"
DUMP_PATH="$OUTPUT_DIR/$DUMP_FILENAME"

run() {
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] $*"
    else
        "$@"
    fi
}

echo "Backing up PostgreSQL for instance: $INSTANCE_NAME"
echo "  Format:     $DUMP_FORMAT"
echo "  Output:     $DUMP_PATH"
echo "  Remote:     $REMOTE"
echo "  S3 upload:  $UPLOAD_S3"
echo ""

# Determine format flag for pg_dump
PG_FORMAT_FLAG="--format=custom"
[[ "$DUMP_FORMAT" == "plain" ]] && PG_FORMAT_FLAG=""

if [[ "$REMOTE" == true ]]; then
    # Dump on remote host, copy to local
    SSH_OPTS="-p $SSH_PORT"
    [[ -n "$SSH_KEY" ]] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY"

    # Find postgres container name on remote
    REMOTE_DUMP="/tmp/$DUMP_FILENAME"

    echo "Connecting to $SSH_USER@$HOST (port $SSH_PORT)..."

    # Determine container runtime on remote
    REMOTE_RUNTIME="docker"
    [[ "$CONTAINER_RUNTIME" == "podman" ]] && REMOTE_RUNTIME="podman"

    # Find postgres container
    REMOTE_SCRIPT="
        POSTGRES_CONTAINER=\$($REMOTE_RUNTIME ps --format '{{.Names}}' | grep postgres | head -1)
        if [[ -z \"\$POSTGRES_CONTAINER\" ]]; then
            echo 'ERROR: No postgres container found' >&2
            exit 1
        fi
        echo \"Using container: \$POSTGRES_CONTAINER\" >&2
        $REMOTE_RUNTIME exec -i \"\$POSTGRES_CONTAINER\" pg_dump \\
            -U skillmeat -d skillmeat \\
            $PG_FORMAT_FLAG \\
            > \"$REMOTE_DUMP\"
        echo \"$REMOTE_DUMP\"
    "

    if [[ "$DRY_RUN" == false ]]; then
        # shellcheck disable=SC2029
        ssh $SSH_OPTS "$SSH_USER@$HOST" "bash -s" <<< "$REMOTE_SCRIPT"

        # Copy dump to local
        echo "Copying dump to local: $DUMP_PATH"
        scp $SSH_OPTS "$SSH_USER@$HOST:$REMOTE_DUMP" "$DUMP_PATH"

        # Clean up remote temp file
        ssh $SSH_OPTS "$SSH_USER@$HOST" "rm -f $REMOTE_DUMP" || true
    else
        echo "[DRY-RUN] Would SSH to $SSH_USER@$HOST, dump to $REMOTE_DUMP, scp to $DUMP_PATH"
    fi

else
    # Local dump (compose running locally)
    # Find the postgres container
    RUNTIME="docker"
    if [[ "$CONTAINER_RUNTIME" == "podman" ]] || (command -v podman &>/dev/null && ! command -v docker &>/dev/null); then
        RUNTIME="podman"
    fi
    [[ "$CONTAINER_RUNTIME" == "docker" ]] && RUNTIME="docker"

    POSTGRES_CONTAINER=$($RUNTIME ps --format '{{.Names}}' 2>/dev/null | grep postgres | head -1 || true)
    if [[ -z "$POSTGRES_CONTAINER" ]]; then
        echo "Error: No running postgres container found. Is the stack up?" >&2
        echo "Tried runtime: $RUNTIME" >&2
        exit 1
    fi
    echo "Using container: $POSTGRES_CONTAINER"

    if [[ "$DUMP_FORMAT" == "custom" ]]; then
        run $RUNTIME exec "$POSTGRES_CONTAINER" pg_dump \
            -U skillmeat -d skillmeat \
            --format=custom \
            > "$DUMP_PATH"
    else
        run $RUNTIME exec "$POSTGRES_CONTAINER" pg_dump \
            -U skillmeat -d skillmeat \
            > "$DUMP_PATH"
    fi
fi

if [[ "$DRY_RUN" == false ]]; then
    DUMP_SIZE=$(du -sh "$DUMP_PATH" 2>/dev/null | cut -f1 || echo "unknown")
    echo "Backup complete: $DUMP_PATH ($DUMP_SIZE)"
fi

# S3 upload
if [[ "$UPLOAD_S3" == true ]]; then
    if [[ -z "$BACKUP_BUCKET" ]]; then
        echo "Error: backup_bucket not configured in registry for instance '$INSTANCE_NAME'" >&2
        echo "Update it with: python manage-instances.py update --name $INSTANCE_NAME --db-backup-bucket <BUCKET>" >&2
        exit 1
    fi

    S3_KEY="$BACKUP_PREFIX/$DUMP_FILENAME"
    echo "Uploading to s3://$BACKUP_BUCKET/$S3_KEY ..."

    run aws s3 cp "$DUMP_PATH" "s3://$BACKUP_BUCKET/$S3_KEY" --profile "$AWS_PROFILE"

    if [[ "$DRY_RUN" == false ]]; then
        echo "S3 upload complete: s3://$BACKUP_BUCKET/$S3_KEY"

        # Update last_backup in registry
        BACKUP_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)
        python3 "$MANAGE_PY" update \
            --name "$INSTANCE_NAME" \
            --db-last-backup "$BACKUP_TS" || true
        echo "Updated registry: last_backup = $BACKUP_TS"
    fi
fi

echo "Done."
