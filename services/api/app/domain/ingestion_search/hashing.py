"""Content hashing helpers for idempotent ingestion."""

from __future__ import annotations

import hashlib
import json
import unicodedata
from collections.abc import Mapping, Sequence
from typing import Any

from .models import ContentUnitFingerprint


def hash_bytes(content: bytes | bytearray | memoryview) -> str:
    """Return a stable SHA-256 hex digest for binary content."""

    return hashlib.sha256(bytes(content)).hexdigest()


def normalize_text_for_hash(text: str | None) -> str:
    """Normalize extracted text before hashing.

    The normalization intentionally ignores case and whitespace differences
    introduced by PPTX XML extraction while preserving token order.
    """

    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text)
    return " ".join(normalized.casefold().split())


def hash_text(text: str | None) -> str:
    return hash_bytes(normalize_text_for_hash(text).encode("utf-8"))


def _jsonable(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _jsonable(value[key]) for key in sorted(value)}
    if isinstance(value, (set, frozenset)):
        return sorted(_jsonable(item) for item in value)
    if isinstance(value, tuple):
        return [_jsonable(item) for item in value]
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def hash_metadata(metadata: Mapping[str, Any] | None) -> str:
    payload = json.dumps(
        _jsonable(metadata or {}),
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hash_bytes(payload.encode("utf-8"))


def content_unit_fingerprint(
    *,
    source_file_hash: str,
    source_order_index: int,
    extracted_text: str | None = None,
    speaker_notes: str | None = None,
    visual_bytes: bytes | bytearray | memoryview | None = None,
    visual_hash: str | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> ContentUnitFingerprint:
    """Build the deterministic identity used for one atomic ContentUnitVersion."""

    if source_order_index < 0:
        raise ValueError("source_order_index must be zero or greater")
    if visual_bytes is not None and visual_hash is not None:
        raise ValueError("pass visual_bytes or visual_hash, not both")

    resolved_visual_hash = visual_hash
    if visual_bytes is not None:
        resolved_visual_hash = hash_bytes(visual_bytes)

    text_hash = hash_text(extracted_text)
    notes_hash = hash_text(speaker_notes)
    metadata_hash = hash_metadata(metadata)
    combined_payload = {
        "metadata_hash": metadata_hash,
        "notes_hash": notes_hash,
        "source_file_hash": source_file_hash,
        "source_order_index": source_order_index,
        "text_hash": text_hash,
        "visual_hash": resolved_visual_hash,
    }
    content_hash = hash_metadata(combined_payload)

    return ContentUnitFingerprint(
        source_file_hash=source_file_hash,
        source_order_index=source_order_index,
        text_hash=text_hash,
        notes_hash=notes_hash,
        visual_hash=resolved_visual_hash,
        metadata_hash=metadata_hash,
        content_hash=content_hash,
    )


def hash_ordered_members(members: Sequence[Mapping[str, Any]]) -> str:
    """Hash ordered composition membership without losing order semantics."""

    return hash_metadata({"members": list(members)})

