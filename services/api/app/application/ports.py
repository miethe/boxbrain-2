from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.domain.models import (
    AuditEvent,
    Comment,
    ContentBlockVersion,
    EmbeddingRecord,
    ContentUnitFamily,
    ContentUnitVariant,
    ContentUnitVersion,
    IngestionJob,
    Note,
    ProvenanceRecord,
    ReviewItem,
    SimilarityEdge,
    StoredObject,
    Storyboard,
    StoryboardSnapshot,
    WorkProductFamily,
    WorkProductVersion,
)


class BoxBrainRepository(Protocol):
    content_unit_families: dict[UUID, ContentUnitFamily]
    content_unit_variants: dict[UUID, ContentUnitVariant]
    content_unit_versions: dict[UUID, ContentUnitVersion]
    work_product_families: dict[UUID, WorkProductFamily]
    work_product_versions: dict[UUID, WorkProductVersion]
    content_blocks: dict[UUID, ContentBlockVersion]
    storyboards: dict[UUID, Storyboard]
    storyboard_snapshots: dict[UUID, StoryboardSnapshot]
    comments: dict[UUID, Comment]
    notes: dict[UUID, Note]
    review_items: dict[UUID, ReviewItem]
    ingestion_jobs: dict[UUID, IngestionJob]
    provenance_records: dict[UUID, ProvenanceRecord]
    similarity_edges: dict[UUID, SimilarityEdge]
    audit_events: list[AuditEvent]
    stored_objects: dict[UUID, StoredObject]
    embeddings: dict[UUID, EmbeddingRecord]

    def record_audit(
        self,
        action: str,
        actor_id: str,
        target_type: str,
        target_id: UUID,
        prior_state: dict,
        new_state: dict,
        reason: str | None = None,
        metadata: dict | None = None,
    ) -> AuditEvent: ...

    def freeze_storyboard_snapshot(
        self,
        storyboard: Storyboard,
        version_label: str | None = None,
    ) -> StoryboardSnapshot: ...
