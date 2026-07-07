"""CapsuleEmitter service for HTML Capsule generation.

Receives a workflow event payload, builds a capsule manifest, calls
``CapsuleRenderer``, and writes the capsule bundle to disk.

Guard variables (checked at ``emit()`` call time, not construction):
    SKILLMEAT_CAPSULES_ENABLED=1   master switch; emission skipped if unset
    CAPSULES_DRY_RUN=1             log what would be written, write nothing

See ``docs/emission-triggers.md`` for the full trigger contract and
the Karen audit checklist.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

_LIB_DIR = Path(__file__).parent
_SKILL_ROOT = _LIB_DIR.parent
_RENDERER_DIR = _SKILL_ROOT / "renderer"

if str(_RENDERER_DIR) not in sys.path:
    sys.path.insert(0, str(_RENDERER_DIR))

from capsule_renderer import CapsuleRenderer  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_OUTPUT_ROOT = Path(".claude") / "capsules"
_ERRORS_LOG_NAME = "errors.log"

_SLUG_MAX_LEN = 48
_SLUG_UNSAFE = re.compile(r"[^a-z0-9]+")

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CapsuleEmitter
# ---------------------------------------------------------------------------


class CapsuleEmitter:
    """Emit HTML Capsule bundles from workflow events.

    Usage::

        emitter = CapsuleEmitter()

        # With guard enabled:
        # SKILLMEAT_CAPSULES_ENABLED=1
        path = emitter.emit(
            event={"tool": "phase-complete", "intent": "Phase 4", "task": "phase-4"},
            template="run-card",
        )

    Args:
        output_root: Directory under which capsule subdirectories are created.
            Defaults to ``.claude/capsules/`` relative to cwd.  Use an
            absolute path or a ``tempfile.TemporaryDirectory`` path in tests.
    """

    def __init__(self, output_root: Optional[Path] = None) -> None:
        self._output_root: Path = (
            output_root if output_root is not None else _DEFAULT_OUTPUT_ROOT
        )

    # ------------------------------------------------------------------
    # Public guard helpers
    # ------------------------------------------------------------------

    @staticmethod
    def is_enabled() -> bool:
        """Return True when SKILLMEAT_CAPSULES_ENABLED=1 is set."""
        return os.environ.get("SKILLMEAT_CAPSULES_ENABLED", "") == "1"

    def dry_run(self) -> bool:
        """Return True when both SKILLMEAT_CAPSULES_ENABLED=1 and CAPSULES_DRY_RUN=1."""
        return self.is_enabled() and os.environ.get("CAPSULES_DRY_RUN", "") == "1"

    # ------------------------------------------------------------------
    # Primary API
    # ------------------------------------------------------------------

    def emit(
        self,
        event: Dict[str, Any],
        template: str,
        source_content: Optional[Dict[str, Any]] = None,
    ) -> Optional[Path]:
        """Emit a capsule from a workflow event.

        Steps:
        1. Check ``SKILLMEAT_CAPSULES_ENABLED``; return ``None`` if not set.
        2. Check ``CAPSULES_DRY_RUN``; log and return path without writing.
        3. Build slug from ``event['task']`` or ``event['intent']``.
        4. Compute ``capsule_id``.
        5. Build manifest dict.
        6. Render via ``CapsuleRenderer``.
        7. Write ``index.html``, ``manifest.yaml``, and optional ``run.md``.
        8. Return capsule directory path.

        All exceptions are caught — a failed emission never raises to the caller.
        Errors are written to ``{output_root}/errors.log`` and ``None`` is returned.

        Args:
            event: Workflow event payload dict.  Recognised keys:
                ``tool``, ``intent``, ``task``, ``run_notes``, and any
                template-specific fields.
            template: Capsule type / template name (e.g. ``"run-card"``).
                Must match an entry in ``CapsuleRenderer._CAPSULE_TYPE_TO_TEMPLATE``
                or fall back to ``_base.html.j2``.
            source_content: Optional supplementary data passed through to the
                Jinja2 template as ``source_content``.

        Returns:
            Path to the capsule directory on success or dry-run, or ``None``
            on disabled / error.
        """
        # Guard: master switch
        if not self.is_enabled():
            return None

        try:
            slug = self._make_slug(event)
            capsule_id = self._make_capsule_id(template, slug)
            today = datetime.now().strftime("%Y-%m-%d")
            capsule_dir = self._unique_dir(today, slug)

            manifest = self._build_manifest(event, template, capsule_id, capsule_dir)

            # Render HTML (may raise — caught by outer try/except)
            renderer = CapsuleRenderer()
            html_output = renderer.render(manifest, source_content)

            # Dry-run: log and return without writing
            if self.dry_run():
                run_md_note = ", run.md" if event.get("run_notes") else ""
                logger.info("[DRY RUN] Would emit capsule: %s", capsule_dir)
                logger.info("[DRY RUN]   template: %s", template)
                logger.info("[DRY RUN]   capsule_id: %s", capsule_id)
                logger.info(
                    "[DRY RUN]   files: index.html, manifest.yaml%s", run_md_note
                )
                return capsule_dir

            # Real write
            capsule_dir.mkdir(parents=True, exist_ok=True)

            (capsule_dir / "index.html").write_text(html_output, encoding="utf-8")

            manifest_text = yaml.dump(
                manifest, default_flow_style=False, allow_unicode=True
            )
            (capsule_dir / "manifest.yaml").write_text(manifest_text, encoding="utf-8")

            run_notes = event.get("run_notes", "")
            if run_notes:
                (capsule_dir / "run.md").write_text(
                    str(run_notes), encoding="utf-8"
                )

            logger.info("Capsule emitted: %s", capsule_dir)

            # Register in the capsule index (index failure must not
            # invalidate the emission — wrapped in its own try/except).
            try:
                from capsule_index import CapsuleIndex  # noqa: PLC0415

                CapsuleIndex(index_path=self._output_root / "index.yaml").add(
                    capsule_dir
                )
            except Exception:
                logger.warning(
                    "CapsuleEmitter: index registration failed for %s",
                    capsule_dir,
                    exc_info=True,
                )

            return capsule_dir

        except Exception:
            self._log_error(event, template)
            return None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _make_slug(event: Dict[str, Any]) -> str:
        """Derive a URL-safe slug from the event task or intent field.

        Prefers ``event['task']`` then ``event['intent']``.  Falls back to
        ``"capsule"`` if neither is present.
        """
        raw = str(event.get("task") or event.get("intent") or "capsule")
        slug = _SLUG_UNSAFE.sub("-", raw.lower()).strip("-")
        return slug[:_SLUG_MAX_LEN].strip("-") or "capsule"

    @staticmethod
    def _make_capsule_id(template: str, slug: str) -> str:
        """Compute a stable capsule_id: capsule_{template}_{slug}_{YYYYMMDD}_{hash6}.

        The 6-char hash component is derived from template+slug+date to keep IDs
        stable across dry-run/real pairs within the same day while remaining unique
        across days.
        """
        date_str = datetime.now().strftime("%Y%m%d")
        hash_input = f"{template}/{slug}/{date_str}"
        hash6 = hashlib.sha1(hash_input.encode()).hexdigest()[:6]  # noqa: S324
        safe_template = _SLUG_UNSAFE.sub("-", template.lower()).strip("-")
        return f"capsule_{safe_template}_{slug}_{date_str}_{hash6}"

    def _unique_dir(self, today: str, slug: str) -> Path:
        """Return a unique capsule directory path under output_root.

        Format: ``{output_root}/{today}-{slug}``

        If the base path already exists, appends ``-2``, ``-3``, etc.
        """
        base = self._output_root / f"{today}-{slug}"
        if not base.exists():
            return base
        counter = 2
        while True:
            candidate = self._output_root / f"{today}-{slug}-{counter}"
            if not candidate.exists():
                return candidate
            counter += 1

    @staticmethod
    def _build_manifest(
        event: Dict[str, Any],
        template: str,
        capsule_id: str,
        capsule_dir: Path,
    ) -> Dict[str, Any]:
        """Build the capsule manifest dict from event fields.

        Constructs the ``html_capsule`` envelope required by the JSON schema
        (schema_version, capsule_id, capsule_type, status, source_of_truth,
        writebacks).

        Args:
            event: Raw workflow event payload.
            template: Capsule type name (mapped to capsule_type).
            capsule_id: Pre-computed capsule identifier.
            capsule_dir: Target capsule directory (used to build html path).

        Returns:
            Dict with ``html_capsule`` top-level key.
        """
        now_iso = datetime.now().isoformat()

        # Map template name to a valid capsule_type enum value.
        # schema enum: run-card, planning-capsule, planning_capsule, skill-card,
        # decision-card, research-capsule, gtm-brief, phase-progress,
        # source-note, code-review, demo-microsite
        capsule_type = template  # default: trust caller to pass valid type

        # source_of_truth: require at least one field (schema minProperties: 1)
        source_of_truth: Dict[str, Any] = {}
        if event.get("plan_file"):
            source_of_truth["structured_data"] = str(event["plan_file"])
        elif event.get("progress_file"):
            source_of_truth["structured_data"] = str(event["progress_file"])
        elif event.get("skill_path"):
            source_of_truth["structured_data"] = str(event["skill_path"])
        else:
            source_of_truth["manifest"] = "manifest.yaml"

        manifest: Dict[str, Any] = {
            "html_capsule": {
                "schema_version": 0.1,
                "capsule_id": capsule_id,
                "title": str(event.get("intent", event.get("task", capsule_id))),
                "capsule_type": capsule_type,
                "status": "draft",
                "created_at": now_iso,
                "updated_at": now_iso,
                "interactivity_level": "L2_exportable",
                "safe_html_mode": "strict",
                "source_of_truth": source_of_truth,
                "rendered_view": {
                    "html": "index.html",
                    "interactivity_level": "L2_exportable",
                    "safe_html_mode": "strict",
                },
                "agentic_context": {
                    "intent_id": event.get("intent"),
                    "task_node_id": event.get("task"),
                    "posture_chain": [],
                    "skillbom_id": None,
                },
                "evidence": {
                    "ccdash_event_id": event.get("ccdash_event_id"),
                    "validation": ["capsule_emitter_generated"],
                },
                "writebacks": {
                    "meatywiki": "proposed",
                    "skillmeat": "proposed",
                },
            }
        }

        # Merge any extra fields from the event into agentic_context
        for key in ("phase_number", "plan_type", "promoted_from"):
            if key in event:
                manifest["html_capsule"]["agentic_context"][key] = event[key]

        return manifest

    def _log_error(self, event: Dict[str, Any], template: str) -> None:
        """Append error details to the errors log file."""
        try:
            errors_log = self._output_root / _ERRORS_LOG_NAME
            errors_log.parent.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().isoformat()
            tb = traceback.format_exc()
            entry = (
                f"\n[{timestamp}] emit() failed\n"
                f"  event.tool={event.get('tool')!r}\n"
                f"  event.task={event.get('task')!r}\n"
                f"  template={template!r}\n"
                f"{tb}"
            )
            with errors_log.open("a", encoding="utf-8") as fh:
                fh.write(entry)
        except Exception:
            # Last-resort: log to stderr so the error is not silently dropped
            logger.error("CapsuleEmitter: failed to write errors.log", exc_info=True)
