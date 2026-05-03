from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.domain.models import (
    AuditEvent,
    ContentUnitFamily,
    ContentUnitVariant,
    ContentUnitVersion,
    EmbeddingRecord,
    IngestionJob,
    ProvenanceRecord,
    StoredObject,
    WorkProductFamily,
    WorkProductVersion,
    now_utc,
)
from app.infrastructure.db_models import (
    AuditEventRow,
    ContentUnitFamilyRow,
    ContentUnitVariantRow,
    ContentUnitVersionRow,
    EmbeddingRow,
    IngestionJobRow,
    ProvenanceRecordRow,
    StoredObjectRow,
    WorkProductFamilyRow,
    WorkProductVariantRow,
    WorkProductVersionRow,
)
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository


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
                    created_at=row.created_at,
                )
                for row in session.scalars(select(AuditEventRow))
            ]
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

    def save_embedding(self, embedding: EmbeddingRecord) -> None:
        self.embeddings[embedding.id] = embedding
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
                    metadata_=embedding.metadata,
                    created_at=embedding.created_at,
                )
            )

    def update_work_product_version(self, version: WorkProductVersion) -> None:
        self.work_product_versions[version.id] = version
        with self._session() as session:
            row = session.get(WorkProductVersionRow, version.id)
            if row is not None:
                row.preview_uri = version.preview_uri
            family = self.work_product_families.get(version.family_id)
            if family is not None:
                family_row = session.get(WorkProductFamilyRow, family.id)
                if family_row is not None:
                    family_row.summary = family.summary

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
