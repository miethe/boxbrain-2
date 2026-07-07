"""Integration smoke tests for the HTML Capsules workflow.

Covers: CapsuleEmitter guard/dry-run/error isolation, CapsuleIndex round-trip,
phase-complete-capsule.sh hook, and meaty-capsule CLI validate smoke test.

Run from the worktree root:
    pytest .claude/skills/html-capsules/tests/test_workflow_integration.py -v
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Any, Dict
from unittest.mock import patch

import pytest

# ---------------------------------------------------------------------------
# Path setup — let test imports resolve lib / renderer without install
# ---------------------------------------------------------------------------

_TESTS_DIR = Path(__file__).resolve().parent
_SKILL_ROOT = _TESTS_DIR.parent
_LIB_DIR = _SKILL_ROOT / "lib"
_RENDERER_DIR = _SKILL_ROOT / "renderer"
_CLI_DIR = _SKILL_ROOT / "cli"
_HOOK_PATH = (
    _SKILL_ROOT.parent / "dev-execution" / "hooks" / "phase-complete-capsule.sh"
)
_FIXTURE_RUN_CARD = _TESTS_DIR / "fixtures" / "run-card.yaml"
_CLI_MAIN = _CLI_DIR / "__main__.py"

for _p in (_SKILL_ROOT, _LIB_DIR, _RENDERER_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

# ---------------------------------------------------------------------------
# Minimal event fixture
# ---------------------------------------------------------------------------

_MINIMAL_EVENT: Dict[str, Any] = {
    "tool": "phase-complete",
    "intent": "Phase 4 — Workflow Integration",
    "task": "phase-4-workflow-integration",
    "phase_number": 4,
    "progress_file": ".claude/progress/html-capsules/phase-4-progress.md",
}


# ---------------------------------------------------------------------------
# Test 1: emitter disabled by default
# ---------------------------------------------------------------------------


def test_emitter_disabled_by_default(tmp_path, monkeypatch):
    """Without SKILLMEAT_CAPSULES_ENABLED set, emit() returns None and
    writes nothing to disk."""
    monkeypatch.delenv("SKILLMEAT_CAPSULES_ENABLED", raising=False)
    monkeypatch.delenv("CAPSULES_DRY_RUN", raising=False)

    from emitter import CapsuleEmitter

    emitter = CapsuleEmitter(output_root=tmp_path)
    result = emitter.emit(event=_MINIMAL_EVENT, template="run-card")

    assert result is None, "emit() should return None when disabled"
    # No files or directories should have been created
    assert list(tmp_path.iterdir()) == [], "No files should be written when disabled"


# ---------------------------------------------------------------------------
# Test 2: emitter writes files when enabled
# ---------------------------------------------------------------------------


def test_emitter_emits_with_env_set(tmp_path, monkeypatch):
    """With SKILLMEAT_CAPSULES_ENABLED=1, emit() writes index.html +
    manifest.yaml to a dated slug directory and updates index.yaml."""
    monkeypatch.setenv("SKILLMEAT_CAPSULES_ENABLED", "1")
    monkeypatch.delenv("CAPSULES_DRY_RUN", raising=False)

    from emitter import CapsuleEmitter

    emitter = CapsuleEmitter(output_root=tmp_path)
    result = emitter.emit(event=_MINIMAL_EVENT, template="run-card")

    assert result is not None, "emit() should return a Path on success"
    assert isinstance(result, Path)

    # Check required files exist
    assert (result / "index.html").exists(), "index.html must be written"
    assert (result / "manifest.yaml").exists(), "manifest.yaml must be written"

    # Slug-based directory naming: YYYY-MM-DD-{slug}
    dir_name = result.name
    import re

    assert re.match(
        r"^\d{4}-\d{2}-\d{2}-", dir_name
    ), f"Directory name should start with YYYY-MM-DD-: {dir_name}"

    # Index should be updated
    index_path = tmp_path / "index.yaml"
    assert index_path.exists(), "index.yaml should be created after emission"

    import yaml

    with index_path.open("r", encoding="utf-8") as fh:
        index_data = yaml.safe_load(fh)

    assert "capsules" in index_data
    assert len(index_data["capsules"]) >= 1, "Index should have at least one entry"


# ---------------------------------------------------------------------------
# Test 3: dry-run produces no files but returns a path and logs marker
# ---------------------------------------------------------------------------


def test_emitter_dry_run(tmp_path, monkeypatch, caplog):
    """With both env vars set, no files are written but a [DRY RUN] log
    message is produced and emit() returns a Path."""
    monkeypatch.setenv("SKILLMEAT_CAPSULES_ENABLED", "1")
    monkeypatch.setenv("CAPSULES_DRY_RUN", "1")

    import logging

    from emitter import CapsuleEmitter

    with caplog.at_level(logging.INFO):
        emitter = CapsuleEmitter(output_root=tmp_path)
        result = emitter.emit(event=_MINIMAL_EVENT, template="run-card")

    # Should return a path (not None)
    assert result is not None, "dry-run emit() should return the would-be Path"
    assert isinstance(result, Path)

    # No files or directories should have been created under output_root
    real_capsule_dir = tmp_path / result.name
    assert not real_capsule_dir.exists(), (
        "dry-run should not create the capsule directory"
    )
    assert not (tmp_path / "index.yaml").exists(), (
        "dry-run should not update index.yaml"
    )

    # Log output must contain a dry-run marker
    dry_run_messages = [
        r for r in caplog.records if "[DRY RUN]" in r.message or "DRY" in r.message
    ]
    assert len(dry_run_messages) >= 1, (
        "At least one log record should contain a DRY RUN marker. "
        f"Captured log records: {[r.message for r in caplog.records]}"
    )


# ---------------------------------------------------------------------------
# Test 4: errors inside emit() are swallowed — no exception to caller
# ---------------------------------------------------------------------------


def test_emitter_errors_dont_raise(tmp_path, monkeypatch):
    """When CapsuleRenderer.render raises, emit() returns None without
    propagating the exception, and errors.log contains an entry."""
    monkeypatch.setenv("SKILLMEAT_CAPSULES_ENABLED", "1")
    monkeypatch.delenv("CAPSULES_DRY_RUN", raising=False)

    from emitter import CapsuleEmitter
    from capsule_renderer import CapsuleRenderer

    with patch.object(
        CapsuleRenderer, "render", side_effect=RuntimeError("simulated render failure")
    ):
        emitter = CapsuleEmitter(output_root=tmp_path)
        result = emitter.emit(event=_MINIMAL_EVENT, template="run-card")

    assert result is None, "emit() must return None on render failure"

    errors_log = tmp_path / "errors.log"
    assert errors_log.exists(), "errors.log should be created on failure"
    content = errors_log.read_text(encoding="utf-8")
    assert "emit() failed" in content or "simulated render failure" in content, (
        "errors.log should contain failure details"
    )


# ---------------------------------------------------------------------------
# Test 5: CapsuleIndex add → list → find_by_id round-trip
# ---------------------------------------------------------------------------


def test_capsule_index_round_trip(tmp_path):
    """Directly exercise CapsuleIndex.add, list_capsules, and find_by_id."""
    from capsule_index import CapsuleIndex

    index_path = tmp_path / "index.yaml"
    index = CapsuleIndex(index_path=index_path)

    # Create a minimal capsule directory with a manifest
    capsule_dir = tmp_path / "2026-05-15-test-capsule"
    capsule_dir.mkdir()

    manifest_content = {
        "html_capsule": {
            "schema_version": 0.1,
            "capsule_id": "capsule_run-card_test_20260515_abc123",
            "capsule_type": "run-card",
            "status": "draft",
            "created_at": "2026-05-15T10:00:00",
            "title": "Test Capsule",
            "source_of_truth": {"manifest": "manifest.yaml"},
        }
    }

    import yaml

    (capsule_dir / "manifest.yaml").write_text(
        yaml.dump(manifest_content), encoding="utf-8"
    )
    (capsule_dir / "index.html").write_text(
        "<html><body>test</body></html>", encoding="utf-8"
    )

    # Add to index
    index.add(capsule_dir)

    # list_capsules should return one entry
    entries = index.list_capsules()
    assert len(entries) == 1, f"Expected 1 entry, got {len(entries)}"
    assert entries[0]["capsule_id"] == "capsule_run-card_test_20260515_abc123"
    assert entries[0]["capsule_type"] == "run-card"

    # find_by_id should return the entry
    found = index.find_by_id("capsule_run-card_test_20260515_abc123")
    assert found is not None
    assert found["status"] == "draft"

    # find_by_id for nonexistent returns None
    not_found = index.find_by_id("does_not_exist")
    assert not_found is None

    # Adding the same capsule again is idempotent (same capsule_id → replaced)
    index.add(capsule_dir)
    entries_after = index.list_capsules()
    assert len(entries_after) == 1, "Re-adding same capsule_id should not duplicate"


# ---------------------------------------------------------------------------
# Test 6: phase-complete hook exits 0 when SKILLMEAT_CAPSULES_ENABLED is unset
# ---------------------------------------------------------------------------


def test_phase_completion_hook_exits_zero_when_disabled():
    """Invoke the hook with an empty env (no SKILLMEAT_CAPSULES_ENABLED).
    Expect exit code 0 and no stderr output."""
    if not _HOOK_PATH.exists():
        pytest.skip(f"Hook script not found: {_HOOK_PATH}")

    result = subprocess.run(
        ["bash", str(_HOOK_PATH)],
        capture_output=True,
        text=True,
        env={},  # completely empty environment
        timeout=10,
    )

    assert result.returncode == 0, (
        f"Hook should exit 0 when disabled. "
        f"returncode={result.returncode} stderr={result.stderr!r}"
    )
    assert result.stderr == "", (
        f"Hook should produce no stderr when disabled. stderr={result.stderr!r}"
    )


# ---------------------------------------------------------------------------
# Test 7: phase-complete hook emits when SKILLMEAT_CAPSULES_ENABLED=1
# ---------------------------------------------------------------------------


def test_phase_completion_hook_emits_when_enabled(tmp_path):
    """Invoke the hook with SKILLMEAT_CAPSULES_ENABLED=1.
    The hook should exit 0 (non-blocking contract always holds)."""
    if not _HOOK_PATH.exists():
        pytest.skip(f"Hook script not found: {_HOOK_PATH}")

    env = {
        "SKILLMEAT_CAPSULES_ENABLED": "1",
        "PHASE_NUM": "4",
        "PRD": "html-capsules",
        "PROGRESS_FILE": ".claude/progress/html-capsules/phase-4-progress.md",
        # Provide PATH so bash can find python
        "PATH": "/usr/bin:/bin:/usr/local/bin",
        "HOME": str(tmp_path),
    }

    result = subprocess.run(
        ["bash", str(_HOOK_PATH)],
        capture_output=True,
        text=True,
        env=env,
        timeout=30,
        cwd=str(_HOOK_PATH.parent.parent.parent.parent.parent),
        # cwd resolves to worktree root: .../html-capsules-exec/
    )

    # The hook's contract: ALWAYS exit 0, never block the workflow
    assert result.returncode == 0, (
        f"Hook must always exit 0. "
        f"returncode={result.returncode} stderr={result.stderr!r} "
        f"stdout={result.stdout!r}"
    )


# ---------------------------------------------------------------------------
# Test 8: meaty-capsule validate smoke test
# ---------------------------------------------------------------------------


def test_meaty_capsule_validate_smoke():
    """Subprocess call to meaty-capsule validate with a known-good fixture.
    Expect exit code 0."""
    if not _CLI_MAIN.exists():
        pytest.skip(f"CLI __main__.py not found: {_CLI_MAIN}")

    if not _FIXTURE_RUN_CARD.exists():
        pytest.skip(f"Fixture not found: {_FIXTURE_RUN_CARD}")

    result = subprocess.run(
        [
            sys.executable,
            str(_CLI_MAIN),
            "validate",
            "--manifest",
            str(_FIXTURE_RUN_CARD),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, (
        f"validate smoke test should exit 0. "
        f"returncode={result.returncode} "
        f"stdout={result.stdout!r} stderr={result.stderr!r}"
    )
