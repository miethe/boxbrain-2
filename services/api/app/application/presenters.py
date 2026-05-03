from __future__ import annotations

from typing import Literal, cast
from uuid import UUID

from app.domain import models as d
from app.schemas import api as s


def taxonomy_model(taxonomy: d.Taxonomy) -> s.Taxonomy:
    model_fields = getattr(s.Taxonomy, "model_fields", None)
    if model_fields is None:
        model_fields = getattr(s.Taxonomy, "__fields__", {})
    return s.Taxonomy(**{key: value for key, value in taxonomy.items() if key in model_fields})


def provenance_model(record: d.ProvenanceRecord) -> s.ProvenanceRecord:
    return s.ProvenanceRecord(
        id=record.id,
        originType=record.origin_type,
        sourceSystem=record.source_system,
        parentRefs=record.parent_refs,
        sourceRefs=record.source_refs,
        modelInfo=record.model_info,
        pipelineVersion=record.pipeline_version,
        createdAt=record.created_at,
    )


def ingestion_job_model(job: d.IngestionJob) -> s.IngestionJob:
    summary = _ingestion_output_summary(job)
    return s.IngestionJob(
        id=job.id,
        status=cast(Literal["queued", "running", "failed", "complete"], job.status),
        stage=job.stage,
        artifactType=job.artifact_type,
        title=job.title,
        originalObjectId=job.original_object_id,
        workProductVersionId=job.work_product_version_id,
        uploadMetadata=job.upload_metadata,
        outputSummary=summary,
        stageTelemetry=dict(job.upload_metadata.get("stageTelemetry") or {}),
        errorCode=job.error_code,
        errorMessage=job.error_message,
        retryCount=job.retry_count,
        createdAt=job.created_at,
        updatedAt=job.updated_at,
        completedAt=job.completed_at,
    )


def content_unit_status(
    family: d.ContentUnitFamily,
    variant: d.ContentUnitVariant | None,
    version: d.ContentUnitVersion | None,
) -> s.StatusChips:
    return s.StatusChips(
        approvalState=cast(s.ApprovalState, version.approval_state if version else "draft"),
        freshnessState=cast(s.FreshnessState, version.freshness_state if version else "fresh"),
        isCanonical=variant.is_canonical if variant else False,
        isRestricted=family.restricted or bool(version and version.restricted),
        linkSource=cast(s.LinkSource, variant.linked_by if variant else "manual"),
    )


def content_unit_version_model(version: d.ContentUnitVersion) -> s.ContentUnitVersion:
    return s.ContentUnitVersion(
        id=version.id,
        variantId=version.variant_id,
        versionNumber=version.version_number,
        renderUri=version.render_uri,
        thumbnailUri=version.thumbnail_uri,
        summary=version.summary,
        approvalState=cast(s.ApprovalState, version.approval_state),
        freshnessState=cast(s.FreshnessState, version.freshness_state),
        qualityScore=version.quality_score,
        usageScore=version.usage_score,
        sourceOrderIndex=version.source_order_index,
        createdAt=version.created_at,
    )


def _ingestion_output_summary(job: d.IngestionJob) -> s.IngestionOutputSummary | None:
    raw = job.upload_metadata.get("outputSummary")
    if not isinstance(raw, dict):
        return None
    created_ids = []
    for value in raw.get("createdContentUnitVersionIds", []):
        try:
            created_ids.append(UUID(str(value)))
        except ValueError:
            continue
    work_product_version_id = raw.get("workProductVersionId") or job.work_product_version_id
    return s.IngestionOutputSummary(
        slideCount=int(raw.get("slideCount") or job.upload_metadata.get("slideCount") or 0),
        renderCount=int(raw.get("renderCount") or 0),
        embeddingCount=int(raw.get("embeddingCount") or 0),
        createdContentUnitVersionIds=created_ids,
        workProductVersionId=UUID(str(work_product_version_id)) if work_product_version_id else None,
        warnings=[str(value) for value in raw.get("warnings", [])],
    )


def content_unit_variant_model(
    variant: d.ContentUnitVariant,
    latest_version: d.ContentUnitVersion | None,
) -> s.ContentUnitVariant:
    return s.ContentUnitVariant(
        id=variant.id,
        familyId=variant.family_id,
        variantLabel=variant.variant_label,
        variantType=variant.variant_type,
        variantDimensions=variant.variant_dimensions,
        isCanonical=variant.is_canonical,
        linkedBy=cast(s.LinkSource, variant.linked_by),
        linkedConfidence=variant.linked_confidence,
        latestVersionId=variant.latest_version_id,
        latestVersion=content_unit_version_model(latest_version) if latest_version else None,
    )


def content_unit_family_card(
    family: d.ContentUnitFamily,
    variants: list[d.ContentUnitVariant],
    versions_by_variant: dict[UUID, list[d.ContentUnitVersion]],
) -> s.ContentUnitFamilyCard:
    canonical_variant = next((variant for variant in variants if variant.is_canonical), None)
    latest_version = None
    if canonical_variant and canonical_variant.latest_version_id:
        latest_version = next(
            (
                version
                for version in versions_by_variant.get(canonical_variant.id, [])
                if version.id == canonical_variant.latest_version_id
            ),
            None,
        )
    version_count = sum(len(versions) for versions in versions_by_variant.values())
    return s.ContentUnitFamilyCard(
        id=family.id,
        familyTitle=family.family_title,
        conceptualSummary=family.conceptual_summary,
        unitType=family.unit_type,
        canonicalPreviewUri=latest_version.thumbnail_uri if latest_version else None,
        variantCount=len(variants),
        versionCount=version_count,
        taxonomy=taxonomy_model(family.taxonomy),
        statusChips=content_unit_status(family, canonical_variant, latest_version),
    )


def content_unit_family_detail(
    family: d.ContentUnitFamily,
    variants: list[d.ContentUnitVariant],
    versions_by_variant: dict[UUID, list[d.ContentUnitVersion]],
    notes: list[d.Note],
) -> s.ContentUnitFamilyDetail:
    card = content_unit_family_card(family, variants, versions_by_variant)
    variant_models = [
        content_unit_variant_model(
            variant,
            next(
                (
                    version
                    for version in versions_by_variant.get(variant.id, [])
                    if version.id == variant.latest_version_id
                ),
                None,
            ),
        )
        for variant in variants
    ]
    return s.ContentUnitFamilyDetail(
        **card.model_dump(),
        variants=variant_models,
        notes=[note_model(note) for note in notes],
    )


def content_unit_version_detail(
    version: d.ContentUnitVersion,
    provenance: d.ProvenanceRecord,
    comments: list[d.Comment],
    notes: list[d.Note],
) -> s.ContentUnitVersionDetail:
    base = content_unit_version_model(version)
    return s.ContentUnitVersionDetail(
        **base.model_dump(),
        extractedText=version.extracted_text,
        speakerNotes=version.speaker_notes,
        provenance=provenance_model(provenance),
        comments=[comment_model(comment) for comment in comments],
        notes=[note_model(note) for note in notes],
    )


def work_product_status(family: d.WorkProductFamily, version: d.WorkProductVersion | None) -> s.StatusChips:
    return s.StatusChips(
        approvalState=cast(s.ApprovalState, version.approval_state if version else "draft"),
        freshnessState="fresh",
        isCanonical=True,
        isRestricted=family.restricted or bool(version and version.restricted),
        linkSource="manual",
    )


def work_product_family_card(
    family: d.WorkProductFamily,
    latest_version: d.WorkProductVersion | None,
) -> s.WorkProductFamilyCard:
    return s.WorkProductFamilyCard(
        id=family.id,
        title=family.title,
        artifactType=family.artifact_type,
        summary=family.summary,
        previewUri=latest_version.preview_uri if latest_version else family.preview_uri,
        variantCount=family.variant_count,
        versionCount=family.version_count,
        statusChips=work_product_status(family, latest_version),
    )


def work_product_version_detail(
    version: d.WorkProductVersion,
    filmstrip: list[d.ContentUnitVersion],
    provenance: d.ProvenanceRecord,
) -> s.WorkProductVersionDetail:
    return s.WorkProductVersionDetail(
        id=version.id,
        title=version.title,
        artifactType=version.artifact_type,
        versionNumber=version.version_number,
        approvalState=cast(s.ApprovalState, version.approval_state),
        previewUri=version.preview_uri,
        filmstrip=[content_unit_version_model(unit) for unit in filmstrip],
        provenance=provenance_model(provenance),
    )


def content_block_model(block: d.ContentBlockVersion) -> s.ContentBlockVersionDetail:
    members = [
        s.ContentBlockMember(
            id=member.id,
            memberType=member.member_type,
            memberId=member.member_id,
            orderIndex=member.order_index,
            role=member.role,
            isRequired=member.is_required,
            notes=member.notes,
        )
        for member in sorted(block.members, key=lambda item: item.order_index)
    ]
    return s.ContentBlockVersionDetail(
        id=block.id,
        familyId=block.family_id,
        title=block.title,
        summary=block.summary,
        blockType=block.block_type,
        approvalState=cast(s.ApprovalState, block.approval_state),
        members=members,
        createdAt=block.created_at,
    )


def storyboard_model(storyboard: d.Storyboard) -> s.Storyboard:
    return s.Storyboard(
        id=storyboard.id,
        mode=storyboard.mode,
        title=storyboard.title,
        currentSnapshotId=storyboard.current_snapshot_id,
        createdAt=storyboard.created_at,
        updatedAt=storyboard.updated_at,
    )


def storyboard_slot_model(slot: d.StoryboardSlot) -> s.StoryboardSlot:
    return s.StoryboardSlot(
        id=slot.id,
        sectionId=slot.section_id,
        slotType=cast(Literal["content_unit", "content_block", "work_product_ref", "gap"], slot.slot_type),
        selectedObjectType=slot.selected_object_type,
        selectedObjectId=slot.selected_object_id,
        orderIndex=slot.order_index,
        purpose=slot.purpose,
        isRequired=slot.is_required,
        aiRecommended=slot.ai_recommended,
    )


def storyboard_section_model(
    section: d.StoryboardSection,
    snapshot_id: UUID | None = None,
) -> s.StoryboardSection:
    return s.StoryboardSection(
        id=section.id,
        snapshotId=snapshot_id,
        storyboardId=section.storyboard_id,
        title=section.title,
        summary=section.summary,
        orderIndex=section.order_index,
        slots=[storyboard_slot_model(slot) for slot in sorted(section.slots, key=lambda item: item.order_index)],
    )


def storyboard_snapshot_model(snapshot: d.StoryboardSnapshot) -> s.StoryboardSnapshot:
    return s.StoryboardSnapshot(
        id=snapshot.id,
        storyboardId=snapshot.storyboard_id,
        versionLabel=snapshot.version_label,
        approvalState=cast(s.ApprovalState, snapshot.approval_state),
        narrativeScore=snapshot.narrative_score,
        sections=[
            storyboard_section_model(section, snapshot.id)
            for section in sorted(snapshot.sections, key=lambda item: item.order_index)
        ],
        createdAt=snapshot.created_at,
    )


def storyboard_detail_model(
    storyboard: d.Storyboard,
    current_snapshot: d.StoryboardSnapshot | None,
) -> s.StoryboardDetail:
    base = storyboard_model(storyboard)
    return s.StoryboardDetail(
        **base.model_dump(),
        draftSections=[
            storyboard_section_model(section)
            for section in sorted(storyboard.draft_sections, key=lambda item: item.order_index)
        ],
        currentSnapshot=storyboard_snapshot_model(current_snapshot) if current_snapshot else None,
    )


def comment_model(comment: d.Comment) -> s.Comment:
    return s.Comment(
        id=comment.id,
        kind=comment.kind,
        targetType=comment.target_type,
        targetId=comment.target_id,
        anchor=comment.anchor,
        parentCommentId=comment.parent_comment_id,
        body=comment.body,
        status=comment.status,
        createdAt=comment.created_at,
    )


def note_model(note: d.Note) -> s.Note:
    return s.Note(
        id=note.id,
        targetType=note.target_type,
        targetId=note.target_id,
        title=note.title,
        body=note.body,
        noteType=note.note_type,
        isPinned=note.is_pinned,
        createdAt=note.created_at,
        updatedAt=note.updated_at,
    )


def review_item_model(item: d.ReviewItem) -> s.ReviewItem:
    return s.ReviewItem(
        id=item.id,
        queueType=item.queue_type,
        status=cast(Literal["open", "accepted", "rejected", "snoozed", "resolved"], item.status),
        confidence=item.confidence,
        rationale=item.rationale,
        suggestedAction=item.suggested_action,
        targetRefs=item.target_refs,
        source=item.source,
        createdAt=item.created_at,
    )


def review_item_detail_model(item: d.ReviewItem) -> s.ReviewItemDetail:
    base = review_item_model(item)
    return s.ReviewItemDetail(
        **base.model_dump(),
        compareObjects=item.compare_objects,
        auditPreview=item.audit_preview,
    )


def audit_event_model(event: d.AuditEvent) -> s.AuditEvent:
    return s.AuditEvent(
        id=event.id,
        action=event.action,
        actorId=event.actor_id,
        targetType=event.target_type,
        targetId=event.target_id,
        priorState=event.prior_state,
        newState=event.new_state,
        reason=event.reason,
        metadata=event.metadata,
        createdAt=event.created_at,
    )
