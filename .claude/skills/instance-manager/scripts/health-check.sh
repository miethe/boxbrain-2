#!/usr/bin/env bash
# health-check.sh — Check health of one or all registered SkillMeat instances
#
# Usage:
#   bash health-check.sh                      # check all instances
#   bash health-check.sh --instance <NAME>    # check specific instance
#   bash health-check.sh --json               # output JSON report
#   bash health-check.sh --update-registry    # write results back to instances.json
#
# Health is declared only when:
#   1. GET /health returns HTTP 200
#   2. GET /api/v1/openapi.json returns path count > HEALTHY_PATH_THRESHOLD
#
# See: deploy/CLAUDE.md §Known Gotchas (Stale Image)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$SKILL_DIR/config"
REGISTRY_FILE="$CONFIG_DIR/instances.json"
MANAGE_PY="$SCRIPT_DIR/manage-instances.py"

HEALTHY_PATH_THRESHOLD=350
TIMEOUT=10  # curl timeout in seconds

# Options
INSTANCE_FILTER=""
OUTPUT_JSON=false
UPDATE_REGISTRY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --instance) INSTANCE_FILTER="$2"; shift 2 ;;
        --json) OUTPUT_JSON=true; shift ;;
        --update-registry) UPDATE_REGISTRY=true; shift ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        -h|--help)
            head -20 "$0" | grep "^#" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo "Error: instances.json not found at $REGISTRY_FILE" >&2
    echo "Copy instances.example.json to instances.json and configure it." >&2
    exit 1
fi

# Read instance list from registry
if [[ -n "$INSTANCE_FILTER" ]]; then
    INSTANCE_NAMES=("$INSTANCE_FILTER")
else
    mapfile -t INSTANCE_NAMES < <(python3 -c "
import json
with open('$REGISTRY_FILE') as f:
    data = json.load(f)
for name in data.get('instances', {}):
    print(name)
")
fi

if [[ ${#INSTANCE_NAMES[@]} -eq 0 ]]; then
    echo "No instances registered."
    exit 0
fi

# Results accumulator for JSON output
JSON_RESULTS="["
FIRST=true
OVERALL_STATUS=0
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

check_instance() {
    local name="$1"

    # Read instance details
    local api_url status edition
    api_url=$(python3 -c "
import json
with open('$REGISTRY_FILE') as f:
    data = json.load(f)
inst = data['instances'].get('$name', {})
print(inst.get('api_url', ''))
" 2>/dev/null)
    edition=$(python3 -c "
import json
with open('$REGISTRY_FILE') as f:
    data = json.load(f)
inst = data['instances'].get('$name', {})
print(inst.get('edition', 'local'))
" 2>/dev/null)

    if [[ -z "$api_url" ]]; then
        echo "  SKIP  $name (not found in registry)"
        return 0
    fi

    local health_status="unknown"
    local path_count=0
    local http_code=0
    local error_msg=""

    # Step 1: /health endpoint
    http_code=$(curl -o /dev/null -s -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        --connect-timeout "$TIMEOUT" \
        "$api_url/health" 2>/dev/null || echo "000")

    if [[ "$http_code" == "200" ]]; then
        # Step 2: OpenAPI path count
        path_count=$(curl -sS --max-time "$TIMEOUT" \
            "$api_url/api/v1/openapi.json" 2>/dev/null | \
            python3 -c "import sys,json; print(len(json.load(sys.stdin).get('paths',{})))" 2>/dev/null || echo "0")

        if [[ "$path_count" -gt "$HEALTHY_PATH_THRESHOLD" ]]; then
            health_status="healthy"
        else
            health_status="degraded"
            error_msg="path_count=$path_count (threshold=$HEALTHY_PATH_THRESHOLD) — possible migration failure"
        fi
    elif [[ "$http_code" == "000" ]]; then
        health_status="unreachable"
        error_msg="connection refused or timeout (${TIMEOUT}s)"
    else
        health_status="error"
        error_msg="HTTP $http_code"
    fi

    # Map to registry status
    local registry_status
    case "$health_status" in
        healthy) registry_status="running" ;;
        degraded) registry_status="error" ;;
        unreachable) registry_status="stopped" ;;
        error) registry_status="error" ;;
        *) registry_status="unknown" ;;
    esac

    # Print result
    if [[ "$OUTPUT_JSON" == false ]]; then
        local indicator
        case "$health_status" in
            healthy)    indicator="[OK]   " ;;
            degraded)   indicator="[WARN] " ;;
            unreachable) indicator="[DOWN] " ;;
            error)      indicator="[ERR]  " ;;
            *)          indicator="[?]    " ;;
        esac
        printf "  %s %-20s  %-12s  paths=%-5s  %s\n" \
            "$indicator" "$name" "$health_status" "$path_count" "$error_msg"
    fi

    # Accumulate JSON
    if [[ "$OUTPUT_JSON" == true ]] || [[ "$UPDATE_REGISTRY" == true ]]; then
        local json_entry
        json_entry=$(python3 -c "
import json
print(json.dumps({
    'name': '$name',
    'health_status': '$health_status',
    'registry_status': '$registry_status',
    'http_code': int('$http_code' or 0),
    'path_count': int('$path_count' or 0),
    'error': '$error_msg',
    'checked_at': '$NOW',
}))
")
        if [[ "$FIRST" == true ]]; then
            JSON_RESULTS+="$json_entry"
            FIRST=false
        else
            JSON_RESULTS+=",$json_entry"
        fi
    fi

    # Update registry
    if [[ "$UPDATE_REGISTRY" == true ]]; then
        python3 "$MANAGE_PY" update \
            --name "$name" \
            --status "$registry_status" \
            --last-health-check "$NOW" 2>/dev/null || true
    fi

    # Signal overall failure if any instance not healthy
    if [[ "$health_status" != "healthy" ]]; then
        OVERALL_STATUS=1
    fi
}

# Header
if [[ "$OUTPUT_JSON" == false ]]; then
    echo "SkillMeat Instance Health Check — $NOW"
    echo "$(printf '%.0s-' {1..70})"
fi

for name in "${INSTANCE_NAMES[@]}"; do
    check_instance "$name"
done

JSON_RESULTS+="]"

if [[ "$OUTPUT_JSON" == true ]]; then
    echo "$JSON_RESULTS" | python3 -m json.tool
fi

if [[ "$OUTPUT_JSON" == false ]]; then
    echo "$(printf '%.0s-' {1..70})"
    if [[ "$OVERALL_STATUS" -eq 0 ]]; then
        echo "All instances healthy."
    else
        echo "One or more instances are not healthy. Review output above."
    fi
fi

exit "$OVERALL_STATUS"
