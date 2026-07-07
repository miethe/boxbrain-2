from __future__ import annotations

import base64
import binascii
from typing import TypeVar

T = TypeVar("T")

# Kept in sync with the shared ``pageCursor``/``pageLimit`` parameter components in
# contracts/openapi/boxbrain.v2.yaml.
DEFAULT_PAGE_LIMIT = 25
MAX_PAGE_LIMIT = 100


def resolve_limit(limit: int | None) -> int:
    """Clamp a requested page limit into the supported range (caps, never rejects)."""
    if limit is None:
        return DEFAULT_PAGE_LIMIT
    return max(1, min(limit, MAX_PAGE_LIMIT))


def decode_cursor(cursor: str | None) -> int:
    """Decode an opaque offset cursor.

    Cursors are server-issued base64 of a non-negative integer offset. Malformed or
    unexpected input is treated as "start from the beginning" rather than raising, so a
    stale token can never 500 a list request.
    """
    if not cursor:
        return 0
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("ascii")
        offset = int(raw)
    except (ValueError, binascii.Error, UnicodeDecodeError):
        return 0
    return offset if offset > 0 else 0


def encode_cursor(offset: int) -> str:
    return base64.urlsafe_b64encode(str(offset).encode("ascii")).decode("ascii")


def paginate(items: list[T], cursor: str | None, limit: int | None) -> tuple[list[T], str | None]:
    """Return a window of ``items`` and the cursor for the next page (or ``None``).

    Ordering is the caller's responsibility; this only slices a deterministic list.
    """
    resolved_limit = resolve_limit(limit)
    offset = decode_cursor(cursor)
    window = items[offset : offset + resolved_limit]
    next_offset = offset + resolved_limit
    next_cursor = encode_cursor(next_offset) if next_offset < len(items) else None
    return window, next_cursor
