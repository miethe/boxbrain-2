"""Core Jinja2 renderer for HTML Capsules.

Validates a capsule manifest against the JSON schema defined in
``schemas/capsule-manifest.schema.json``, then renders the capsule to a
self-contained HTML string using the matching Jinja2 template (or
``_base.html.j2`` when the per-type template has not been implemented yet).

Safe HTML policy is enforced post-render by calling
``safe_html.assert_no_external_urls`` before the result is returned.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Optional, Union

try:
    import jsonschema
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "jsonschema is required for manifest validation. "
        "Install it with: pip install jsonschema"
    ) from exc

try:
    import jinja2
    from jinja2 import Environment, FileSystemLoader, select_autoescape
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "jinja2 is required for capsule rendering. "
        "Install it with: pip install jinja2"
    ) from exc

# Safe HTML helpers — sibling package
_LIB_DIR = Path(__file__).parent.parent / "lib"

import sys as _sys

if str(_LIB_DIR) not in _sys.path:
    _sys.path.insert(0, str(_LIB_DIR))

from safe_html import CSP_HEADER, IFRAME_SANDBOX_ATTR, assert_no_external_urls  # noqa: E402

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_SCHEMAS_DIR = Path(__file__).parent.parent / "schemas"
_DEFAULT_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_MANIFEST_SCHEMA_PATH = _SCHEMAS_DIR / "capsule-manifest.schema.json"

# ---------------------------------------------------------------------------
# Template name mapping
# capsule_type → template filename.  Add entries here as templates are built.
# ---------------------------------------------------------------------------

_CAPSULE_TYPE_TO_TEMPLATE: Dict[str, str] = {
    "run-card": "run-card.html.j2",
    "planning-capsule": "planning-capsule.html.j2",
    "planning_capsule": "planning-capsule.html.j2",
    "skill-card": "skill-card.html.j2",
    "decision-card": "decision-card.html.j2",
    "research-capsule": "research-capsule.html.j2",
    "gtm-brief": "gtm-brief.html.j2",
    "phase-progress": "phase-progress.html.j2",
    "source-note": "source-note.html.j2",
    "code-review": "code-review.html.j2",
    "demo-microsite": "demo-microsite.html.j2",
}

_FALLBACK_TEMPLATE = "_base.html.j2"


# ---------------------------------------------------------------------------
# Datetime normalisation
# YAML deserialises timestamps (e.g. ``created_at: 2026-05-09T00:00:00-04:00``)
# into Python ``datetime`` / ``date`` objects, which the Jinja2 ``tojson``
# filter cannot serialise.  ``_normalise_datetimes`` recursively converts them
# to ISO-8601 strings so that ``tojson`` never encounters a non-serialisable
# value.
# ---------------------------------------------------------------------------

_DateLike = Union[datetime, date]


def _normalise_datetimes(value: Any) -> Any:
    """Recursively convert datetime/date values to ISO-8601 strings.

    Traverses dicts and lists in-place (returning a new structure so the
    original manifest is never mutated).

    Args:
        value: Any value — dict, list, scalar, or datetime-like.

    Returns:
        The same structure with all ``datetime``/``date`` instances replaced
        by their ``isoformat()`` string representations.
    """
    if isinstance(value, datetime):
        # datetime is a subclass of date; check datetime first.
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalise_datetimes(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalise_datetimes(item) for item in value]
    return value


class CapsuleRenderer:
    """Validate and render an HTML Capsule from a manifest dict.

    Args:
        templates_dir: Directory containing Jinja2 templates.  Defaults to
            the ``templates/`` directory adjacent to the ``renderer/`` package.

    Example::

        renderer = CapsuleRenderer()
        html_output = renderer.render(manifest_dict)
    """

    def __init__(self, templates_dir: Optional[Path] = None) -> None:
        self._templates_dir: Path = (
            templates_dir if templates_dir is not None else _DEFAULT_TEMPLATES_DIR
        )

        # Load and cache the manifest JSON schema once per renderer instance.
        self._manifest_schema: Dict[str, Any] = self._load_manifest_schema()

        # Build the Jinja2 environment.
        self._env: Environment = self._build_env()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def render(
        self,
        manifest: Dict[str, Any],
        source_content: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Render a capsule manifest to an HTML string.

        Validates ``manifest`` against the capsule-manifest JSON schema, selects
        the appropriate Jinja2 template (falling back to ``_base.html.j2`` when
        the per-type template does not yet exist), renders, and asserts safe HTML
        compliance before returning.

        Args:
            manifest: Parsed capsule manifest dictionary.  Must satisfy the
                capsule-manifest schema.  The top-level ``html_capsule`` key is
                the canonical envelope.
            source_content: Optional supplementary data to pass into the
                template as ``source_content``.

        Returns:
            A rendered HTML string that passes safe HTML policy checks.

        Raises:
            ValueError: If the manifest fails schema validation, or if the
                rendered HTML contains disallowed external URL references.
        """
        self._validate_manifest(manifest)

        # Normalise datetime/date objects → ISO-8601 strings so that the
        # Jinja2 ``tojson`` filter never encounters a non-serialisable value.
        # We work on a normalised copy so the caller's dict is not mutated and
        # schema validation (above) always sees the original structure.
        manifest_norm: Dict[str, Any] = _normalise_datetimes(manifest)

        # Unwrap the ``html_capsule`` envelope if present.  Templates receive
        # flat capsule fields; the wrapper is transparent inside the renderer.
        capsule_data: Dict[str, Any] = manifest_norm.get("html_capsule", manifest_norm)
        capsule_type: str = capsule_data.get("capsule_type", "")

        template_name, template_implemented = self._resolve_template(capsule_type)
        template = self._env.get_template(template_name)

        context = {
            "manifest": manifest_norm,
            "capsule": capsule_data,
            "capsule_id": capsule_data.get("capsule_id", ""),
            "capsule_type": capsule_type,
            "source_content": source_content or {},
            "template_implemented": template_implemented,
            "template_name": template_name,
        }

        rendered: str = template.render(**context)
        assert_no_external_urls(rendered)
        return rendered

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_manifest_schema(self) -> Dict[str, Any]:
        """Load the capsule-manifest JSON schema from disk.

        Returns:
            Parsed schema as a dict.

        Raises:
            FileNotFoundError: If the schema file is missing.
        """
        if not _MANIFEST_SCHEMA_PATH.exists():
            raise FileNotFoundError(
                f"Capsule manifest schema not found at: {_MANIFEST_SCHEMA_PATH}"
            )
        with _MANIFEST_SCHEMA_PATH.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def _build_env(self) -> Environment:
        """Construct and return the Jinja2 Environment.

        Autoescape is enabled for HTML/HTM/XML templates.  CSP_HEADER and
        IFRAME_SANDBOX_ATTR are injected as globals so all templates can
        reference them directly.
        """
        if not self._templates_dir.exists():
            self._templates_dir.mkdir(parents=True, exist_ok=True)

        env = Environment(
            loader=FileSystemLoader(str(self._templates_dir)),
            autoescape=select_autoescape(["html", "htm", "xml"]),
            keep_trailing_newline=True,
        )

        # Inject safe HTML constants as template globals.
        env.globals["CSP_HEADER"] = CSP_HEADER
        env.globals["IFRAME_SANDBOX_ATTR"] = IFRAME_SANDBOX_ATTR

        return env

    def _validate_manifest(self, manifest: Dict[str, Any]) -> None:
        """Validate *manifest* against the capsule-manifest JSON schema.

        Args:
            manifest: Manifest dict to validate.

        Raises:
            ValueError: Wraps ``jsonschema.ValidationError`` with a human-friendly
                message that includes the failing field path and the violation.
        """
        try:
            validator_cls = jsonschema.validators.validator_for(self._manifest_schema)
            validator = validator_cls(self._manifest_schema)
            errors = sorted(validator.iter_errors(manifest), key=lambda e: e.path)
            if errors:
                messages = "; ".join(
                    f"[{'/'.join(str(p) for p in err.absolute_path) or '<root>'}] "
                    f"{err.message}"
                    for err in errors[:5]  # cap at 5 to keep message readable
                )
                raise ValueError(
                    f"Capsule manifest failed schema validation "
                    f"({len(errors)} error(s)): {messages}"
                )
        except jsonschema.SchemaError as exc:
            raise ValueError(f"Capsule manifest schema is invalid: {exc.message}") from exc

    def _resolve_template(self, capsule_type: str) -> tuple:
        """Resolve the best-available template for *capsule_type*.

        Returns:
            Tuple of (template_filename, is_implemented).  ``is_implemented``
            is ``False`` when falling back to ``_base.html.j2``.
        """
        desired = _CAPSULE_TYPE_TO_TEMPLATE.get(capsule_type)
        if desired:
            candidate = self._templates_dir / desired
            if candidate.exists():
                return desired, True

        # Fall back to base template; it will display a "not implemented" notice.
        return _FALLBACK_TEMPLATE, False
