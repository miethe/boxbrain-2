"""meaty-capsule capture-run subcommand.

Scaffolds a new capsule run directory containing:
  - run.md     : templated stub for human notes
  - manifest.yaml : skeleton manifest matching the capsule schema
  - index.html : rendered capsule output

Capsule ID format: capsule_<tool>_<task-slug>_<YYYYMMDD>
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

_SKILLS_ROOT = Path(__file__).resolve().parent.parent


def _slugify(text: str) -> str:
    """Convert text to a lowercase underscore slug."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = text.strip("_")
    return text


def _build_capsule_id(tool: str, task: str) -> str:
    """Build a capsule ID from tool and task."""
    today = date.today().strftime("%Y%m%d")
    return f"capsule_{_slugify(tool)}_{_slugify(task)}_{today}"


def _load_template(template_name: str, intent: str, task: str) -> str:
    """Load a named run-note template or raise a graceful error.

    Returns the rendered template string.
    """
    templates_dir = _SKILLS_ROOT / "templates"
    # Phase 2 templates may not exist yet.
    template_path = templates_dir / f"{template_name}.md"
    if not template_path.exists():
        print(
            f"Template not found: {template_name}. "
            "Run after Phase 2 templates exist.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    content = template_path.read_text(encoding="utf-8")
    # Simple variable substitution — no full templating engine needed here.
    content = content.replace("{{intent}}", intent or "")
    content = content.replace("{{task}}", task or "")
    return content


def _default_run_md(tool: str, intent: str, task: str, capsule_id: str) -> str:
    """Return a default run-notes stub when no template is requested."""
    return f"""# Run Notes — {capsule_id}

**Tool**: {tool}
**Intent**: {intent or '(not set)'}
**Task**: {task or '(not set)'}

## Summary

<!-- Describe what this run accomplished -->

## Key Observations

<!-- Notable findings, decisions, or blockers -->

## Next Steps

<!-- Follow-on actions or open questions -->
"""


def _manifest_skeleton(
    capsule_id: str,
    tool: str,
    intent: str,
    task: str,
) -> str:
    """Return a YAML manifest skeleton as a string."""
    today_iso = date.today().isoformat()
    return f"""html_capsule:
  schema_version: 0.1
  capsule_id: {capsule_id}
  title: "Run: {task or tool}"
  capsule_type: run-card
  status: draft
  created_at: "{today_iso}T00:00:00Z"
  owner: ""
  confidentiality: personal

  # Agentic context — fill in after the run
  agentic_context:
    intent_id: null
    task_node_id: null
    posture_chain: []
    skillbom_id: null

  source_of_truth:
    run_log: run.md

  rendered_view:
    html: index.html
    interactivity_level: L2_exportable
    safe_html_mode: true

  # Run metadata (tool-specific extension)
  run_metadata:
    tool: "{tool}"
    intent: "{intent or ''}"
    task: "{task or ''}"

  writebacks:
    meatywiki: proposed
    ccdash: proposed
    skillmeat: proposed
    intenttree: proposed
    control_plane: proposed
"""


def build_parser(subparsers=None) -> argparse.ArgumentParser:
    """Build (and optionally register) the 'capture-run' subcommand parser."""
    kwargs = {
        "description": (
            "Scaffold a new capsule run directory with run.md, manifest.yaml, "
            "and index.html."
        ),
        "help": "Scaffold a capsule run directory from a template.",
    }
    if subparsers is not None:
        parser = subparsers.add_parser("capture-run", **kwargs)
    else:
        parser = argparse.ArgumentParser(
            prog="meaty-capsule capture-run", **kwargs
        )

    parser.add_argument(
        "--tool",
        required=True,
        metavar="TOOL",
        help="Name of the tool or agent that produced this run.",
    )
    parser.add_argument(
        "--intent",
        default="",
        metavar="INTENT",
        help="High-level intent or goal for this run.",
    )
    parser.add_argument(
        "--task",
        default="",
        metavar="TASK",
        help="Specific task name or description.",
    )
    parser.add_argument(
        "--template",
        default=None,
        metavar="TEMPLATE_NAME",
        help=(
            "Template name for run.md scaffolding. "
            "Requires Phase 2 templates to exist."
        ),
    )
    parser.add_argument(
        "--out-dir",
        required=True,
        metavar="OUT_DIR",
        help="Target directory to scaffold the capsule run into.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help=(
            "Dry-run mode: print what would be scaffolded without creating any files. "
            "Also activated by CAPSULES_DRY_RUN=1 environment variable."
        ),
    )
    return parser


def _is_dry_run(args: argparse.Namespace) -> bool:
    """Return True when dry-run is requested via flag or environment variable."""
    import os  # noqa: PLC0415

    return getattr(args, "dry_run", False) or os.environ.get("CAPSULES_DRY_RUN") == "1"


def run(args: argparse.Namespace) -> int:
    """Execute the capture-run subcommand.

    Args:
        args: Parsed argument namespace from build_parser().

    Returns:
        Exit code (0 = success, 1 = error).
    """
    dry_run = _is_dry_run(args)
    out_dir = Path(args.out_dir)

    capsule_id = _build_capsule_id(args.tool, args.task or args.tool)

    if dry_run:
        run_md_path = out_dir / "run.md"
        manifest_path = out_dir / "manifest.yaml"
        html_path = out_dir / "index.html"
        print(f"[DRY-RUN] Would scaffold capsule run in: {out_dir}")
        print(f"[DRY-RUN]   capsule_id : {capsule_id}")
        print(f"[DRY-RUN]   run.md     : {run_md_path}")
        print(f"[DRY-RUN]   manifest   : {manifest_path}")
        print(f"[DRY-RUN]   index.html : {html_path}")
        if args.template:
            print(f"[DRY-RUN]   template   : {args.template}")
        return 0

    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        print(f"Error creating output directory: {exc}", file=sys.stderr)
        return 1

    # --- run.md ---
    if args.template:
        run_md_content = _load_template(args.template, args.intent, args.task)
    else:
        run_md_content = _default_run_md(
            args.tool, args.intent, args.task, capsule_id
        )

    run_md_path = out_dir / "run.md"
    try:
        run_md_path.write_text(run_md_content, encoding="utf-8")
    except OSError as exc:
        print(f"Error writing run.md: {exc}", file=sys.stderr)
        return 1

    # --- manifest.yaml ---
    manifest_content = _manifest_skeleton(
        capsule_id, args.tool, args.intent, args.task
    )
    manifest_path = out_dir / "manifest.yaml"
    try:
        manifest_path.write_text(manifest_content, encoding="utf-8")
    except OSError as exc:
        print(f"Error writing manifest.yaml: {exc}", file=sys.stderr)
        return 1

    # --- index.html (render from manifest) ---
    # Reuse the render subcommand logic.
    if str(_SKILLS_ROOT) not in sys.path:
        sys.path.insert(0, str(_SKILLS_ROOT))

    try:
        from renderer import CapsuleRenderer  # noqa: PLC0415
    except ImportError as exc:
        print(
            f"Could not import CapsuleRenderer: {exc}. "
            "Ensure jinja2 and jsonschema are installed.",
            file=sys.stderr,
        )
        return 1

    try:
        import yaml  # noqa: PLC0415
    except ImportError as exc:
        print(
            "PyYAML is required. Install with: pip install pyyaml",
            file=sys.stderr,
        )
        return 1

    try:
        with manifest_path.open("r", encoding="utf-8") as fh:
            manifest_dict = yaml.safe_load(fh)
    except Exception as exc:  # noqa: BLE001
        print(f"Error loading manifest for rendering: {exc}", file=sys.stderr)
        return 1

    try:
        renderer = CapsuleRenderer()
        html = renderer.render(manifest_dict)
    except ValueError as exc:
        print(f"Render warning (continuing): {exc}", file=sys.stderr)
        html = (
            f"<!DOCTYPE html><html><body>"
            f"<p>Render failed: {exc}</p>"
            f"</body></html>"
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected render error (continuing): {exc}", file=sys.stderr)
        html = (
            f"<!DOCTYPE html><html><body>"
            f"<p>Render error: {exc}</p>"
            f"</body></html>"
        )

    html_path = out_dir / "index.html"
    try:
        html_path.write_text(html, encoding="utf-8")
    except OSError as exc:
        print(f"Error writing index.html: {exc}", file=sys.stderr)
        return 1

    print(f"Scaffolded: {out_dir}")
    print(f"  capsule_id : {capsule_id}")
    print(f"  run.md     : {run_md_path}")
    print(f"  manifest   : {manifest_path}")
    print(f"  index.html : {html_path}")
    return 0
