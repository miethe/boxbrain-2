from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, cast
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from app.application import presenters as p
from app.application.pptx_processor import extract_pptx_slides
from app.application.ports import BoxBrainRepository
from app.application.slide_renderer import (
    RenderedSlideAsset,
    SlideRenderError,
    SlideRenderer,
    build_slide_renderer,
)
from app.domain.errors import ConflictError, NotFoundError
from app.domain.ingestion_search import (
    DETERMINISTIC_EMBEDDING_MODEL,
    DETERMINISTIC_EMBEDDING_VERSION,
    RankedResult,
    SearchDocument,
    SearchQuery,
    content_unit_fingerprint,
    coerce_embedding_vector,
    deterministic_text_embedding,
    hash_bytes,
    rank_documents,
    validate_pptx_upload,
)
from app.domain.ingestion_search.embeddings import DEFAULT_EMBEDDING_DIMS, tokenize
from app.domain.models import (
    Actor,
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
        slide_renderer: SlideRenderer | None = None,
    ) -> None:
        self.repository = repository
        self.object_storage = object_storage or InMemoryObjectStorage()
        self.ingestion_queue = ingestion_queue or NoopIngestionQueue()
        self.slide_renderer = slide_renderer or build_slide_renderer()

    def health(self) -> s.HealthResponse:
        return s.HealthResponse(status="ok")

    def admin_health(self) -> s.AdminHealth:
        self._refresh_repository()
        ingestion = self._admin_ingestion_health()
        queue = self._admin_queue_health(ingestion)
        stages = self._admin_stage_health()
        search_eval = self._admin_search_eval_summary()
        status = "ok"
        if queue.status == "degraded" or search_eval.status == "fail":
            status = "degraded"
        elif search_eval.status == "warn":
            status = "warn"
        return s.AdminHealth(
            status=status,
            ingestion=ingestion,
            queue=queue,
            stages=stages,
            catalog=self._admin_catalog_counts(),
            searchIndex=self._admin_search_index_health(),
            reviewAudit=self._admin_review_audit_counts(),
            composition=self._admin_composition_counts(),
            searchEval=search_eval,
        )

    def _admin_ingestion_health(self) -> s.AdminIngestionHealth:
        jobs = list(self.repository.ingestion_jobs.values())
        status_counts = self._sorted_counts(job.status for job in jobs)
        stage_counts = self._sorted_counts(job.stage for job in jobs)
        failed_jobs = [job for job in jobs if job.status == "failed"]
        recent_failures = sorted(failed_jobs, key=lambda item: item.updated_at, reverse=True)[:5]
        return s.AdminIngestionHealth(
            totalJobs=len(jobs),
            statusCounts=status_counts,
            stageCounts=stage_counts,
            failedJobs=len(failed_jobs),
            retriedJobs=sum(1 for job in jobs if job.retry_count > 0),
            totalRetries=sum(job.retry_count for job in jobs),
            retryableFailures=sum(1 for job in failed_jobs if job.error_code is not None),
            recentFailures=[
                s.AdminIngestionFailure(
                    jobId=job.id,
                    title=job.title,
                    stage=job.stage,
                    errorCode=job.error_code,
                    errorMessage=job.error_message,
                    retryCount=job.retry_count,
                    updatedAt=job.updated_at,
                )
                for job in recent_failures
            ],
        )

    def _admin_queue_health(self, ingestion: s.AdminIngestionHealth) -> s.AdminQueueHealth:
        adapter = type(self.ingestion_queue).__name__
        queue_name = None
        notes: list[str] = []
        enqueued_job_count = None
        queue = getattr(self.ingestion_queue, "queue", None)
        if queue is not None:
            queue_name = str(getattr(queue, "name", "") or "boxbrain-ingestion")
            try:
                enqueued_job_count = int(getattr(queue, "count"))
            except Exception as exc:  # pragma: no cover - depends on live Redis/RQ.
                notes.append(f"Queue depth unavailable: {type(exc).__name__}")
        else:
            enqueued_ids = getattr(self.ingestion_queue, "enqueued_job_ids", None)
            if isinstance(enqueued_ids, list):
                enqueued_job_count = len(enqueued_ids)
                notes.append("In-memory queue adapter records enqueue attempts only.")

        queued_job_count = ingestion.statusCounts.get("queued", 0)
        running_job_count = ingestion.statusCounts.get("running", 0)
        failed_job_count = ingestion.statusCounts.get("failed", 0)
        retry_queued_job_count = ingestion.stageCounts.get("retry_queued", 0)
        if failed_job_count:
            status: Any = "degraded"
        elif queued_job_count or running_job_count or retry_queued_job_count:
            status = "active"
        elif ingestion.totalJobs:
            status = "healthy"
        else:
            status = "idle"
        return s.AdminQueueHealth(
            status=status,
            adapter=adapter,
            queueName=queue_name,
            enqueuedJobCount=enqueued_job_count,
            queuedJobCount=queued_job_count,
            runningJobCount=running_job_count,
            failedJobCount=failed_job_count,
            retryQueuedJobCount=retry_queued_job_count,
            notes=notes,
        )

    def _admin_stage_health(self) -> s.AdminStageHealth:
        jobs = list(self.repository.ingestion_jobs.values())
        completed_stage_counter: Counter[str] = Counter()
        failed_stage_counter: Counter[str] = Counter()
        for job in jobs:
            telemetry = job.upload_metadata.get("stageTelemetry")
            if not isinstance(telemetry, dict):
                continue
            for stage, details in telemetry.items():
                if not isinstance(details, dict):
                    continue
                stage_status = str(details.get("status", ""))
                if stage_status == "failed":
                    failed_stage_counter[str(stage)] += 1
                elif stage_status:
                    completed_stage_counter[str(stage)] += 1
        return s.AdminStageHealth(
            currentStageCounts=self._sorted_counts(job.stage for job in jobs),
            completedStageCounts=dict(sorted(completed_stage_counter.items())),
            failedStageCounts=dict(sorted(failed_stage_counter.items())),
            stagesWithFailures=sorted(failed_stage_counter),
        )

    def _admin_catalog_counts(self) -> s.AdminCatalogCounts:
        return s.AdminCatalogCounts(
            contentUnitFamilies=len(self.repository.content_unit_families),
            contentUnitVariants=len(self.repository.content_unit_variants),
            contentUnitVersions=len(self.repository.content_unit_versions),
            workProductFamilies=len(self.repository.work_product_families),
            workProductVersions=len(self.repository.work_product_versions),
            contentBlocks=len(self.repository.content_blocks),
            storyboards=len(self.repository.storyboards),
            storyboardSnapshots=len(self.repository.storyboard_snapshots),
            storedObjects=len(self.repository.stored_objects),
            provenanceRecords=len(self.repository.provenance_records),
        )

    def _admin_search_index_health(self) -> s.AdminSearchIndexHealth:
        embedding_target_counts = self._sorted_counts(
            embedding.target_type for embedding in self.repository.embeddings.values()
        )
        restricted_content_unit_versions = sum(
            1
            for version in self.repository.content_unit_versions.values()
            if self._is_content_unit_version_restricted(version)
        )
        restricted_work_product_versions = sum(
            1
            for version in self.repository.work_product_versions.values()
            if self._is_work_product_version_restricted(version)
        )
        return s.AdminSearchIndexHealth(
            backend="database" if self._has_database_search() else "memory",
            searchableContentUnitVersions=len(self.repository.content_unit_versions),
            searchableWorkProductVersions=len(self.repository.work_product_versions),
            searchableContentBlocks=len(self.repository.content_blocks),
            embeddings=len(self.repository.embeddings),
            embeddingTargetCounts=embedding_target_counts,
            restrictedContentUnitVersions=restricted_content_unit_versions,
            restrictedWorkProductVersions=restricted_work_product_versions,
            restrictedContentBlocks=sum(1 for block in self.repository.content_blocks.values() if block.restricted),
        )

    def _admin_review_audit_counts(self) -> s.AdminReviewAuditCounts:
        review_items = list(self.repository.review_items.values())
        return s.AdminReviewAuditCounts(
            reviewItems=len(review_items),
            openReviewItems=sum(1 for item in review_items if item.status == "open"),
            reviewItemsByStatus=self._sorted_counts(item.status for item in review_items),
            reviewItemsByQueue=self._sorted_counts(item.queue_type for item in review_items),
            auditEvents=len(self.repository.audit_events),
            auditEventsByAction=self._sorted_counts(event.action for event in self.repository.audit_events),
            comments=len(self.repository.comments),
            notes=len(self.repository.notes),
        )

    def _admin_composition_counts(self) -> s.AdminCompositionCounts:
        storyboards = list(self.repository.storyboards.values())
        snapshots = list(self.repository.storyboard_snapshots.values())
        return s.AdminCompositionCounts(
            contentBlocks=len(self.repository.content_blocks),
            contentBlockMembers=sum(len(block.members) for block in self.repository.content_blocks.values()),
            storyboards=len(storyboards),
            storyboardDraftSections=sum(len(storyboard.draft_sections) for storyboard in storyboards),
            storyboardDraftSlots=sum(
                len(section.slots)
                for storyboard in storyboards
                for section in storyboard.draft_sections
            ),
            storyboardSnapshots=len(snapshots),
            storyboardSnapshotSections=sum(len(snapshot.sections) for snapshot in snapshots),
            storyboardSnapshotSlots=sum(
                len(section.slots)
                for snapshot in snapshots
                for section in snapshot.sections
            ),
        )

    def _admin_search_eval_summary(self) -> s.AdminSearchEvalSummary:
        cases = [
            self._admin_search_eval_case(
                name="operating_margin_retrieval",
                query="operating margin payback",
                role="viewer",
                require_results=True,
            ),
            self._admin_search_eval_case(
                name="technical_architecture_retrieval",
                query="technical architecture migration",
                role="viewer",
                require_results=True,
            ),
            self._admin_search_eval_case(
                name="restricted_viewer_exclusion",
                query="client-sensitive operating margin bridge",
                role="viewer",
                require_no_restricted_results=True,
            ),
        ]
        passed_cases = sum(1 for case in cases if case.passed)
        failed_cases = len(cases) - passed_cases
        if failed_cases == 0:
            status: Any = "pass"
        elif passed_cases:
            status = "warn"
        else:
            status = "fail"
        return s.AdminSearchEvalSummary(
            status=status,
            totalCases=len(cases),
            passedCases=passed_cases,
            failedCases=failed_cases,
            cases=cases,
        )

    def _admin_search_eval_case(
        self,
        *,
        name: str,
        query: str,
        role: s.Role,
        require_results: bool = False,
        require_no_restricted_results: bool = False,
    ) -> s.AdminSearchEvalCase:
        actor = Actor(user_id=f"admin-health-{role}", role=role)
        response = self.search(
            s.SearchRequest(query=query, resultMode="versions", limit=5),
            actor,
        )
        restricted_ids = self._restricted_search_result_ids()
        top = response.items[0] if response.items else None
        returned_ids = {item.objectId for item in response.items}
        notes: list[str] = []
        passed = True
        if require_results and not response.items:
            passed = False
            notes.append("Expected at least one search result.")
        if require_no_restricted_results and returned_ids.intersection(restricted_ids):
            passed = False
            notes.append("Restricted result leaked into viewer search.")
        elif require_no_restricted_results:
            notes.append("Restricted candidates excluded from viewer search.")
        return s.AdminSearchEvalCase(
            name=name,
            query=query,
            role=role,
            topObjectId=top.objectId if top else None,
            topTitle=top.title if top else None,
            resultCount=len(response.items),
            topScore=round(top.score, 6) if top else None,
            passed=passed,
            notes=notes,
        )

    def _restricted_search_result_ids(self) -> set[UUID]:
        ids: set[UUID] = set()
        for content_unit_version in self.repository.content_unit_versions.values():
            if self._is_content_unit_version_restricted(content_unit_version):
                ids.add(content_unit_version.id)
        for work_product_version in self.repository.work_product_versions.values():
            if self._is_work_product_version_restricted(work_product_version):
                ids.add(work_product_version.id)
        ids.update(block.id for block in self.repository.content_blocks.values() if block.restricted)
        return ids

    def _is_content_unit_version_restricted(self, version: ContentUnitVersion) -> bool:
        variant = self.repository.content_unit_variants.get(version.variant_id)
        family = self.repository.content_unit_families.get(variant.family_id) if variant else None
        return bool(version.restricted or (family and family.restricted))

    def _is_work_product_version_restricted(self, version: WorkProductVersion) -> bool:
        family = self.repository.work_product_families.get(version.family_id)
        return bool(version.restricted or (family and family.restricted))

    def _sorted_counts(self, values: Any) -> dict[str, int]:
        return dict(sorted(Counter(str(value) for value in values).items()))

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
        self._save_embedding(
            EmbeddingRecord(
                id=uuid4(),
                target_type="work_product_version",
                target_id=work_product_version.id,
                embedding_kind="text",
                model_name=DETERMINISTIC_EMBEDDING_MODEL,
                model_version=DETERMINISTIC_EMBEDDING_VERSION,
                dims=DEFAULT_EMBEDDING_DIMS,
                metadata={
                    "source": "upload_metadata",
                    "embeddingText": self._work_product_embedding_text(family, work_product_version, taxonomy),
                },
            )
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
        self._refresh_repository()
        jobs = sorted(self.repository.ingestion_jobs.values(), key=lambda item: item.created_at)
        return [p.ingestion_job_model(job) for job in jobs]

    def get_ingestion_job(self, job_id: UUID) -> s.IngestionJob:
        self._refresh_repository()
        return p.ingestion_job_model(self._get_job(job_id))

    def retry_ingestion_job(self, job_id: UUID, actor: Actor) -> s.IngestionJob:
        require_role(actor, "contributor")
        self._refresh_repository()
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
        self._refresh_repository()
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
            self._fail_ingestion_job(
                job,
                stage="validated",
                error_code=validation.error_code or "validation_failed",
                error_message=validation.error_message or "PPTX validation failed.",
            )
            return p.ingestion_job_model(job)

        job.status = "running"
        self._mark_ingestion_stage(job, "validated", status="complete")

        try:
            rendered_assets = self.slide_renderer.render_pptx(
                content=payload,
                filename=str(job.upload_metadata.get("filename") or "upload.pptx"),
                slide_count=int(validation.slide_count or 0),
            )
        except SlideRenderError as exc:
            self._fail_ingestion_job(
                job,
                stage="rendered",
                error_code=exc.code,
                error_message=exc.message,
            )
            return p.ingestion_job_model(job)

        render_assets_by_slide = {asset.source_order_index: asset for asset in rendered_assets}
        self._mark_ingestion_stage(
            job,
            "rendered",
            status="complete",
            metadata={
                "renderCount": len(rendered_assets),
                "renderer": self.slide_renderer.renderer_name,
                "rendererVersion": rendered_assets[0].renderer_version if rendered_assets else None,
            },
        )

        slides = extract_pptx_slides(payload)
        self._mark_ingestion_stage(
            job,
            "extracted",
            status="complete",
            metadata={"slideCount": len(slides), "extractorVersion": "pptx-xml-v2"},
        )

        existing_ids = [
            UUID(value)
            for value in job.upload_metadata.get("createdContentUnitVersionIds", [])
        ]
        if existing_ids:
            created_ids = existing_ids
        else:
            created_ids = self._create_content_units_from_slides(
                job,
                slides,
                validation.content_hash,
                render_assets_by_slide,
            )
        job.upload_metadata["createdContentUnitVersionIds"] = [str(value) for value in created_ids]
        self._mark_ingestion_stage(
            job,
            "units_created",
            status="complete",
            metadata={"createdContentUnitCount": len(created_ids)},
            save=False,
        )
        job.upload_metadata["outputSummary"] = {
            "slideCount": len(slides),
            "renderCount": len(rendered_assets),
            "embeddingCount": len(created_ids),
            "createdContentUnitVersionIds": [str(value) for value in created_ids],
            "workProductVersionId": str(job.work_product_version_id) if job.work_product_version_id else None,
            "warnings": list(job.upload_metadata.get("warnings") or []),
        }
        self._mark_ingestion_stage(
            job,
            "indexed",
            status="complete",
            metadata={"embeddingCount": len(created_ids)},
            save=False,
        )
        job.status = "complete"
        job.error_code = None
        job.error_message = None
        self._mark_ingestion_stage(job, "complete", status="complete", save=False)
        job.completed_at = job.updated_at

        work_product = self.repository.work_product_versions.get(job.work_product_version_id)
        if work_product is not None:
            work_product.filmstrip_version_ids = created_ids
            if created_ids:
                first = self.repository.content_unit_versions[created_ids[0]]
                work_product.preview_uri = first.thumbnail_uri
                family = self.repository.work_product_families.get(work_product.family_id)
                if family is not None:
                    family.preview_uri = first.thumbnail_uri
            self._update_work_product_version(work_product)

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

    def list_content_unit_families(
        self,
        actor: Actor,
        *,
        approval_state: str | None = None,
        freshness_state: str | None = None,
    ) -> list[s.ContentUnitFamilyCard]:
        families = [
            family
            for family in self.repository.content_unit_families.values()
            if self._can_access_family(family.id, actor)
            and self._family_matches_version_filters(
                family.id,
                approval_state=approval_state,
                freshness_state=freshness_state,
                actor=actor,
            )
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
            and self._can_access_version(version.id, actor)
        ]
        return [
            p.content_unit_version_model(version)
            for version in sorted(versions, key=lambda item: item.created_at, reverse=True)
        ]

    def get_content_unit_version(self, version_id: UUID, actor: Actor) -> s.ContentUnitVersionDetail:
        version = self._get_content_unit_version(version_id)
        if not self._can_access_version(version.id, actor):
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
        self._save_content_unit_version(version)
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

    def update_content_unit_freshness(
        self,
        version_id: UUID,
        freshness_state: str,
        actor: Actor,
        notes: str | None = None,
    ) -> s.ContentUnitVersion:
        require_curator_actor(actor)
        version = self._get_content_unit_version(version_id)
        variant = self._get_content_unit_variant(version.variant_id)
        if not self._can_access_family(variant.family_id, actor):
            raise NotFoundError("ContentUnit version not found.")
        prior = {"freshnessState": version.freshness_state}
        version.freshness_state = freshness_state
        self._save_content_unit_version(version)
        self.repository.record_audit(
            action="freshness_state_change",
            actor_id=actor.user_id,
            target_type="content_unit_version",
            target_id=version.id,
            prior_state=prior,
            new_state={"freshnessState": version.freshness_state},
            reason=notes,
        )
        return p.content_unit_version_model(version)

    def similar_content_units(self, version_id: UUID, actor: Actor) -> list[s.SearchResultItem]:
        if not self._can_access_version(version_id, actor):
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
            if not self._can_access_version(target.id, actor):
                continue
            target_variant = self._get_content_unit_variant(target.variant_id)
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

    def where_used(self, version_id: UUID, actor: Actor) -> list[s.ContentUnitUsageReference]:
        if not self._can_access_version(version_id, actor):
            raise NotFoundError("ContentUnit version not found.")
        used: list[s.ContentUnitUsageReference] = []
        for block in self.repository.content_blocks.values():
            if not self._can_access_block(block, actor):
                continue
            for member in block.members:
                if member.member_id == version_id:
                    used.append(
                        s.ContentUnitUsageReference(
                            objectType="content_block_version",
                            objectId=block.id,
                            title=block.title,
                            orderIndex=member.order_index,
                            memberId=member.id,
                        )
                    )
        for storyboard in self.repository.storyboards.values():
            if not self._can_access_storyboard(storyboard, actor):
                continue
            for section in storyboard.draft_sections:
                for slot in section.slots:
                    if slot.selected_object_id == version_id:
                        used.append(
                            s.ContentUnitUsageReference(
                                objectType="storyboard",
                                objectId=storyboard.id,
                                title=storyboard.title,
                                orderIndex=slot.order_index,
                                sectionId=section.id,
                                slotId=slot.id,
                            )
                        )
        for work_product in self.repository.work_product_versions.values():
            if not self._can_access_work_product_version(work_product, actor):
                continue
            for order_index, filmstrip_version_id in enumerate(work_product.filmstrip_version_ids):
                if filmstrip_version_id == version_id:
                    used.append(
                        s.ContentUnitUsageReference(
                            objectType="work_product_version",
                            objectId=work_product.id,
                            title=work_product.title,
                            orderIndex=order_index,
                            workProductVersionId=work_product.id,
                        )
                    )
        return used

    def list_work_product_families(self, actor: Actor) -> list[s.WorkProductFamilyCard]:
        families = [
            family
            for family in self.repository.work_product_families.values()
            if self._can_access_work_product_family(family.id, actor)
        ]
        return [
            p.work_product_family_card(family, self._latest_work_product_version(family.id))
            for family in sorted(families, key=lambda item: item.title)
        ]

    def get_work_product_version(self, version_id: UUID, actor: Actor) -> s.WorkProductVersionDetail:
        version = self._get_work_product_version(version_id)
        if not self._can_access_work_product_version(version, actor):
            raise NotFoundError("WorkProduct version not found.")
        filmstrip = [
            unit
            for unit_id in version.filmstrip_version_ids
            if self._can_access_version(unit_id, actor)
            for unit in [self.repository.content_unit_versions[unit_id]]
        ]
        provenance = self.repository.provenance_records[version.provenance_id]
        family = self.repository.work_product_families[version.family_id]
        return p.work_product_version_detail(family, version, filmstrip, provenance)

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
        self._validate_content_block_members(members, actor)
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
        self._save_content_block(block)
        return p.content_block_model(block)

    def list_content_blocks(self, actor: Actor) -> list[s.ContentBlockVersionDetail]:
        self._refresh_repository()
        blocks = sorted(
            (
                block
                for block in self.repository.content_blocks.values()
                if self._can_access_block(block, actor)
            ),
            key=lambda item: item.title,
        )
        return [p.content_block_model(block) for block in blocks]

    def get_content_block(self, block_id: UUID, actor: Actor) -> s.ContentBlockVersionDetail:
        self._refresh_repository()
        block = self.repository.content_blocks.get(block_id)
        if block is None or not self._can_access_block(block, actor):
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
        self._save_storyboard(storyboard)
        return p.storyboard_model(storyboard)

    def list_storyboards(self, actor: Actor) -> list[s.Storyboard]:
        self._refresh_repository()
        return [
            p.storyboard_model(storyboard)
            for storyboard in sorted(self.repository.storyboards.values(), key=lambda item: item.title)
            if self._can_access_storyboard(storyboard, actor)
        ]

    def get_storyboard(self, storyboard_id: UUID, actor: Actor) -> s.StoryboardDetail:
        self._refresh_repository()
        storyboard = self._get_storyboard(storyboard_id)
        if not self._can_access_storyboard(storyboard, actor):
            raise NotFoundError("Storyboard not found.")
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
        self._refresh_repository()
        storyboard = self._get_storyboard(storyboard_id)
        if not self._can_access_storyboard(storyboard, actor):
            raise NotFoundError("Storyboard not found.")
        snapshot = self.repository.freeze_storyboard_snapshot(storyboard, request.versionLabel)
        return p.storyboard_snapshot_model(snapshot)

    def list_storyboard_snapshots(self, storyboard_id: UUID, actor: Actor) -> list[s.StoryboardSnapshot]:
        self._refresh_repository()
        storyboard = self._get_storyboard(storyboard_id)
        if not self._can_access_storyboard(storyboard, actor):
            raise NotFoundError("Storyboard not found.")
        snapshots = [
            snapshot
            for snapshot in self.repository.storyboard_snapshots.values()
            if snapshot.storyboard_id == storyboard_id
            and self._can_access_storyboard_snapshot(snapshot, actor)
        ]
        return [
            p.storyboard_snapshot_model(snapshot)
            for snapshot in sorted(snapshots, key=lambda item: item.created_at)
        ]

    def get_storyboard_snapshot(self, snapshot_id: UUID, actor: Actor) -> s.StoryboardSnapshot:
        self._refresh_repository()
        snapshot = self.repository.storyboard_snapshots.get(snapshot_id)
        if snapshot is None or not self._can_access_storyboard_snapshot(snapshot, actor):
            raise NotFoundError("Storyboard snapshot not found.")
        return p.storyboard_snapshot_model(snapshot)

    def create_storyboard_section(
        self,
        storyboard_id: UUID,
        request: s.CreateStoryboardSectionRequest,
        actor: Actor,
    ) -> s.StoryboardSection:
        require_role(actor, "contributor")
        self._refresh_repository()
        storyboard = self._get_storyboard(storyboard_id)
        if not self._can_access_storyboard(storyboard, actor):
            raise NotFoundError("Storyboard not found.")
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
        self._save_storyboard(storyboard)
        return p.storyboard_section_model(section)

    def update_storyboard_section(
        self,
        section_id: UUID,
        request: s.CreateStoryboardSectionRequest,
        actor: Actor,
    ) -> s.StoryboardSection:
        require_role(actor, "contributor")
        self._refresh_repository()
        section = self._get_draft_section(section_id)
        parent = self._get_storyboard(section.storyboard_id)
        if not self._can_access_storyboard(parent, actor):
            raise NotFoundError("Draft storyboard section not found.")
        section.title = request.title
        section.summary = request.summary
        if request.orderIndex is not None:
            section.order_index = request.orderIndex
        self._touch_storyboard(section.storyboard_id)
        self._save_storyboard(parent)
        return p.storyboard_section_model(section)

    def create_storyboard_slot(
        self,
        section_id: UUID,
        request: s.CreateStoryboardSlotRequest,
        actor: Actor,
    ) -> s.StoryboardSlot:
        require_role(actor, "contributor")
        self._refresh_repository()
        section = self._get_draft_section(section_id)
        parent = self._get_storyboard(section.storyboard_id)
        if not self._can_access_storyboard(parent, actor):
            raise NotFoundError("Draft storyboard section not found.")
        self._validate_slot_selection(
            request.slotType,
            request.selectedObjectType,
            request.selectedObjectId,
            actor,
        )
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
        self._save_storyboard(parent)
        return p.storyboard_slot_model(slot)

    def update_storyboard_slot(
        self,
        slot_id: UUID,
        request: s.UpdateStoryboardSlotRequest,
        actor: Actor,
    ) -> s.StoryboardSlot:
        require_role(actor, "contributor")
        self._refresh_repository()
        slot, section = self._get_draft_slot(slot_id)
        parent = self._get_storyboard(section.storyboard_id)
        if not self._can_access_storyboard(parent, actor):
            raise NotFoundError("Draft storyboard slot not found.")
        slot_type = request.slotType or slot.slot_type
        selected_object_type = (
            request.selectedObjectType if request.selectedObjectType is not None else slot.selected_object_type
        )
        selected_object_id = (
            request.selectedObjectId if request.selectedObjectId is not None else slot.selected_object_id
        )
        self._validate_slot_selection(slot_type, selected_object_type, selected_object_id, actor)
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
        self._save_storyboard(parent)
        return p.storyboard_slot_model(slot)

    def analyze_storyboard(self, storyboard_id: UUID, actor: Actor) -> s.StoryboardDiagnostics:
        self._refresh_repository()
        storyboard = self._get_storyboard(storyboard_id)
        if not self._can_access_storyboard(storyboard, actor):
            raise NotFoundError("Storyboard not found.")
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
        if not self._can_access_target(request.targetType, request.targetId, actor):
            raise NotFoundError("Comment target not found.")
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
        self._save_comment(comment)
        return p.comment_model(comment)

    def list_comments(
        self,
        target_type: str | None,
        target_id: UUID | None,
        actor: Actor,
    ) -> list[s.Comment]:
        comments = list(self.repository.comments.values())
        if target_type:
            comments = [comment for comment in comments if comment.target_type == target_type]
        if target_id:
            comments = [comment for comment in comments if comment.target_id == target_id]
        comments = [
            comment
            for comment in comments
            if self._can_access_target(comment.target_type, comment.target_id, actor)
        ]
        return [
            p.comment_model(comment)
            for comment in sorted(comments, key=lambda item: item.created_at)
        ]

    def create_note(self, request: s.CreateNoteRequest, actor: Actor) -> s.Note:
        require_curator_actor(actor)
        if not self._can_access_target(request.targetType, request.targetId, actor):
            raise NotFoundError("Note target not found.")
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
        self._save_note(note)
        self.repository.record_audit(
            action="note_create",
            actor_id=actor.user_id,
            target_type=note.target_type,
            target_id=note.target_id,
            prior_state={},
            new_state={"noteId": str(note.id), "noteType": note.note_type},
        )
        return p.note_model(note)

    def list_notes(
        self,
        target_type: str | None,
        target_id: UUID | None,
        actor: Actor,
    ) -> list[s.Note]:
        notes = list(self.repository.notes.values())
        if target_type:
            notes = [note for note in notes if note.target_type == target_type]
        if target_id:
            notes = [note for note in notes if note.target_id == target_id]
        notes = [
            note
            for note in notes
            if self._can_access_target(note.target_type, note.target_id, actor)
        ]
        return [p.note_model(note) for note in sorted(notes, key=lambda item: item.created_at)]

    def generate_review_candidates(self, actor: Actor) -> list[s.ReviewItem]:
        require_review_actor(actor)
        self._refresh_repository()
        created: list[ReviewItem] = []
        for item in self._deterministic_review_candidates():
            if self._review_candidate_exists(item):
                continue
            self.repository.review_items[item.id] = item
            self._save_review_item(item)
            created.append(item)
            self.repository.record_audit(
                action="review_candidate_generated",
                actor_id=actor.user_id,
                target_type="review_item",
                target_id=item.id,
                prior_state={},
                new_state={
                    "queueType": item.queue_type,
                    "status": item.status,
                    "suggestedAction": item.suggested_action,
                },
                reason="Deterministic review candidate generation",
                metadata={
                    "source": item.source,
                    "targetRefs": item.target_refs,
                    "confidence": item.confidence,
                },
            )
        return [p.review_item_model(item) for item in sorted(created, key=lambda item: item.created_at)]

    def review_queues(self, actor: Actor) -> list[s.ReviewQueueSummary]:
        require_review_actor(actor)
        self._refresh_repository()
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
        actor: Actor,
        queue_type: str | None = None,
        status: str = "open",
    ) -> list[s.ReviewItem]:
        require_review_actor(actor)
        self._refresh_repository()
        items = list(self.repository.review_items.values())
        if queue_type:
            items = [item for item in items if item.queue_type == queue_type]
        if status:
            items = [item for item in items if item.status == status]
        return [p.review_item_model(item) for item in sorted(items, key=lambda item: item.created_at)]

    def get_review_item(self, review_item_id: UUID, actor: Actor) -> s.ReviewItemDetail:
        require_review_actor(actor)
        self._refresh_repository()
        return p.review_item_detail_model(self._get_review_item(review_item_id))

    def review_action(
        self,
        review_item_id: UUID,
        action: str,
        request: s.ReviewActionRequest,
        actor: Actor,
    ) -> s.ReviewActionResponse:
        require_review_actor(actor)
        self._refresh_repository()
        item = self._get_review_item(review_item_id)
        if item.status != "open":
            raise ConflictError("Review item is not open.")
        prior = {"status": item.status}
        metadata: dict[str, Any] = {"queueType": item.queue_type}
        resolved_action = self._resolve_review_action(item, action)

        if resolved_action == "mark-similar":
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
            self._save_similarity_edge(edge)
            item.status = "accepted"
            metadata["similarityEdgeId"] = str(edge.id)
        elif resolved_action == "mark-variant":
            left, right = self._review_target_version_ids(item)
            moved_variant = self._link_versions_as_variants(left, right, actor, request.reason, item.confidence)
            item.status = "accepted"
            metadata["relationship"] = "variant_candidate_accepted"
            metadata["variantId"] = str(moved_variant.id)
        elif resolved_action == "merge-versions":
            left, right = self._review_target_version_ids(item)
            self._merge_duplicate_versions(left, right, actor, request.reason)
            item.status = "accepted"
            metadata["relationship"] = "version_merge_queued"
            metadata["survivingVersionId"] = str(left)
            metadata["deprecatedVersionId"] = str(right)
        elif resolved_action == "set-canonical":
            variant_id = request.targetVariantId or self._variant_id_from_review(item)
            self._set_canonical_variant_unchecked(variant_id, actor, request.reason)
            item.status = "accepted"
            metadata["canonicalVariantId"] = str(variant_id)
        elif resolved_action == "approve":
            version_id = request.targetVersionId or self._first_review_version_id(item)
            if version_id is None:
                raise ConflictError("Review action requires a ContentUnit version target.")
            self.update_content_unit_approval(version_id, "approved", actor, request.reason)
            item.status = "accepted"
            metadata["approvedVersionId"] = str(version_id)
        elif resolved_action == "deprecate":
            version_id = request.targetVersionId or self._first_review_version_id(item)
            if version_id is None:
                raise ConflictError("Review action requires a ContentUnit version target.")
            self.update_content_unit_approval(version_id, "deprecated", actor, request.reason)
            item.status = "accepted"
            metadata["deprecatedVersionId"] = str(version_id)
        elif resolved_action == "reject":
            if item.queue_type == "approval":
                version_id = request.targetVersionId or self._first_review_version_id(item)
                if version_id is None:
                    raise ConflictError("Review action requires a ContentUnit version target.")
                self.update_content_unit_approval(version_id, "deprecated", actor, request.reason)
                metadata["rejectedVersionId"] = str(version_id)
            item.status = "rejected"
        elif resolved_action == "request-changes":
            version_id = self._first_review_version_id(item)
            if version_id is not None:
                self.update_content_unit_approval(version_id, "review", actor, request.reason)
                metadata["changesRequestedVersionId"] = str(version_id)
            item.status = "resolved"
        else:
            raise NotFoundError("Review action not found.")

        item.resolved_at = now_utc()
        self._save_review_item(item, resolved_by=actor.user_id, resolution_notes=request.reason)
        audit_event = self.repository.record_audit(
            action=f"review_{resolved_action.replace('-', '_')}",
            actor_id=actor.user_id,
            target_type="review_item",
            target_id=item.id,
            prior_state=prior,
            new_state={"status": item.status},
            reason=request.reason,
            metadata=metadata,
        )
        return s.ReviewActionResponse(
            reviewItemId=item.id,
            auditEventId=audit_event.id,
            status=cast(Any, item.status),
            action=resolved_action,
            queueType=item.queue_type,
            metadata=metadata,
        )

    def search(self, request: s.SearchRequest, actor: Actor) -> s.SearchResponse:
        self._refresh_repository()
        requested_types = {item.casefold() for item in request.objectTypes}
        search_query = SearchQuery(
            text=request.query.strip(),
            taxonomy=self._taxonomy_filters(request),
            metadata_filters=self._metadata_filters(request),
            include_restricted=can_view_restricted(actor),
        )
        result_mode = self._resolve_result_mode(request)
        hybrid_results = self._hybrid_search_results(
            search_query,
            requested_types=requested_types,
            actor=actor,
            limit=max(request.limit * 4, request.limit),
        )
        filtered_restricted = self._restricted_search_candidate_count(requested_types, actor)
        items = self._search_items_from_ranked_results(hybrid_results, result_mode, actor)

        if request.profile == "approved_only":
            items = [item for item in items if item.statusChips.approvalState == "approved"]

        items = sorted(items, key=lambda item: (item.score, item.title), reverse=True)[: request.limit]
        debug = None
        if self._can_view_search_debug(actor):
            debug = {
                "filteredRestrictedCount": filtered_restricted,
                "profile": request.profile,
                "resultMode": result_mode,
                "backend": "database" if self._has_database_search() else "memory",
            }
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

    def _hybrid_search_results(
        self,
        query: SearchQuery,
        *,
        requested_types: set[str],
        actor: Actor,
        limit: int,
    ) -> list[RankedResult]:
        database_search = getattr(self.repository, "hybrid_search_documents", None)
        if callable(database_search):
            results = list(
                database_search(
                    query,
                    object_types=requested_types,
                    include_restricted=can_view_restricted(actor),
                    limit=limit,
                )
            )
        else:
            results = self._memory_search_results(
                query,
                requested_types=requested_types,
                actor=actor,
                limit=limit,
            )
        return [result for result in results if self._passes_search_relevance(query, result)]

    def _memory_search_results(
        self,
        query: SearchQuery,
        *,
        requested_types: set[str],
        actor: Actor,
        limit: int,
    ) -> list[RankedResult]:
        documents = self._memory_search_documents(requested_types, actor)
        return rank_documents(query, documents, limit=limit)

    def _memory_search_documents(
        self,
        requested_types: set[str],
        actor: Actor,
    ) -> list[SearchDocument]:
        documents: list[SearchDocument] = []
        include_content_units = not requested_types or bool(
            requested_types.intersection(
                {
                    "content_unit",
                    "content_units",
                    "content_unit_family",
                    "content_unit_variant",
                    "content_unit_version",
                }
            )
        )
        if include_content_units:
            for version in self.repository.content_unit_versions.values():
                if not self._can_access_version(version.id, actor):
                    continue
                variant = self.repository.content_unit_variants.get(version.variant_id)
                family = (
                    self.repository.content_unit_families.get(variant.family_id)
                    if variant
                    else None
                )
                if variant is None or family is None:
                    continue
                documents.append(
                    SearchDocument(
                        id=str(version.id),
                        object_type="content_unit_version",
                        title=family.family_title,
                        summary=version.summary or family.conceptual_summary or "",
                        text=version.extracted_text or "",
                        speaker_notes=version.speaker_notes or "",
                        taxonomy=family.taxonomy,
                        metadata={
                            "familyId": str(family.id),
                            "variantId": str(variant.id),
                            "versionId": str(version.id),
                            "familyTitle": family.family_title,
                            "familySummary": family.conceptual_summary,
                            "variantLabel": variant.variant_label,
                            "variantType": variant.variant_type,
                            "variantDimensions": variant.variant_dimensions,
                            "isCanonical": variant.is_canonical,
                            "linkSource": variant.linked_by,
                            "versionNumber": version.version_number,
                            "sourceOrderIndex": version.source_order_index,
                            "previewUri": version.thumbnail_uri,
                        },
                        embedding=self._stored_embedding("content_unit_version", version.id),
                        approval_state=version.approval_state,
                        freshness_state=version.freshness_state,
                        updated_at=version.created_at,
                        is_restricted=family.restricted or version.restricted,
                    )
                )

        include_work_products = not requested_types or bool(
            requested_types.intersection(
                {
                    "work_product",
                    "work_products",
                    "work_product_family",
                    "work_product_version",
                }
            )
        )
        if include_work_products:
            for wp_version in self.repository.work_product_versions.values():
                if not self._can_access_work_product_version(wp_version, actor):
                    continue
                wp_family = self.repository.work_product_families.get(wp_version.family_id)
                if wp_family is None:
                    continue
                documents.append(
                    SearchDocument(
                        id=str(wp_version.id),
                        object_type="work_product_version",
                        title=wp_family.title,
                        summary=wp_family.summary or "",
                        text=" ".join(
                            part
                            for part in (
                                wp_version.title,
                                wp_family.summary or "",
                                wp_family.artifact_type,
                            )
                            if part
                        ),
                        taxonomy={},
                        metadata={
                            "familyId": str(wp_family.id),
                            "versionId": str(wp_version.id),
                            "familyTitle": wp_family.title,
                            "familySummary": wp_family.summary,
                            "artifactType": wp_family.artifact_type,
                            "versionNumber": wp_version.version_number,
                            "previewUri": wp_version.preview_uri or wp_family.preview_uri,
                            "isCanonical": True,
                            "linkSource": "manual",
                        },
                        embedding=self._stored_embedding("work_product_version", wp_version.id),
                        approval_state=wp_version.approval_state,
                        freshness_state="fresh",
                        is_restricted=wp_family.restricted or wp_version.restricted,
                    )
                )
        include_content_blocks = not requested_types or bool(
            requested_types.intersection(
                {
                    "content_block",
                    "content_blocks",
                    "content_block_family",
                    "content_block_variant",
                    "content_block_version",
                }
            )
        )
        if include_content_blocks:
            for block in self.repository.content_blocks.values():
                if not self._can_access_block(block, actor):
                    continue
                documents.append(
                    SearchDocument(
                        id=str(block.id),
                        object_type="content_block_version",
                        title=block.title,
                        summary=block.summary or "",
                        text=" ".join(
                            part
                            for part in (
                                block.title,
                                block.summary or "",
                                block.block_type,
                                " ".join(member.role or "" for member in block.members),
                                " ".join(member.notes or "" for member in block.members),
                            )
                            if part
                        ),
                        taxonomy={},
                        metadata={
                            "familyId": str(block.family_id),
                            "variantId": str(block.family_id),
                            "versionId": str(block.id),
                            "familyTitle": block.title,
                            "familySummary": block.summary,
                            "blockType": block.block_type,
                            "versionNumber": "v1.0",
                            "memberCount": len(block.members),
                            "isCanonical": True,
                            "linkSource": "manual",
                            "previewUri": None,
                        },
                        approval_state=block.approval_state,
                        freshness_state="fresh",
                        updated_at=block.created_at,
                        is_restricted=block.restricted,
                    )
                )
        return documents

    def _passes_search_relevance(self, query: SearchQuery, result: RankedResult) -> bool:
        if not query.text.strip():
            return True
        breakdown = result.breakdown
        if breakdown.metadata > 0:
            return True
        query_token_count = len(tokenize(query.text))
        if breakdown.lexical > 0 and (query_token_count <= 2 or breakdown.lexical >= 0.5):
            return True
        return breakdown.semantic >= 0.55

    def _search_items_from_ranked_results(
        self,
        results: list[RankedResult],
        result_mode: str,
        actor: Actor,
    ) -> list[s.SearchResultItem]:
        grouped: dict[tuple[str, str], list[RankedResult]] = defaultdict(list)
        for result in results:
            key = self._search_group_key(result.document, result_mode)
            if key is not None:
                grouped[key].append(result)

        items: list[s.SearchResultItem] = []
        for group_results in grouped.values():
            group_results.sort(key=lambda item: item.score, reverse=True)
            top = group_results[0]
            item = self._search_item_from_result(top, result_mode, len(group_results), actor)
            if item is not None:
                items.append(item)
        return items

    def _search_group_key(
        self,
        document: SearchDocument,
        result_mode: str,
    ) -> tuple[str, str] | None:
        metadata = document.metadata
        if document.object_type == "content_unit_version":
            if result_mode == "families":
                return ("content_unit_family", str(metadata.get("familyId") or ""))
            if result_mode == "variants":
                return ("content_unit_variant", str(metadata.get("variantId") or ""))
            return ("content_unit_version", str(metadata.get("versionId") or document.id))
        if document.object_type == "work_product_version":
            if result_mode == "versions":
                return ("work_product_version", str(metadata.get("versionId") or document.id))
            return ("work_product_family", str(metadata.get("familyId") or ""))
        if document.object_type == "content_block_version":
            return ("content_block_version", str(metadata.get("versionId") or document.id))
        return None

    def _search_item_from_result(
        self,
        result: RankedResult,
        result_mode: str,
        group_count: int,
        actor: Actor,
    ) -> s.SearchResultItem | None:
        document = result.document
        metadata = document.metadata
        score = min(1.0, result.score + (0.03 * max(group_count - 1, 0)))
        chips = self._component_explanation_chips(result, result_mode, group_count)
        if document.object_type == "content_unit_version":
            version_id = UUID(str(metadata.get("versionId") or document.id))
            version = self.repository.content_unit_versions.get(version_id)
            if version is None or not self._can_access_version(version.id, actor):
                return None
            variant = self._get_content_unit_variant(version.variant_id)
            family = self._get_content_unit_family(variant.family_id)
            if result_mode == "families":
                card = p.content_unit_family_card(
                    family,
                    self._variants_for_family(family.id),
                    self._versions_by_variant(family.id),
                )
                return s.SearchResultItem(
                    objectType="content_unit_family",
                    objectId=family.id,
                    resultGrain="family",
                    title=card.familyTitle,
                    summary=card.conceptualSummary,
                    previewUri=card.canonicalPreviewUri,
                    score=round(score, 6),
                    explanationChips=chips,
                    statusChips=card.statusChips,
                )
            if result_mode == "variants":
                return s.SearchResultItem(
                    objectType="content_unit_variant",
                    objectId=variant.id,
                    resultGrain="variant",
                    title=f"{family.family_title} - {variant.variant_label}",
                    summary=version.summary or family.conceptual_summary,
                    previewUri=version.thumbnail_uri,
                    score=round(score, 6),
                    explanationChips=chips,
                    statusChips=p.content_unit_status(family, variant, version),
                )
            return s.SearchResultItem(
                objectType="content_unit_version",
                objectId=version.id,
                resultGrain="version",
                title=f"{family.family_title} ({version.version_number})",
                summary=version.summary or family.conceptual_summary,
                previewUri=version.thumbnail_uri,
                score=round(score, 6),
                explanationChips=chips,
                statusChips=p.content_unit_status(family, variant, version),
            )

        if document.object_type == "work_product_version":
            version_id = UUID(str(metadata.get("versionId") or document.id))
            wp_version = self.repository.work_product_versions.get(version_id)
            if wp_version is None or not self._can_access_work_product_version(wp_version, actor):
                return None
            wp_family = self.repository.work_product_families.get(wp_version.family_id)
            if wp_family is None:
                return None
            object_type = "work_product_version" if result_mode == "versions" else "work_product_family"
            object_id = wp_version.id if result_mode == "versions" else wp_family.id
            return s.SearchResultItem(
                objectType=object_type,
                objectId=object_id,
                resultGrain="work_product",
                title=wp_version.title if result_mode == "versions" else wp_family.title,
                summary=wp_family.summary,
                previewUri=wp_version.preview_uri or wp_family.preview_uri,
                score=round(score, 6),
                explanationChips=chips,
                statusChips=p.work_product_status(wp_family, wp_version),
            )
        if document.object_type == "content_block_version":
            block_id = UUID(str(metadata.get("versionId") or document.id))
            block = self.repository.content_blocks.get(block_id)
            if block is None or not self._can_access_block(block, actor):
                return None
            if "ordered composition" not in chips:
                chips.append("ordered composition")
            return s.SearchResultItem(
                objectType="content_block_version",
                objectId=block.id,
                resultGrain="block",
                title=block.title,
                summary=block.summary,
                previewUri=None,
                score=round(score, 6),
                explanationChips=chips,
                statusChips=s.StatusChips(
                    approvalState=cast(s.ApprovalState, block.approval_state),
                    freshnessState="fresh",
                    isCanonical=True,
                    isRestricted=block.restricted,
                    linkSource="manual",
                ),
            )
        return None

    def _content_block_search_items(
        self,
        request: s.SearchRequest,
        actor: Actor,
    ) -> list[s.SearchResultItem]:
        terms = [term for term in request.query.casefold().split() if term]
        items: list[s.SearchResultItem] = []
        for block in self.repository.content_blocks.values():
            if not self._can_access_block(block, actor):
                continue
            haystack = f"{block.title} {block.summary or ''}".casefold()
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
                    explanationChips=["keyword match", "ordered composition"],
                    statusChips=s.StatusChips(
                        approvalState=cast(s.ApprovalState, block.approval_state),
                        freshnessState="fresh",
                        isCanonical=True,
                        isRestricted=block.restricted,
                        linkSource="manual",
                    ),
                )
            )
        return items

    def _component_explanation_chips(
        self,
        result: RankedResult,
        result_mode: str,
        group_count: int,
    ) -> list[str]:
        label_map = {
            "lexical": "keyword match",
            "semantic": "semantic match",
            "metadata": "metadata match",
            "trusted": "approved/trusted",
        }
        chips = [label_map.get(chip, chip) for chip in result.explanation]
        if not chips:
            chips.append("deterministic rank")
        if result_mode == "families":
            chips.append("family rollup")
        elif result_mode == "variants":
            chips.append("variant rollup")
        else:
            chips.append("version match")
        if group_count > 1:
            chips.append(f"{group_count} matching versions")
        return chips

    def _stored_embedding(self, target_type: str, target_id: UUID) -> tuple[float, ...] | None:
        for embedding in self.repository.embeddings.values():
            if (
                embedding.target_type == target_type
                and embedding.target_id == target_id
                and embedding.embedding_kind == "text"
            ):
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

    def _taxonomy_filters(self, request: s.SearchRequest) -> dict[str, Any]:
        taxonomy = request.filters.get("taxonomy")
        return dict(taxonomy) if isinstance(taxonomy, dict) else {}

    def _metadata_filters(self, request: s.SearchRequest) -> dict[str, Any]:
        return {key: value for key, value in request.filters.items() if key != "taxonomy"}

    def _resolve_result_mode(self, request: s.SearchRequest) -> str:
        if request.resultMode != "auto":
            return request.resultMode
        lowered = request.query.casefold()
        if any(term in lowered for term in ("version", "latest", "exact", "slide", "source")):
            return "versions"
        if request.profile in {"executive", "technical"}:
            return "variants"
        if any(term in lowered for term in ("board", "executive", "technical", "audience")):
            return "variants"
        return "families"

    def _restricted_search_candidate_count(self, requested_types: set[str], actor: Actor) -> int:
        if can_view_restricted(actor):
            return 0
        count = 0
        content_types = {
            "content_unit",
            "content_units",
            "content_unit_family",
            "content_unit_variant",
            "content_unit_version",
        }
        work_product_types = {
            "work_product",
            "work_products",
            "work_product_family",
            "work_product_version",
        }
        if not requested_types or requested_types.intersection(content_types):
            count += sum(
                1
                for version in self.repository.content_unit_versions.values()
                if not self._can_access_version(version.id, actor)
            )
        if not requested_types or requested_types.intersection(work_product_types):
            count += sum(
                1
                for version in self.repository.work_product_versions.values()
                if not self._can_access_work_product_version(version, actor)
            )
        if not requested_types or requested_types.intersection({"content_block", "content_blocks"}):
            count += sum(
                1
                for block in self.repository.content_blocks.values()
                if not self._can_access_block(block, actor)
            )
        return count

    def _has_database_search(self) -> bool:
        return callable(getattr(self.repository, "hybrid_search_documents", None))

    def _can_view_search_debug(self, actor: Actor) -> bool:
        return actor.role in {"reviewer", "admin"}

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

    def _deterministic_review_candidates(self) -> list[ReviewItem]:
        versions = sorted(
            self.repository.content_unit_versions.values(),
            key=lambda item: (item.created_at, str(item.id)),
        )
        candidates: list[ReviewItem] = []

        for index, left in enumerate(versions):
            for right in versions[index + 1 :]:
                score = self._version_text_similarity(left, right)
                left_variant = self.repository.content_unit_variants.get(left.variant_id)
                right_variant = self.repository.content_unit_variants.get(right.variant_id)
                if left_variant is None or right_variant is None:
                    continue
                same_family = left_variant.family_id == right_variant.family_id
                exact_duplicate = (
                    self._normalized_review_text(left) == self._normalized_review_text(right)
                    and bool(self._normalized_review_text(left))
                )
                if exact_duplicate:
                    candidates.append(
                        self._build_review_candidate(
                            queue_type="duplicate",
                            suggested_action="merge_versions",
                            target_versions=[left, right],
                            confidence=1.0,
                            rationale="Deterministic text fingerprint matched exactly; reviewer must confirm before graph mutation.",
                        )
                    )
                    continue
                if same_family and left.variant_id != right.variant_id and score >= 0.2:
                    candidates.append(
                        self._build_review_candidate(
                            queue_type="variant",
                            suggested_action="mark_variant",
                            target_versions=[left, right],
                            confidence=score,
                            rationale="Versions are already near the same family and share enough text to review variant linkage.",
                        )
                    )
                elif not same_family and score >= 0.65:
                    candidates.append(
                        self._build_review_candidate(
                            queue_type="variant",
                            suggested_action="mark_variant",
                            target_versions=[left, right],
                            confidence=score,
                            rationale="Different families have high text overlap; reviewer can link them as variants if conceptually aligned.",
                        )
                    )
                elif not same_family and score >= 0.25:
                    candidates.append(
                        self._build_review_candidate(
                            queue_type="similarity",
                            suggested_action="mark_similar",
                            target_versions=[left, right],
                            confidence=score,
                            rationale="Different families have overlapping text signals; reviewer can record similarity without merging families.",
                        )
                    )

        for version in versions:
            if version.freshness_state in {"aging", "stale"}:
                candidates.append(
                    self._build_review_candidate(
                        queue_type="stale",
                        suggested_action="deprecate",
                        target_versions=[version],
                        confidence=0.9 if version.freshness_state == "stale" else 0.7,
                        rationale=f"ContentUnit version is marked {version.freshness_state}; review before reuse.",
                    )
                )
            if version.approval_state in {"draft", "review"}:
                candidates.append(
                    self._build_review_candidate(
                        queue_type="approval",
                        suggested_action="approve",
                        target_versions=[version],
                        confidence=0.8 if version.approval_state == "review" else 0.55,
                        rationale=f"ContentUnit version is in {version.approval_state} state and needs human approval review.",
                    )
                )

        candidates.sort(key=lambda item: (item.queue_type, item.suggested_action or "", str(item.id)))
        return candidates

    def _build_review_candidate(
        self,
        *,
        queue_type: str,
        suggested_action: str,
        target_versions: list[ContentUnitVersion],
        confidence: float,
        rationale: str,
    ) -> ReviewItem:
        target_refs = [
            {"objectType": "content_unit_version", "id": str(version.id)}
            for version in target_versions
        ]
        candidate_key = "|".join(
            [
                queue_type,
                suggested_action,
                *sorted(str(version.id) for version in target_versions),
            ]
        )
        action_name = suggested_action.replace("_", "-")
        return ReviewItem(
            id=uuid5(NAMESPACE_URL, f"boxbrain-review-candidate:{candidate_key}"),
            queue_type=queue_type,
            status="open",
            confidence=round(max(0.0, min(1.0, confidence)), 4),
            rationale=rationale,
            suggested_action=suggested_action,
            target_refs=target_refs,
            compare_objects=[self._review_compare_object(version) for version in target_versions],
            source="deterministic_ai",
            audit_preview={
                "action": f"review_{action_name.replace('-', '_')}",
                "requiresRole": "reviewer",
                "autoApplied": False,
            },
            created_at=now_utc(),
        )

    def _review_candidate_exists(self, candidate: ReviewItem) -> bool:
        candidate_signature = self._review_candidate_signature(candidate)
        return any(
            self._review_candidate_signature(item) == candidate_signature
            for item in self.repository.review_items.values()
        )

    def _review_candidate_signature(self, item: ReviewItem) -> tuple[str, str | None, tuple[str, ...]]:
        return (
            item.queue_type,
            item.suggested_action,
            tuple(
                sorted(
                    f"{ref.get('objectType')}:{ref.get('id')}"
                    for ref in item.target_refs
                )
            ),
        )

    def _review_compare_object(self, version: ContentUnitVersion) -> dict[str, Any]:
        variant = self.repository.content_unit_variants.get(version.variant_id)
        family = self.repository.content_unit_families.get(variant.family_id) if variant else None
        return {
            "objectType": "content_unit_version",
            "id": str(version.id),
            "title": family.family_title if family else "Untitled ContentUnit",
            "variantLabel": variant.variant_label if variant else None,
            "versionNumber": version.version_number,
            "approvalState": version.approval_state,
            "freshnessState": version.freshness_state,
            "summary": version.summary,
            "previewUri": version.thumbnail_uri or version.render_uri,
            "provenanceId": str(version.provenance_id),
            "restricted": version.restricted or bool(family and family.restricted),
        }

    def _version_text_similarity(
        self,
        left: ContentUnitVersion,
        right: ContentUnitVersion,
    ) -> float:
        left_tokens = set(tokenize(self._review_text(left)))
        right_tokens = set(tokenize(self._review_text(right)))
        if not left_tokens or not right_tokens:
            return 0.0
        return round(len(left_tokens & right_tokens) / len(left_tokens | right_tokens), 4)

    def _review_text(self, version: ContentUnitVersion) -> str:
        return " ".join(part for part in (version.extracted_text, version.summary) if part)

    def _normalized_review_text(self, version: ContentUnitVersion) -> str:
        return " ".join(tokenize(self._review_text(version)))

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

    def _family_matches_version_filters(
        self,
        family_id: UUID,
        *,
        approval_state: str | None,
        freshness_state: str | None,
        actor: Actor,
    ) -> bool:
        if approval_state is None and freshness_state is None:
            return True
        visible_versions = [
            version
            for versions in self._versions_by_variant(family_id).values()
            for version in versions
            if self._can_access_version(version.id, actor)
        ]
        for version in visible_versions:
            if approval_state is not None and version.approval_state != approval_state:
                continue
            if freshness_state is not None and version.freshness_state != freshness_state:
                continue
            return True
        return False

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

    def _can_access_block(self, block: ContentBlockVersion, actor: Actor) -> bool:
        return can_view_restricted(actor) or not self._block_is_restricted(block)

    def _can_access_storyboard(self, storyboard: Storyboard, actor: Actor) -> bool:
        if can_view_restricted(actor):
            return True
        for section in storyboard.draft_sections:
            for slot in section.slots:
                if slot.selected_object_type and slot.selected_object_id:
                    if not self._can_access_target(
                        slot.selected_object_type,
                        slot.selected_object_id,
                        actor,
                    ):
                        return False
        return True

    def _can_access_storyboard_snapshot(
        self,
        snapshot: StoryboardSnapshot,
        actor: Actor,
    ) -> bool:
        if can_view_restricted(actor):
            return True
        for section in snapshot.sections:
            for slot in section.slots:
                if slot.selected_object_type and slot.selected_object_id:
                    if not self._can_access_target(
                        slot.selected_object_type,
                        slot.selected_object_id,
                        actor,
                    ):
                        return False
        return True

    def _can_access_work_product_family(self, family_id: UUID, actor: Actor) -> bool:
        family = self.repository.work_product_families.get(family_id)
        if family is None:
            return False
        if family.restricted and not can_view_restricted(actor):
            return False
        return True

    def _can_access_work_product_version(
        self,
        version: WorkProductVersion,
        actor: Actor,
    ) -> bool:
        if not self._can_access_work_product_family(version.family_id, actor):
            return False
        if version.restricted and not can_view_restricted(actor):
            return False
        return True

    def _can_access_target(self, target_type: str, target_id: UUID, actor: Actor) -> bool:
        if target_type in {"content_unit_version", "content_unit"}:
            return self._can_access_version(target_id, actor)
        if target_type == "content_unit_variant":
            variant = self.repository.content_unit_variants.get(target_id)
            return bool(variant and self._can_access_family(variant.family_id, actor))
        if target_type == "content_unit_family":
            return self._can_access_family(target_id, actor)
        if target_type == "content_block_version":
            block = self.repository.content_blocks.get(target_id)
            return bool(block and self._can_access_block(block, actor))
        if target_type == "storyboard":
            storyboard = self.repository.storyboards.get(target_id)
            return bool(storyboard and self._can_access_storyboard(storyboard, actor))
        if target_type == "work_product_version":
            version = self.repository.work_product_versions.get(target_id)
            return bool(version and self._can_access_work_product_version(version, actor))
        if target_type == "work_product_family":
            return self._can_access_work_product_family(target_id, actor)
        return False

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
        self._save_content_unit_variants(siblings)
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

    def _validate_content_block_members(
        self,
        members: list[ContentBlockMember],
        actor: Actor,
    ) -> None:
        if not members:
            raise ConflictError("ContentBlock requires at least one member.")
        seen_order_indexes: set[int] = set()
        for member in members:
            if member.order_index in seen_order_indexes:
                raise ConflictError("ContentBlock member orderIndex values must be unique.")
            seen_order_indexes.add(member.order_index)
            if member.member_type == "content_unit_version":
                self._get_content_unit_version(member.member_id)
                if not self._can_access_version(member.member_id, actor):
                    raise NotFoundError("ContentUnit version not found.")
            elif member.member_type == "content_unit_variant":
                variant = self._get_content_unit_variant(member.member_id)
                if not self._can_access_family(variant.family_id, actor):
                    raise NotFoundError("ContentUnit variant not found.")
            else:
                raise ConflictError("Unsupported ContentBlock member type.")

    def _validate_slot_selection(
        self,
        slot_type: str,
        selected_object_type: str | None,
        selected_object_id: UUID | None,
        actor: Actor,
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
        if not self._can_access_target(selected_object_type, selected_object_id, actor):
            raise NotFoundError("Selected object not found.")

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

    def _mark_ingestion_stage(
        self,
        job: IngestionJob,
        stage: str,
        *,
        status: str,
        metadata: dict[str, Any] | None = None,
        save: bool = True,
    ) -> None:
        timestamp = now_utc()
        job.stage = stage
        job.updated_at = timestamp
        telemetry = dict(job.upload_metadata.get("stageTelemetry") or {})
        telemetry[stage] = {
            "status": status,
            "completedAt": timestamp.isoformat(),
            **(metadata or {}),
        }
        job.upload_metadata["stageTelemetry"] = telemetry
        if save:
            self._save_ingestion_job(job)

    def _fail_ingestion_job(
        self,
        job: IngestionJob,
        *,
        stage: str,
        error_code: str,
        error_message: str,
    ) -> None:
        job.status = "failed"
        job.error_code = error_code
        job.error_message = error_message
        self._mark_ingestion_stage(
            job,
            stage,
            status="failed",
            metadata={"errorCode": error_code, "errorMessage": error_message},
        )

    def _store_rendered_slide_object(
        self,
        job: IngestionJob,
        source_order_index: int,
        content: bytes,
        content_type: str,
        extension: str,
        *,
        object_type: str,
    ) -> StoredObject:
        digest = hash_bytes(content)
        key = (
            f"renders/{job.id}/{source_order_index:04d}/"
            f"{object_type}-{digest[:12]}{extension if extension.startswith('.') else f'.{extension}'}"
        )
        artifact = self.object_storage.put_bytes(
            key=key,
            content=content,
            content_type=content_type,
            metadata={
                "sha256": digest,
                "jobId": str(job.id),
                "sourceOrderIndex": str(source_order_index),
                "objectType": object_type,
            },
        )
        stored_object = StoredObject(
            id=uuid4(),
            object_type=object_type,
            storage_uri=f"/api/assets/{artifact.key}",
            mime_type=content_type,
            byte_size=len(content),
            sha256=digest,
            metadata={"bucket": artifact.bucket, "key": artifact.key, "storageUri": artifact.storage_uri},
            created_at=now_utc(),
        )
        self.repository.stored_objects[stored_object.id] = stored_object
        self._save_stored_object(stored_object)
        return stored_object

    def _create_content_units_from_slides(
        self,
        job: IngestionJob,
        slides,
        source_hash: str | None,
        rendered_assets: dict[int, RenderedSlideAsset],
    ) -> list[UUID]:
        created_ids: list[UUID] = []
        source_file_hash = source_hash or str(job.upload_metadata.get("sourceFileHash") or "")
        taxonomy = cast(dict[str, list[str]], job.upload_metadata.get("taxonomy") or {})
        for slide in slides:
            rendered_asset = rendered_assets.get(slide.source_order_index)
            if rendered_asset is None:
                raise ConflictError(f"Rendered asset missing for slide {slide.source_order_index}.")
            existing = self._find_ingested_version(job.id, slide.source_order_index)
            if existing is not None:
                created_ids.append(existing.id)
                continue
            render_object = self._store_rendered_slide_object(
                job,
                slide.source_order_index,
                rendered_asset.render_content,
                rendered_asset.render_content_type,
                rendered_asset.render_extension,
                object_type="render",
            )
            thumbnail_object = self._store_rendered_slide_object(
                job,
                slide.source_order_index,
                rendered_asset.thumbnail_content,
                rendered_asset.thumbnail_content_type,
                rendered_asset.thumbnail_extension,
                object_type="thumbnail",
            )
            fingerprint = content_unit_fingerprint(
                source_file_hash=source_file_hash,
                source_order_index=slide.source_order_index,
                extracted_text=slide.extracted_text,
                speaker_notes=slide.speaker_notes,
                visual_bytes=rendered_asset.render_content,
                metadata={
                    "jobId": str(job.id),
                    "workProductVersionId": str(job.work_product_version_id),
                    "sourceOrderIndex": slide.source_order_index,
                },
            )

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
                render_uri=render_object.storage_uri,
                thumbnail_uri=thumbnail_object.storage_uri,
                summary=slide.extracted_text[:240] if slide.extracted_text else None,
                approval_state="draft",
                freshness_state="fresh",
                quality_score=None,
                usage_score=None,
                extracted_text=slide.extracted_text,
                speaker_notes=slide.speaker_notes,
                provenance_id=provenance.id,
                source_slide_count=1,
                source_order_index=slide.source_order_index,
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
            self._save_embedding(
                EmbeddingRecord(
                    id=uuid4(),
                    target_type="content_unit_version",
                    target_id=version.id,
                    embedding_kind="text",
                    model_name=DETERMINISTIC_EMBEDDING_MODEL,
                    model_version=DETERMINISTIC_EMBEDDING_VERSION,
                    dims=DEFAULT_EMBEDDING_DIMS,
                    metadata={
                        "source": "deterministic_pptx_ingest",
                        "sourceOrderIndex": slide.source_order_index,
                        "embeddingText": "\n".join(
                            part for part in (slide.extracted_text, slide.speaker_notes) if part
                        ),
                        "embedding": list(
                            deterministic_text_embedding(
                                "\n".join(
                                    part for part in (slide.extracted_text, slide.speaker_notes) if part
                                ),
                                dims=DEFAULT_EMBEDDING_DIMS,
                            )
                        ),
                    },
                )
            )
            created_ids.append(version.id)
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

    def _refresh_repository(self) -> None:
        reload_repository = getattr(self.repository, "reload", None)
        if callable(reload_repository):
            reload_repository()

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

    def _work_product_embedding_text(
        self,
        family: WorkProductFamily,
        version: WorkProductVersion,
        taxonomy: dict[str, Any] | None,
    ) -> str:
        taxonomy_values: list[str] = []
        for value in (taxonomy or {}).values():
            if isinstance(value, str):
                taxonomy_values.append(value)
            else:
                try:
                    taxonomy_values.extend(str(item) for item in value)
                except TypeError:
                    taxonomy_values.append(str(value))
        return "\n".join(
            part
            for part in (
                family.title,
                family.summary,
                family.artifact_type,
                version.title,
                *taxonomy_values,
            )
            if part
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

    def _save_content_unit_version(self, version: ContentUnitVersion) -> None:
        self.repository.content_unit_versions[version.id] = version
        save = getattr(self.repository, "save_content_unit_version", None)
        if callable(save):
            save(version)

    def _save_content_unit_variants(self, variants: list[ContentUnitVariant]) -> None:
        for variant in variants:
            self.repository.content_unit_variants[variant.id] = variant
        save = getattr(self.repository, "save_content_unit_variants", None)
        if callable(save):
            save(variants)

    def _save_content_block(self, block: ContentBlockVersion) -> None:
        self.repository.content_blocks[block.id] = block
        save = getattr(self.repository, "save_content_block", None)
        if callable(save):
            save(block)

    def _save_storyboard(self, storyboard: Storyboard) -> None:
        self.repository.storyboards[storyboard.id] = storyboard
        save = getattr(self.repository, "save_storyboard", None)
        if callable(save):
            save(storyboard)

    def _save_embedding(self, embedding: EmbeddingRecord) -> None:
        self.repository.embeddings[embedding.id] = embedding
        save = getattr(self.repository, "save_embedding", None)
        if callable(save):
            save(embedding)

    def _save_comment(self, comment: Comment) -> None:
        self.repository.comments[comment.id] = comment
        save = getattr(self.repository, "save_comment", None)
        if callable(save):
            save(comment)

    def _save_note(self, note: Note) -> None:
        self.repository.notes[note.id] = note
        save = getattr(self.repository, "save_note", None)
        if callable(save):
            save(note)

    def _update_work_product_version(self, version: WorkProductVersion) -> None:
        save = getattr(self.repository, "update_work_product_version", None)
        if callable(save):
            save(version)

    def _save_review_item(
        self,
        item: ReviewItem,
        *,
        resolved_by: str | None = None,
        resolution_notes: str | None = None,
    ) -> None:
        self.repository.review_items[item.id] = item
        save = getattr(self.repository, "save_review_item", None)
        if callable(save):
            save(item, resolved_by=resolved_by, resolution_notes=resolution_notes)

    def _save_similarity_edge(self, edge: SimilarityEdge) -> None:
        self.repository.similarity_edges[edge.id] = edge
        save = getattr(self.repository, "save_similarity_edge", None)
        if callable(save):
            save(edge)

    def _resolve_review_action(self, item: ReviewItem, action: str) -> str:
        if action != "accept":
            return action
        suggested = (item.suggested_action or "").replace("_", "-")
        if suggested in {
            "mark-variant",
            "mark-similar",
            "merge-versions",
            "set-canonical",
            "approve",
            "deprecate",
        }:
            return suggested
        if item.queue_type == "duplicate":
            return "merge-versions"
        if item.queue_type in {"variant", "variant_candidate", "variant_linking"}:
            return "mark-variant"
        if item.queue_type in {"similarity", "similarity_candidate"}:
            return "mark-similar"
        if item.queue_type == "stale":
            return "deprecate"
        if item.queue_type == "approval":
            return "approve"
        raise ConflictError("Review item does not have an accepted action.")

    def _review_target_version_ids(self, item: ReviewItem) -> tuple[UUID, UUID]:
        version_ids = [
            UUID(str(ref["id"]))
            for ref in item.target_refs
            if ref.get("objectType") == "content_unit_version"
        ]
        if len(version_ids) < 2:
            raise ConflictError("Review action requires two ContentUnit version targets.")
        return version_ids[0], version_ids[1]

    def _first_review_version_id(self, item: ReviewItem) -> UUID | None:
        for ref in item.target_refs:
            if ref.get("objectType") == "content_unit_version":
                return UUID(str(ref["id"]))
        return None

    def _variant_id_from_review(self, item: ReviewItem) -> UUID:
        version_id = self._review_target_version_ids(item)[0]
        return self._get_content_unit_version(version_id).variant_id

    def _link_versions_as_variants(
        self,
        source_version_id: UUID,
        target_version_id: UUID,
        actor: Actor,
        reason: str | None,
        confidence: float | None,
    ) -> ContentUnitVariant:
        source_version = self._get_content_unit_version(source_version_id)
        target_version = self._get_content_unit_version(target_version_id)
        source_variant = self._get_content_unit_variant(source_version.variant_id)
        target_variant = self._get_content_unit_variant(target_version.variant_id)
        prior = {
            "variantId": str(target_variant.id),
            "familyId": str(target_variant.family_id),
            "linkedBy": target_variant.linked_by,
            "linkedConfidence": target_variant.linked_confidence,
        }
        target_variant.family_id = source_variant.family_id
        target_variant.linked_by = "hybrid"
        target_variant.linked_confidence = confidence
        target_variant.latest_version_id = target_variant.latest_version_id or target_version.id
        self._save_content_unit_variants([target_variant])
        self.repository.record_audit(
            action="variant_link_change",
            actor_id=actor.user_id,
            target_type="content_unit_variant",
            target_id=target_variant.id,
            prior_state=prior,
            new_state={
                "variantId": str(target_variant.id),
                "familyId": str(target_variant.family_id),
                "linkedBy": target_variant.linked_by,
                "linkedConfidence": target_variant.linked_confidence,
            },
            reason=reason,
            metadata={
                "sourceVersionId": str(source_version.id),
                "targetVersionId": str(target_version.id),
            },
        )
        return target_variant

    def _merge_duplicate_versions(
        self,
        surviving_version_id: UUID,
        duplicate_version_id: UUID,
        actor: Actor,
        reason: str | None,
    ) -> None:
        surviving_version = self._get_content_unit_version(surviving_version_id)
        duplicate_version = self._get_content_unit_version(duplicate_version_id)
        prior = {"approvalState": duplicate_version.approval_state}
        duplicate_version.approval_state = "deprecated"
        self._save_content_unit_version(duplicate_version)
        duplicate_variant = self._get_content_unit_variant(duplicate_version.variant_id)
        if duplicate_variant.latest_version_id == duplicate_version.id:
            duplicate_variant.latest_version_id = surviving_version.id
            self._save_content_unit_variants([duplicate_variant])
        self.repository.record_audit(
            action="duplicate_version_merge",
            actor_id=actor.user_id,
            target_type="content_unit_version",
            target_id=duplicate_version.id,
            prior_state=prior,
            new_state={
                "approvalState": duplicate_version.approval_state,
                "supersededByVersionId": str(surviving_version.id),
            },
            reason=reason,
        )

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
            elif member.member_type == "content_unit_variant":
                variant = self.repository.content_unit_variants.get(member.member_id)
                family = (
                    self.repository.content_unit_families.get(variant.family_id)
                    if variant
                    else None
                )
                if family and family.restricted:
                    return True
                if variant and variant.latest_version_id:
                    latest = self.repository.content_unit_versions.get(variant.latest_version_id)
                    if latest and latest.restricted:
                        return True
        return False

    def _score_content_unit_family(self, family_id: UUID, terms: list[str], actor: Actor) -> float:
        family = self._get_content_unit_family(family_id)
        variants = self._variants_for_family(family_id)
        versions_by_variant = self._versions_by_variant(family_id)
        haystack_parts = [family.family_title, family.conceptual_summary or ""]
        for values in family.taxonomy.values():
            haystack_parts.extend(values)
        for variant in variants:
            haystack_parts.append(variant.variant_label)
            for version in versions_by_variant.get(variant.id, []):
                if not self._can_access_version(version.id, actor):
                    continue
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
