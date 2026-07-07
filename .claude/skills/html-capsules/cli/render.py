"""meaty-capsule render subcommand.

Renders a capsule manifest (YAML) to a self-contained HTML file using
CapsuleRenderer.  Exits 0 on success; prints an error to stderr and exits
non-zero on any failure.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _load_yaml(path: Path) -> dict:
    """Load a YAML file and return its contents as a dict."""
    try:
        import yaml  # type: ignore
    except ImportError as exc:
        print(
            "PyYAML is required for manifest loading. "
            "Install it with: pip install pyyaml",
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
        print(f"Invalid YAML in manifest: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    if not isinstance(data, dict):
        print(
            f"Manifest must be a YAML mapping (got {type(data).__name__}).",
            file=sys.stderr,
        )
        raise SystemExit(1)

    return data


def _get_renderer():
    """Import and return a CapsuleRenderer instance."""
    # Support both installed-package and script/worktree invocations.
    _HERE = Path(__file__).resolve().parent.parent
    if str(_HERE) not in sys.path:
        sys.path.insert(0, str(_HERE))

    try:
        from renderer import CapsuleRenderer  # noqa: PLC0415
    except ImportError as exc:
        print(
            f"Could not import CapsuleRenderer: {exc}. "
            "Ensure jinja2 and jsonschema are installed.",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    return CapsuleRenderer()


def build_parser(subparsers=None) -> argparse.ArgumentParser:
    """Build (and optionally register) the 'render' subcommand parser."""
    kwargs = {
        "description": (
            "Render a capsule manifest (YAML) to a self-contained HTML file."
        ),
        "help": "Render a capsule manifest to HTML.",
    }
    if subparsers is not None:
        parser = subparsers.add_parser("render", **kwargs)
    else:
        parser = argparse.ArgumentParser(prog="meaty-capsule render", **kwargs)

    source_group = parser.add_mutually_exclusive_group()
    source_group.add_argument(
        "--source",
        metavar="YAML_PATH",
        help="Path to the capsule manifest YAML file.",
    )
    source_group.add_argument(
        "--manifest",
        metavar="YAML_PATH",
        help="Alias for --source.",
    )
    parser.add_argument(
        "--type",
        dest="capsule_type",
        metavar="CAPSULE_TYPE",
        help=(
            "Override the capsule_type declared in the manifest "
            "(e.g. run-card, planning-capsule)."
        ),
    )
    parser.add_argument(
        "--out",
        metavar="HTML_PATH",
        required=True,
        help="Output path for the rendered HTML file.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help=(
            "Dry-run mode: print what would be written without creating any files. "
            "Also activated by CAPSULES_DRY_RUN=1 environment variable."
        ),
    )
    return parser


def _is_dry_run(args: argparse.Namespace) -> bool:
    """Return True when dry-run is requested via flag or environment variable."""
    import os  # noqa: PLC0415

    return getattr(args, "dry_run", False) or os.environ.get("CAPSULES_DRY_RUN") == "1"


def run(args: argparse.Namespace) -> int:
    """Execute the render subcommand.

    Args:
        args: Parsed argument namespace from build_parser().

    Returns:
        Exit code (0 = success, 1 = error).
    """
    # Resolve manifest path from either --source or --manifest.
    raw_path = args.source or getattr(args, "manifest", None)
    if not raw_path:
        print(
            "Error: one of --source or --manifest is required.",
            file=sys.stderr,
        )
        return 1

    manifest_path = Path(raw_path)
    if not manifest_path.exists():
        print(f"Error: manifest not found: {manifest_path}", file=sys.stderr)
        return 1

    manifest = _load_yaml(manifest_path)

    # Optional type override.
    if args.capsule_type:
        manifest.setdefault("html_capsule", {})["capsule_type"] = args.capsule_type

    dry_run = _is_dry_run(args)

    renderer = _get_renderer()

    try:
        html = renderer.render(manifest)
    except ValueError as exc:
        print(f"Render error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected render error: {exc}", file=sys.stderr)
        return 1

    out_path = Path(args.out)

    if dry_run:
        byte_count = len(html.encode("utf-8"))
        print(f"[DRY-RUN] Would write {byte_count} bytes to: {out_path}")
        print(f"[DRY-RUN] Manifest source: {manifest_path}")
        capsule_type = manifest.get("html_capsule", {}).get("capsule_type", "(unknown)")
        print(f"[DRY-RUN] Capsule type: {capsule_type}")
        return 0

    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(html, encoding="utf-8")
    except OSError as exc:
        print(f"Error writing output: {exc}", file=sys.stderr)
        return 1

    print(f"Rendered: {out_path}")
    return 0
