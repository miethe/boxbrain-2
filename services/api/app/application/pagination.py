from __future__ import annotations

import base64
import binascii
import json
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


def _clean_offset(value: object) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        offset = value
    elif isinstance(value, str):
        try:
            offset = int(value)
        except ValueError:
            return 0
    else:
        return 0
    return offset if offset > 0 else 0


def decode_cursor(cursor: str | None) -> tuple[str | None, int]:
    """Decode an opaque hybrid cursor.

    Cursors are server-issued base64 JSON containing the last seen item id and
    the next offset fallback. Malformed or unexpected input is treated as "start
    from the beginning" rather than raising, so a stale token can never 500 a
    list request.
    """
    if not cursor:
        return None, 0
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("ascii")
    except (ValueError, binascii.Error, UnicodeDecodeError):
        return None, 0

    try:
        payload = json.loads(raw)
    except ValueError:
        return None, _clean_offset(raw)

    if not isinstance(payload, dict):
        return None, _clean_offset(payload)

    item_id = payload.get("i")
    offset = _clean_offset(payload.get("o"))
    if not isinstance(item_id, str) or not item_id:
        return None, offset
    return item_id, offset


def encode_cursor(item_id: str | None, offset: int) -> str:
    payload = {"i": item_id or "", "o": max(0, offset)}
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("ascii")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _item_id(item: T) -> str | None:
    if isinstance(item, dict):
        value = item.get("id")
    else:
        value = getattr(item, "id", None)
    if value is None:
        return None
    return str(value)


def _start_offset(items: list[T], item_id: str | None, fallback_offset: int) -> int:
    if item_id is None:
        return fallback_offset
    for index, item in enumerate(items):
        if _item_id(item) == item_id:
            return index + 1
    return fallback_offset


def paginate(items: list[T], cursor: str | None, limit: int | None) -> tuple[list[T], str | None]:
    """Return a window of ``items`` and the cursor for the next page (or ``None``).

    Ordering is the caller's responsibility; this only slices a deterministic list.
    """
    resolved_limit = resolve_limit(limit)
    item_id, fallback_offset = decode_cursor(cursor)
    offset = _start_offset(items, item_id, fallback_offset)
    window = items[offset : offset + resolved_limit]
    next_offset = offset + resolved_limit
    next_cursor = (
        encode_cursor(_item_id(window[-1]), next_offset)
        if window and next_offset < len(items)
        else None
    )
    return window, next_cursor
