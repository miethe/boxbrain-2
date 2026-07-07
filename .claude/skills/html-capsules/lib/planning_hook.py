"""Planning workflow hook for HTML Capsule emission.

Called after an ``implementation-planner`` subagent has written its planning
artifact (PRD, implementation plan, or feature contract) to disk.  Emits a
``planning-capsule`` HTML Capsule that captures the decision matrix, open
questions, and planning cards extracted from the plan file.

Trigger contract: see ``../docs/emission-triggers.md`` §3.2
Guard variable:   ``SKILLMEAT_CAPSULES_ENABLED=1`` (checked inside emitter)

Usage::

    from planning_hook import on_planner_complete

    result_path = on_planner_complete({
        "plan_path": ".claude/progress/my-feature/phase-1-progress.md",
        "prd": "my-feature",
        "feature_slug": "my-feature",
        "phase_count": 4,
        "summary": "Implements the my-feature PRD",
    })
    # Returns Path on success, None if disabled or on error.
"""

from __future__ import annotations

import logging
import re
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)

_ERRORS_LOG = Path(".claude") / "capsules" / "errors.log"

# ---------------------------------------------------------------------------
# Regex patterns for best-effort Markdown parsing
# ---------------------------------------------------------------------------

# Decision headings: "## Decision: ...", "### Decision ...", or "Decision:"
_RE_DECISION_HEADING = re.compile(
    r"^#{1,4}\s+Decision(?:\s*[:\-–]\s*|\s+)(.+)$", re.IGNORECASE
)

# Open question markers
_RE_OPEN_QUESTION = re.compile(
    r"(?:open\s+question|TBD|TODO)[:\s]+(.+)", re.IGNORECASE
)

# "Chosen:" / "**Chosen**:" lines inside decision blocks
_RE_CHOSEN = re.compile(r"^\s*\*{0,2}[Cc]hosen\*{0,2}[:\s]+(.+)$")

# "Rationale:" lines inside decision blocks
_RE_RATIONALE = re.compile(r"^\s*\*{0,2}[Rr]ationale\*{0,2}[:\s]+(.+)$")

# "Options:" followed by a list or inline value
_RE_OPTIONS = re.compile(r"^\s*\*{0,2}[Oo]ptions?\*{0,2}[:\s]+(.+)$")

# Planning card columns
_COLUMN_KEYWORDS: Dict[str, str] = {
    "now": "Now",
    "next": "Next",
    "later": "Later",
    "debate": "Debate",
    "backlog": "Later",
    "done": "Now",
    "in progress": "Now",
}

# Section heading that signals a planning card
_RE_CARD_HEADING = re.compile(r"^#{2,4}\s+(.+)$")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def on_planner_complete(planner_output: Dict[str, Any]) -> Optional[Path]:
    """Handle planner completion and emit a planning-capsule.

    Args:
        planner_output: Dict produced by the planner subagent.  Expected keys:
            ``plan_path``     — Path (or str) to the plan Markdown file.
            ``prd``           — PRD/feature identifier string.
            ``feature_slug``  — URL-safe slug for the feature.
            ``phase_count``   — Number of phases (int), optional.
            ``summary``       — Short plain-text summary, optional.

    Returns:
        Path to the emitted capsule directory on success, or ``None`` when
        capsule emission is disabled or an error occurs.

    All exceptions are caught internally.  This function never raises to the
    caller.
    """
    try:
        return _emit_planning_capsule(planner_output)
    except Exception:
        _log_error(planner_output)
        return None


def parse_plan_markdown(plan_path: Path) -> Dict[str, Any]:
    """Parse a plan Markdown file into structured sections.

    Performs best-effort extraction.  Sections that cannot be parsed return
    empty lists so the ``planning-capsule`` template can handle them gracefully.

    Args:
        plan_path: Path to the plan Markdown file.

    Returns:
        Dict with keys:
            ``decision_matrix``  — list of {title, options, chosen, rationale}
            ``open_questions``   — list of {question, status}
            ``planning_cards``   — list of {title, column, summary}
    """
    try:
        text = plan_path.read_text(encoding="utf-8")
    except (OSError, IOError):
        return {
            "decision_matrix": [],
            "open_questions": [],
            "planning_cards": [],
        }

    lines = text.splitlines()

    decision_matrix = _extract_decision_matrix(lines)
    open_questions = _extract_open_questions(lines)
    planning_cards = _extract_planning_cards(lines)

    return {
        "decision_matrix": decision_matrix,
        "open_questions": open_questions,
        "planning_cards": planning_cards,
    }


# ---------------------------------------------------------------------------
# Internal implementation
# ---------------------------------------------------------------------------


def _emit_planning_capsule(planner_output: Dict[str, Any]) -> Optional[Path]:
    """Build event payload and call CapsuleEmitter.emit().

    Separated from ``on_planner_complete`` so the outer function can catch
    all exceptions cleanly.
    """
    # Import here to keep coupling unidirectional and avoid circular imports.
    # html-capsules never imports dev-execution; dev-execution may import us.
    _here = Path(__file__).parent
    import sys

    if str(_here) not in sys.path:
        sys.path.insert(0, str(_here))

    from emitter import CapsuleEmitter  # noqa: PLC0415

    emitter = CapsuleEmitter()

    # Resolve plan_path to a Path object
    raw_plan_path = planner_output.get("plan_path", "")
    plan_path = Path(str(raw_plan_path)) if raw_plan_path else None

    # Parse source content from the plan file
    source_content: Dict[str, Any] = {}
    if plan_path and plan_path.exists():
        source_content = parse_plan_markdown(plan_path)

    # Build task slug from feature_slug or prd
    feature_slug = str(
        planner_output.get("feature_slug")
        or planner_output.get("prd")
        or "plan"
    )

    event: Dict[str, Any] = {
        "tool": "planning-board-create",
        "intent": str(
            planner_output.get("summary")
            or planner_output.get("prd")
            or feature_slug
        ),
        "task": feature_slug,
        "plan_file": str(plan_path) if plan_path else "",
        "plan_type": str(planner_output.get("plan_type", "implementation-plan")),
    }

    # Include phase_count in agentic_context if provided
    phase_count = planner_output.get("phase_count")
    if phase_count is not None:
        event["phase_count"] = int(phase_count)

    return emitter.emit(
        event=event,
        template="planning-capsule",
        source_content=source_content if source_content else None,
    )


# ---------------------------------------------------------------------------
# Markdown parsing helpers
# ---------------------------------------------------------------------------


def _extract_decision_matrix(lines: List[str]) -> List[Dict[str, Any]]:
    """Extract decision blocks from Markdown lines.

    Looks for headings matching ``_RE_DECISION_HEADING`` and collects the
    title, options, chosen, and rationale from the subsequent lines until the
    next heading of equal or higher level.
    """
    decisions: List[Dict[str, Any]] = []
    i = 0
    total = len(lines)

    while i < total:
        line = lines[i]
        m = _RE_DECISION_HEADING.match(line)
        if m:
            title = m.group(1).strip()
            block = _collect_block(lines, i + 1, total)

            chosen = ""
            rationale = ""
            options: List[str] = []

            for bline in block:
                cm = _RE_CHOSEN.match(bline)
                if cm:
                    chosen = cm.group(1).strip()
                    continue
                rm = _RE_RATIONALE.match(bline)
                if rm:
                    rationale = rm.group(1).strip()
                    continue
                om = _RE_OPTIONS.match(bline)
                if om:
                    raw_opts = om.group(1).strip()
                    # Options may be comma-separated or a single value
                    options = [o.strip() for o in raw_opts.split(",") if o.strip()]
                    continue
                # Also pick up list items as options
                list_m = re.match(r"^\s*[-*]\s+(.+)$", bline)
                if list_m and not chosen and not rationale:
                    options.append(list_m.group(1).strip())

            decisions.append(
                {
                    "title": title,
                    "options": options,
                    "chosen": chosen,
                    "rationale": rationale,
                }
            )
        i += 1

    return decisions


def _extract_open_questions(lines: List[str]) -> List[Dict[str, str]]:
    """Extract open question markers from Markdown lines."""
    questions: List[Dict[str, str]] = []
    seen: set = set()

    for line in lines:
        m = _RE_OPEN_QUESTION.search(line)
        if m:
            question = m.group(1).strip().rstrip(".")
            if question and question not in seen:
                seen.add(question)
                # Attempt to detect status from surrounding context
                status = "open"
                lower = line.lower()
                if "resolved" in lower or "answered" in lower or "closed" in lower:
                    status = "resolved"
                elif "in progress" in lower or "investigating" in lower:
                    status = "in-progress"
                questions.append({"question": question, "status": status})

    return questions


def _extract_planning_cards(lines: List[str]) -> List[Dict[str, str]]:
    """Extract planning cards from Markdown headings.

    Assigns each card a column based on:
    1. A ``Now/Next/Later/Debate`` column prefix in the heading itself.
    2. The heading text of the nearest parent section.
    3. Default column: "Next".
    """
    cards: List[Dict[str, str]] = []
    total = len(lines)
    current_column = "Next"

    for i, line in enumerate(lines):
        m = _RE_CARD_HEADING.match(line)
        if not m:
            continue

        heading_text = m.group(1).strip()
        heading_lower = heading_text.lower()

        # Check if this heading IS a column marker
        column_match = None
        for keyword, column in _COLUMN_KEYWORDS.items():
            if heading_lower == keyword or heading_lower.startswith(keyword + " "):
                column_match = column
                break

        if column_match:
            # This heading sets the column context; it is not itself a card
            current_column = column_match
            continue

        # Determine the column for this card
        card_column = _infer_column_from_text(heading_lower) or current_column

        # Gather a short summary from the next few non-empty lines
        summary = _first_paragraph(lines, i + 1, total)

        cards.append(
            {
                "title": heading_text,
                "column": card_column,
                "summary": summary,
            }
        )

    return cards


def _infer_column_from_text(text: str) -> Optional[str]:
    """Return a column name if the heading text contains a column keyword."""
    for keyword, column in _COLUMN_KEYWORDS.items():
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            return column
    return None


def _collect_block(lines: List[str], start: int, total: int) -> List[str]:
    """Return lines from ``start`` until the next heading (## or higher)."""
    block: List[str] = []
    for i in range(start, total):
        if _RE_CARD_HEADING.match(lines[i]):
            break
        block.append(lines[i])
    return block


def _first_paragraph(lines: List[str], start: int, total: int) -> str:
    """Return the first non-empty paragraph starting at ``start``.

    Stops at headings or after 3 non-empty lines to keep summaries short.
    """
    parts: List[str] = []
    for i in range(start, total):
        line = lines[i].strip()
        if _RE_CARD_HEADING.match(lines[i]):
            break
        if line:
            parts.append(line)
            if len(parts) >= 3:
                break
        elif parts:
            # Blank line ends paragraph
            break
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Error logging
# ---------------------------------------------------------------------------


def _log_error(planner_output: Dict[str, Any]) -> None:
    """Append error details to the capsules errors log."""
    try:
        from datetime import datetime

        _ERRORS_LOG.parent.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().isoformat()
        tb = traceback.format_exc()
        entry = (
            f"\n[{timestamp}] planning_hook.on_planner_complete() failed\n"
            f"  prd={planner_output.get('prd')!r}\n"
            f"  plan_path={planner_output.get('plan_path')!r}\n"
            f"{tb}"
        )
        with _ERRORS_LOG.open("a", encoding="utf-8") as fh:
            fh.write(entry)
    except Exception:
        logger.error(
            "planning_hook: failed to write errors.log", exc_info=True
        )
