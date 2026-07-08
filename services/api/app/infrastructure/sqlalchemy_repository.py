from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from sqlalchemy import delete, text
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.domain.ingestion_search import (
    DEFAULT_EMBEDDING_DIMS,
    DEFAULT_RANKING_WEIGHTS,
    RankingWeights,
    RankedResult,
    ScoreBreakdown,
    SearchDocument,
    SearchQuery,
    coerce_embedding_vector,
    deterministic_text_embedding,
    pgvector_literal,
    score_document,
)
from app.domain.models import (
    AuditEvent,
    Comment,
    ContentBlockMember,
    ContentBlockVersion,
    ContentUnitFamily,
    ContentUnitVariant,
    ContentUnitVersion,
    EmbeddingRecord,
    IngestionJob,
    Note,
    ProvenanceRecord,
    ReviewItem,
    SimilarityEdge,
    StoredObject,
    Storyboard,
    StoryboardSection,
    StoryboardSlot,
    StoryboardSnapshot,
    WorkProductFamily,
    WorkProductVersion,
    now_utc,
)
from app.infrastructure.db_models import (
    AuditEventRow,
    CommentRow,
    ContentBlockFamilyRow,
    ContentBlockMemberRow,
    ContentBlockVariantRow,
    ContentBlockVersionRow,
    ContentUnitFamilyRow,
    ContentUnitVariantRow,
    ContentUnitVersionRow,
    EmbeddingRow,
    IngestionJobRow,
    NoteRow,
    ProvenanceRecordRow,
    ReviewItemRow,
    SimilarityEdgeRow,
    StoredObjectRow,
    StoryboardRow,
    StoryboardSectionRow,
    StoryboardSlotRow,
    StoryboardSnapshotRow,
    WorkProductFamilyRow,
    WorkProductVariantRow,
    WorkProductVersionRow,
)
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository


CONTENT_UNIT_SEARCH_TYPES = {
    "content_unit",
    "content_units",
    "content_unit_family",
    "content_unit_variant",
    "content_unit_version",
}
WORK_PRODUCT_SEARCH_TYPES = {
    "work_product",
    "work_products",
    "work_product_family",
    "work_product_version",
}
CONTENT_BLOCK_SEARCH_TYPES = {
    "content_block",
    "content_blocks",
    "content_block_family",
    "content_block_variant",
    "content_block_version",
}


def build_hybrid_search_sql(
    *,
    include_content_units: bool,
    include_work_products: bool,
    include_restricted: bool,
    include_content_blocks: bool = False,
) -> str:
    # A CTE cannot reference its own name inside its own body — family_restricted/
    # version_restricted are output aliases of the SELECT, not in-scope columns, so
    # qualifying them with the CTE name (content_unit./work_product./content_block.)
    # raises "missing FROM-clause entry" in Postgres. Filter on the underlying join
    # aliases instead (cuf/cuv, wpf/wpv, cbv).
    restricted_content_unit_filter = (
        "TRUE" if include_restricted else "NOT (cuf.restricted OR cuv.restricted)"
    )
    restricted_work_product_filter = (
        "TRUE" if include_restricted else "NOT (wpf.restricted OR wpv.restricted)"
    )
    content_unit_enabled = "TRUE" if include_content_units else "FALSE"
    work_product_enabled = "TRUE" if include_work_products else "FALSE"
    restricted_content_block_filter = "TRUE" if include_restricted else "NOT cbv.restricted"
    content_block_enabled = "TRUE" if include_content_blocks else "FALSE"
    return f"""
WITH query_input AS (
  SELECT
    websearch_to_tsquery('english', :query_text) AS ts_query,
    CAST(:query_embedding AS vector(1536)) AS query_embedding
),
content_unit AS (
  SELECT
    'content_unit_version' AS object_type,
    cuv.id AS object_id,
    cuf.id AS family_id,
    cuvar.id AS variant_id,
    cuv.id AS version_id,
    cuf.family_title AS title,
    cuv.summary AS summary,
    cuv.thumbnail_uri AS preview_uri,
    cuf.taxonomy AS taxonomy,
    jsonb_build_object(
      'familyTitle', cuf.family_title,
      'familySummary', cuf.conceptual_summary,
      'variantLabel', cuvar.variant_label,
      'variantType', cuvar.variant_type,
      'variantDimensions', cuvar.variant_dimensions,
      'isCanonical', cuvar.is_canonical,
      'linkSource', cuvar.linked_by,
      'versionNumber', cuv.version_number,
      'sourceOrderIndex', cuv.source_order_index
    ) AS metadata,
    cuv.approval_state AS approval_state,
    coalesce(cuv.freshness_state, 'fresh') AS freshness_state,
    cuf.restricted AS family_restricted,
    cuv.restricted AS version_restricted,
    cuv.created_at AS updated_at,
    CASE
      WHEN :query_text = '' THEN 0
      ELSE LEAST(1.0, ts_rank_cd(cuv.search_vector, query_input.ts_query, 32) * 4.0)
    END AS lexical_score,
    CASE
      WHEN embeddings.embedding IS NULL OR :query_text = '' THEN 0
      ELSE GREATEST(0.0, 1.0 - (embeddings.embedding <=> query_input.query_embedding))
    END AS semantic_score
  FROM query_input
  JOIN content_unit_versions cuv ON TRUE
  JOIN content_unit_variants cuvar ON cuvar.id = cuv.variant_id
  JOIN content_unit_families cuf ON cuf.id = cuvar.family_id
  LEFT JOIN embeddings
    ON embeddings.target_type = 'content_unit_version'
   AND embeddings.target_id = cuv.id
   AND embeddings.embedding_kind = 'text'
   AND embeddings.embedding IS NOT NULL
  WHERE {content_unit_enabled}
    AND {restricted_content_unit_filter}
),
work_product AS (
  SELECT
    'work_product_version' AS object_type,
    wpv.id AS object_id,
    wpf.id AS family_id,
    wpvar.id AS variant_id,
    wpv.id AS version_id,
    wpf.title AS title,
    coalesce(wpv.summary, wpf.summary) AS summary,
    wpv.preview_uri AS preview_uri,
    wpf.taxonomy AS taxonomy,
    jsonb_build_object(
      'artifactType', wpf.artifact_type,
      'familyTitle', wpf.title,
      'familySummary', wpf.summary,
      'variantLabel', wpvar.variant_label,
      'variantType', wpvar.variant_type,
      'variantDimensions', wpvar.variant_dimensions,
      'isCanonical', wpvar.is_canonical,
      'versionNumber', wpv.version_number
    ) AS metadata,
    wpv.approval_state AS approval_state,
    coalesce(wpv.freshness_state, 'fresh') AS freshness_state,
    wpf.restricted AS family_restricted,
    wpv.restricted AS version_restricted,
    wpv.created_at AS updated_at,
    CASE
      WHEN :query_text = '' THEN 0
      ELSE LEAST(1.0, ts_rank_cd(wpv.search_vector, query_input.ts_query, 32) * 4.0)
    END AS lexical_score,
    CASE
      WHEN embeddings.embedding IS NULL OR :query_text = '' THEN 0
      ELSE GREATEST(0.0, 1.0 - (embeddings.embedding <=> query_input.query_embedding))
    END AS semantic_score
  FROM query_input
  JOIN work_product_versions wpv ON TRUE
  JOIN work_product_variants wpvar ON wpvar.id = wpv.variant_id
  JOIN work_product_families wpf ON wpf.id = wpvar.family_id
  LEFT JOIN embeddings
    ON embeddings.target_type = 'work_product_version'
   AND embeddings.target_id = wpv.id
   AND embeddings.embedding_kind = 'text'
   AND embeddings.embedding IS NOT NULL
  WHERE {work_product_enabled}
    AND {restricted_work_product_filter}
),
content_block AS (
  SELECT
    'content_block_version' AS object_type,
    cbv.id AS object_id,
    cbf.id AS family_id,
    cbvar.id AS variant_id,
    cbv.id AS version_id,
    cbf.title AS title,
    coalesce(cbv.summary, cbf.summary) AS summary,
    NULL::text AS preview_uri,
    cbf.taxonomy AS taxonomy,
    jsonb_build_object(
      'familyTitle', cbf.title,
      'familySummary', cbf.summary,
      'blockType', cbf.block_type,
      'variantLabel', cbvar.variant_label,
      'variantType', cbvar.variant_type,
      'isCanonical', cbvar.is_canonical,
      'linkSource', cbvar.linked_by,
      'versionNumber', cbv.version_number,
      'memberCount', (
        SELECT count(*)
        FROM content_block_members cbm
        WHERE cbm.block_version_id = cbv.id
      )
    ) AS metadata,
    cbv.approval_state AS approval_state,
    coalesce(cbv.freshness_state, 'fresh') AS freshness_state,
    FALSE AS family_restricted,
    cbv.restricted AS version_restricted,
    cbv.created_at AS updated_at,
    CASE
      WHEN :query_text = '' THEN 0
      ELSE LEAST(
        1.0,
        ts_rank_cd(
          setweight(to_tsvector('english', coalesce(cbf.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(cbf.summary, '')), 'B') ||
          cbv.search_vector,
          query_input.ts_query,
          32
        ) * 4.0
      )
    END AS lexical_score,
    CASE
      WHEN embeddings.embedding IS NULL OR :query_text = '' THEN 0
      ELSE GREATEST(0.0, 1.0 - (embeddings.embedding <=> query_input.query_embedding))
    END AS semantic_score
  FROM query_input
  JOIN content_block_versions cbv ON TRUE
  JOIN content_block_variants cbvar ON cbvar.id = cbv.variant_id
  JOIN content_block_families cbf ON cbf.id = cbvar.family_id
  LEFT JOIN embeddings
    ON embeddings.target_type = 'content_block_version'
   AND embeddings.target_id = cbv.id
   AND embeddings.embedding_kind = 'text'
   AND embeddings.embedding IS NOT NULL
  WHERE {content_block_enabled}
    AND {restricted_content_block_filter}
),
combined AS (
  SELECT * FROM content_unit
  UNION ALL
  SELECT * FROM work_product
  UNION ALL
  SELECT * FROM content_block
)
SELECT *
FROM combined
ORDER BY
  ((:lexical_weight * lexical_score) + (:semantic_weight * semantic_score)) DESC,
  title ASC,
  object_id ASC
LIMIT :limit
"""


def _bounded_float(value: Any) -> float:
    if value is None:
        return 0.0
    return max(0.0, min(1.0, float(value)))


def _explanation_components(breakdown: ScoreBreakdown) -> tuple[str, ...]:
    components: list[str] = []
    if breakdown.lexical > 0:
        components.append("keyword match")
    if breakdown.semantic > 0:
        components.append("semantic match")
    if breakdown.metadata > 0:
        components.append("metadata match")
    if breakdown.trust >= 0.65:
        components.append("approved/trusted")
    if breakdown.freshness >= 0.6:
        components.append("fresh")
    return tuple(components)


class SqlAlchemyBoxBrainRepository(InMemoryBoxBrainRepository):
    """Database-backed repository adapter with in-memory read model compatibility.

    The current use-case layer works against dictionaries. This adapter keeps
    that contract while persisting newly written ingestion/audit/provenance
    records to PostgreSQL. Later slices can move read paths to SQL queries
    without changing route modules.
    """

    def __init__(self, session_factory: sessionmaker[Session], seed: bool = False) -> None:
        self.session_factory = session_factory
        super().__init__(seed=seed)
        self.reload()

    def reload(self) -> None:
        with self._session() as session:
            self.stored_objects = {
                row.id: StoredObject(
                    id=row.id,
                    object_type=row.object_type,
                    storage_uri=row.storage_uri,
                    mime_type=row.mime_type,
                    byte_size=row.byte_size,
                    sha256=row.sha256,
                    metadata=dict(row.metadata_),
                    created_at=row.created_at,
                )
                for row in session.scalars(select(StoredObjectRow))
            }
            # Keep the O(1) key-index in sync with the freshly loaded dict.
            self.stored_object_by_key = {
                obj.metadata["key"]: obj
                for obj in self.stored_objects.values()
                if obj.metadata.get("key")
            }
            self.provenance_records.update(
                {
                    row.id: ProvenanceRecord(
                        id=row.id,
                        origin_type=row.origin_type,
                        source_system=row.source_system,
                        parent_refs=list(row.parent_refs),
                        source_refs=[str(ref) for ref in row.source_refs],
                        model_info=row.model_info,
                        pipeline_version=row.pipeline_version,
                        created_at=row.created_at,
                    )
                    for row in session.scalars(select(ProvenanceRecordRow))
                }
            )
            self.ingestion_jobs.update(
                {
                    row.id: IngestionJob(
                        id=row.id,
                        status=row.status,
                        stage=row.stage,
                        artifact_type=str(row.metadata_.get("artifactType", "deck")),
                        title=row.metadata_.get("title"),
                        original_object_id=row.original_object_id,
                        work_product_version_id=row.work_product_version_id,
                        upload_metadata=dict(row.metadata_),
                        error_code=row.error_code,
                        error_message=row.error_message,
                        retry_count=int(row.metadata_.get("retryCount", 0)),
                        created_at=row.created_at,
                        updated_at=row.updated_at,
                        completed_at=row.completed_at,
                    )
                    for row in session.scalars(select(IngestionJobRow))
                }
            )
            self.content_unit_families.update(
                {
                    row.id: ContentUnitFamily(
                        id=row.id,
                        family_title=row.family_title,
                        conceptual_summary=row.conceptual_summary,
                        unit_type=row.unit_type,
                        taxonomy=dict(row.taxonomy),
                        restricted=row.restricted,
                    )
                    for row in session.scalars(select(ContentUnitFamilyRow))
                }
            )
            self.content_unit_variants.update(
                {
                    row.id: ContentUnitVariant(
                        id=row.id,
                        family_id=row.family_id,
                        variant_label=row.variant_label,
                        variant_type=row.variant_type,
                        variant_dimensions=dict(row.variant_dimensions),
                        is_canonical=row.is_canonical,
                        linked_by=row.linked_by,
                        linked_confidence=float(row.linked_confidence)
                        if row.linked_confidence is not None
                        else None,
                        latest_version_id=row.latest_version_id,
                    )
                    for row in session.scalars(select(ContentUnitVariantRow))
                }
            )
            content_unit_rows = list(session.scalars(select(ContentUnitVersionRow)))
            self.content_unit_versions.update(
                {
                    row.id: ContentUnitVersion(
                        id=row.id,
                        variant_id=row.variant_id,
                        version_number=row.version_number,
                        render_uri=row.render_uri,
                        thumbnail_uri=row.thumbnail_uri,
                        summary=row.summary,
                        approval_state=row.approval_state,
                        freshness_state=row.freshness_state or "fresh",
                        quality_score=float(row.quality_score) if row.quality_score is not None else None,
                        usage_score=float(row.usage_score) if row.usage_score is not None else None,
                        extracted_text=row.extracted_text,
                        speaker_notes=row.speaker_notes,
                        provenance_id=row.provenance_id,
                        restricted=row.restricted,
                        source_order_index=row.source_order_index,
                        created_at=row.created_at,
                    )
                    for row in content_unit_rows
                    if row.provenance_id is not None
                }
            )
            content_block_families = {
                row.id: row for row in session.scalars(select(ContentBlockFamilyRow))
            }
            content_block_variants = {
                row.id: row for row in session.scalars(select(ContentBlockVariantRow))
            }
            content_block_members: dict[UUID, list[ContentBlockMember]] = {}
            for member_row in session.scalars(select(ContentBlockMemberRow)):
                content_block_members.setdefault(member_row.block_version_id, []).append(
                    ContentBlockMember(
                        id=member_row.id,
                        member_type=member_row.member_type,
                        member_id=member_row.member_id,
                        order_index=member_row.order_index,
                        role=member_row.role,
                        is_required=member_row.is_required,
                        notes=member_row.notes,
                    )
                )
            self.content_blocks.update(
                {
                    row.id: ContentBlockVersion(
                        id=row.id,
                        family_id=variant.family_id,
                        title=family.title,
                        summary=row.summary or family.summary,
                        block_type=family.block_type,
                        approval_state=row.approval_state,
                        members=sorted(
                            content_block_members.get(row.id, []),
                            key=lambda item: item.order_index,
                        ),
                        restricted=row.restricted,
                        created_at=row.created_at,
                    )
                    for row in session.scalars(select(ContentBlockVersionRow))
                    for variant in [content_block_variants.get(row.variant_id)]
                    if variant is not None
                    for family in [content_block_families.get(variant.family_id)]
                    if family is not None
                }
            )
            storyboard_snapshot_rows = list(session.scalars(select(StoryboardSnapshotRow)))
            storyboard_snapshots_by_id = {row.id: row for row in storyboard_snapshot_rows}
            slots_by_section: dict[UUID, list[StoryboardSlot]] = {}
            for slot_row in session.scalars(select(StoryboardSlotRow)):
                slots_by_section.setdefault(slot_row.section_id, []).append(
                    StoryboardSlot(
                        id=slot_row.id,
                        section_id=slot_row.section_id,
                        slot_type=slot_row.slot_type,
                        selected_object_type=slot_row.selected_object_type,
                        selected_object_id=slot_row.selected_object_id,
                        order_index=slot_row.order_index,
                        purpose=slot_row.purpose,
                        is_required=slot_row.is_required,
                        ai_recommended=slot_row.ai_recommended,
                    )
                )
            draft_sections_by_storyboard: dict[UUID, list[StoryboardSection]] = {}
            snapshot_sections_by_snapshot: dict[UUID, list[StoryboardSection]] = {}
            for section_row in session.scalars(select(StoryboardSectionRow)):
                section_storyboard_id = section_row.storyboard_id
                if section_storyboard_id is None and section_row.snapshot_id is not None:
                    snapshot_storyboard = storyboard_snapshots_by_id.get(section_row.snapshot_id)
                    section_storyboard_id = snapshot_storyboard.storyboard_id if snapshot_storyboard else None
                if section_storyboard_id is None:
                    continue
                section = StoryboardSection(
                    id=section_row.id,
                    storyboard_id=section_storyboard_id,
                    title=section_row.title,
                    summary=section_row.summary,
                    order_index=section_row.order_index,
                    slots=sorted(
                        slots_by_section.get(section_row.id, []),
                        key=lambda item: item.order_index,
                    ),
                )
                if section_row.row_kind == "draft":
                    draft_sections_by_storyboard.setdefault(section_storyboard_id, []).append(section)
                elif section_row.snapshot_id is not None:
                    snapshot_sections_by_snapshot.setdefault(section_row.snapshot_id, []).append(section)
            self.storyboard_snapshots = {
                row.id: StoryboardSnapshot(
                    id=row.id,
                    storyboard_id=row.storyboard_id,
                    version_label=row.version_label,
                    approval_state=row.approval_state,
                    narrative_score=float(row.narrative_score)
                    if row.narrative_score is not None
                    else None,
                    sections=tuple(
                        sorted(
                            snapshot_sections_by_snapshot.get(row.id, []),
                            key=lambda item: item.order_index,
                        )
                    ),
                    created_at=row.created_at,
                )
                for row in storyboard_snapshot_rows
            }
            self.storyboards = {
                row.id: Storyboard(
                    id=row.id,
                    mode=row.mode,
                    title=row.title,
                    draft_sections=sorted(
                        draft_sections_by_storyboard.get(row.id, []),
                        key=lambda item: item.order_index,
                    ),
                    current_snapshot_id=row.current_snapshot_id,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
                for row in session.scalars(select(StoryboardRow))
            }
            self.work_product_families.update(
                {
                    row.id: WorkProductFamily(
                        id=row.id,
                        title=row.title,
                        artifact_type=row.artifact_type,
                        summary=row.summary,
                        preview_uri=None,
                        variant_count=1,
                        version_count=1,
                        restricted=row.restricted,
                    )
                    for row in session.scalars(select(WorkProductFamilyRow))
                }
            )
            work_product_variants = {
                row.id: row for row in session.scalars(select(WorkProductVariantRow))
            }
            filmstrip_by_work_product: dict[UUID, list[UUID]] = {}
            for unit_row in sorted(content_unit_rows, key=lambda item: item.source_order_index or 0):
                if unit_row.source_work_product_version_id is not None:
                    filmstrip_by_work_product.setdefault(unit_row.source_work_product_version_id, []).append(
                        unit_row.id
                    )
            self.work_product_versions.update(
                {
                    row.id: WorkProductVersion(
                        id=row.id,
                        family_id=work_product_variants[row.variant_id].family_id,
                        title=self.work_product_families[
                            work_product_variants[row.variant_id].family_id
                        ].title,
                        artifact_type=self.work_product_families[
                            work_product_variants[row.variant_id].family_id
                        ].artifact_type,
                        version_number=row.version_number,
                        approval_state=row.approval_state,
                        preview_uri=row.preview_uri,
                        filmstrip_version_ids=filmstrip_by_work_product.get(row.id, []),
                        provenance_id=row.provenance_id,
                        restricted=row.restricted,
                    )
                    for row in session.scalars(select(WorkProductVersionRow))
                    if row.variant_id in work_product_variants
                    and row.provenance_id is not None
                    and work_product_variants[row.variant_id].family_id in self.work_product_families
                }
            )
            self.audit_events = [
                AuditEvent(
                    id=row.id,
                    action=row.action,
                    actor_id=str(row.metadata_.get("actorId") or row.actor_id or "unknown"),
                    target_type=row.target_type,
                    target_id=row.target_id,
                    prior_state=dict(row.prior_state or {}),
                    new_state=dict(row.new_state or {}),
                    metadata=dict(row.metadata_),
                    reason=row.metadata_.get("reason"),
                    created_at=row.created_at,
                )
                for row in session.scalars(select(AuditEventRow))
            ]
            self.comments = {
                row.id: Comment(
                    id=row.id,
                    kind=row.kind,
                    target_type=row.target_type,
                    target_id=row.target_id,
                    anchor=dict(row.anchor),
                    body=row.body,
                    status=row.status,
                    parent_comment_id=row.parent_comment_id,
                    created_at=row.created_at,
                )
                for row in session.scalars(select(CommentRow))
            }
            self.notes = {
                row.id: Note(
                    id=row.id,
                    target_type=row.target_type,
                    target_id=row.target_id,
                    title=row.title,
                    body=row.body,
                    note_type=row.note_type,
                    is_pinned=row.is_pinned,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
                for row in session.scalars(select(NoteRow))
            }
            self.similarity_edges = {
                row.id: SimilarityEdge(
                    id=row.id,
                    source_version_id=row.source_object_id,
                    target_version_id=row.target_object_id,
                    score=float(row.score),
                    rationale=row.explanation,
                    confirmed_by=row.created_by if row.created_by != "ai" else None,
                    created_at=row.created_at,
                )
                for row in session.scalars(select(SimilarityEdgeRow))
                if row.source_object_type == "content_unit_version"
                and row.target_object_type == "content_unit_version"
            }
            self.review_items = {
                row.id: ReviewItem(
                    id=row.id,
                    queue_type=row.queue_type,
                    status=row.status,
                    confidence=float(row.confidence) if row.confidence is not None else None,
                    rationale=row.rationale,
                    suggested_action=row.suggested_action,
                    target_refs=list(row.target_refs),
                    compare_objects=list(row.metadata_.get("compareObjects", [])),
                    source=str(row.metadata_.get("source", row.created_by)),
                    audit_preview=dict(row.metadata_.get("auditPreview", {})),
                    created_at=row.created_at,
                    resolved_at=row.resolved_at,
                )
                for row in session.scalars(select(ReviewItemRow))
            }
            self.embeddings = {
                row.id: EmbeddingRecord(
                    id=row.id,
                    target_type=row.target_type,
                    target_id=row.target_id,
                    embedding_kind=row.embedding_kind,
                    model_name=row.model_name,
                    model_version=row.model_version,
                    dims=row.dims,
                    metadata=dict(row.metadata_),
                    created_at=row.created_at,
                )
                for row in session.scalars(select(EmbeddingRow))
            }

    def hybrid_search_documents(
        self,
        query: SearchQuery,
        *,
        object_types: set[str],
        include_restricted: bool,
        limit: int,
        weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
    ) -> list[RankedResult]:
        include_content_units = not object_types or bool(object_types.intersection(CONTENT_UNIT_SEARCH_TYPES))
        include_work_products = not object_types or bool(object_types.intersection(WORK_PRODUCT_SEARCH_TYPES))
        include_content_blocks = not object_types or bool(object_types.intersection(CONTENT_BLOCK_SEARCH_TYPES))
        if not include_content_units and not include_work_products and not include_content_blocks:
            return []

        query_text = query.text.strip()
        query_embedding = deterministic_text_embedding(query_text, dims=DEFAULT_EMBEDDING_DIMS)
        sql = build_hybrid_search_sql(
            include_content_units=include_content_units,
            include_work_products=include_work_products,
            include_restricted=include_restricted,
            include_content_blocks=include_content_blocks,
        )
        params = {
            "query_text": query_text,
            "query_embedding": pgvector_literal(query_embedding),
            "lexical_weight": weights.lexical,
            "semantic_weight": weights.semantic,
            "limit": max(limit, 1),
        }
        with self._session() as session:
            rows = session.execute(text(sql), params).mappings().all()

        results: list[RankedResult] = []
        for row in rows:
            document = self._search_document_from_row(row)
            policy_breakdown = score_document(
                query,
                document,
                weights=weights,
                query_embedding=query_embedding,
            )
            lexical = _bounded_float(row.get("lexical_score"))
            semantic = _bounded_float(row.get("semantic_score"))
            metadata = policy_breakdown.metadata
            trust = policy_breakdown.trust
            freshness = policy_breakdown.freshness
            total = (
                weights.lexical * lexical
                + weights.semantic * semantic
                + weights.metadata * metadata
                + weights.trust * trust
                + weights.freshness * freshness
            )
            breakdown = ScoreBreakdown(
                lexical=round(lexical, 6),
                semantic=round(semantic, 6),
                metadata=round(metadata, 6),
                trust=round(trust, 6),
                freshness=round(freshness, 6),
                total=round(total, 6),
            )
            results.append(
                RankedResult(
                    document=document,
                    score=breakdown.total,
                    breakdown=breakdown,
                    explanation=_explanation_components(breakdown),
                )
            )

        results.sort(key=lambda item: (item.score, item.document.id), reverse=True)
        return results[:limit]

    def _search_document_from_row(self, row: Any) -> SearchDocument:
        metadata = dict(row["metadata"] or {})
        metadata.update(
            {
                "familyId": str(row["family_id"]),
                "variantId": str(row["variant_id"]),
                "versionId": str(row["version_id"]),
                "previewUri": row["preview_uri"],
            }
        )
        return SearchDocument(
            id=str(row["object_id"]),
            object_type=str(row["object_type"]),
            title=str(row["title"] or ""),
            summary=row["summary"],
            text=row["summary"] or "",
            taxonomy=dict(row["taxonomy"] or {}),
            metadata=metadata,
            approval_state=str(row["approval_state"]),
            freshness_state=str(row["freshness_state"] or "fresh"),
            updated_at=row["updated_at"],
            is_restricted=bool(row["family_restricted"] or row["version_restricted"]),
        )

    def save_stored_object(self, stored_object: StoredObject) -> None:
        self.register_stored_object(stored_object)
        with self._session() as session:
            session.merge(
                StoredObjectRow(
                    id=stored_object.id,
                    object_type=stored_object.object_type,
                    storage_uri=stored_object.storage_uri,
                    mime_type=stored_object.mime_type,
                    byte_size=stored_object.byte_size,
                    sha256=stored_object.sha256,
                    metadata_=stored_object.metadata,
                    created_at=stored_object.created_at,
                )
            )

    def save_provenance_record(self, provenance: ProvenanceRecord) -> None:
        self.provenance_records[provenance.id] = provenance
        with self._session() as session:
            session.merge(
                ProvenanceRecordRow(
                    id=provenance.id,
                    origin_type=provenance.origin_type,
                    source_system=provenance.source_system,
                    parent_refs=provenance.parent_refs,
                    source_refs=provenance.source_refs,
                    model_info=provenance.model_info,
                    pipeline_version=provenance.pipeline_version,
                    metadata_={},
                    created_at=provenance.created_at,
                )
            )

    def save_ingestion_job(self, job: IngestionJob) -> None:
        self.ingestion_jobs[job.id] = job
        with self._session() as session:
            metadata = dict(job.upload_metadata)
            metadata["artifactType"] = job.artifact_type
            metadata["title"] = job.title
            metadata["retryCount"] = job.retry_count
            session.merge(
                IngestionJobRow(
                    id=job.id,
                    status=job.status,
                    stage=job.stage,
                    original_object_id=job.original_object_id,
                    work_product_version_id=job.work_product_version_id,
                    error_code=job.error_code,
                    error_message=job.error_message,
                    metadata_=metadata,
                    created_at=job.created_at,
                    updated_at=job.updated_at,
                    completed_at=job.completed_at,
                )
            )

    def save_work_product(
        self,
        family: WorkProductFamily,
        version: WorkProductVersion,
        *,
        variant_id: UUID,
        original_object_id: UUID | None,
    ) -> None:
        self.work_product_families[family.id] = family
        self.work_product_versions[version.id] = version
        with self._session() as session:
            session.merge(
                WorkProductFamilyRow(
                    id=family.id,
                    title=family.title,
                    artifact_type=family.artifact_type,
                    summary=family.summary,
                    restricted=family.restricted,
                    taxonomy={},
                )
            )
            session.merge(
                WorkProductVariantRow(
                    id=variant_id,
                    family_id=family.id,
                    variant_label="Imported source",
                    variant_type="source",
                    variant_dimensions={},
                    is_canonical=True,
                    latest_version_id=version.id,
                )
            )
            session.merge(
                WorkProductVersionRow(
                    id=version.id,
                    variant_id=variant_id,
                    version_number=version.version_number,
                    approval_state=version.approval_state,
                    freshness_state="fresh",
                    provenance_id=version.provenance_id,
                    original_object_id=original_object_id,
                    preview_uri=version.preview_uri,
                    summary=version.title,
                    restricted=version.restricted,
                )
            )

    def save_content_unit(
        self,
        family: ContentUnitFamily,
        variant: ContentUnitVariant,
        version: ContentUnitVersion,
        *,
        source_work_product_version_id: UUID | None,
        source_order_index: int,
        text_hash: str,
        visual_hash: str | None,
    ) -> None:
        self.content_unit_families[family.id] = family
        self.content_unit_variants[variant.id] = variant
        self.content_unit_versions[version.id] = version
        with self._session() as session:
            session.merge(
                ContentUnitFamilyRow(
                    id=family.id,
                    family_title=family.family_title,
                    conceptual_summary=family.conceptual_summary,
                    unit_type=family.unit_type,
                    restricted=family.restricted,
                    taxonomy=family.taxonomy,
                )
            )
            session.merge(
                ContentUnitVariantRow(
                    id=variant.id,
                    family_id=family.id,
                    variant_label=variant.variant_label,
                    variant_type=variant.variant_type,
                    variant_dimensions=variant.variant_dimensions,
                    is_canonical=variant.is_canonical,
                    linked_by=variant.linked_by,
                    linked_confidence=variant.linked_confidence,
                    latest_version_id=version.id,
                )
            )
            session.merge(
                ContentUnitVersionRow(
                    id=version.id,
                    variant_id=variant.id,
                    version_number=version.version_number,
                    render_uri=version.render_uri,
                    thumbnail_uri=version.thumbnail_uri,
                    extracted_text=version.extracted_text,
                    summary=version.summary,
                    speaker_notes=version.speaker_notes,
                    restricted=version.restricted,
                    source_work_product_version_id=source_work_product_version_id,
                    source_order_index=source_order_index,
                    text_hash=text_hash,
                    visual_hash=visual_hash,
                    provenance_id=version.provenance_id,
                    approval_state=version.approval_state,
                    freshness_state=version.freshness_state,
                    quality_score=version.quality_score,
                    usage_score=version.usage_score,
                    created_at=version.created_at,
                )
            )

    def save_content_unit_version(self, version: ContentUnitVersion) -> None:
        self.content_unit_versions[version.id] = version
        with self._session() as session:
            row = session.get(ContentUnitVersionRow, version.id)
            if row is not None:
                row.approval_state = version.approval_state
                row.freshness_state = version.freshness_state
                row.restricted = version.restricted
                row.render_uri = version.render_uri
                row.thumbnail_uri = version.thumbnail_uri
                row.summary = version.summary
                row.extracted_text = version.extracted_text
                row.speaker_notes = version.speaker_notes

    def save_content_unit_variants(self, variants: list[ContentUnitVariant]) -> None:
        for variant in variants:
            self.content_unit_variants[variant.id] = variant
        with self._session() as session:
            for variant in variants:
                row = session.get(ContentUnitVariantRow, variant.id)
                if row is not None:
                    row.family_id = variant.family_id
                    row.variant_label = variant.variant_label
                    row.variant_type = variant.variant_type
                    row.variant_dimensions = variant.variant_dimensions
                    row.is_canonical = variant.is_canonical
                    row.linked_by = variant.linked_by
                    row.linked_confidence = variant.linked_confidence
                    row.latest_version_id = variant.latest_version_id

    def save_content_block(self, block: ContentBlockVersion) -> None:
        self.content_blocks[block.id] = block
        variant_id = self._content_block_variant_id(block.family_id)
        with self._session() as session:
            session.merge(
                ContentBlockFamilyRow(
                    id=block.family_id,
                    title=block.title,
                    summary=block.summary,
                    block_type=block.block_type,
                    canonical_variant_id=variant_id,
                    taxonomy={},
                    created_at=block.created_at,
                    updated_at=block.created_at,
                )
            )
            session.merge(
                ContentBlockVariantRow(
                    id=variant_id,
                    family_id=block.family_id,
                    variant_label="Canonical",
                    variant_type=block.block_type,
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=1.0,
                    latest_version_id=block.id,
                    created_at=block.created_at,
                    updated_at=block.created_at,
                )
            )
            session.merge(
                ContentBlockVersionRow(
                    id=block.id,
                    variant_id=variant_id,
                    version_number="v1.0",
                    summary=block.summary,
                    restricted=block.restricted,
                    provenance_id=None,
                    approval_state=block.approval_state,
                    freshness_state="fresh",
                    created_by=None,
                    created_at=block.created_at,
                    supersedes_version_id=None,
                )
            )
            session.execute(
                delete(ContentBlockMemberRow).where(ContentBlockMemberRow.block_version_id == block.id)
            )
            for member in sorted(block.members, key=lambda item: item.order_index):
                session.merge(
                    ContentBlockMemberRow(
                        id=member.id,
                        block_version_id=block.id,
                        member_type=member.member_type,
                        member_id=member.member_id,
                        order_index=member.order_index,
                        role=member.role,
                        is_required=member.is_required,
                        notes=member.notes,
                    )
                )

    def save_storyboard(self, storyboard: Storyboard) -> None:
        self.storyboards[storyboard.id] = storyboard
        with self._session() as session:
            session.merge(
                StoryboardRow(
                    id=storyboard.id,
                    mode=storyboard.mode,
                    title=storyboard.title,
                    current_snapshot_id=storyboard.current_snapshot_id,
                    created_at=storyboard.created_at,
                    updated_at=storyboard.updated_at,
                )
            )
            session.execute(
                delete(StoryboardSectionRow).where(
                    StoryboardSectionRow.storyboard_id == storyboard.id,
                    StoryboardSectionRow.row_kind == "draft",
                )
            )
            self._merge_storyboard_sections(
                session,
                storyboard.draft_sections,
                storyboard_id=storyboard.id,
                snapshot_id=None,
                row_kind="draft",
            )

    def freeze_storyboard_snapshot(
        self,
        storyboard: Storyboard,
        version_label: str | None = None,
    ) -> StoryboardSnapshot:
        snapshot_sections = self._copy_sections_for_snapshot(storyboard.draft_sections)
        snapshot = StoryboardSnapshot(
            id=uuid4(),
            storyboard_id=storyboard.id,
            version_label=version_label,
            approval_state="draft",
            narrative_score=None,
            sections=snapshot_sections,
            created_at=now_utc(),
        )
        storyboard.current_snapshot_id = snapshot.id
        storyboard.updated_at = now_utc()
        self.storyboard_snapshots[snapshot.id] = snapshot
        self.storyboards[storyboard.id] = storyboard
        with self._session() as session:
            session.merge(
                StoryboardSnapshotRow(
                    id=snapshot.id,
                    storyboard_id=storyboard.id,
                    version_label=version_label,
                    approval_state=snapshot.approval_state,
                    narrative_score=snapshot.narrative_score,
                    created_at=snapshot.created_at,
                )
            )
            self._merge_storyboard_sections(
                session,
                snapshot.sections,
                storyboard_id=storyboard.id,
                snapshot_id=snapshot.id,
                row_kind="snapshot",
            )
            session.merge(
                StoryboardRow(
                    id=storyboard.id,
                    mode=storyboard.mode,
                    title=storyboard.title,
                    current_snapshot_id=storyboard.current_snapshot_id,
                    created_at=storyboard.created_at,
                    updated_at=storyboard.updated_at,
                )
            )
        return snapshot

    def _copy_sections_for_snapshot(
        self,
        draft_sections: list[StoryboardSection],
    ) -> tuple[StoryboardSection, ...]:
        copied_sections: list[StoryboardSection] = []
        for draft_section in sorted(draft_sections, key=lambda item: item.order_index):
            section_id = uuid4()
            copied_slots = [
                StoryboardSlot(
                    id=uuid4(),
                    section_id=section_id,
                    slot_type=slot.slot_type,
                    selected_object_type=slot.selected_object_type,
                    selected_object_id=slot.selected_object_id,
                    order_index=slot.order_index,
                    purpose=slot.purpose,
                    is_required=slot.is_required,
                    ai_recommended=slot.ai_recommended,
                )
                for slot in sorted(draft_section.slots, key=lambda item: item.order_index)
            ]
            copied_sections.append(
                StoryboardSection(
                    id=section_id,
                    storyboard_id=draft_section.storyboard_id,
                    title=draft_section.title,
                    summary=draft_section.summary,
                    order_index=draft_section.order_index,
                    slots=copied_slots,
                )
            )
        return tuple(copied_sections)

    def _merge_storyboard_sections(
        self,
        session: Session,
        sections: list[StoryboardSection] | tuple[StoryboardSection, ...],
        *,
        storyboard_id: UUID,
        snapshot_id: UUID | None,
        row_kind: str,
    ) -> None:
        for section in sorted(sections, key=lambda item: item.order_index):
            session.merge(
                StoryboardSectionRow(
                    id=section.id,
                    storyboard_id=storyboard_id,
                    snapshot_id=snapshot_id,
                    row_kind=row_kind,
                    title=section.title,
                    summary=section.summary,
                    order_index=section.order_index,
                )
            )
            for slot in sorted(section.slots, key=lambda item: item.order_index):
                session.merge(
                    StoryboardSlotRow(
                        id=slot.id,
                        section_id=section.id,
                        slot_type=slot.slot_type,
                        selected_object_type=slot.selected_object_type,
                        selected_object_id=slot.selected_object_id,
                        order_index=slot.order_index,
                        purpose=slot.purpose,
                        is_required=slot.is_required,
                        ai_recommended=slot.ai_recommended,
                        metadata_={},
                    )
                )

    def _content_block_variant_id(self, family_id: UUID) -> UUID:
        return uuid5(NAMESPACE_URL, f"boxbrain:content-block-variant:{family_id}")

    def save_embedding(self, embedding: EmbeddingRecord) -> None:
        self.embeddings[embedding.id] = embedding
        vector = self._embedding_vector(embedding)
        with self._session() as session:
            session.merge(
                EmbeddingRow(
                    id=embedding.id,
                    target_type=embedding.target_type,
                    target_id=embedding.target_id,
                    embedding_kind=embedding.embedding_kind,
                    model_name=embedding.model_name,
                    model_version=embedding.model_version,
                    dims=embedding.dims,
                    embedding=list(vector) if vector is not None else None,
                    metadata_=embedding.metadata,
                    created_at=embedding.created_at,
                )
            )

    def _embedding_vector(self, embedding: EmbeddingRecord) -> tuple[float, ...] | None:
        if embedding.dims != DEFAULT_EMBEDDING_DIMS:
            return None
        vector = coerce_embedding_vector(
            embedding.metadata.get("embedding"),
            dims=embedding.dims,
        )
        if vector is not None:
            return vector
        embedding_text = embedding.metadata.get("embeddingText")
        if isinstance(embedding_text, str) and embedding_text.strip():
            return deterministic_text_embedding(embedding_text, dims=embedding.dims)
        return None

    def save_comment(self, comment: Comment) -> None:
        self.comments[comment.id] = comment
        with self._session() as session:
            session.merge(
                CommentRow(
                    id=comment.id,
                    kind=comment.kind,
                    target_type=comment.target_type,
                    target_id=comment.target_id,
                    anchor=comment.anchor,
                    parent_comment_id=comment.parent_comment_id,
                    body=comment.body,
                    status=comment.status,
                    created_at=comment.created_at,
                    updated_at=comment.created_at,
                )
            )

    def save_note(self, note: Note) -> None:
        self.notes[note.id] = note
        with self._session() as session:
            session.merge(
                NoteRow(
                    id=note.id,
                    target_type=note.target_type,
                    target_id=note.target_id,
                    title=note.title,
                    body=note.body,
                    note_type=note.note_type,
                    is_pinned=note.is_pinned,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                )
            )

    def update_work_product_version(self, version: WorkProductVersion) -> None:
        self.work_product_versions[version.id] = version
        with self._session() as session:
            row = session.get(WorkProductVersionRow, version.id)
            if row is not None:
                row.preview_uri = version.preview_uri
                row.approval_state = version.approval_state
                row.restricted = version.restricted
            family = self.work_product_families.get(version.family_id)
            if family is not None:
                family_row = session.get(WorkProductFamilyRow, family.id)
                if family_row is not None:
                    family_row.summary = family.summary
                    family_row.restricted = family.restricted

    def save_review_item(
        self,
        item: ReviewItem,
        *,
        resolved_by: str | None = None,
        resolution_notes: str | None = None,
    ) -> None:
        self.review_items[item.id] = item
        metadata = {
            "source": item.source,
            "compareObjects": item.compare_objects,
            "auditPreview": item.audit_preview,
        }
        if resolved_by is not None:
            metadata["resolvedBy"] = resolved_by
        with self._session() as session:
            session.merge(
                ReviewItemRow(
                    id=item.id,
                    queue_type=item.queue_type,
                    status=item.status,
                    target_refs=item.target_refs,
                    confidence=item.confidence,
                    rationale=item.rationale,
                    suggested_action=item.suggested_action,
                    assigned_to=None,
                    created_by=item.source,
                    created_at=item.created_at,
                    resolved_by=None,
                    resolved_at=item.resolved_at,
                    resolution_notes=resolution_notes,
                    metadata_=metadata,
                )
            )

    def save_similarity_edge(self, edge: SimilarityEdge) -> None:
        self.similarity_edges[edge.id] = edge
        with self._session() as session:
            session.merge(
                SimilarityEdgeRow(
                    id=edge.id,
                    source_object_type="content_unit_version",
                    source_object_id=edge.source_version_id,
                    target_object_type="content_unit_version",
                    target_object_id=edge.target_version_id,
                    similarity_type="hybrid",
                    score=edge.score,
                    created_by=edge.confirmed_by or "ai",
                    explanation=edge.rationale,
                    metadata_={},
                    created_at=edge.created_at,
                )
            )

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
    ) -> AuditEvent:
        event = AuditEvent(
            id=uuid4(),
            action=action,
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            prior_state=prior_state,
            new_state=new_state,
            reason=reason,
            metadata=metadata or {},
            created_at=now_utc(),
        )
        self.audit_events.append(event)
        with self._session() as session:
            row_metadata: dict[str, Any] = dict(event.metadata)
            row_metadata["actorId"] = actor_id
            if reason is not None:
                row_metadata["reason"] = reason
            session.add(
                AuditEventRow(
                    id=event.id,
                    action=event.action,
                    actor_id=None,
                    target_type=event.target_type,
                    target_id=event.target_id,
                    prior_state=event.prior_state,
                    new_state=event.new_state,
                    metadata_=row_metadata,
                    created_at=event.created_at,
                )
            )
        return event

    @contextmanager
    def _session(self) -> Iterator[Session]:
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
