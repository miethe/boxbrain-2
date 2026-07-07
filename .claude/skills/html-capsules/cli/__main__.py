"""meaty-capsule CLI dispatcher.

Entry point for the ``meaty-capsule`` command.  Dispatches to one of four
subcommands: render, validate, capture-run, export-writeback.

Invocation:
    python -m html_capsules.cli [subcommand] [flags]
    python .../cli/__main__.py [subcommand] [flags]
    meaty-capsule [subcommand] [flags]   # via bin/meaty-capsule shim

Future SkillMeat integration: add the entry point to pyproject.toml once
the html-capsules skill is packaged:
    [project.scripts]
    meaty-capsule = "html_capsules.cli.__main__:main"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# sys.path setup — support both installed package and worktree/script
# invocations without requiring editable installs.
# ---------------------------------------------------------------------------

_CLI_DIR = Path(__file__).resolve().parent
_SKILLS_ROOT = _CLI_DIR.parent  # .../html-capsules/

# When invoked as a script or via the shim, the skills root may not be on
# sys.path.  Insert it so that sibling packages (renderer, lib, etc.) import.
if str(_SKILLS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SKILLS_ROOT))

# Also support "python -m html_capsules.cli" from a parent directory by
# inserting the parent of the skills root.
_SKILLS_PARENT = _SKILLS_ROOT.parent
if str(_SKILLS_PARENT) not in sys.path:
    sys.path.insert(0, str(_SKILLS_PARENT))

# ---------------------------------------------------------------------------
# Lazy subcommand imports — deferred so --help works even when optional deps
# (jinja2, jsonschema, pyyaml) are absent.
# ---------------------------------------------------------------------------

def _import_subcommand(name: str):
    """Import a subcommand module by short name."""
    # Try package import first (installed or sys.path'd package).
    module_map = {
        "render": "cli.render",
        "validate": "cli.validate",
        "capture-run": "cli.capture_run",
        "export-writeback": "cli.export_writeback",
    }
    module_suffix = module_map[name]

    # Try html_capsules.cli.<mod> first, then direct cli.<mod>.
    for prefix in ("html_capsules", ""):
        full = f"{prefix}.{module_suffix}".lstrip(".")
        try:
            import importlib
            return importlib.import_module(full)
        except ModuleNotFoundError:
            continue

    # Last resort: direct file import.
    file_map = {
        "render": _CLI_DIR / "render.py",
        "validate": _CLI_DIR / "validate.py",
        "capture-run": _CLI_DIR / "capture_run.py",
        "export-writeback": _CLI_DIR / "export_writeback.py",
    }
    import importlib.util
    spec = importlib.util.spec_from_file_location(name, file_map[name])
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def build_top_parser() -> argparse.ArgumentParser:
    """Build the top-level argument parser with all subcommands."""
    parser = argparse.ArgumentParser(
        prog="meaty-capsule",
        description=(
            "meaty-capsule — HTML Capsule CLI\n\n"
            "Render, validate, scaffold, and export HTML Capsules from the\n"
            "Agentic OS toolkit."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--version",
        action="version",
        version="meaty-capsule 0.1.0",
    )

    subparsers = parser.add_subparsers(
        title="subcommands",
        dest="subcommand",
        metavar="<subcommand>",
    )
    subparsers.required = True

    # Register each subcommand's parser.
    for name in ("render", "validate", "capture-run", "export-writeback"):
        mod = _import_subcommand(name)
        mod.build_parser(subparsers)

    return parser


def main(argv=None) -> int:
    """Top-level entry point.

    Args:
        argv: Optional argument list (defaults to sys.argv[1:]).

    Returns:
        Exit code.
    """
    parser = build_top_parser()
    args = parser.parse_args(argv)

    mod = _import_subcommand(args.subcommand)
    return mod.run(args)


if __name__ == "__main__":
    sys.exit(main())
