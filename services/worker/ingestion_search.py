"""Worker-facing facade for ingestion/search domain helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from app.domain.ingestion_search import (
    DETERMINISTIC_EMBEDDING_MODEL,
    DETERMINISTIC_EMBEDDING_VERSION,
    ContentUnitFingerprint,
    UploadValidationResult,
    content_unit_fingerprint,
    deterministic_text_embedding,
    validate_pptx_upload,
)


@dataclass(frozen=True)
class ContentUnitIndexRecord:
    source_order_index: int
    fingerprint: ContentUnitFingerprint
    embedding: tuple[float, ...]
    embedding_model_name: str = DETERMINISTIC_EMBEDDING_MODEL
    embedding_model_version: str = DETERMINISTIC_EMBEDDING_VERSION


def validate_upload_for_ingestion(
    *,
    filename: str,
    content: bytes | bytearray | memoryview,
    content_type: str | None = None,
) -> UploadValidationResult:
    return validate_pptx_upload(
        filename=filename,
        content=content,
        content_type=content_type,
    )


def build_content_unit_index_record(
    *,
    source_file_hash: str,
    source_order_index: int,
    extracted_text: str | None,
    speaker_notes: str | None = None,
    visual_bytes: bytes | bytearray | memoryview | None = None,
    visual_hash: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    embedding_dims: int = 1536,
) -> ContentUnitIndexRecord:
    fingerprint = content_unit_fingerprint(
        source_file_hash=source_file_hash,
        source_order_index=source_order_index,
        extracted_text=extracted_text,
        speaker_notes=speaker_notes,
        visual_bytes=visual_bytes,
        visual_hash=visual_hash,
        metadata=metadata,
    )
    embedding_text = "\n".join(part for part in (extracted_text, speaker_notes) if part)
    return ContentUnitIndexRecord(
        source_order_index=source_order_index,
        fingerprint=fingerprint,
        embedding=deterministic_text_embedding(embedding_text, dims=embedding_dims),
    )
