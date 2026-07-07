"""
Safe HTML policy constants and sanitizer helpers for HTML Capsules.

Implements the policy defined in Spec §18 (HTML Capsules and Agentic Run Cards
Design Spec, section 18 "Safe HTML policy"). The default policy prohibits
external scripts, external stylesheets, remote image loads, secrets, automatic
writebacks, and arbitrary form submissions.

CSP string from Spec §18 (verbatim):
    default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline';
    script-src 'unsafe-inline'; connect-src 'none'; font-src 'none';
    frame-ancestors 'self'; base-uri 'none'; form-action 'none'

For integrated writeback (L3+), loosen connect-src only for trusted local or
private API endpoints — never for arbitrary external URLs.
"""
from __future__ import annotations

import html
import re
from typing import List

# ---------------------------------------------------------------------------
# §18 Content Security Policy header — exact text from spec
# ---------------------------------------------------------------------------

CSP_HEADER: str = (
    "Content-Security-Policy: default-src 'none'; "
    "img-src 'self' data:; "
    "style-src 'unsafe-inline'; "
    "script-src 'unsafe-inline'; "
    "connect-src 'none'; "
    "font-src 'none'; "
    "frame-ancestors 'self'; "
    "base-uri 'none'; "
    "form-action 'none'"
)

# ---------------------------------------------------------------------------
# iframe sandbox attribute — used when embedding capsules inside a portal
# ---------------------------------------------------------------------------

IFRAME_SANDBOX_ATTR: str = (
    "sandbox=\"allow-scripts allow-same-origin\""
)

# ---------------------------------------------------------------------------
# Allowed HTML tags for sanitized inline content (Spec §18: sanitize generated HTML)
# ---------------------------------------------------------------------------

ALLOWED_TAGS: List[str] = [
    # Structure
    "div", "span", "section", "article", "header", "footer", "main", "nav",
    "aside",
    # Text
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "b", "i", "u", "s", "del", "ins", "mark", "small",
    "sup", "sub", "abbr", "code", "pre", "blockquote", "q", "cite",
    # Lists
    "ul", "ol", "li", "dl", "dt", "dd",
    # Tables
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "colgroup", "col",
    # Media — self/data URIs only; external src rejected by assert_no_external_urls
    "img",
    # Inline interaction (no remote endpoints)
    "button", "details", "summary",
    # Metadata
    "time", "data",
]

# ---------------------------------------------------------------------------
# Forbidden patterns — external resource injection via common attributes
# ---------------------------------------------------------------------------

# Detects <script src="..."> pointing to any src value (external or relative
# is fine for same-origin; absolute http/https/// is external).
_SCRIPT_EXTERNAL_SRC: re.Pattern = re.compile(
    r"""<script\b[^>]*\bsrc\s*=\s*['"]?(https?:|//)[^'">\s]*""",
    re.IGNORECASE,
)

# Detects <link href="http..."> (external stylesheet or resource).
_LINK_EXTERNAL_HREF: re.Pattern = re.compile(
    r"""<link\b[^>]*\bhref\s*=\s*['"]?(https?:|//)[^'">\s]*""",
    re.IGNORECASE,
)

# Detects src= on any tag pointing to an external URL (e.g. <img src="http...">,
# <iframe src="http...">).
_EXTERNAL_SRC_ANY_TAG: re.Pattern = re.compile(
    r"""<[a-zA-Z][^>]*\bsrc\s*=\s*['"]?(https?:|//)[^'">\s]*""",
    re.IGNORECASE,
)

# Collection of all forbidden patterns for external URL detection.
FORBIDDEN_PATTERNS: List[re.Pattern] = [
    _SCRIPT_EXTERNAL_SRC,
    _LINK_EXTERNAL_HREF,
    _EXTERNAL_SRC_ANY_TAG,
]

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def assert_no_external_urls(html_content: str) -> None:
    """Raise ValueError if the HTML contains disallowed external resource loads.

    Checks for:
    - ``<script src="http...">`` or ``<script src="//...">``
    - ``<link href="http...">`` or ``<link href="//...">``
    - Any tag with ``src="http..."`` (covers ``<img>``, ``<iframe>``, etc.)

    Args:
        html_content: Raw HTML string to inspect.

    Raises:
        ValueError: If any forbidden external URL pattern is detected. The
            exception message names the pattern that matched and the offending
            fragment (truncated to 120 chars for readability).
    """
    for pattern in FORBIDDEN_PATTERNS:
        match = pattern.search(html_content)
        if match:
            fragment = match.group(0)[:120]
            raise ValueError(
                "Safe HTML policy violation (Spec §18): "
                f"external resource URL detected. "
                f"Pattern: {pattern.pattern!r}. "
                f"Matched: {fragment!r}"
            )


def sanitize_inline(text: str) -> str:
    """HTML-escape user-controlled content for safe inline embedding.

    Converts ``<``, ``>``, ``&``, ``'``, and ``"`` to their HTML entities,
    preventing injection of markup or scripts into capsule output.

    This function is intentionally minimal — it escapes and nothing more.
    Use it for user-supplied strings that will appear inside an HTML attribute
    or text node. Do not use it to validate full HTML documents; use
    ``assert_no_external_urls`` for that.

    Args:
        text: Plain text string that may contain characters with special HTML
            meaning.

    Returns:
        The input string with HTML special characters replaced by entities.
    """
    return html.escape(text, quote=True)
