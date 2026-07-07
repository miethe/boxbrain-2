"""meaty-capsule export-writeback subcommand.

Reads a capsule manifest (YAML) or rendered HTML (auto-detected by extension)
and emits a writeback bundle conforming to writeback-bundle.schema.json.

Source autodetection:
  *.yaml / *.yml  → treat as manifest
  *.html / *.htm  → extract manifest reference from rendered HTML (not yet
                    supported; falls back to requiring a sibling manifest.yaml)

Writeback targets (from Spec §11, §13):
  meatywiki, ccdash, skillmeat, intenttree, control_plane
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

_WRITEBACK_TARGETS = [
    "meatywiki",
    "ccdash",
    "skillmeat",
    "intenttree",
    "control_plane",
]


def _load_manifest_from_yaml(path: Path) -> dict:
    """Load and return a capsule manifest from a YAML file."""
    try:
        import yaml  # noqa: PLC0415
    except ImportError as exc:
        print(
            "PyYAML is required. Install with: pip install pyyaml",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    try:
        with path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except OSError as exc:
        print(f"Error reading manifest: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    except yaml.YAMLError as exc:
        print(f"Invalid YAML: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    if not isinstance(data, dict):
        print(
            f"Manifest must be a YAML mapping (got {type(data).__name__}).",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return data


def _load_manifest_from_html(html_path: Path) -> dict:
    """Attempt to resolve a manifest from a rendered HTML file.

    Strategy: look for a sibling manifest.yaml / manifest.yml.
    """
    for name in ("manifest.yaml", "manifest.yml"):
        sibling = html_path.parent / name
        if sibling.exists():
            return _load_manifest_from_yaml(sibling)
    print(
        f"Error: cannot resolve manifest from HTML source '{html_path}'. "
        "Place a manifest.yaml sibling next to the HTML file, or pass the "
        "manifest YAML directly as --source.",
        file=sys.stderr,
    )
    raise SystemExit(1)


def _load_manifest(source_path: Path) -> dict:
    """Autodetect source type and load the manifest."""
    suffix = source_path.suffix.lower()
    if suffix in (".yaml", ".yml"):
        return _load_manifest_from_yaml(source_path)
    if suffix in (".html", ".htm"):
        return _load_manifest_from_html(source_path)
    print(
        f"Error: unrecognised source extension '{suffix}'. "
        "Expected .yaml/.yml or .html/.htm.",
        file=sys.stderr,
    )
    raise SystemExit(1)


def _writeback_entry_from_manifest(
    target: str,
    wb_value,
    capsule_data: dict,
) -> dict:
    """Build a writeback bundle entry for one target.

    Args:
        target: One of the five canonical target names.
        wb_value: The raw writeback value from the manifest (string status
            shorthand or object descriptor).
        capsule_data: The unwrapped html_capsule dict.

    Returns:
        A writeback entry dict conforming to writeback-bundle.schema.json.
    """
    # Determine status and any destination hints from the manifest value.
    if isinstance(wb_value, str):
        status = wb_value
        destination_hint = {}
        operation = "create_or_update"
    elif isinstance(wb_value, dict):
        status = wb_value.get("status", "proposed")
        operation = wb_value.get("operation", "create_or_update")
        destination_hint = {}
        if "target" in wb_value:
            destination_hint["path"] = wb_value["target"]
    else:
        status = "proposed"
        destination_hint = {}
        operation = "create_or_update"

    capsule_id = capsule_data.get("capsule_id", "")
    capsule_title = capsule_data.get("title", capsule_id)

    # Build a minimal but useful payload per target.
    payload = _build_payload(target, capsule_data, capsule_id, capsule_title)

    entry: dict = {
        "target": target,
        "action": operation,
        "status": status,
        "payload": payload,
    }
    if destination_hint:
        entry["destination"] = destination_hint

    notes = _build_notes(target, capsule_title)
    if notes:
        entry["notes"] = notes

    return entry


def _build_payload(
    target: str,
    capsule_data: dict,
    capsule_id: str,
    capsule_title: str,
) -> dict:
    """Return a minimal target-specific payload dict."""
    if target == "meatywiki":
        return {
            "page_type": "decision",
            "markdown": f"# {capsule_title}\n\nCapsule ID: `{capsule_id}`\n",
            "tags": ["html-capsule", capsule_data.get("capsule_type", "")],
        }
    if target == "ccdash":
        return {
            "event_type": "capsule_export",
            "capsule_ref": capsule_id,
            "event_data": {
                "capsule_type": capsule_data.get("capsule_type", ""),
                "status": capsule_data.get("status", "draft"),
            },
        }
    if target == "skillmeat":
        return {
            "artifact_type": "skillbom",
            "artifact_spec": {
                "name": capsule_id,
                "title": capsule_title,
                "capsule_type": capsule_data.get("capsule_type", ""),
            },
        }
    if target == "intenttree":
        return {
            "node_type": "outcome",
            "node_data": {
                "capsule_id": capsule_id,
                "title": capsule_title,
                "capsule_type": capsule_data.get("capsule_type", ""),
            },
        }
    if target == "control_plane":
        return {
            "decision_type": "routing",
            "routing_note": (
                f"Capsule '{capsule_id}' exported for control plane review."
            ),
            "decision_data": {
                "capsule_id": capsule_id,
                "capsule_type": capsule_data.get("capsule_type", ""),
                "status": capsule_data.get("status", "draft"),
            },
        }
    return {}


def _build_notes(target: str, capsule_title: str) -> str:
    """Return a brief human-readable note for the writeback entry."""
    notes_map = {
        "meatywiki": f"Auto-generated page stub for capsule: {capsule_title}",
        "ccdash": "Execution event record for this capsule export.",
        "skillmeat": "SkillBOM candidate derived from capsule manifest.",
        "intenttree": "Outcome node linking this capsule to the intent graph.",
        "control_plane": "Routing signal for control plane review.",
    }
    return notes_map.get(target, "")


def build_parser(subparsers=None) -> argparse.ArgumentParser:
    """Build (and optionally register) the 'export-writeback' subcommand parser."""
    kwargs = {
        "description": (
            "Export a writeback bundle JSON from a capsule manifest or rendered HTML. "
            "Autodetects source type by file extension (.yaml/.yml or .html/.htm)."
        ),
        "help": "Export a writeback bundle from a capsule manifest.",
    }
    if subparsers is not None:
        parser = subparsers.add_parser("export-writeback", **kwargs)
    else:
        parser = argparse.ArgumentParser(
            prog="meaty-capsule export-writeback", **kwargs
        )

    parser.add_argument(
        "--source",
        required=True,
        metavar="SOURCE",
        help=(
            "Path to the capsule manifest YAML or rendered HTML. "
            "Autodetected by extension."
        ),
    )
    parser.add_argument(
        "--out",
        required=True,
        metavar="BUNDLE_PATH",
        help="Output path for the writeback bundle JSON (e.g. writeback.bundle.json).",
    )
    return parser


def run(args: argparse.Namespace) -> int:
    """Execute the export-writeback subcommand.

    Args:
        args: Parsed argument namespace from build_parser().

    Returns:
        Exit code (0 = success, 1 = error).
    """
    source_path = Path(args.source)
    if not source_path.exists():
        print(f"Error: source not found: {source_path}", file=sys.stderr)
        return 1

    manifest = _load_manifest(source_path)
    capsule_data = manifest.get("html_capsule", manifest)
    capsule_id = capsule_data.get("capsule_id", "")

    if not capsule_id:
        print(
            "Error: manifest is missing 'html_capsule.capsule_id'.",
            file=sys.stderr,
        )
        return 1

    writebacks_raw = capsule_data.get("writebacks", {})
    if not writebacks_raw:
        print(
            "Warning: no writebacks defined in manifest.",
            file=sys.stderr,
        )

    schema_version = capsule_data.get("schema_version", 0.1)
    generated_at = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    entries = []
    for target in _WRITEBACK_TARGETS:
        wb_value = writebacks_raw.get(target)
        if wb_value is None:
            continue
        entries.append(
            _writeback_entry_from_manifest(target, wb_value, capsule_data)
        )

    # Also include any non-standard targets defined in the manifest.
    for target, wb_value in writebacks_raw.items():
        if target not in _WRITEBACK_TARGETS:
            entries.append(
                _writeback_entry_from_manifest(target, wb_value, capsule_data)
            )

    if not entries:
        print(
            "Error: no writeback entries could be generated "
            "(manifest.writebacks is empty or missing).",
            file=sys.stderr,
        )
        return 1

    bundle = {
        "schema_version": 0.1,
        "capsule_id": capsule_id,
        "generated_at": generated_at,
        "review_status": "proposed",
        "source_capsule_version": schema_version,
        "writebacks": entries,
    }

    out_path = Path(args.out)
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    except OSError as exc:
        print(f"Error writing writeback bundle: {exc}", file=sys.stderr)
        return 1

    print(f"Exported: {out_path}")
    print(f"  capsule_id : {capsule_id}")
    print(f"  entries    : {len(entries)}")
    return 0
