from __future__ import annotations

import hashlib
import json
import sys
from collections.abc import Callable
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import get_settings
from app.domain.ingestion_search import (
    DEFAULT_EMBEDDING_DIMS,
    coerce_embedding_vector,
    deterministic_text_embedding,
)
from app.domain.models import (
    AuditEvent,
    Comment,
    ContentBlockMember,
    ContentBlockVersion,
    ContentUnitVersion,
    EmbeddingRecord,
    IngestionJob,
    Note,
    ProvenanceRecord,
    ReviewItem,
    SimilarityEdge,
    StoredObject,
    StoryboardSection,
    StoryboardSlot,
    StoryboardSnapshot,
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
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository, SEED_IDS


SessionFactory = Callable[[], Session]

SEED_NAMESPACE = uuid5(NAMESPACE_URL, "boxbrain:v2:database-seed")
STATIC_SEED_IDS = set(SEED_IDS.values())


def seed_database(session_factory: SessionFactory) -> dict[str, int]:
    """Persist the deterministic demo fixture graph into PostgreSQL.

    The in-memory seed contains a few ``uuid4()`` identifiers. This module maps those
    fixture-only IDs to UUIDv5 values derived from stable object content so repeated
    CLI runs upsert the same rows instead of appending duplicates. Domain IDs already
    listed in ``SEED_IDS`` are preserved as-is.
    """

    seed = InMemoryBoxBrainRepository(seed=True)
    id_map = _build_id_map(seed)
    counts: dict[str, int] = {}
    session = session_factory()
    try:
        _merge_provenance_records(session, seed, id_map, counts)
        _merge_stored_objects(session, seed, id_map, counts)
        # Work products before content units: content_unit_versions.source_work_product_version_id
        # is an FK into work_product_versions (used to reconstruct filmstrips on reload), so the
        # referenced work-product rows must exist before the content-unit inserts autoflush.
        _merge_work_products(session, seed, id_map, counts)
        _merge_content_units(session, seed, id_map, counts)
        _merge_content_blocks(session, seed, id_map, counts)
        _merge_storyboards(session, seed, id_map, counts)
        _merge_similarity_edges(session, seed, id_map, counts)
        _merge_embeddings(session, seed, id_map, counts)
        _merge_review_items(session, seed, id_map, counts)
        _merge_comments(session, seed, id_map, counts)
        _merge_notes(session, seed, id_map, counts)
        _merge_ingestion_jobs(session, seed, id_map, counts)
        _merge_audit_events(session, seed, id_map, counts)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
    return counts


def _merge_provenance_records(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for provenance in seed.provenance_records.values():
        session.merge(
            ProvenanceRecordRow(
                id=_mapped_id(provenance.id, id_map),
                origin_type=provenance.origin_type,
                source_system=provenance.source_system,
                parent_refs=_map_refs(provenance.parent_refs, id_map),
                source_refs=provenance.source_refs,
                model_info=provenance.model_info,
                pipeline_version=provenance.pipeline_version,
                metadata_={},
                created_at=provenance.created_at,
            )
        )
    _set_count(counts, "provenance_records", len(seed.provenance_records))


def _merge_stored_objects(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for stored_object in seed.stored_objects.values():
        session.merge(
            StoredObjectRow(
                id=_mapped_id(stored_object.id, id_map),
                object_type=stored_object.object_type,
                storage_uri=stored_object.storage_uri,
                mime_type=stored_object.mime_type,
                byte_size=stored_object.byte_size,
                sha256=stored_object.sha256,
                metadata_=stored_object.metadata,
                created_at=stored_object.created_at,
            )
        )
    _set_count(counts, "stored_objects", len(seed.stored_objects))


def _merge_content_units(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for family in seed.content_unit_families.values():
        session.merge(
            ContentUnitFamilyRow(
                id=_mapped_id(family.id, id_map),
                family_title=family.family_title,
                conceptual_summary=family.conceptual_summary,
                unit_type=family.unit_type,
                restricted=family.restricted,
                taxonomy=family.taxonomy,
            )
        )
    _set_count(counts, "content_unit_families", len(seed.content_unit_families))

    for variant in seed.content_unit_variants.values():
        session.merge(
            ContentUnitVariantRow(
                id=_mapped_id(variant.id, id_map),
                family_id=_mapped_id(variant.family_id, id_map),
                variant_label=variant.variant_label,
                variant_type=variant.variant_type,
                variant_dimensions=variant.variant_dimensions,
                is_canonical=variant.is_canonical,
                linked_by=variant.linked_by,
                linked_confidence=variant.linked_confidence,
                latest_version_id=_map_optional_id(variant.latest_version_id, id_map),
            )
        )
    _set_count(counts, "content_unit_variants", len(seed.content_unit_variants))

    filmstrip_map = _build_filmstrip_map(seed)
    for version in seed.content_unit_versions.values():
        session.merge(_content_unit_version_row(version, id_map, filmstrip_map))
    _set_count(counts, "content_unit_versions", len(seed.content_unit_versions))


def _merge_work_products(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for family in seed.work_product_families.values():
        session.merge(
            WorkProductFamilyRow(
                id=_mapped_id(family.id, id_map),
                title=family.title,
                artifact_type=family.artifact_type,
                summary=family.summary,
                restricted=family.restricted,
                taxonomy={},
            )
        )
    _set_count(counts, "work_product_families", len(seed.work_product_families))

    for version in seed.work_product_versions.values():
        variant_id = _work_product_variant_id(version.family_id)
        session.merge(
            WorkProductVariantRow(
                id=variant_id,
                family_id=_mapped_id(version.family_id, id_map),
                variant_label="Imported source",
                variant_type="source",
                variant_dimensions={},
                is_canonical=True,
                latest_version_id=_mapped_id(version.id, id_map),
            )
        )
    _set_count(counts, "work_product_variants", len(seed.work_product_versions))

    for version in seed.work_product_versions.values():
        session.merge(
            WorkProductVersionRow(
                id=_mapped_id(version.id, id_map),
                variant_id=_work_product_variant_id(version.family_id),
                version_number=version.version_number,
                approval_state=version.approval_state,
                freshness_state="fresh",
                provenance_id=_mapped_id(version.provenance_id, id_map),
                original_object_id=None,
                preview_uri=version.preview_uri,
                extracted_text=None,
                summary=version.title,
                restricted=version.restricted,
            )
        )
    _set_count(counts, "work_product_versions", len(seed.work_product_versions))


def _merge_content_blocks(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    member_count = 0
    for block in seed.content_blocks.values():
        variant_id = _content_block_variant_id(block.family_id)
        session.merge(
            ContentBlockFamilyRow(
                id=_mapped_id(block.family_id, id_map),
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
                family_id=_mapped_id(block.family_id, id_map),
                variant_label="Canonical",
                variant_type=block.block_type,
                is_canonical=True,
                linked_by="manual",
                linked_confidence=1.0,
                latest_version_id=_mapped_id(block.id, id_map),
                created_at=block.created_at,
                updated_at=block.created_at,
            )
        )
        session.merge(
            ContentBlockVersionRow(
                id=_mapped_id(block.id, id_map),
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
            delete(ContentBlockMemberRow).where(
                ContentBlockMemberRow.block_version_id == _mapped_id(block.id, id_map)
            )
        )
        for member in sorted(block.members, key=lambda item: item.order_index):
            session.merge(_content_block_member_row(block, member, id_map))
            member_count += 1

    _set_count(counts, "content_block_families", len(seed.content_blocks))
    _set_count(counts, "content_block_variants", len(seed.content_blocks))
    _set_count(counts, "content_block_versions", len(seed.content_blocks))
    _set_count(counts, "content_block_members", member_count)


def _merge_storyboards(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    section_count = 0
    slot_count = 0
    for storyboard in seed.storyboards.values():
        session.merge(
            StoryboardRow(
                id=_mapped_id(storyboard.id, id_map),
                mode=storyboard.mode,
                parent_type=None,
                parent_id=None,
                title=storyboard.title,
                current_snapshot_id=_map_optional_id(storyboard.current_snapshot_id, id_map),
                created_by=None,
                created_at=storyboard.created_at,
                updated_at=storyboard.updated_at,
            )
        )
        session.execute(
            delete(StoryboardSectionRow).where(
                StoryboardSectionRow.storyboard_id == _mapped_id(storyboard.id, id_map),
                StoryboardSectionRow.row_kind == "draft",
            )
        )
        added_sections, added_slots = _merge_storyboard_sections(
            session,
            storyboard.draft_sections,
            storyboard_id=storyboard.id,
            snapshot_id=None,
            row_kind="draft",
            id_map=id_map,
        )
        section_count += added_sections
        slot_count += added_slots

    snapshot_section_count, snapshot_slot_count = _merge_storyboard_snapshots(
        session, seed, id_map, counts
    )
    section_count += snapshot_section_count
    slot_count += snapshot_slot_count

    _set_count(counts, "storyboards", len(seed.storyboards))
    _set_count(counts, "storyboard_sections", section_count)
    _set_count(counts, "storyboard_slots", slot_count)


def _merge_storyboard_snapshots(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> tuple[int, int]:
    section_count = 0
    slot_count = 0
    for snapshot in seed.storyboard_snapshots.values():
        session.merge(
            StoryboardSnapshotRow(
                id=_mapped_id(snapshot.id, id_map),
                storyboard_id=_mapped_id(snapshot.storyboard_id, id_map),
                version_label=snapshot.version_label,
                derived_from_snapshot_id=None,
                approval_state=snapshot.approval_state,
                narrative_score=snapshot.narrative_score,
                created_by=None,
                created_at=snapshot.created_at,
            )
        )
        session.execute(
            delete(StoryboardSectionRow).where(
                StoryboardSectionRow.snapshot_id == _mapped_id(snapshot.id, id_map)
            )
        )
        added_sections, added_slots = _merge_storyboard_sections(
            session,
            snapshot.sections,
            storyboard_id=snapshot.storyboard_id,
            snapshot_id=snapshot.id,
            row_kind="snapshot",
            id_map=id_map,
        )
        section_count += added_sections
        slot_count += added_slots

    _set_count(counts, "storyboard_snapshots", len(seed.storyboard_snapshots))
    return section_count, slot_count


def _merge_similarity_edges(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for edge in seed.similarity_edges.values():
        session.merge(
            SimilarityEdgeRow(
                id=_mapped_id(edge.id, id_map),
                source_object_type="content_unit_version",
                source_object_id=_mapped_id(edge.source_version_id, id_map),
                target_object_type="content_unit_version",
                target_object_id=_mapped_id(edge.target_version_id, id_map),
                similarity_type="hybrid",
                score=edge.score,
                created_by=edge.confirmed_by or "ai",
                explanation=edge.rationale,
                metadata_={},
                created_at=edge.created_at,
            )
        )
    _set_count(counts, "similarity_edges", len(seed.similarity_edges))


def _merge_embeddings(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for embedding in seed.embeddings.values():
        session.merge(
            EmbeddingRow(
                id=_mapped_id(embedding.id, id_map),
                target_type=embedding.target_type,
                target_id=_mapped_id(embedding.target_id, id_map),
                embedding_kind=embedding.embedding_kind,
                model_name=embedding.model_name,
                model_version=embedding.model_version,
                dims=embedding.dims,
                embedding=_embedding_vector(embedding),
                metadata_=embedding.metadata,
                created_at=embedding.created_at,
            )
        )
    _set_count(counts, "embeddings", len(seed.embeddings))


def _merge_review_items(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for item in seed.review_items.values():
        session.merge(
            ReviewItemRow(
                id=_mapped_id(item.id, id_map),
                queue_type=item.queue_type,
                status=item.status,
                target_refs=_map_refs(item.target_refs, id_map),
                confidence=item.confidence,
                rationale=item.rationale,
                suggested_action=item.suggested_action,
                assigned_to=None,
                created_by=item.source,
                created_at=item.created_at,
                resolved_by=None,
                resolved_at=item.resolved_at,
                resolution_notes=None,
                metadata_={
                    "source": item.source,
                    "compareObjects": _map_refs(item.compare_objects, id_map),
                    "auditPreview": item.audit_preview,
                },
            )
        )
    _set_count(counts, "review_items", len(seed.review_items))


def _merge_comments(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for comment in seed.comments.values():
        session.merge(
            CommentRow(
                id=_mapped_id(comment.id, id_map),
                kind=comment.kind,
                target_type=comment.target_type,
                target_id=_mapped_id(comment.target_id, id_map),
                anchor=comment.anchor,
                parent_comment_id=_map_optional_id(comment.parent_comment_id, id_map),
                body=comment.body,
                status=comment.status,
                created_at=comment.created_at,
                updated_at=comment.created_at,
            )
        )
    _set_count(counts, "comments", len(seed.comments))


def _merge_notes(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for note in seed.notes.values():
        session.merge(
            NoteRow(
                id=_mapped_id(note.id, id_map),
                target_type=note.target_type,
                target_id=_mapped_id(note.target_id, id_map),
                title=note.title,
                body=note.body,
                note_type=note.note_type,
                is_pinned=note.is_pinned,
                created_at=note.created_at,
                updated_at=note.updated_at,
            )
        )
    _set_count(counts, "notes", len(seed.notes))


def _merge_ingestion_jobs(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for job in seed.ingestion_jobs.values():
        metadata = dict(job.upload_metadata)
        metadata["artifactType"] = job.artifact_type
        metadata["title"] = job.title
        metadata["retryCount"] = job.retry_count
        session.merge(
            IngestionJobRow(
                id=_mapped_id(job.id, id_map),
                status=job.status,
                stage=job.stage,
                original_object_id=_map_optional_id(job.original_object_id, id_map),
                work_product_version_id=_map_optional_id(job.work_product_version_id, id_map),
                error_code=job.error_code,
                error_message=job.error_message,
                metadata_=metadata,
                created_at=job.created_at,
                updated_at=job.updated_at,
                completed_at=job.completed_at,
            )
        )
    _set_count(counts, "ingestion_jobs", len(seed.ingestion_jobs))


def _merge_audit_events(
    session: Session,
    seed: InMemoryBoxBrainRepository,
    id_map: dict[UUID, UUID],
    counts: dict[str, int],
) -> None:
    for event in seed.audit_events:
        metadata = dict(event.metadata)
        metadata["actorId"] = event.actor_id
        if event.reason is not None:
            metadata["reason"] = event.reason
        session.merge(
            AuditEventRow(
                id=_mapped_id(event.id, id_map),
                action=event.action,
                actor_id=None,
                target_type=event.target_type,
                target_id=_mapped_id(event.target_id, id_map),
                prior_state=event.prior_state,
                new_state=event.new_state,
                metadata_=metadata,
                created_at=event.created_at,
            )
        )
    _set_count(counts, "audit_events", len(seed.audit_events))


def _build_filmstrip_map(
    seed: InMemoryBoxBrainRepository,
) -> dict[UUID, tuple[UUID, int]]:
    """Map each content-unit version id to the (work-product-version id, order) it
    appears at in a work product's filmstrip. ``reload()`` reconstructs
    ``filmstrip_version_ids`` by grouping content-unit versions on
    ``source_work_product_version_id`` (ordered by ``source_order_index``), so these
    two columns must be seeded for work-product filmstrips and content-unit
    where-used references to survive a database-mode reload.
    """
    filmstrip: dict[UUID, tuple[UUID, int]] = {}
    for work_product in seed.work_product_versions.values():
        for order_index, version_id in enumerate(work_product.filmstrip_version_ids):
            filmstrip[version_id] = (work_product.id, order_index)
    return filmstrip


def _content_unit_version_row(
    version: ContentUnitVersion,
    id_map: dict[UUID, UUID],
    filmstrip_map: dict[UUID, tuple[UUID, int]],
) -> ContentUnitVersionRow:
    extracted_text = version.extracted_text or ""
    filmstrip_entry = filmstrip_map.get(version.id)
    if filmstrip_entry is not None:
        source_work_product_version_id: UUID | None = _mapped_id(filmstrip_entry[0], id_map)
        source_order_index = filmstrip_entry[1]
    else:
        source_work_product_version_id = None
        source_order_index = version.source_order_index or 0
    return ContentUnitVersionRow(
        id=_mapped_id(version.id, id_map),
        variant_id=_mapped_id(version.variant_id, id_map),
        version_number=version.version_number,
        render_uri=version.render_uri,
        thumbnail_uri=version.thumbnail_uri,
        extracted_text=version.extracted_text,
        summary=version.summary,
        speaker_notes=version.speaker_notes,
        restricted=version.restricted,
        source_work_product_version_id=source_work_product_version_id,
        source_order_index=source_order_index,
        text_hash=hashlib.sha256(extracted_text.encode("utf-8")).hexdigest(),
        visual_hash=None,
        provenance_id=_mapped_id(version.provenance_id, id_map),
        approval_state=version.approval_state,
        freshness_state=version.freshness_state,
        quality_score=version.quality_score,
        usage_score=version.usage_score,
        created_at=version.created_at,
    )


def _content_block_member_row(
    block: ContentBlockVersion,
    member: ContentBlockMember,
    id_map: dict[UUID, UUID],
) -> ContentBlockMemberRow:
    return ContentBlockMemberRow(
        id=_mapped_id(member.id, id_map),
        block_version_id=_mapped_id(block.id, id_map),
        member_type=member.member_type,
        member_id=_mapped_id(member.member_id, id_map),
        order_index=member.order_index,
        role=member.role,
        is_required=member.is_required,
        notes=member.notes,
    )


def _merge_storyboard_sections(
    session: Session,
    sections: list[StoryboardSection] | tuple[StoryboardSection, ...],
    *,
    storyboard_id: UUID,
    snapshot_id: UUID | None,
    row_kind: str,
    id_map: dict[UUID, UUID],
) -> tuple[int, int]:
    section_count = 0
    slot_count = 0
    for section in sorted(sections, key=lambda item: item.order_index):
        session.merge(
            StoryboardSectionRow(
                id=_mapped_id(section.id, id_map),
                storyboard_id=_mapped_id(storyboard_id, id_map),
                snapshot_id=_map_optional_id(snapshot_id, id_map),
                row_kind=row_kind,
                title=section.title,
                summary=section.summary,
                order_index=section.order_index,
                section_type=None,
                estimated_read_time_minutes=None,
            )
        )
        section_count += 1
        for slot in sorted(section.slots, key=lambda item: item.order_index):
            session.merge(
                StoryboardSlotRow(
                    id=_mapped_id(slot.id, id_map),
                    section_id=_mapped_id(section.id, id_map),
                    slot_type=slot.slot_type,
                    selected_object_type=slot.selected_object_type,
                    selected_object_id=_map_optional_id(slot.selected_object_id, id_map),
                    order_index=slot.order_index,
                    purpose=slot.purpose,
                    is_required=slot.is_required,
                    ai_recommended=slot.ai_recommended,
                    metadata_={},
                )
            )
            slot_count += 1
    return section_count, slot_count


def _build_id_map(seed: InMemoryBoxBrainRepository) -> dict[UUID, UUID]:
    id_map: dict[UUID, UUID] = {}

    for provenance in seed.provenance_records.values():
        _add_stable_id(id_map, provenance.id, _provenance_key(provenance))
    for stored_object in seed.stored_objects.values():
        _add_stable_id(id_map, stored_object.id, _stored_object_key(stored_object))
    for block in seed.content_blocks.values():
        for member in block.members:
            _add_stable_id(id_map, member.id, _member_key(block, member))
    for storyboard in seed.storyboards.values():
        _add_storyboard_section_ids(id_map, storyboard.draft_sections, "draft")
    for snapshot in seed.storyboard_snapshots.values():
        _add_stable_id(id_map, snapshot.id, _snapshot_key(snapshot))
        _add_storyboard_section_ids(id_map, snapshot.sections, f"snapshot:{snapshot.id}")
    for comment in seed.comments.values():
        _add_stable_id(id_map, comment.id, _comment_key(comment))
    for note in seed.notes.values():
        _add_stable_id(id_map, note.id, _note_key(note))
    for item in seed.review_items.values():
        _add_stable_id(id_map, item.id, _review_item_key(item))
    for job in seed.ingestion_jobs.values():
        _add_stable_id(id_map, job.id, _ingestion_job_key(job))
    for edge in seed.similarity_edges.values():
        _add_stable_id(id_map, edge.id, _similarity_edge_key(edge))
    for embedding in seed.embeddings.values():
        _add_stable_id(id_map, embedding.id, _embedding_key(embedding))
    for event in seed.audit_events:
        _add_stable_id(id_map, event.id, _audit_event_key(event))

    return id_map


def _add_storyboard_section_ids(
    id_map: dict[UUID, UUID],
    sections: list[StoryboardSection] | tuple[StoryboardSection, ...],
    section_scope: str,
) -> None:
    for section in sections:
        _add_stable_id(id_map, section.id, _section_key(section, section_scope))
        for slot in section.slots:
            _add_stable_id(id_map, slot.id, _slot_key(section, slot, section_scope))


def _add_stable_id(id_map: dict[UUID, UUID], source_id: UUID, key: str) -> None:
    id_map[source_id] = source_id if source_id in STATIC_SEED_IDS else uuid5(SEED_NAMESPACE, key)


def _mapped_id(value: UUID, id_map: dict[UUID, UUID]) -> UUID:
    return id_map.get(value, value)


def _map_optional_id(value: UUID | None, id_map: dict[UUID, UUID]) -> UUID | None:
    return _mapped_id(value, id_map) if value is not None else None


def _map_refs(value: Any, id_map: dict[UUID, UUID]) -> Any:
    if isinstance(value, list):
        return [_map_refs(item, id_map) for item in value]
    if isinstance(value, tuple):
        return [_map_refs(item, id_map) for item in value]
    if isinstance(value, dict):
        mapped: dict[str, Any] = {}
        for key, item in value.items():
            if key in {"id", "versionId"} and isinstance(item, str):
                mapped[key] = _map_uuid_string(item, id_map)
            else:
                mapped[key] = _map_refs(item, id_map)
        return mapped
    return value


def _map_uuid_string(value: str, id_map: dict[UUID, UUID]) -> str:
    try:
        parsed = UUID(value)
    except ValueError:
        return value
    return str(_mapped_id(parsed, id_map))


def _set_count(counts: dict[str, int], table_name: str, count: int) -> None:
    if count:
        counts[table_name] = count


def _work_product_variant_id(family_id: UUID) -> UUID:
    return uuid5(NAMESPACE_URL, f"boxbrain:work-product-variant:{family_id}")


def _content_block_variant_id(family_id: UUID) -> UUID:
    return uuid5(NAMESPACE_URL, f"boxbrain:content-block-variant:{family_id}")


def _embedding_vector(embedding: EmbeddingRecord) -> list[float] | None:
    if embedding.dims != DEFAULT_EMBEDDING_DIMS:
        return None
    vector = coerce_embedding_vector(embedding.metadata.get("embedding"), dims=embedding.dims)
    if vector is not None:
        return list(vector)
    embedding_text = embedding.metadata.get("embeddingText")
    if isinstance(embedding_text, str) and embedding_text.strip():
        return list(deterministic_text_embedding(embedding_text, dims=embedding.dims))
    return None


def _stable_key(kind: str, payload: dict[str, Any]) -> str:
    return f"{kind}:{json.dumps(payload, sort_keys=True, default=str, separators=(',', ':'))}"


def _provenance_key(provenance: ProvenanceRecord) -> str:
    return _stable_key(
        "provenance",
        {
            "originType": provenance.origin_type,
            "sourceSystem": provenance.source_system,
            "parentRefs": provenance.parent_refs,
            "sourceRefs": provenance.source_refs,
            "modelInfo": provenance.model_info,
            "pipelineVersion": provenance.pipeline_version,
            "createdAt": provenance.created_at,
        },
    )


def _stored_object_key(stored_object: StoredObject) -> str:
    return _stable_key(
        "stored_object",
        {
            "objectType": stored_object.object_type,
            "storageUri": stored_object.storage_uri,
            "metadata": stored_object.metadata,
        },
    )


def _member_key(block: ContentBlockVersion, member: ContentBlockMember) -> str:
    return _stable_key(
        "content_block_member",
        {
            "blockId": block.id,
            "memberType": member.member_type,
            "memberId": member.member_id,
            "orderIndex": member.order_index,
            "role": member.role,
        },
    )


def _snapshot_key(snapshot: StoryboardSnapshot) -> str:
    return _stable_key(
        "storyboard_snapshot",
        {
            "storyboardId": snapshot.storyboard_id,
            "versionLabel": snapshot.version_label,
            "createdAt": snapshot.created_at,
        },
    )


def _section_key(section: StoryboardSection, section_scope: str) -> str:
    return _stable_key(
        "storyboard_section",
        {
            "scope": section_scope,
            "storyboardId": section.storyboard_id,
            "orderIndex": section.order_index,
            "title": section.title,
        },
    )


def _slot_key(section: StoryboardSection, slot: StoryboardSlot, section_scope: str) -> str:
    return _stable_key(
        "storyboard_slot",
        {
            "scope": section_scope,
            "sectionId": section.id,
            "orderIndex": slot.order_index,
            "purpose": slot.purpose,
            "selectedObjectId": slot.selected_object_id,
        },
    )


def _comment_key(comment: Comment) -> str:
    return _stable_key(
        "comment",
        {
            "kind": comment.kind,
            "targetType": comment.target_type,
            "targetId": comment.target_id,
            "body": comment.body,
            "createdAt": comment.created_at,
        },
    )


def _note_key(note: Note) -> str:
    return _stable_key(
        "note",
        {
            "targetType": note.target_type,
            "targetId": note.target_id,
            "title": note.title,
            "body": note.body,
            "createdAt": note.created_at,
        },
    )


def _review_item_key(item: ReviewItem) -> str:
    return _stable_key(
        "review_item",
        {
            "queueType": item.queue_type,
            "targetRefs": item.target_refs,
            "suggestedAction": item.suggested_action,
        },
    )


def _ingestion_job_key(job: IngestionJob) -> str:
    return _stable_key(
        "ingestion_job",
        {
            "workProductVersionId": job.work_product_version_id,
            "title": job.title,
            "uploadMetadata": job.upload_metadata,
        },
    )


def _similarity_edge_key(edge: SimilarityEdge) -> str:
    return _stable_key(
        "similarity_edge",
        {
            "sourceVersionId": edge.source_version_id,
            "targetVersionId": edge.target_version_id,
            "score": edge.score,
        },
    )


def _embedding_key(embedding: EmbeddingRecord) -> str:
    return _stable_key(
        "embedding",
        {
            "targetType": embedding.target_type,
            "targetId": embedding.target_id,
            "embeddingKind": embedding.embedding_kind,
            "modelName": embedding.model_name,
        },
    )


def _audit_event_key(event: AuditEvent) -> str:
    return _stable_key(
        "audit_event",
        {
            "action": event.action,
            "targetType": event.target_type,
            "targetId": event.target_id,
            "createdAt": event.created_at,
        },
    )


def main() -> int:
    settings = get_settings()
    if settings.repository_mode != "database":
        print("Refusing to seed: BOXBRAIN_REPOSITORY must be set to 'database'.")
        return 1

    from app.infrastructure.database import SessionLocal

    counts = seed_database(SessionLocal)
    print("Seeded BoxBrain demo fixture graph:")
    for table_name in sorted(counts):
        print(f"  {table_name}: {counts[table_name]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
