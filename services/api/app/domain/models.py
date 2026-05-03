from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.domain.errors import InvariantViolationError


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


Taxonomy = dict[str, list[str]]


@dataclass(slots=True)
class Actor:
    user_id: str
    role: str = "viewer"


@dataclass(slots=True)
class StoredObject:
    id: UUID
    object_type: str
    storage_uri: str
    mime_type: str | None
    byte_size: int | None
    sha256: str | None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class ProvenanceRecord:
    id: UUID
    origin_type: str
    source_system: str | None = None
    parent_refs: list[dict[str, Any]] = field(default_factory=list)
    source_refs: list[str] = field(default_factory=list)
    model_info: str | None = None
    pipeline_version: str | None = None
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class AuditEvent:
    id: UUID
    action: str
    actor_id: str
    target_type: str
    target_id: UUID
    prior_state: dict[str, Any]
    new_state: dict[str, Any]
    reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class EmbeddingRecord:
    id: UUID
    target_type: str
    target_id: UUID
    embedding_kind: str
    model_name: str
    model_version: str | None
    dims: int
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class ContentUnitFamily:
    id: UUID
    family_title: str
    conceptual_summary: str | None
    unit_type: str
    taxonomy: Taxonomy
    restricted: bool = False


@dataclass(slots=True)
class ContentUnitVariant:
    id: UUID
    family_id: UUID
    variant_label: str
    variant_type: str
    variant_dimensions: dict[str, Any]
    is_canonical: bool
    linked_by: str
    linked_confidence: float | None
    latest_version_id: UUID | None


@dataclass(slots=True)
class ContentUnitVersion:
    id: UUID
    variant_id: UUID
    version_number: str
    render_uri: str | None
    thumbnail_uri: str | None
    summary: str | None
    approval_state: str
    freshness_state: str
    quality_score: float | None
    usage_score: float | None
    extracted_text: str | None
    speaker_notes: str | None
    provenance_id: UUID
    restricted: bool = False
    source_slide_count: int = 1
    source_order_index: int | None = None
    created_at: datetime = field(default_factory=now_utc)

    def __post_init__(self) -> None:
        if self.source_slide_count != 1:
            raise InvariantViolationError("ContentUnitVersion must represent exactly one atomic unit.")


@dataclass(slots=True)
class SimilarityEdge:
    id: UUID
    source_version_id: UUID
    target_version_id: UUID
    score: float
    rationale: str | None = None
    confirmed_by: str | None = None
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class WorkProductFamily:
    id: UUID
    title: str
    artifact_type: str
    summary: str | None
    preview_uri: str | None
    variant_count: int
    version_count: int
    restricted: bool = False


@dataclass(slots=True)
class WorkProductVersion:
    id: UUID
    family_id: UUID
    title: str
    artifact_type: str
    version_number: str
    approval_state: str
    preview_uri: str | None
    filmstrip_version_ids: list[UUID]
    provenance_id: UUID
    restricted: bool = False


@dataclass(slots=True)
class ContentBlockMember:
    id: UUID
    member_type: str
    member_id: UUID
    order_index: int
    role: str | None = None
    is_required: bool = True
    notes: str | None = None


@dataclass(slots=True)
class ContentBlockVersion:
    id: UUID
    family_id: UUID
    title: str
    summary: str | None
    block_type: str
    approval_state: str
    members: list[ContentBlockMember]
    restricted: bool = False
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class StoryboardSlot:
    id: UUID
    section_id: UUID
    slot_type: str
    selected_object_type: str | None
    selected_object_id: UUID | None
    order_index: int
    purpose: str | None
    is_required: bool
    ai_recommended: bool = False


@dataclass(slots=True)
class StoryboardSection:
    id: UUID
    storyboard_id: UUID
    title: str
    summary: str | None
    order_index: int
    slots: list[StoryboardSlot] = field(default_factory=list)


@dataclass(slots=True)
class StoryboardSnapshot:
    id: UUID
    storyboard_id: UUID
    version_label: str | None
    approval_state: str
    sections: tuple[StoryboardSection, ...]
    narrative_score: float | None = None
    created_at: datetime = field(default_factory=now_utc)
    immutable: bool = True


@dataclass(slots=True)
class Storyboard:
    id: UUID
    mode: str
    title: str
    draft_sections: list[StoryboardSection] = field(default_factory=list)
    current_snapshot_id: UUID | None = None
    created_at: datetime = field(default_factory=now_utc)
    updated_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class Comment:
    id: UUID
    kind: str
    target_type: str
    target_id: UUID
    anchor: dict[str, Any]
    body: str
    status: str = "open"
    parent_comment_id: UUID | None = None
    created_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class Note:
    id: UUID
    target_type: str
    target_id: UUID
    body: str
    title: str | None = None
    note_type: str = "usage_guidance"
    is_pinned: bool = False
    created_at: datetime = field(default_factory=now_utc)
    updated_at: datetime = field(default_factory=now_utc)


@dataclass(slots=True)
class ReviewItem:
    id: UUID
    queue_type: str
    status: str
    confidence: float | None
    rationale: str | None
    suggested_action: str | None
    target_refs: list[dict[str, Any]]
    compare_objects: list[dict[str, Any]]
    source: str = "ai"
    audit_preview: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=now_utc)
    resolved_at: datetime | None = None


@dataclass(slots=True)
class IngestionJob:
    id: UUID
    status: str
    stage: str
    artifact_type: str
    title: str | None
    original_object_id: UUID | None = None
    work_product_version_id: UUID | None = None
    upload_metadata: dict[str, Any] = field(default_factory=dict)
    error_code: str | None = None
    error_message: str | None = None
    retry_count: int = 0
    created_at: datetime = field(default_factory=now_utc)
    updated_at: datetime = field(default_factory=now_utc)
    completed_at: datetime | None = None


def new_id() -> UUID:
    return uuid4()
