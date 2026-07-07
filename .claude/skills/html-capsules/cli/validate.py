"""meaty-capsule validate subcommand.

Validates a capsule manifest YAML against the capsule-manifest JSON schema.
Optionally checks a rendered HTML file for safe-HTML policy violations.
Exits 0 if valid; exits non-zero with a structured error message on failure.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCHEMAS_DIR = Path(__file__).resolve().parent.parent / "schemas"
_MANIFEST_SCHEMA_PATH = _SCHEMAS_DIR / "capsule-manifest.schema.json"


def _ensure_imports():
    """Ensure required third-party packages are importable."""
    missing = []
    try:
        import yaml  # noqa: F401
    except ImportError:
        missing.append("pyyaml")
    try:
        import jsonschema  # noqa: F401
    except ImportError:
        missing.append("jsonschema")
    if missing:
        print(
            f"Missing required packages: {', '.join(missing)}. "
            f"Install with: pip install {' '.join(missing)}",
            file=sys.stderr,
        )
        raise SystemExit(1)


def _load_yaml(path: Path) -> dict:
    """Load a YAML file and return its parsed contents."""
    import yaml  # noqa: PLC0415

    try:
        with path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except OSError as exc:
        print(f"Error reading file: {exc}", file=sys.stderr)
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


def _validate_against_schema(manifest: dict) -> list:
    """Validate manifest against the capsule-manifest JSON schema.

    Returns:
        List of error message strings (empty = valid).
    """
    import jsonschema  # noqa: PLC0415

    if not _MANIFEST_SCHEMA_PATH.exists():
        print(
            f"Schema not found at: {_MANIFEST_SCHEMA_PATH}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    with _MANIFEST_SCHEMA_PATH.open("r", encoding="utf-8") as fh:
        schema = json.load(fh)

    validator_cls = jsonschema.validators.validator_for(schema)
    validator = validator_cls(schema)
    errors = sorted(validator.iter_errors(manifest), key=lambda e: e.path)

    return [
        {
            "path": "/".join(str(p) for p in err.absolute_path) or "<root>",
            "message": err.message,
        }
        for err in errors
    ]


def _check_safe_html(html_path: Path) -> list:
    """Check a rendered HTML file for safe-HTML violations.

    Returns:
        List of violation strings (empty = clean).
    """
    _LIB_DIR = Path(__file__).resolve().parent.parent / "lib"
    if str(_LIB_DIR) not in sys.path:
        sys.path.insert(0, str(_LIB_DIR))

    try:
        from safe_html import assert_no_external_urls  # noqa: PLC0415
    except ImportError as exc:
        print(
            f"Could not import safe_html module: {exc}",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    try:
        content = html_path.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"Error reading rendered HTML: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    violations = []
    try:
        assert_no_external_urls(content)
    except ValueError as exc:
        violations.append(str(exc))
    return violations


def build_parser(subparsers=None) -> argparse.ArgumentParser:
    """Build (and optionally register) the 'validate' subcommand parser."""
    kwargs = {
        "description": (
            "Validate a capsule manifest YAML against the schema. "
            "Optionally check a rendered HTML file for safe-HTML violations."
        ),
        "help": "Validate a capsule manifest (and optionally rendered HTML).",
    }
    if subparsers is not None:
        parser = subparsers.add_parser("validate", **kwargs)
    else:
        parser = argparse.ArgumentParser(prog="meaty-capsule validate", **kwargs)

    parser.add_argument(
        "--manifest",
        metavar="YAML_PATH",
        required=True,
        help="Path to the capsule manifest YAML file to validate.",
    )
    parser.add_argument(
        "--rendered",
        metavar="HTML_PATH",
        help=(
            "Optional path to a rendered HTML file to check for "
            "safe-HTML policy violations."
        ),
    )
    return parser


def run(args: argparse.Namespace) -> int:
    """Execute the validate subcommand.

    Args:
        args: Parsed argument namespace from build_parser().

    Returns:
        Exit code (0 = valid, 1 = validation errors).
    """
    _ensure_imports()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"Error: manifest not found: {manifest_path}", file=sys.stderr)
        return 1

    manifest = _load_yaml(manifest_path)
    schema_errors = _validate_against_schema(manifest)

    safe_html_violations: list = []
    if hasattr(args, "rendered") and args.rendered:
        rendered_path = Path(args.rendered)
        if not rendered_path.exists():
            print(
                f"Error: rendered HTML not found: {rendered_path}",
                file=sys.stderr,
            )
            return 1
        safe_html_violations = _check_safe_html(rendered_path)

    if not schema_errors and not safe_html_violations:
        print(f"OK: {manifest_path}")
        if hasattr(args, "rendered") and args.rendered:
            print(f"OK (safe-HTML): {args.rendered}")
        return 0

    # Report errors in structured form.
    result = {
        "valid": False,
        "manifest": str(manifest_path),
        "schema_errors": schema_errors,
        "safe_html_violations": safe_html_violations,
    }
    print(json.dumps(result, indent=2), file=sys.stderr)
    return 1
