#!/usr/bin/env bash
# test_cross_project_smoke.sh
#
# Cross-project portability smoke test for the html-capsules skill.
# Proves the skill is self-contained and works from any directory.
#
# Usage:
#   bash test_cross_project_smoke.sh
#   ./test_cross_project_smoke.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
fail() {
    echo "SMOKE TEST FAILED: $1" >&2
    exit 1
}

assert_exit_0() {
    local label="$1"
    shift
    if ! "$@"; then
        fail "$label — command exited non-zero: $*"
    fi
}

# ---------------------------------------------------------------------------
# Resolve skill root (parent of the tests/ directory containing this script)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Detect python binary
# ---------------------------------------------------------------------------
PYTHON=""
if command -v python3 >/dev/null 2>&1; then
    PYTHON="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON="python"
else
    fail "No python3 or python found on PATH"
fi

# ---------------------------------------------------------------------------
# Temp workspace with guaranteed cleanup
# ---------------------------------------------------------------------------
TMPDIR_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

DEST="$TMPDIR_ROOT/.claude/skills/html-capsules"
mkdir -p "$DEST"

# ---------------------------------------------------------------------------
# Step 1: Copy skill to temp dir (exclude tests/ and __pycache__)
# ---------------------------------------------------------------------------
# Use rsync if available for cleaner exclusion; fall back to cp + manual prune.
if command -v rsync >/dev/null 2>&1; then
    rsync -a \
        --exclude='tests/' \
        --exclude='__pycache__/' \
        --exclude='*.pyc' \
        "$SKILL_ROOT/" "$DEST/"
else
    cp -R "$SKILL_ROOT/." "$DEST/"
    # Remove excluded directories if cp was used
    rm -rf "$DEST/tests" "$DEST/__pycache__"
    find "$DEST" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
    find "$DEST" -name '*.pyc' -delete 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Step 2: Work from the temp project root
# ---------------------------------------------------------------------------
cd "$TMPDIR_ROOT"

CLI="$DEST/cli/__main__.py"

# ---------------------------------------------------------------------------
# Step 3: Render run-card fixture
# ---------------------------------------------------------------------------
assert_exit_0 "render run-card" \
    "$PYTHON" "$CLI" render \
        --type run-card \
        --source "$SKILL_ROOT/tests/fixtures/run-card.yaml" \
        --out "$TMPDIR_ROOT/test.html"

# ---------------------------------------------------------------------------
# Step 4: Validate manifest only (schema check)
# ---------------------------------------------------------------------------
assert_exit_0 "validate manifest" \
    "$PYTHON" "$CLI" validate \
        --manifest "$SKILL_ROOT/tests/fixtures/run-card.yaml"

# ---------------------------------------------------------------------------
# Step 5: Validate manifest + rendered HTML together
# ---------------------------------------------------------------------------
assert_exit_0 "validate manifest+rendered" \
    "$PYTHON" "$CLI" validate \
        --manifest "$SKILL_ROOT/tests/fixtures/run-card.yaml" \
        --rendered "$TMPDIR_ROOT/test.html"

# ---------------------------------------------------------------------------
# Step 6: Assert test.html exists
# ---------------------------------------------------------------------------
[ -f "$TMPDIR_ROOT/test.html" ] \
    || fail "test.html was not created by the render command"

# ---------------------------------------------------------------------------
# Step 7: Assert zero external URLs in the rendered HTML
# ---------------------------------------------------------------------------
if grep -qE 'src="http|href="http' "$TMPDIR_ROOT/test.html"; then
    fail "test.html contains external URLs (src=\"http or href=\"http) — capsule is not self-contained"
fi

# ---------------------------------------------------------------------------
# Step 8: Count rendered HTML files (must be >= 1)
# ---------------------------------------------------------------------------
HTML_COUNT="$(find "$TMPDIR_ROOT" -name '*.html' | wc -l | tr -d ' ')"
[ "$HTML_COUNT" -ge 1 ] \
    || fail "Expected at least 1 rendered .html file, found $HTML_COUNT"

# ---------------------------------------------------------------------------
# All assertions passed
# ---------------------------------------------------------------------------
echo "SMOKE TEST PASSED: ${HTML_COUNT} capsule(s) rendered, 0 external URLs, schema valid."
exit 0
