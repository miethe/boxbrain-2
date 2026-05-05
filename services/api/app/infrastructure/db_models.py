from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import UserDefinedType

from app.domain.ingestion_search import coerce_embedding_vector, pgvector_literal
from app.infrastructure.database import Base


JsonDict = dict
JsonList = list


class PGVector(UserDefinedType):
    cache_ok = True

    def __init__(self, dims: int) -> None:
        self.dims = dims

    def get_col_spec(self, **_: object) -> str:
        return f"vector({self.dims})"

    def bind_processor(self, dialect):
        def process(value):
            vector = coerce_embedding_vector(value, dims=self.dims)
            if vector is None:
                return None
            return pgvector_literal(vector)

        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            vector = coerce_embedding_vector(value, dims=self.dims)
            if vector is None:
                return None
            return list(vector)

        return process


ApprovalStateEnum = ENUM(
    "draft",
    "review",
    "approved",
    "deprecated",
    "archived",
    name="approval_state",
    create_type=False,
)
FreshnessStateEnum = ENUM("fresh", "aging", "stale", name="freshness_state", create_type=False)
LinkSourceEnum = ENUM("manual", "ai", "hybrid", name="link_source", create_type=False)
CommentKindEnum = ENUM(
    "review_comment",
    "persistent_comment",
    "note_discussion",
    name="comment_kind",
    create_type=False,
)
ReviewStatusEnum = ENUM(
    "open",
    "accepted",
    "rejected",
    "snoozed",
    "resolved",
    name="review_status",
    create_type=False,
)


class StoredObjectRow(Base):
    __tablename__ = "stored_objects"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    object_type: Mapped[str] = mapped_column(Text, nullable=False)
    storage_uri: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(Text)
    byte_size: Mapped[int | None] = mapped_column(BigInteger)
    sha256: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProvenanceRecordRow(Base):
    __tablename__ = "provenance_records"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    origin_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_system: Mapped[str | None] = mapped_column(Text)
    parent_refs: Mapped[JsonList] = mapped_column(JSONB, default=list, nullable=False)
    source_refs: Mapped[JsonList] = mapped_column(JSONB, default=list, nullable=False)
    prompt_ref: Mapped[str | None] = mapped_column(Text)
    model_info: Mapped[str | None] = mapped_column(Text)
    pipeline_version: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkProductFamilyRow(Base):
    __tablename__ = "work_product_families"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    artifact_type: Mapped[str] = mapped_column(Text, nullable=False, default="deck")
    summary: Mapped[str | None] = mapped_column(Text)
    restricted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    taxonomy: Mapped[JsonDict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkProductVariantRow(Base):
    __tablename__ = "work_product_variants"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    family_id: Mapped[UUID] = mapped_column(ForeignKey("work_product_families.id"), nullable=False)
    variant_label: Mapped[str] = mapped_column(Text, nullable=False)
    variant_type: Mapped[str] = mapped_column(Text, nullable=False, default="source")
    variant_dimensions: Mapped[JsonDict] = mapped_column(JSONB, default=dict, nullable=False)
    is_canonical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    latest_version_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkProductVersionRow(Base):
    __tablename__ = "work_product_versions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    variant_id: Mapped[UUID] = mapped_column(ForeignKey("work_product_variants.id"), nullable=False)
    version_number: Mapped[str] = mapped_column(Text, nullable=False)
    approval_state: Mapped[str] = mapped_column(ApprovalStateEnum, nullable=False, default="draft")
    freshness_state: Mapped[str | None] = mapped_column(FreshnessStateEnum, default="fresh")
    provenance_id: Mapped[UUID | None] = mapped_column(ForeignKey("provenance_records.id"))
    original_object_id: Mapped[UUID | None] = mapped_column(ForeignKey("stored_objects.id"))
    preview_uri: Mapped[str | None] = mapped_column(Text)
    extracted_text: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    restricted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentUnitFamilyRow(Base):
    __tablename__ = "content_unit_families"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    family_title: Mapped[str] = mapped_column(Text, nullable=False)
    conceptual_summary: Mapped[str | None] = mapped_column(Text)
    unit_type: Mapped[str] = mapped_column(Text, nullable=False, default="slide")
    restricted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    taxonomy: Mapped[JsonDict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentUnitVariantRow(Base):
    __tablename__ = "content_unit_variants"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    family_id: Mapped[UUID] = mapped_column(ForeignKey("content_unit_families.id"), nullable=False)
    variant_label: Mapped[str] = mapped_column(Text, nullable=False)
    variant_type: Mapped[str] = mapped_column(Text, nullable=False, default="source")
    variant_dimensions: Mapped[JsonDict] = mapped_column(JSONB, default=dict, nullable=False)
    is_canonical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    linked_by: Mapped[str] = mapped_column(LinkSourceEnum, nullable=False, default="manual")
    linked_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    latest_version_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentUnitVersionRow(Base):
    __tablename__ = "content_unit_versions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    variant_id: Mapped[UUID] = mapped_column(ForeignKey("content_unit_variants.id"), nullable=False)
    version_number: Mapped[str] = mapped_column(Text, nullable=False)
    render_uri: Mapped[str | None] = mapped_column(Text)
    thumbnail_uri: Mapped[str | None] = mapped_column(Text)
    extracted_text: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    speaker_notes: Mapped[str | None] = mapped_column(Text)
    restricted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_work_product_version_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("work_product_versions.id")
    )
    source_order_index: Mapped[int | None]
    text_hash: Mapped[str | None] = mapped_column(Text)
    visual_hash: Mapped[str | None] = mapped_column(Text)
    provenance_id: Mapped[UUID | None] = mapped_column(ForeignKey("provenance_records.id"))
    approval_state: Mapped[str] = mapped_column(ApprovalStateEnum, nullable=False, default="draft")
    freshness_state: Mapped[str | None] = mapped_column(FreshnessStateEnum, default="fresh")
    quality_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    usage_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentBlockFamilyRow(Base):
    __tablename__ = "content_block_families"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    block_type: Mapped[str] = mapped_column(Text, nullable=False, default="sequence")
    canonical_variant_id: Mapped[UUID | None]
    taxonomy: Mapped[JsonDict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentBlockVariantRow(Base):
    __tablename__ = "content_block_variants"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    family_id: Mapped[UUID] = mapped_column(ForeignKey("content_block_families.id"), nullable=False)
    variant_label: Mapped[str] = mapped_column(Text, nullable=False)
    variant_type: Mapped[str] = mapped_column(Text, nullable=False, default="other")
    is_canonical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    linked_by: Mapped[str] = mapped_column(LinkSourceEnum, nullable=False, default="manual")
    linked_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    latest_version_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentBlockVersionRow(Base):
    __tablename__ = "content_block_versions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    variant_id: Mapped[UUID] = mapped_column(ForeignKey("content_block_variants.id"), nullable=False)
    version_number: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    restricted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    provenance_id: Mapped[UUID | None] = mapped_column(ForeignKey("provenance_records.id"))
    approval_state: Mapped[str] = mapped_column(ApprovalStateEnum, nullable=False, default="draft")
    freshness_state: Mapped[str | None] = mapped_column(FreshnessStateEnum, default="fresh")
    created_by: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    supersedes_version_id: Mapped[UUID | None] = mapped_column(ForeignKey("content_block_versions.id"))


class ContentBlockMemberRow(Base):
    __tablename__ = "content_block_members"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    block_version_id: Mapped[UUID] = mapped_column(ForeignKey("content_block_versions.id"), nullable=False)
    member_type: Mapped[str] = mapped_column(Text, nullable=False)
    member_id: Mapped[UUID] = mapped_column(nullable=False)
    order_index: Mapped[int] = mapped_column(nullable=False)
    role: Mapped[str | None] = mapped_column(Text)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoryboardRow(Base):
    __tablename__ = "storyboards"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    mode: Mapped[str] = mapped_column(Text, nullable=False, default="work_product")
    parent_type: Mapped[str | None] = mapped_column(Text)
    parent_id: Mapped[UUID | None]
    title: Mapped[str] = mapped_column(Text, nullable=False)
    current_snapshot_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("storyboard_snapshots.id", deferrable=True, initially="DEFERRED")
    )
    created_by: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoryboardSnapshotRow(Base):
    __tablename__ = "storyboard_snapshots"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    storyboard_id: Mapped[UUID] = mapped_column(ForeignKey("storyboards.id"), nullable=False)
    version_label: Mapped[str | None] = mapped_column(Text)
    derived_from_snapshot_id: Mapped[UUID | None] = mapped_column(ForeignKey("storyboard_snapshots.id"))
    approval_state: Mapped[str] = mapped_column(ApprovalStateEnum, nullable=False, default="draft")
    narrative_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_by: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoryboardSectionRow(Base):
    __tablename__ = "storyboard_sections"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    storyboard_id: Mapped[UUID | None] = mapped_column(ForeignKey("storyboards.id"))
    snapshot_id: Mapped[UUID | None] = mapped_column(ForeignKey("storyboard_snapshots.id"))
    row_kind: Mapped[str] = mapped_column(Text, nullable=False, default="snapshot")
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(nullable=False)
    section_type: Mapped[str | None] = mapped_column(Text)
    estimated_read_time_minutes: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoryboardSlotRow(Base):
    __tablename__ = "storyboard_slots"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    section_id: Mapped[UUID] = mapped_column(ForeignKey("storyboard_sections.id"), nullable=False)
    slot_type: Mapped[str] = mapped_column(Text, nullable=False, default="gap")
    selected_object_type: Mapped[str | None] = mapped_column(Text)
    selected_object_id: Mapped[UUID | None]
    order_index: Mapped[int] = mapped_column(nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ai_recommended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IngestionJobRow(Base):
    __tablename__ = "ingestion_jobs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="queued")
    stage: Mapped[str] = mapped_column(Text, nullable=False, default="uploaded")
    original_object_id: Mapped[UUID | None] = mapped_column(ForeignKey("stored_objects.id"))
    work_product_version_id: Mapped[UUID | None] = mapped_column(ForeignKey("work_product_versions.id"))
    error_code: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditEventRow(Base):
    __tablename__ = "audit_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[UUID | None]
    target_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(nullable=False)
    prior_state: Mapped[JsonDict | None] = mapped_column(JSONB)
    new_state: Mapped[JsonDict | None] = mapped_column(JSONB)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CommentRow(Base):
    __tablename__ = "comments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    kind: Mapped[str] = mapped_column(CommentKindEnum, nullable=False, default="persistent_comment")
    target_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(nullable=False)
    anchor: Mapped[JsonDict] = mapped_column(JSONB, default=dict, nullable=False)
    parent_comment_id: Mapped[UUID | None] = mapped_column(ForeignKey("comments.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NoteRow(Base):
    __tablename__ = "notes"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    target_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(nullable=False)
    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    note_type: Mapped[str] = mapped_column(Text, nullable=False, default="usage_guidance")
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SimilarityEdgeRow(Base):
    __tablename__ = "similarity_edges"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source_object_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_object_id: Mapped[UUID] = mapped_column(nullable=False)
    target_object_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_object_id: Mapped[UUID] = mapped_column(nullable=False)
    similarity_type: Mapped[str] = mapped_column(Text, nullable=False, default="hybrid")
    score: Mapped[float] = mapped_column(Numeric(6, 5), nullable=False)
    created_by: Mapped[str] = mapped_column(Text, nullable=False, default="ai")
    explanation: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReviewItemRow(Base):
    __tablename__ = "review_items"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    queue_type: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(ReviewStatusEnum, nullable=False, default="open")
    target_refs: Mapped[JsonList] = mapped_column(JSONB, default=list, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    rationale: Mapped[str | None] = mapped_column(Text)
    suggested_action: Mapped[str | None] = mapped_column(Text)
    assigned_to: Mapped[UUID | None]
    created_by: Mapped[str] = mapped_column(Text, nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_by: Mapped[UUID | None]
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)


class EmbeddingRow(Base):
    __tablename__ = "embeddings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    target_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(nullable=False)
    embedding_kind: Mapped[str] = mapped_column(Text, nullable=False, default="text")
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    model_version: Mapped[str | None] = mapped_column(Text)
    dims: Mapped[int] = mapped_column(nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(PGVector(1536))
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIOutputRow(Base):
    __tablename__ = "ai_outputs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    target_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(nullable=False)
    output_type: Mapped[str] = mapped_column(Text, nullable=False)
    pipeline_version: Mapped[str | None] = mapped_column(Text)
    model_info: Mapped[str | None] = mapped_column(Text)
    prompt_ref: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    output: Mapped[JsonDict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="suggested")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
