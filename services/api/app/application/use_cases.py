from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, cast
from uuid import UUID, uuid4

from app.application import presenters as p
from app.application.pptx_processor import extract_pptx_slides
from app.application.ports import BoxBrainRepository
from app.domain.errors import ConflictError, NotFoundError
from app.domain.ingestion_search import (
    content_unit_fingerprint,
    hash_bytes,
    validate_pptx_upload,
)
from app.domain.models import (
    Actor,
    Comment,
    ContentBlockMember,
    ContentBlockVersion,
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
    StoryboardSection,
    StoryboardSlot,
    WorkProductFamily,
    WorkProductVersion,
    now_utc,
)
from app.domain.policies import (
    can_view_restricted,
    require_curator_actor,
    require_review_actor,
    require_role,
)
from app.schemas import api as s
from app.infrastructure.queue import IngestionQueue, NoopIngestionQueue
from app.infrastructure.storage import InMemoryObjectStorage, ObjectStorage, artifact_key


class BoxBrainUseCases:
    def __init__(
        self,
        repository: BoxBrainRepository,
        *,
        object_storage: ObjectStorage | None = None,
        ingestion_queue: IngestionQueue | None = None,
    ) -> None:
        self.repository = repository
        self.object_storage = object_storage or InMemoryObjectStorage()
        self.ingestion_queue = ingestion_queue or NoopIngestionQueue()

    def health(self) -> s.HealthResponse:
        return s.HealthResponse(status="ok")

    def admin_health(self) -> s.AdminHealth:
        return s.AdminHealth(
            status="ok",
            contentUnitFamilies=len(self.repository.content_unit_families),
            contentUnitVersions=len(self.repository.content_unit_versions),
            workProductVersions=len(self.repository.work_product_versions),
            contentBlocks=len(self.repository.content_blocks),
            storyboards=len(self.repository.storyboards),
            ingestionJobs=len(self.repository.ingestion_jobs),
            auditEvents=len(self.repository.audit_events),
        )

    def audit_events(self, actor: Actor) -> list[s.AuditEvent]:
        require_role(actor, "admin")
        return [p.audit_event_model(event) for event in self.repository.audit_events]

    def create_upload_job(self, request: s.UploadMetadataRequest, actor: Actor) -> s.IngestionJob:
        require_role(actor, "contributor")
        filename = request.filename or ""
        is_unsupported_file = bool(filename) and not filename.lower().endswith(".pptx")
        job = IngestionJob(
            id=uuid4(),
            status="failed" if is_unsupported_file else "queued",
            stage="validate_file" if is_unsupported_file else "uploaded_metadata",
            artifact_type=request.artifactType,
            title=request.title,
            upload_metadata=request.model_dump(exclude_none=True),
            error_code="unsupported_file_type" if is_unsupported_file else None,
            error_message="Only PPTX upload metadata is accepted by this scaffold."
            if is_unsupported_file
            else None,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        self.repository.ingestion_jobs[job.id] = job
        self._save_ingestion_job(job)
        self.repository.record_audit(
            action="upload_import",
            actor_id=actor.user_id,
            target_type="ingestion_job",
            target_id=job.id,
            prior_state={},
            new_state={"status": job.status, "stage": job.stage},
            reason="Upload metadata accepted",
            metadata={"artifactType": job.artifact_type},
        )
        return p.ingestion_job_model(job)

    def create_uploaded_artifact(
        self,
        *,
        filename: str,
        content_type: str | None,
        content: bytes,
        artifact_type: str,
        title: str | None,
        taxonomy: dict[str, Any] | None,
        actor: Actor,
    ) -> s.IngestionJob:
        require_role(actor, "contributor")
        validation = validate_pptx_upload(
            filename=filename,
            content=content,
            content_type=content_type,
        )
        timestamp = now_utc()
        upload_metadata: dict[str, Any] = {
            "filename": filename,
            "contentType": content_type,
            "byteSize": len(content),
            "checksum": hash_bytes(content),
            "taxonomy": taxonomy or {},
        }

        if not validation.valid:
            job = IngestionJob(
                id=uuid4(),
                status="failed",
                stage="validate_file",
                artifact_type=artifact_type,
                title=title,
                upload_metadata=upload_metadata,
                error_code=validation.error_code,
                error_message=validation.error_message,
                created_at=timestamp,
                updated_at=timestamp,
            )
            self.repository.ingestion_jobs[job.id] = job
            self._save_ingestion_job(job)
            self.repository.record_audit(
                action="upload_rejected",
                actor_id=actor.user_id,
                target_type="ingestion_job",
                target_id=job.id,
                prior_state={},
                new_state={"status": job.status, "stage": job.stage, "errorCode": job.error_code},
                reason=validation.error_message,
                metadata={"artifactType": artifact_type, "filename": filename},
            )
            return p.ingestion_job_model(job)

        source_hash = validation.content_hash or hash_bytes(content)
        key = artifact_key(sha256=source_hash, filename=validation.filename)
        stored_artifact = self.object_storage.put_bytes(
            key=key,
            content=content,
            content_type=content_type,
            metadata={"sha256": source_hash, "filename": validation.filename},
        )
        stored_object = StoredObject(
            id=uuid4(),
            object_type="original_binary",
            storage_uri=stored_artifact.storage_uri,
            mime_type=content_type,
            byte_size=len(content),
            sha256=source_hash,
            metadata={"bucket": stored_artifact.bucket, "key": stored_artifact.key},
            created_at=timestamp,
        )
        self.repository.stored_objects[stored_object.id] = stored_object
        self._save_stored_object(stored_object)

        provenance = ProvenanceRecord(
            id=uuid4(),
            origin_type="uploaded_source",
            source_system="boxbrain_upload",
            source_refs=[validation.filename, stored_artifact.storage_uri],
            pipeline_version="upload-v1",
            created_at=timestamp,
        )
        self.repository.provenance_records[provenance.id] = provenance
        self._save_provenance_record(provenance)

        family = WorkProductFamily(
            id=uuid4(),
            title=title or validation.filename,
            artifact_type=artifact_type,
            summary=f"Uploaded source artifact: {validation.filename}",
            preview_uri=None,
            variant_count=1,
            version_count=1,
        )
        work_product_version = WorkProductVersion(
            id=uuid4(),
            family_id=family.id,
            title=family.title,
            artifact_type=artifact_type,
            version_number="v1.0",
            approval_state="draft",
            preview_uri=None,
            filmstrip_version_ids=[],
            provenance_id=provenance.id,
        )
        variant_id = uuid4()
        self.repository.work_product_families[family.id] = family
        self.repository.work_product_versions[work_product_version.id] = work_product_version
        self._save_work_product(
            family,
            work_product_version,
            variant_id=variant_id,
            original_object_id=stored_object.id,
        )

        upload_metadata.update(
            {
                "filename": validation.filename,
                "sourceFileHash": source_hash,
                "slideCount": validation.slide_count,
                "storageUri": stored_artifact.storage_uri,
                "storageKey": stored_artifact.key,
                "storedObjectId": str(stored_object.id),
                "workProductFamilyId": str(family.id),
                "workProductVariantId": str(variant_id),
                "warnings": list(validation.warnings),
            }
        )
        job = IngestionJob(
            id=uuid4(),
            status="queued",
            stage="uploaded",
            artifact_type=artifact_type,
            title=family.title,
            original_object_id=stored_object.id,
            work_product_version_id=work_product_version.id,
            upload_metadata=upload_metadata,
            created_at=timestamp,
            updated_at=timestamp,
        )
        self.repository.ingestion_jobs[job.id] = job
        self._save_ingestion_job(job)
        self.repository.record_audit(
            action="upload_import",
            actor_id=actor.user_id,
            target_type="ingestion_job",
            target_id=job.id,
            prior_state={},
            new_state={
                "status": job.status,
                "stage": job.stage,
                "originalObjectId": str(stored_object.id),
                "workProductVersionId": str(work_product_version.id),
            },
            reason="Upload accepted and queued for ingestion",
            metadata={"artifactType": artifact_type, "filename": validation.filename},
        )
        self.ingestion_queue.enqueue_ingestion_job(job.id)
        return p.ingestion_job_model(job)

    def list_ingestion_jobs(self) -> list[s.IngestionJob]:
        jobs = sorted(self.repository.ingestion_jobs.values(), key=lambda item: item.created_at)
        return [p.ingestion_job_model(job) for job in jobs]

    def get_ingestion_job(self, job_id: UUID) -> s.IngestionJob:
        return p.ingestion_job_model(self._get_job(job_id))

    def retry_ingestion_job(self, job_id: UUID, actor: Actor) -> s.IngestionJob:
        require_role(actor, "contributor")
        job = self._get_job(job_id)
        prior = {"status": job.status, "stage": job.stage, "retryCount": job.retry_count}
        job.status = "queued"
        job.stage = "retry_queued"
        job.retry_count += 1
        job.error_code = None
        job.error_message = None
        job.updated_at = now_utc()
        self._save_ingestion_job(job)
        self.repository.record_audit(
            action="ingestion_retry",
            actor_id=actor.user_id,
            target_type="ingestion_job",
            target_id=job.id,
            prior_state=prior,
            new_state={"status": job.status, "stage": job.stage, "retryCount": job.retry_count},
        )
        self.ingestion_queue.enqueue_ingestion_job(job.id)
        return p.ingestion_job_model(job)

    def process_ingestion_job(self, job_id: UUID, content: bytes | None = None) -> s.IngestionJob:
        job = self._get_job(job_id)
        if job.status == "complete":
            return p.ingestion_job_model(job)
        if job.original_object_id is None or job.work_product_version_id is None:
            raise ConflictError("Ingestion job is missing uploaded artifact references.")

        payload = content
        if payload is None:
            storage_key = job.upload_metadata.get("storageKey")
            if not storage_key:
                raise ConflictError("Ingestion job is missing a storage key.")
            payload = self.object_storage.get_bytes(str(storage_key))

        validation = validate_pptx_upload(
            filename=str(job.upload_metadata.get("filename") or "upload.pptx"),
            content=payload,
            content_type=job.upload_metadata.get("contentType"),
        )
        if not validation.valid:
            job.status = "failed"
            job.stage = "validated"
            job.error_code = validation.error_code
            job.error_message = validation.error_message
            job.updated_at = now_utc()
            self._save_ingestion_job(job)
            return p.ingestion_job_model(job)

        job.status = "running"
        job.stage = "validated"
        job.updated_at = now_utc()
        self._save_ingestion_job(job)

        slides = extract_pptx_slides(payload)
        job.stage = "rendered"
        job.updated_at = now_utc()
        self._save_ingestion_job(job)

        created_ids = {
            UUID(value)
            for value in job.upload_metadata.get("createdContentUnitVersionIds", [])
        }
        if not created_ids:
            created_ids = self._create_content_units_from_slides(job, slides, validation.content_hash)
        job.upload_metadata["createdContentUnitVersionIds"] = [str(value) for value in created_ids]
        job.stage = "complete"
        job.status = "complete"
        job.error_code = None
        job.error_message = None
        job.updated_at = now_utc()
        job.completed_at = job.updated_at

        work_product = self.repository.work_product_versions.get(job.work_product_version_id)
        if work_product is not None:
            work_product.filmstrip_version_ids = list(created_ids)
            if created_ids:
                first = self.repository.content_unit_versions[next(iter(created_ids))]
                work_product.preview_uri = first.thumbnail_uri

        self._save_ingestion_job(job)
        self.repository.record_audit(
            action="ingestion_complete",
            actor_id="system",
            target_type="ingestion_job",
            target_id=job.id,
            prior_state={"stage": "uploaded"},
            new_state={
                "stage": job.stage,
                "status": job.status,
                "contentUnitVersionIds": [str(value) for value in created_ids],
            },
            metadata={"pipelineVersion": "deterministic-pptx-v1"},
        )
        return p.ingestion_job_model(job)

    def list_content_unit_families(self, actor: Actor) -> list[s.ContentUnitFamilyCard]:
        families = [
            family
            for family in self.repository.content_unit_families.values()
            if self._can_access_family(family.id, actor)
        ]
        return [
            p.content_unit_family_card(
                family,
                self._variants_for_family(family.id),
                self._versions_by_variant(family.id),
            )
            for family in sorted(families, key=lambda item: item.family_title)
        ]

    def get_content_unit_family(self, family_id: UUID, actor: Actor) -> s.ContentUnitFamilyDetail:
        if not self._can_access_family(family_id, actor):
            raise NotFoundError("ContentUnit family not found.")
        family = self._get_content_unit_family(family_id)
        return p.content_unit_family_detail(
            family,
            self._variants_for_family(family_id),
            self._versions_by_variant(family_id),
            self._notes_for("content_unit_family", family_id),
        )

    def list_content_unit_variants(self, family_id: UUID, actor: Actor) -> list[s.ContentUnitVariant]:
        if not self._can_access_family(family_id, actor):
            raise NotFoundError("ContentUnit family not found.")
        variants = self._variants_for_family(family_id)
        models = []
        for variant in sorted(variants, key=lambda item: item.variant_label):
            latest = (
                self.repository.content_unit_versions.get(variant.latest_version_id)
                if variant.latest_version_id
                else None
            )
            models.append(p.content_unit_variant_model(variant, latest))
        return models

    def list_content_unit_versions(self, variant_id: UUID, actor: Actor) -> list[s.ContentUnitVersion]:
        variant = self._get_content_unit_variant(variant_id)
        if not self._can_access_family(variant.family_id, actor):
            raise NotFoundError("ContentUnit variant not found.")
        versions = [
            version
            for version in self.repository.content_unit_versions.values()
            if version.variant_id == variant_id
        ]
        return [
            p.content_unit_version_model(version)
            for version in sorted(versions, key=lambda item: item.created_at, reverse=True)
        ]

    def get_content_unit_version(self, version_id: UUID, actor: Actor) -> s.ContentUnitVersionDetail:
        version = self._get_content_unit_version(version_id)
        variant = self._get_content_unit_variant(version.variant_id)
        if not self._can_access_family(variant.family_id, actor):
            raise NotFoundError("ContentUnit version not found.")
        provenance = self.repository.provenance_records[version.provenance_id]
        return p.content_unit_version_detail(
            version,
            provenance,
            self._comments_for("content_unit_version", version_id),
            self._notes_for("content_unit_version", version_id),
        )

    def set_content_unit_canonical(
        self,
        variant_id: UUID,
        actor: Actor,
        reason: str | None = None,
    ) -> s.ContentUnitVariant:
        require_curator_actor(actor)
        variant = self._set_canonical_variant_unchecked(variant_id, actor, reason)
        latest = (
            self.repository.content_unit_versions.get(variant.latest_version_id)
            if variant.latest_version_id
            else None
        )
        return p.content_unit_variant_model(variant, latest)

    def update_content_unit_approval(
        self,
        version_id: UUID,
        approval_state: str,
        actor: Actor,
        notes: str | None = None,
    ) -> s.ContentUnitVersion:
        require_review_actor(actor)
        version = self._get_content_unit_version(version_id)
        prior = {"approvalState": version.approval_state}
        version.approval_state = approval_state
        self.repository.record_audit(
            action="approval_state_change",
            actor_id=actor.user_id,
            target_type="content_unit_version",
            target_id=version.id,
            prior_state=prior,
            new_state={"approvalState": version.approval_state},
            reason=notes,
        )
        return p.content_unit_version_model(version)

    def similar_content_units(self, version_id: UUID, actor: Actor) -> list[s.SearchResultItem]:
        source = self._get_content_unit_version(version_id)
        source_variant = self._get_content_unit_variant(source.variant_id)
        if not self._can_access_family(source_variant.family_id, actor):
            raise NotFoundError("ContentUnit version not found.")
        results: list[s.SearchResultItem] = []
        for edge in self.repository.similarity_edges.values():
            target_id = None
            if edge.source_version_id == version_id:
                target_id = edge.target_version_id
            elif edge.target_version_id == version_id:
                target_id = edge.source_version_id
            if target_id is None:
                continue
            target = self._get_content_unit_version(target_id)
            target_variant = self._get_content_unit_variant(target.variant_id)
            if not self._can_access_family(target_variant.family_id, actor):
                continue
            target_family = self._get_content_unit_family(target_variant.family_id)
            results.append(
                s.SearchResultItem(
                    objectType="content_unit_version",
                    objectId=target.id,
                    resultGrain="version",
                    title=target_family.family_title,
                    summary=target.summary,
                    previewUri=target.thumbnail_uri,
                    score=edge.score,
                    explanationChips=["similarity confirmed", "family identity unchanged"],
                    statusChips=p.content_unit_status(target_family, target_variant, target),
                )
            )
        return sorted(results, key=lambda item: item.score, reverse=True)

    def where_used(self, version_id: UUID) -> list[dict[str, Any]]:
        self._get_content_unit_version(version_id)
        used: list[dict[str, Any]] = []
        for block in self.repository.content_blocks.values():
            for member in block.members:
                if member.member_id == version_id:
                    used.append(
                        {
                            "objectType": "content_block_version",
                            "objectId": str(block.id),
                            "title": block.title,
                            "orderIndex": member.order_index,
                        }
                    )
        for storyboard in self.repository.storyboards.values():
            for section in storyboard.draft_sections:
                for slot in section.slots:
                    if slot.selected_object_id == version_id:
                        used.append(
                            {
                                "objectType": "storyboard",
                                "objectId": str(storyboard.id),
                                "title": storyboard.title,
                                "slotId": str(slot.id),
                            }
                        )
        return used

    def list_work_product_families(self, actor: Actor) -> list[s.WorkProductFamilyCard]:
        families = [
            family
            for family in self.repository.work_product_families.values()
            if can_view_restricted(actor) or not family.restricted
        ]
        return [
            p.work_product_family_card(family, self._latest_work_product_version(family.id))
            for family in sorted(families, key=lambda item: item.title)
        ]

    def get_work_product_version(self, version_id: UUID, actor: Actor) -> s.WorkProductVersionDetail:
        version = self._get_work_product_version(version_id)
        if version.restricted and not can_view_restricted(actor):
            raise NotFoundError("WorkProduct version not found.")
        filmstrip = [
            unit
            for unit_id in version.filmstrip_version_ids
            if self._can_access_version(unit_id, actor)
            for unit in [self.repository.content_unit_versions[unit_id]]
        ]
        provenance = self.repository.provenance_records[version.provenance_id]
        return p.work_product_version_detail(version, filmstrip, provenance)

    def create_content_block(
        self,
        request: s.CreateContentBlockRequest,
        actor: Actor,
    ) -> s.ContentBlockVersionDetail:
        require_role(actor, "contributor")
        members = [
            ContentBlockMember(
                id=uuid4(),
                member_type=member.memberType,
                member_id=member.memberId,
                order_index=member.orderIndex,
                role=member.role,
                is_required=member.isRequired,
                notes=member.notes,
            )
            for member in request.members
        ]
        self._validate_content_block_members(members)
        block = ContentBlockVersion(
            id=uuid4(),
            family_id=uuid4(),
            title=request.title,
            summary=request.summary,
            block_type=request.blockType,
            approval_state="draft",
            members=sorted(members, key=lambda item: item.order_index),
            created_at=now_utc(),
        )
        self.repository.content_blocks[block.id] = block
        return p.content_block_model(block)

    def list_content_blocks(self) -> list[s.ContentBlockVersionDetail]:
        blocks = sorted(self.repository.content_blocks.values(), key=lambda item: item.title)
        return [p.content_block_model(block) for block in blocks]

    def get_content_block(self, block_id: UUID) -> s.ContentBlockVersionDetail:
        block = self.repository.content_blocks.get(block_id)
        if block is None:
            raise NotFoundError("ContentBlock not found.")
        return p.content_block_model(block)

    def create_storyboard(self, request: s.CreateStoryboardRequest, actor: Actor) -> s.Storyboard:
        require_role(actor, "contributor")
        storyboard = Storyboard(
            id=uuid4(),
            mode=request.mode,
            title=request.title,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        self.repository.storyboards[storyboard.id] = storyboard
        return p.storyboard_model(storyboard)

    def list_storyboards(self) -> list[s.Storyboard]:
        return [
            p.storyboard_model(storyboard)
            for storyboard in sorted(self.repository.storyboards.values(), key=lambda item: item.title)
        ]

    def get_storyboard(self, storyboard_id: UUID) -> s.StoryboardDetail:
        storyboard = self._get_storyboard(storyboard_id)
        snapshot = (
            self.repository.storyboard_snapshots.get(storyboard.current_snapshot_id)
            if storyboard.current_snapshot_id
            else None
        )
        return p.storyboard_detail_model(storyboard, snapshot)

    def create_storyboard_snapshot(
        self,
        storyboard_id: UUID,
        request: s.CreateStoryboardSnapshotRequest,
        actor: Actor,
    ) -> s.StoryboardSnapshot:
        require_role(actor, "contributor")
        storyboard = self._get_storyboard(storyboard_id)
        snapshot = self.repository.freeze_storyboard_snapshot(storyboard, request.versionLabel)
        return p.storyboard_snapshot_model(snapshot)

    def list_storyboard_snapshots(self, storyboard_id: UUID) -> list[s.StoryboardSnapshot]:
        self._get_storyboard(storyboard_id)
        snapshots = [
            snapshot
            for snapshot in self.repository.storyboard_snapshots.values()
            if snapshot.storyboard_id == storyboard_id
        ]
        return [
            p.storyboard_snapshot_model(snapshot)
            for snapshot in sorted(snapshots, key=lambda item: item.created_at)
        ]

    def get_storyboard_snapshot(self, snapshot_id: UUID) -> s.StoryboardSnapshot:
        snapshot = self.repository.storyboard_snapshots.get(snapshot_id)
        if snapshot is None:
            raise NotFoundError("Storyboard snapshot not found.")
        return p.storyboard_snapshot_model(snapshot)

    def create_storyboard_section(
        self,
        storyboard_id: UUID,
        request: s.CreateStoryboardSectionRequest,
        actor: Actor,
    ) -> s.StoryboardSection:
        require_role(actor, "contributor")
        storyboard = self._get_storyboard(storyboard_id)
        order_index = request.orderIndex
        if order_index is None:
            order_index = len(storyboard.draft_sections)
        section = StoryboardSection(
            id=uuid4(),
            storyboard_id=storyboard.id,
            title=request.title,
            summary=request.summary,
            order_index=order_index,
        )
        storyboard.draft_sections.append(section)
        storyboard.draft_sections.sort(key=lambda item: item.order_index)
        storyboard.updated_at = now_utc()
        return p.storyboard_section_model(section)

    def update_storyboard_section(
        self,
        section_id: UUID,
        request: s.CreateStoryboardSectionRequest,
        actor: Actor,
    ) -> s.StoryboardSection:
        require_role(actor, "contributor")
        section = self._get_draft_section(section_id)
        section.title = request.title
        section.summary = request.summary
        if request.orderIndex is not None:
            section.order_index = request.orderIndex
        self._touch_storyboard(section.storyboard_id)
        return p.storyboard_section_model(section)

    def create_storyboard_slot(
        self,
        section_id: UUID,
        request: s.CreateStoryboardSlotRequest,
        actor: Actor,
    ) -> s.StoryboardSlot:
        require_role(actor, "contributor")
        section = self._get_draft_section(section_id)
        self._validate_slot_selection(request.slotType, request.selectedObjectType, request.selectedObjectId)
        order_index = request.orderIndex
        if order_index is None:
            order_index = len(section.slots)
        slot = StoryboardSlot(
            id=uuid4(),
            section_id=section.id,
            slot_type=request.slotType,
            selected_object_type=request.selectedObjectType,
            selected_object_id=request.selectedObjectId,
            order_index=order_index,
            purpose=request.purpose,
            is_required=request.isRequired,
        )
        section.slots.append(slot)
        section.slots.sort(key=lambda item: item.order_index)
        self._touch_storyboard(section.storyboard_id)
        return p.storyboard_slot_model(slot)

    def update_storyboard_slot(
        self,
        slot_id: UUID,
        request: s.UpdateStoryboardSlotRequest,
        actor: Actor,
    ) -> s.StoryboardSlot:
        require_role(actor, "contributor")
        slot, section = self._get_draft_slot(slot_id)
        slot_type = request.slotType or slot.slot_type
        selected_object_type = (
            request.selectedObjectType if request.selectedObjectType is not None else slot.selected_object_type
        )
        selected_object_id = (
            request.selectedObjectId if request.selectedObjectId is not None else slot.selected_object_id
        )
        self._validate_slot_selection(slot_type, selected_object_type, selected_object_id)
        slot.slot_type = slot_type
        slot.selected_object_type = selected_object_type
        slot.selected_object_id = selected_object_id
        if request.orderIndex is not None:
            slot.order_index = request.orderIndex
        if request.purpose is not None:
            slot.purpose = request.purpose
        if request.isRequired is not None:
            slot.is_required = request.isRequired
        section.slots.sort(key=lambda item: item.order_index)
        self._touch_storyboard(section.storyboard_id)
        return p.storyboard_slot_model(slot)

    def analyze_storyboard(self, storyboard_id: UUID) -> s.StoryboardDiagnostics:
        storyboard = self._get_storyboard(storyboard_id)
        warnings: list[s.StoryboardDiagnosticWarning] = []
        selected_ids: list[UUID] = []
        for section in storyboard.draft_sections:
            for slot in section.slots:
                if slot.slot_type == "gap":
                    warnings.append(
                        s.StoryboardDiagnosticWarning(
                            code="gap_slot",
                            severity="warning" if slot.is_required else "info",
                            message="Required gap needs content before publishing.",
                            targetType="storyboard_slot",
                            targetId=slot.id,
                        )
                    )
                if slot.selected_object_type == "content_unit_version" and slot.selected_object_id:
                    selected_ids.append(slot.selected_object_id)
                    version = self.repository.content_unit_versions.get(slot.selected_object_id)
                    if version and version.approval_state != "approved":
                        warnings.append(
                            s.StoryboardDiagnosticWarning(
                                code="unapproved_content",
                                severity="warning",
                                message="Selected content has not been approved.",
                                targetType="storyboard_slot",
                                targetId=slot.id,
                            )
                        )
                    if version and version.freshness_state == "stale":
                        warnings.append(
                            s.StoryboardDiagnosticWarning(
                                code="stale_content",
                                severity="critical",
                                message="Selected content is stale.",
                                targetType="storyboard_slot",
                                targetId=slot.id,
                            )
                        )
        duplicate_ids = {item for item, count in Counter(selected_ids).items() if count > 1}
        for duplicate_id in duplicate_ids:
            warnings.append(
                s.StoryboardDiagnosticWarning(
                    code="duplicate_selection",
                    severity="warning",
                    message="The same content appears more than once in this storyboard.",
                    targetType="content_unit_version",
                    targetId=duplicate_id,
                )
            )
        narrative_score = max(0.2, 1.0 - (len(warnings) * 0.1)) if storyboard.draft_sections else None
        return s.StoryboardDiagnostics(narrativeScore=narrative_score, warnings=warnings)

    def create_comment(self, request: s.CreateCommentRequest, actor: Actor) -> s.Comment:
        require_role(actor, "contributor")
        comment = Comment(
            id=uuid4(),
            kind=request.kind,
            target_type=request.targetType,
            target_id=request.targetId,
            anchor=request.anchor,
            parent_comment_id=request.parentCommentId,
            body=request.body,
            created_at=now_utc(),
        )
        self.repository.comments[comment.id] = comment
        return p.comment_model(comment)

    def list_comments(self, target_type: str | None, target_id: UUID | None) -> list[s.Comment]:
        comments = list(self.repository.comments.values())
        if target_type:
            comments = [comment for comment in comments if comment.target_type == target_type]
        if target_id:
            comments = [comment for comment in comments if comment.target_id == target_id]
        return [
            p.comment_model(comment)
            for comment in sorted(comments, key=lambda item: item.created_at)
        ]

    def create_note(self, request: s.CreateNoteRequest, actor: Actor) -> s.Note:
        require_curator_actor(actor)
        note = Note(
            id=uuid4(),
            target_type=request.targetType,
            target_id=request.targetId,
            title=request.title,
            body=request.body,
            note_type=request.noteType,
            is_pinned=request.isPinned,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        self.repository.notes[note.id] = note
        self.repository.record_audit(
            action="note_create",
            actor_id=actor.user_id,
            target_type=note.target_type,
            target_id=note.target_id,
            prior_state={},
            new_state={"noteId": str(note.id), "noteType": note.note_type},
        )
        return p.note_model(note)

    def list_notes(self, target_type: str | None, target_id: UUID | None) -> list[s.Note]:
        notes = list(self.repository.notes.values())
        if target_type:
            notes = [note for note in notes if note.target_type == target_type]
        if target_id:
            notes = [note for note in notes if note.target_id == target_id]
        return [p.note_model(note) for note in sorted(notes, key=lambda item: item.created_at)]

    def review_queues(self) -> list[s.ReviewQueueSummary]:
        grouped: dict[str, list[ReviewItem]] = defaultdict(list)
        for item in self.repository.review_items.values():
            if item.status == "open":
                grouped[item.queue_type].append(item)
        return [
            s.ReviewQueueSummary(
                queueType=queue_type,
                openCount=len(items),
                oldestCreatedAt=min(item.created_at for item in items) if items else None,
            )
            for queue_type, items in sorted(grouped.items())
        ]

    def list_review_items(
        self,
        queue_type: str | None = None,
        status: str = "open",
    ) -> list[s.ReviewItem]:
        items = list(self.repository.review_items.values())
        if queue_type:
            items = [item for item in items if item.queue_type == queue_type]
        if status:
            items = [item for item in items if item.status == status]
        return [p.review_item_model(item) for item in sorted(items, key=lambda item: item.created_at)]

    def get_review_item(self, review_item_id: UUID) -> s.ReviewItemDetail:
        return p.review_item_detail_model(self._get_review_item(review_item_id))

    def review_action(
        self,
        review_item_id: UUID,
        action: str,
        request: s.ReviewActionRequest,
        actor: Actor,
    ) -> dict[str, Any]:
        require_review_actor(actor)
        item = self._get_review_item(review_item_id)
        if item.status != "open":
            raise ConflictError("Review item is not open.")
        prior = {"status": item.status}
        metadata: dict[str, Any] = {"queueType": item.queue_type}

        if action == "mark-similar":
            left, right = self._review_target_version_ids(item)
            edge = SimilarityEdge(
                id=uuid4(),
                source_version_id=left,
                target_version_id=right,
                score=item.confidence or 0.0,
                rationale=item.rationale,
                confirmed_by=actor.user_id,
                created_at=now_utc(),
            )
            self.repository.similarity_edges[edge.id] = edge
            item.status = "accepted"
            metadata["similarityEdgeId"] = str(edge.id)
        elif action == "mark-variant":
            item.status = "accepted"
            metadata["relationship"] = "variant_candidate_accepted"
        elif action == "merge-versions":
            item.status = "accepted"
            metadata["relationship"] = "version_merge_queued"
        elif action == "set-canonical":
            variant_id = request.targetVariantId or self._variant_id_from_review(item)
            self._set_canonical_variant_unchecked(variant_id, actor, request.reason)
            item.status = "accepted"
            metadata["canonicalVariantId"] = str(variant_id)
        elif action == "approve":
            version_id = request.targetVersionId or self._review_target_version_ids(item)[0]
            self.update_content_unit_approval(version_id, "approved", actor, request.reason)
            item.status = "accepted"
            metadata["approvedVersionId"] = str(version_id)
        elif action == "reject":
            item.status = "rejected"
        elif action == "request-changes":
            item.status = "resolved"
        else:
            raise NotFoundError("Review action not found.")

        item.resolved_at = now_utc()
        audit_event = self.repository.record_audit(
            action=f"review_{action.replace('-', '_')}",
            actor_id=actor.user_id,
            target_type="review_item",
            target_id=item.id,
            prior_state=prior,
            new_state={"status": item.status},
            reason=request.reason,
            metadata=metadata,
        )
        payload = p.review_item_model(item).model_dump(mode="json")
        payload.update(p.audit_event_model(audit_event).model_dump(mode="json"))
        payload["reviewItemId"] = str(item.id)
        payload["auditEventId"] = str(audit_event.id)
        return payload

    def search(self, request: s.SearchRequest, actor: Actor) -> s.SearchResponse:
        query = request.query.strip()
        terms = [term for term in query.lower().split() if term]
        items: list[s.SearchResultItem] = []
        filtered_restricted = 0
        requested_types = set(request.objectTypes)

        if not requested_types or "content_unit" in requested_types or "content_units" in requested_types:
            for family in self.repository.content_unit_families.values():
                if not self._can_access_family(family.id, actor):
                    filtered_restricted += 1
                    continue
                score = self._score_content_unit_family(family.id, terms)
                if score <= 0 and terms:
                    continue
                variants = self._variants_for_family(family.id)
                versions_by_variant = self._versions_by_variant(family.id)
                card = p.content_unit_family_card(family, variants, versions_by_variant)
                items.append(
                    s.SearchResultItem(
                        objectType="content_unit_family",
                        objectId=family.id,
                        resultGrain="family",
                        title=card.familyTitle,
                        summary=card.conceptualSummary,
                        previewUri=card.canonicalPreviewUri,
                        score=score or 0.15,
                        explanationChips=self._explanation_chips(terms, family.family_title),
                        statusChips=card.statusChips,
                    )
                )

        if not requested_types or "content_block" in requested_types or "content_blocks" in requested_types:
            for block in self.repository.content_blocks.values():
                if self._block_is_restricted(block) and not can_view_restricted(actor):
                    filtered_restricted += 1
                    continue
                haystack = f"{block.title} {block.summary or ''}".lower()
                score = self._score_text(haystack, terms)
                if score <= 0 and terms:
                    continue
                items.append(
                    s.SearchResultItem(
                        objectType="content_block_version",
                        objectId=block.id,
                        resultGrain="block",
                        title=block.title,
                        summary=block.summary,
                        previewUri=None,
                        score=score or 0.12,
                        explanationChips=["ordered ContentBlock", "reusable mini-story"],
                        statusChips=s.StatusChips(
                            approvalState=cast(s.ApprovalState, block.approval_state),
                            freshnessState="fresh",
                            isCanonical=True,
                            isRestricted=block.restricted,
                            linkSource="manual",
                        ),
                    )
                )

        if not requested_types or "work_product" in requested_types or "work_products" in requested_types:
            for wp_family in self.repository.work_product_families.values():
                if wp_family.restricted and not can_view_restricted(actor):
                    filtered_restricted += 1
                    continue
                haystack = f"{wp_family.title} {wp_family.summary or ''} {wp_family.artifact_type}".lower()
                score = self._score_text(haystack, terms)
                if score <= 0 and terms:
                    continue
                version = self._latest_work_product_version(wp_family.id)
                items.append(
                    s.SearchResultItem(
                        objectType="work_product_family",
                        objectId=wp_family.id,
                        resultGrain="work_product",
                        title=wp_family.title,
                        summary=wp_family.summary,
                        previewUri=wp_family.preview_uri,
                        score=score or 0.1,
                        explanationChips=["source artifact", "decomposed work product"],
                        statusChips=p.work_product_status(wp_family, version),
                    )
                )

        if request.profile == "approved_only":
            items = [item for item in items if item.statusChips.approvalState == "approved"]

        items = sorted(items, key=lambda item: item.score, reverse=True)[: request.limit]
        debug = None
        if can_view_restricted(actor):
            debug = {"filteredRestrictedCount": filtered_restricted, "profile": request.profile}
        return s.SearchResponse(
            query=request.query,
            interpretedIntent=self._interpret_intent(request),
            items=items,
            debug=debug,
        )

    def ask(self, request: s.AskRequest, actor: Actor) -> s.SearchResponse:
        response = self.search(request, actor)
        response.interpretedIntent = response.interpretedIntent or "natural_language_retrieval"
        return response

    def _get_job(self, job_id: UUID) -> IngestionJob:
        job = self.repository.ingestion_jobs.get(job_id)
        if job is None:
            raise NotFoundError("Ingestion job not found.")
        return job

    def _get_content_unit_family(self, family_id: UUID):
        family = self.repository.content_unit_families.get(family_id)
        if family is None:
            raise NotFoundError("ContentUnit family not found.")
        return family

    def _get_content_unit_variant(self, variant_id: UUID):
        variant = self.repository.content_unit_variants.get(variant_id)
        if variant is None:
            raise NotFoundError("ContentUnit variant not found.")
        return variant

    def _get_content_unit_version(self, version_id: UUID):
        version = self.repository.content_unit_versions.get(version_id)
        if version is None:
            raise NotFoundError("ContentUnit version not found.")
        return version

    def _get_work_product_version(self, version_id: UUID):
        version = self.repository.work_product_versions.get(version_id)
        if version is None:
            raise NotFoundError("WorkProduct version not found.")
        return version

    def _get_storyboard(self, storyboard_id: UUID) -> Storyboard:
        storyboard = self.repository.storyboards.get(storyboard_id)
        if storyboard is None:
            raise NotFoundError("Storyboard not found.")
        return storyboard

    def _get_review_item(self, review_item_id: UUID) -> ReviewItem:
        item = self.repository.review_items.get(review_item_id)
        if item is None:
            raise NotFoundError("Review item not found.")
        return item

    def _variants_for_family(self, family_id: UUID):
        return [
            variant
            for variant in self.repository.content_unit_variants.values()
            if variant.family_id == family_id
        ]

    def _versions_by_variant(self, family_id: UUID):
        variant_ids = {variant.id for variant in self._variants_for_family(family_id)}
        versions_by_variant: dict[UUID, list] = defaultdict(list)
        for version in self.repository.content_unit_versions.values():
            if version.variant_id in variant_ids:
                versions_by_variant[version.variant_id].append(version)
        return versions_by_variant

    def _notes_for(self, target_type: str, target_id: UUID):
        return [
            note
            for note in self.repository.notes.values()
            if note.target_type == target_type and note.target_id == target_id
        ]

    def _comments_for(self, target_type: str, target_id: UUID):
        return [
            comment
            for comment in self.repository.comments.values()
            if comment.target_type == target_type and comment.target_id == target_id
        ]

    def _latest_work_product_version(self, family_id: UUID):
        versions = [
            version
            for version in self.repository.work_product_versions.values()
            if version.family_id == family_id
        ]
        return versions[0] if versions else None

    def _can_access_family(self, family_id: UUID, actor: Actor) -> bool:
        family = self.repository.content_unit_families.get(family_id)
        if family is None:
            return False
        if family.restricted and not can_view_restricted(actor):
            return False
        for variant in self._variants_for_family(family_id):
            if variant.latest_version_id and not self._can_access_version(variant.latest_version_id, actor):
                return False
        return True

    def _can_access_version(self, version_id: UUID, actor: Actor) -> bool:
        version = self.repository.content_unit_versions.get(version_id)
        if version is None:
            return False
        variant = self.repository.content_unit_variants.get(version.variant_id)
        if variant is None:
            return False
        family = self.repository.content_unit_families.get(variant.family_id)
        if family is None:
            return False
        if (family.restricted or version.restricted) and not can_view_restricted(actor):
            return False
        return True

    def _set_canonical_variant_unchecked(
        self,
        variant_id: UUID,
        actor: Actor,
        reason: str | None,
    ):
        variant = self._get_content_unit_variant(variant_id)
        siblings = self._variants_for_family(variant.family_id)
        prior = {str(sibling.id): sibling.is_canonical for sibling in siblings}
        for sibling in siblings:
            sibling.is_canonical = sibling.id == variant_id
        new = {str(sibling.id): sibling.is_canonical for sibling in siblings}
        self.repository.record_audit(
            action="canonical_change",
            actor_id=actor.user_id,
            target_type="content_unit_variant",
            target_id=variant.id,
            prior_state=prior,
            new_state=new,
            reason=reason,
        )
        return variant

    def _validate_content_block_members(self, members: list[ContentBlockMember]) -> None:
        if not members:
            raise ConflictError("ContentBlock requires at least one member.")
        seen_order_indexes: set[int] = set()
        for member in members:
            if member.order_index in seen_order_indexes:
                raise ConflictError("ContentBlock member orderIndex values must be unique.")
            seen_order_indexes.add(member.order_index)
            if member.member_type == "content_unit_version":
                self._get_content_unit_version(member.member_id)
            elif member.member_type == "content_unit_variant":
                self._get_content_unit_variant(member.member_id)
            else:
                raise ConflictError("Unsupported ContentBlock member type.")

    def _validate_slot_selection(
        self,
        slot_type: str,
        selected_object_type: str | None,
        selected_object_id: UUID | None,
    ) -> None:
        if slot_type == "gap":
            return
        if not selected_object_type or not selected_object_id:
            raise ConflictError("Non-gap storyboard slots require a selected object.")
        if selected_object_type == "content_unit_version":
            self._get_content_unit_version(selected_object_id)
        elif selected_object_type == "content_block_version":
            if selected_object_id not in self.repository.content_blocks:
                raise NotFoundError("ContentBlock version not found.")
        elif selected_object_type == "work_product_version":
            self._get_work_product_version(selected_object_id)
        else:
            raise ConflictError("Unsupported selected object type.")

    def _get_draft_section(self, section_id: UUID) -> StoryboardSection:
        for storyboard in self.repository.storyboards.values():
            for section in storyboard.draft_sections:
                if section.id == section_id:
                    return section
        raise NotFoundError("Draft storyboard section not found.")

    def _get_draft_slot(self, slot_id: UUID) -> tuple[StoryboardSlot, StoryboardSection]:
        for storyboard in self.repository.storyboards.values():
            for section in storyboard.draft_sections:
                for slot in section.slots:
                    if slot.id == slot_id:
                        return slot, section
        raise NotFoundError("Draft storyboard slot not found.")

    def _touch_storyboard(self, storyboard_id: UUID) -> None:
        storyboard = self.repository.storyboards.get(storyboard_id)
        if storyboard:
            storyboard.updated_at = now_utc()

    def _create_content_units_from_slides(
        self,
        job: IngestionJob,
        slides,
        source_hash: str | None,
    ) -> set[UUID]:
        created_ids: set[UUID] = set()
        source_file_hash = source_hash or str(job.upload_metadata.get("sourceFileHash") or "")
        taxonomy = cast(dict[str, list[str]], job.upload_metadata.get("taxonomy") or {})
        for slide in slides:
            fingerprint = content_unit_fingerprint(
                source_file_hash=source_file_hash,
                source_order_index=slide.source_order_index,
                extracted_text=slide.extracted_text,
                speaker_notes=slide.speaker_notes,
                metadata={
                    "jobId": str(job.id),
                    "workProductVersionId": str(job.work_product_version_id),
                    "sourceOrderIndex": slide.source_order_index,
                },
            )
            existing = self._find_ingested_version(job.id, slide.source_order_index)
            if existing is not None:
                created_ids.add(existing.id)
                continue

            provenance = ProvenanceRecord(
                id=uuid4(),
                origin_type="generated_or_derived",
                source_system="deterministic_pptx_ingest",
                parent_refs=[
                    {
                        "objectType": "ingestion_job",
                        "id": str(job.id),
                    },
                    {
                        "objectType": "work_product_version",
                        "id": str(job.work_product_version_id),
                    },
                    {
                        "objectType": "stored_object",
                        "id": str(job.original_object_id),
                    },
                ],
                source_refs=[
                    str(job.upload_metadata.get("filename") or ""),
                    f"slide {slide.source_order_index}",
                ],
                pipeline_version="deterministic-pptx-v1",
                created_at=now_utc(),
            )
            self.repository.provenance_records[provenance.id] = provenance
            self._save_provenance_record(provenance)

            family = ContentUnitFamily(
                id=uuid4(),
                family_title=f"{job.title or 'Uploaded deck'} - slide {slide.source_order_index}",
                conceptual_summary=slide.extracted_text[:240] if slide.extracted_text else None,
                unit_type="slide",
                taxonomy=taxonomy,
            )
            variant = ContentUnitVariant(
                id=uuid4(),
                family_id=family.id,
                variant_label="Imported source",
                variant_type="source",
                variant_dimensions={"sourceOrderIndex": slide.source_order_index},
                is_canonical=True,
                linked_by="manual",
                linked_confidence=None,
                latest_version_id=None,
            )
            version = ContentUnitVersion(
                id=uuid4(),
                variant_id=variant.id,
                version_number="v1.0",
                render_uri=f"/placeholder/renders/{job.id}/{slide.source_order_index}.png",
                thumbnail_uri=f"/placeholder/thumbs/{job.id}/{slide.source_order_index}.png",
                summary=slide.extracted_text[:240] if slide.extracted_text else None,
                approval_state="draft",
                freshness_state="fresh",
                quality_score=None,
                usage_score=None,
                extracted_text=slide.extracted_text,
                speaker_notes=slide.speaker_notes,
                provenance_id=provenance.id,
                source_slide_count=1,
                created_at=now_utc(),
            )
            variant.latest_version_id = version.id
            self.repository.content_unit_families[family.id] = family
            self.repository.content_unit_variants[variant.id] = variant
            self.repository.content_unit_versions[version.id] = version
            self._save_content_unit(
                family,
                variant,
                version,
                source_work_product_version_id=job.work_product_version_id,
                source_order_index=slide.source_order_index,
                text_hash=fingerprint.text_hash,
                visual_hash=fingerprint.visual_hash,
            )
            created_ids.add(version.id)
        return created_ids

    def _find_ingested_version(
        self,
        job_id: UUID,
        source_order_index: int,
    ) -> ContentUnitVersion | None:
        for version in self.repository.content_unit_versions.values():
            provenance = self.repository.provenance_records.get(version.provenance_id)
            if provenance is None:
                continue
            parent_ids = {str(ref.get("id")) for ref in provenance.parent_refs}
            source_refs = set(provenance.source_refs)
            if str(job_id) in parent_ids and f"slide {source_order_index}" in source_refs:
                return version
        return None

    def _save_stored_object(self, stored_object: StoredObject) -> None:
        save = getattr(self.repository, "save_stored_object", None)
        if callable(save):
            save(stored_object)

    def _save_provenance_record(self, provenance: ProvenanceRecord) -> None:
        save = getattr(self.repository, "save_provenance_record", None)
        if callable(save):
            save(provenance)

    def _save_ingestion_job(self, job: IngestionJob) -> None:
        save = getattr(self.repository, "save_ingestion_job", None)
        if callable(save):
            save(job)

    def _save_work_product(
        self,
        family: WorkProductFamily,
        version: WorkProductVersion,
        *,
        variant_id: UUID,
        original_object_id: UUID | None,
    ) -> None:
        save = getattr(self.repository, "save_work_product", None)
        if callable(save):
            save(
                family,
                version,
                variant_id=variant_id,
                original_object_id=original_object_id,
            )

    def _save_content_unit(
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
        save = getattr(self.repository, "save_content_unit", None)
        if callable(save):
            save(
                family,
                variant,
                version,
                source_work_product_version_id=source_work_product_version_id,
                source_order_index=source_order_index,
                text_hash=text_hash,
                visual_hash=visual_hash,
            )

    def _review_target_version_ids(self, item: ReviewItem) -> tuple[UUID, UUID]:
        version_ids = [
            UUID(str(ref["id"]))
            for ref in item.target_refs
            if ref.get("objectType") == "content_unit_version"
        ]
        if len(version_ids) < 2:
            raise ConflictError("Review action requires two ContentUnit version targets.")
        return version_ids[0], version_ids[1]

    def _variant_id_from_review(self, item: ReviewItem) -> UUID:
        version_id = self._review_target_version_ids(item)[0]
        return self._get_content_unit_version(version_id).variant_id

    def _block_is_restricted(self, block: ContentBlockVersion) -> bool:
        if block.restricted:
            return True
        for member in block.members:
            if member.member_type == "content_unit_version":
                version = self.repository.content_unit_versions.get(member.member_id)
                if version and version.restricted:
                    return True
                if version:
                    variant = self.repository.content_unit_variants.get(version.variant_id)
                    family = (
                        self.repository.content_unit_families.get(variant.family_id)
                        if variant
                        else None
                    )
                    if family and family.restricted:
                        return True
        return False

    def _score_content_unit_family(self, family_id: UUID, terms: list[str]) -> float:
        family = self._get_content_unit_family(family_id)
        variants = self._variants_for_family(family_id)
        versions_by_variant = self._versions_by_variant(family_id)
        haystack_parts = [family.family_title, family.conceptual_summary or ""]
        for values in family.taxonomy.values():
            haystack_parts.extend(values)
        for variant in variants:
            haystack_parts.append(variant.variant_label)
            for version in versions_by_variant.get(variant.id, []):
                haystack_parts.extend(
                    [
                        version.summary or "",
                        version.extracted_text or "",
                        version.speaker_notes or "",
                    ]
                )
        return self._score_text(" ".join(haystack_parts).lower(), terms)

    def _score_text(self, haystack: str, terms: list[str]) -> float:
        if not terms:
            return 0.0
        matched = sum(1 for term in terms if term in haystack)
        if matched == 0:
            return 0.0
        return round(matched / len(terms), 3)

    def _explanation_chips(self, terms: list[str], title: str) -> list[str]:
        chips = ["family-first result"]
        matched = [term for term in terms if term in title.lower()]
        if matched:
            chips.append("title match")
        else:
            chips.append("metadata/text match")
        return chips

    def _interpret_intent(self, request: s.SearchRequest) -> str:
        if request.resultMode != "auto":
            return f"{request.resultMode}_requested"
        lowered = request.query.lower()
        if "story" in lowered or "3 slide" in lowered:
            return "content_block_or_storyboard"
        if "deck" in lowered or "proposal" in lowered:
            return "work_product"
        if "board" in lowered or "technical" in lowered:
            return "variant_specific"
        return "family_broad"
