"""CapsuleIndex — lightweight YAML index of emitted HTML Capsules.

Maintains a sorted registry of every capsule that has been emitted to
``.claude/capsules/``.  The index file is written atomically to avoid
corruption from concurrent writes.

Index file format::

    schema_version: 0.1
    capsules:
      - capsule_id: capsule_run-card_phase-4_20260515_abc123
        capsule_type: run-card
        status: draft
        created_at: "2026-05-15T12:34:56.789012"
        path: .claude/capsules/2026-05-15-phase-4/
        source_of_truth: manifest.yaml

Sorting: entries are kept in descending ``created_at`` order so the most
recent capsule appears first.

``CapsuleEmitter`` calls ``CapsuleIndex().add(capsule_dir)`` after a
successful real emission.  Index failures are caught internally and must
never propagate to the emitter.
"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_INDEX_PATH = Path(".claude") / "capsules" / "index.yaml"
_SCHEMA_VERSION = 0.1

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CapsuleIndex
# ---------------------------------------------------------------------------


class CapsuleIndex:
    """Read and write the capsule index YAML file.

    Args:
        index_path: Path to the index YAML file.  Defaults to
            ``.claude/capsules/index.yaml`` relative to cwd.
    """

    def __init__(self, index_path: Optional[Path] = None) -> None:
        self._index_path: Path = (
            index_path if index_path is not None else _DEFAULT_INDEX_PATH
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add(self, capsule_dir: Path) -> None:
        """Register a newly emitted capsule in the index.

        Reads the capsule's ``manifest.yaml``, builds an index entry, appends
        it to the existing index (creating the file if absent), sorts all
        entries by ``created_at`` descending, and writes the result back
        atomically.

        Args:
            capsule_dir: Path to the capsule directory (must contain
                ``manifest.yaml``).

        Raises:
            Nothing — all exceptions are caught internally and logged.
        """
        try:
            self._add(capsule_dir)
        except Exception:
            logger.warning(
                "CapsuleIndex.add() failed for %s — index not updated",
                capsule_dir,
                exc_info=True,
            )

    def list_capsules(self) -> List[Dict[str, Any]]:
        """Return all index entries, newest first.

        Returns:
            List of entry dicts (empty list if the index file does not exist
            or cannot be parsed).
        """
        data = self._load()
        return data.get("capsules", [])

    def find_by_id(self, capsule_id: str) -> Optional[Dict[str, Any]]:
        """Find a single entry by ``capsule_id``.

        Args:
            capsule_id: The capsule identifier string.

        Returns:
            The matching entry dict, or ``None`` if not found.
        """
        for entry in self.list_capsules():
            if entry.get("capsule_id") == capsule_id:
                return entry
        return None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _add(self, capsule_dir: Path) -> None:
        """Implementation of add() — may raise."""
        manifest_path = capsule_dir / "manifest.yaml"
        if not manifest_path.exists():
            raise FileNotFoundError(
                f"manifest.yaml not found in capsule dir: {capsule_dir}"
            )

        manifest_text = manifest_path.read_text(encoding="utf-8")
        manifest = yaml.safe_load(manifest_text)
        html_capsule = manifest.get("html_capsule", {})

        # Build index entry from manifest fields
        entry = self._entry_from_manifest(html_capsule, capsule_dir)

        # Load existing index (or start fresh)
        data = self._load()
        existing: List[Dict[str, Any]] = data.get("capsules", [])

        # Remove stale entry with the same capsule_id (idempotent re-index)
        capsule_id = entry["capsule_id"]
        existing = [e for e in existing if e.get("capsule_id") != capsule_id]

        # Append and sort newest-first by created_at (ISO strings sort correctly)
        existing.append(entry)
        existing.sort(key=lambda e: e.get("created_at", ""), reverse=True)

        data["schema_version"] = _SCHEMA_VERSION
        data["capsules"] = existing

        self._write_atomic(data)

    def _entry_from_manifest(
        self, html_capsule: Dict[str, Any], capsule_dir: Path
    ) -> Dict[str, Any]:
        """Build an index entry dict from a manifest html_capsule block."""
        # Determine a relative path for the ``path`` field.  Use relative path
        # from cwd when possible; fall back to absolute if relpath fails.
        try:
            rel_path = str(capsule_dir.relative_to(Path.cwd())) + os.sep
        except ValueError:
            rel_path = str(capsule_dir) + os.sep

        # source_of_truth: stringify the first value from the manifest block
        sot_block = html_capsule.get("source_of_truth", {})
        if isinstance(sot_block, dict) and sot_block:
            source_of_truth = str(next(iter(sot_block.values())))
        else:
            source_of_truth = str(sot_block) if sot_block else "manifest.yaml"

        return {
            "capsule_id": html_capsule.get("capsule_id", ""),
            "capsule_type": html_capsule.get("capsule_type", ""),
            "status": html_capsule.get("status", "draft"),
            "created_at": html_capsule.get("created_at", ""),
            "path": rel_path,
            "source_of_truth": source_of_truth,
        }

    def _load(self) -> Dict[str, Any]:
        """Load the index YAML file.  Returns empty structure if absent/invalid."""
        if not self._index_path.exists():
            return {"schema_version": _SCHEMA_VERSION, "capsules": []}
        try:
            raw = self._index_path.read_text(encoding="utf-8")
            data = yaml.safe_load(raw)
            if not isinstance(data, dict):
                return {"schema_version": _SCHEMA_VERSION, "capsules": []}
            if "capsules" not in data or not isinstance(data["capsules"], list):
                data["capsules"] = []
            return data
        except Exception:
            logger.warning(
                "CapsuleIndex: failed to parse %s — treating as empty",
                self._index_path,
                exc_info=True,
            )
            return {"schema_version": _SCHEMA_VERSION, "capsules": []}

    def _write_atomic(self, data: Dict[str, Any]) -> None:
        """Write ``data`` to the index file atomically via a temp file + rename."""
        self._index_path.parent.mkdir(parents=True, exist_ok=True)

        yaml_text = yaml.dump(
            data, default_flow_style=False, allow_unicode=True, sort_keys=False
        )

        dir_path = self._index_path.parent
        fd, tmp_path = tempfile.mkstemp(
            dir=str(dir_path), prefix=".index-", suffix=".yaml.tmp"
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(yaml_text)
            os.replace(tmp_path, str(self._index_path))
        except Exception:
            # Clean up temp file on failure
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise
