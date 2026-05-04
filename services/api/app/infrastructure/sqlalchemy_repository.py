from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
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
    ContentUnitFamily,
    ContentUnitVariant,
    ContentUnitVersion,
    EmbeddingRecord,
    IngestionJob,
    Note,
    ProvenanceRecord,
    StoredObject,
    WorkProductFamily,
    WorkProductVersion,
    now_utc,
)
from app.infrastructure.db_models import (
    AuditEventRow,
    CommentRow,
    ContentUnitFamilyRow,
    ContentUnitVariantRow,
    ContentUnitVersionRow,
    EmbeddingRow,
    IngestionJobRow,
    NoteRow,
    ProvenanceRecordRow,
    StoredObjectRow,
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


def build_hybrid_search_sql(
    *,
    include_content_units: bool,
    include_work_products: bool,
    include_restricted: bool,
) -> str:
    restricted_content_unit_filter = (
        "TRUE" if include_restricted else "NOT (content_unit.family_restricted OR content_unit.version_restricted)"
    )
    restricted_work_product_filter = (
        "TRUE"
        if include_restricted
        else "NOT (work_product.family_restricted OR work_product.version_restricted)"
    )
    content_unit_enabled = "TRUE" if include_content_units else "FALSE"
    work_product_enabled = "TRUE" if include_work_products else "FALSE"
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
combined AS (
  SELECT * FROM content_unit
  UNION ALL
  SELECT * FROM work_product
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
            for row in sorted(content_unit_rows, key=lambda item: item.source_order_index or 0):
                if row.source_work_product_version_id is not None:
                    filmstrip_by_work_product.setdefault(row.source_work_product_version_id, []).append(row.id)
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
        if not include_content_units and not include_work_products:
            return []

        query_text = query.text.strip()
        query_embedding = deterministic_text_embedding(query_text, dims=DEFAULT_EMBEDDING_DIMS)
        sql = build_hybrid_search_sql(
            include_content_units=include_content_units,
            include_work_products=include_work_products,
            include_restricted=include_restricted,
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
        self.stored_objects[stored_object.id] = stored_object
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
                    row.is_canonical = variant.is_canonical
                    row.latest_version_id = variant.latest_version_id

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
