from __future__ import annotations

from copy import deepcopy
from uuid import UUID, uuid4

from app.domain.models import (
    AuditEvent,
    Comment,
    ContentBlockMember,
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
    StoryboardSection,
    StoryboardSlot,
    StoryboardSnapshot,
    WorkProductFamily,
    WorkProductVersion,
    now_utc,
)


SEED_IDS = {
    "roi_family": UUID("00000000-0000-4000-8000-000000000101"),
    "architecture_family": UUID("00000000-0000-4000-8000-000000000102"),
    "restricted_family": UUID("00000000-0000-4000-8000-000000000103"),
    "roi_exec_variant": UUID("00000000-0000-4000-8000-000000000201"),
    "roi_board_variant": UUID("00000000-0000-4000-8000-000000000202"),
    "architecture_variant": UUID("00000000-0000-4000-8000-000000000203"),
    "restricted_variant": UUID("00000000-0000-4000-8000-000000000204"),
    "roi_exec_v1": UUID("00000000-0000-4000-8000-000000000301"),
    "roi_board_v1": UUID("00000000-0000-4000-8000-000000000302"),
    "architecture_v1": UUID("00000000-0000-4000-8000-000000000303"),
    "restricted_v1": UUID("00000000-0000-4000-8000-000000000304"),
    "work_product_family": UUID("00000000-0000-4000-8000-000000000401"),
    "work_product_v1": UUID("00000000-0000-4000-8000-000000000402"),
    "content_block_family": UUID("00000000-0000-4000-8000-000000000501"),
    "content_block_v1": UUID("00000000-0000-4000-8000-000000000502"),
    "storyboard": UUID("00000000-0000-4000-8000-000000000601"),
    "storyboard_section": UUID("00000000-0000-4000-8000-000000000602"),
    "storyboard_slot": UUID("00000000-0000-4000-8000-000000000603"),
    "review_variant": UUID("00000000-0000-4000-8000-000000000701"),
    "review_similarity": UUID("00000000-0000-4000-8000-000000000702"),
}


class InMemoryBoxBrainRepository:
    """Seeded in-memory repository used until the database adapter lands."""

    def __init__(self, seed: bool = True) -> None:
        self.content_unit_families: dict[UUID, ContentUnitFamily] = {}
        self.content_unit_variants: dict[UUID, ContentUnitVariant] = {}
        self.content_unit_versions: dict[UUID, ContentUnitVersion] = {}
        self.work_product_families: dict[UUID, WorkProductFamily] = {}
        self.work_product_versions: dict[UUID, WorkProductVersion] = {}
        self.content_blocks: dict[UUID, ContentBlockVersion] = {}
        self.storyboards: dict[UUID, Storyboard] = {}
        self.storyboard_snapshots: dict[UUID, StoryboardSnapshot] = {}
        self.comments: dict[UUID, Comment] = {}
        self.notes: dict[UUID, Note] = {}
        self.review_items: dict[UUID, ReviewItem] = {}
        self.ingestion_jobs: dict[UUID, IngestionJob] = {}
        self.provenance_records: dict[UUID, ProvenanceRecord] = {}
        self.similarity_edges: dict[UUID, SimilarityEdge] = {}
        self.audit_events: list[AuditEvent] = []
        self.stored_objects: dict[UUID, StoredObject] = {}
        self.embeddings: dict[UUID, EmbeddingRecord] = {}
        if seed:
            self.seed()

    def seed(self) -> None:
        created_at = now_utc()
        imported_provenance = ProvenanceRecord(
            id=uuid4(),
            origin_type="uploaded_source",
            source_system="seed_fixture",
            source_refs=["Executive Overview Deck"],
            pipeline_version="seed-v1",
            created_at=created_at,
        )
        generated_provenance = ProvenanceRecord(
            id=uuid4(),
            origin_type="generated_or_derived",
            source_system="seed_fixture",
            parent_refs=[{"objectType": "work_product_version", "id": str(SEED_IDS["work_product_v1"])}],
            source_refs=["Executive Overview Deck", "slide indexes 1-3"],
            model_info="deterministic seed",
            pipeline_version="seed-v1",
            created_at=created_at,
        )
        self.provenance_records[imported_provenance.id] = imported_provenance
        self.provenance_records[generated_provenance.id] = generated_provenance

        self.content_unit_families.update(
            {
                SEED_IDS["roi_family"]: ContentUnitFamily(
                    id=SEED_IDS["roi_family"],
                    family_title="Cloud modernization ROI business case",
                    conceptual_summary="Executive narrative for the economic case behind cloud modernization.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Cloud Modernization"],
                        "technologies": ["Cloud", "FinOps"],
                        "audiences": ["executive", "board"],
                        "purposes": ["business_case", "roi"],
                        "tags": ["operating margin", "roi", "approved"],
                    },
                ),
                SEED_IDS["architecture_family"]: ContentUnitFamily(
                    id=SEED_IDS["architecture_family"],
                    family_title="Technical architecture migration path",
                    conceptual_summary="Migration sequencing, platform layers, and dependency view.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Cloud Modernization"],
                        "technologies": ["Kubernetes", "Networking"],
                        "audiences": ["technical"],
                        "purposes": ["architecture"],
                        "tags": ["migration", "platform"],
                    },
                ),
                SEED_IDS["restricted_family"]: ContentUnitFamily(
                    id=SEED_IDS["restricted_family"],
                    family_title="Client-sensitive operating margin bridge",
                    conceptual_summary="Restricted client financial details for board-only review.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Cloud Modernization"],
                        "audiences": ["board"],
                        "purposes": ["financial_review"],
                        "tags": ["client-sensitive", "operating margin"],
                    },
                    restricted=True,
                ),
            }
        )

        self.content_unit_variants.update(
            {
                SEED_IDS["roi_exec_variant"]: ContentUnitVariant(
                    id=SEED_IDS["roi_exec_variant"],
                    family_id=SEED_IDS["roi_family"],
                    variant_label="Executive summary",
                    variant_type="audience",
                    variant_dimensions={"audience": "executive"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["roi_exec_v1"],
                ),
                SEED_IDS["roi_board_variant"]: ContentUnitVariant(
                    id=SEED_IDS["roi_board_variant"],
                    family_id=SEED_IDS["roi_family"],
                    variant_label="Board detail",
                    variant_type="audience",
                    variant_dimensions={"audience": "board"},
                    is_canonical=False,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["roi_board_v1"],
                ),
                SEED_IDS["architecture_variant"]: ContentUnitVariant(
                    id=SEED_IDS["architecture_variant"],
                    family_id=SEED_IDS["architecture_family"],
                    variant_label="Technical deep dive",
                    variant_type="audience",
                    variant_dimensions={"audience": "technical"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["architecture_v1"],
                ),
                SEED_IDS["restricted_variant"]: ContentUnitVariant(
                    id=SEED_IDS["restricted_variant"],
                    family_id=SEED_IDS["restricted_family"],
                    variant_label="Client board finance",
                    variant_type="restricted_source",
                    variant_dimensions={"audience": "board", "visibility": "restricted"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["restricted_v1"],
                ),
            }
        )

        self.content_unit_versions.update(
            {
                SEED_IDS["roi_exec_v1"]: ContentUnitVersion(
                    id=SEED_IDS["roi_exec_v1"],
                    variant_id=SEED_IDS["roi_exec_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/roi-exec-v1.png",
                    thumbnail_uri="/seed/thumbs/roi-exec-v1.png",
                    summary="Approved executive ROI slide with margin lift and payback highlights.",
                    approval_state="approved",
                    freshness_state="fresh",
                    quality_score=0.94,
                    usage_score=0.72,
                    extracted_text="Cloud modernization ROI operating margin payback savings executive case.",
                    speaker_notes="Use this for C-suite business case conversations.",
                    provenance_id=generated_provenance.id,
                    created_at=created_at,
                ),
                SEED_IDS["roi_board_v1"]: ContentUnitVersion(
                    id=SEED_IDS["roi_board_v1"],
                    variant_id=SEED_IDS["roi_board_variant"],
                    version_number="v1.1",
                    render_uri="/seed/renders/roi-board-v1.png",
                    thumbnail_uri="/seed/thumbs/roi-board-v1.png",
                    summary="Board version of the ROI case with scenario sensitivity and margin bridge.",
                    approval_state="review",
                    freshness_state="fresh",
                    quality_score=0.87,
                    usage_score=0.5,
                    extracted_text="Board operating margin modernization scenario sensitivity ROI.",
                    speaker_notes="Route through finance reviewer before external reuse.",
                    provenance_id=generated_provenance.id,
                    created_at=created_at,
                ),
                SEED_IDS["architecture_v1"]: ContentUnitVersion(
                    id=SEED_IDS["architecture_v1"],
                    variant_id=SEED_IDS["architecture_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/architecture-v1.png",
                    thumbnail_uri="/seed/thumbs/architecture-v1.png",
                    summary="Technical architecture slide for migration waves and target platform.",
                    approval_state="draft",
                    freshness_state="aging",
                    quality_score=0.78,
                    usage_score=0.41,
                    extracted_text="Technical architecture migration wave platform landing zone dependencies.",
                    speaker_notes="Validate dependency sequencing for regulated accounts.",
                    provenance_id=generated_provenance.id,
                    created_at=created_at,
                ),
                SEED_IDS["restricted_v1"]: ContentUnitVersion(
                    id=SEED_IDS["restricted_v1"],
                    variant_id=SEED_IDS["restricted_variant"],
                    version_number="v0.9",
                    render_uri="/seed/restricted/renders/client-margin.png",
                    thumbnail_uri="/seed/restricted/thumbs/client-margin.png",
                    summary="Restricted client financial bridge; never expose to viewer search.",
                    approval_state="review",
                    freshness_state="stale",
                    quality_score=0.62,
                    usage_score=0.1,
                    extracted_text="Client-sensitive operating margin bridge confidential account numbers.",
                    speaker_notes="Restricted to reviewers and admins.",
                    provenance_id=generated_provenance.id,
                    restricted=True,
                    created_at=created_at,
                ),
            }
        )

        self.work_product_families[SEED_IDS["work_product_family"]] = WorkProductFamily(
            id=SEED_IDS["work_product_family"],
            title="Executive Cloud Modernization Overview",
            artifact_type="deck",
            summary="Seed source deck decomposed into governed ContentUnits.",
            preview_uri="/seed/work-products/executive-overview.png",
            variant_count=1,
            version_count=1,
        )
        self.work_product_versions[SEED_IDS["work_product_v1"]] = WorkProductVersion(
            id=SEED_IDS["work_product_v1"],
            family_id=SEED_IDS["work_product_family"],
            title="Executive Cloud Modernization Overview",
            artifact_type="deck",
            version_number="v1.0",
            approval_state="review",
            preview_uri="/seed/work-products/executive-overview.png",
            filmstrip_version_ids=[
                SEED_IDS["roi_exec_v1"],
                SEED_IDS["roi_board_v1"],
                SEED_IDS["architecture_v1"],
            ],
            provenance_id=imported_provenance.id,
        )

        self.content_blocks[SEED_IDS["content_block_v1"]] = ContentBlockVersion(
            id=SEED_IDS["content_block_v1"],
            family_id=SEED_IDS["content_block_family"],
            title="Three-slide ROI story",
            summary="Ordered mini-story for modernization economics.",
            block_type="sequence",
            approval_state="draft",
            members=[
                ContentBlockMember(
                    id=uuid4(),
                    member_type="content_unit_version",
                    member_id=SEED_IDS["roi_exec_v1"],
                    order_index=0,
                    role="headline_case",
                ),
                ContentBlockMember(
                    id=uuid4(),
                    member_type="content_unit_version",
                    member_id=SEED_IDS["roi_board_v1"],
                    order_index=1,
                    role="financial_detail",
                ),
            ],
            created_at=created_at,
        )

        storyboard = Storyboard(
            id=SEED_IDS["storyboard"],
            mode="work_product",
            title="Pilot modernization storyboard",
            created_at=created_at,
            updated_at=created_at,
        )
        section = StoryboardSection(
            id=SEED_IDS["storyboard_section"],
            storyboard_id=storyboard.id,
            title="Economic case",
            summary="Why invest now and what changes financially.",
            order_index=0,
        )
        section.slots.append(
            StoryboardSlot(
                id=SEED_IDS["storyboard_slot"],
                section_id=section.id,
                slot_type="content_unit",
                selected_object_type="content_unit_version",
                selected_object_id=SEED_IDS["roi_exec_v1"],
                order_index=0,
                purpose="Open with approved ROI case",
                is_required=True,
            )
        )
        storyboard.draft_sections.append(section)
        self.storyboards[storyboard.id] = storyboard

        note = Note(
            id=uuid4(),
            target_type="content_unit_family",
            target_id=SEED_IDS["roi_family"],
            title="Usage guidance",
            body="Use the executive variant for first-call business case discussions.",
            is_pinned=True,
            created_at=created_at,
            updated_at=created_at,
        )
        self.notes[note.id] = note

        comment = Comment(
            id=uuid4(),
            kind="persistent_comment",
            target_type="content_unit_version",
            target_id=SEED_IDS["roi_board_v1"],
            anchor={},
            body="Finance review requested for board sensitivity assumptions.",
            created_at=created_at,
        )
        self.comments[comment.id] = comment

        self.review_items.update(
            {
                SEED_IDS["review_variant"]: ReviewItem(
                    id=SEED_IDS["review_variant"],
                    queue_type="variant_candidate",
                    status="open",
                    confidence=0.86,
                    rationale="AI detected shared ROI structure with board-specific framing.",
                    suggested_action="mark_variant",
                    target_refs=[
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["roi_exec_v1"])},
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["roi_board_v1"])},
                    ],
                    compare_objects=[
                        {"title": "Executive ROI", "versionId": str(SEED_IDS["roi_exec_v1"])},
                        {"title": "Board ROI", "versionId": str(SEED_IDS["roi_board_v1"])},
                    ],
                    audit_preview={
                        "action": "review_mark_variant",
                        "requiresRole": "reviewer",
                    },
                    created_at=created_at,
                ),
                SEED_IDS["review_similarity"]: ReviewItem(
                    id=SEED_IDS["review_similarity"],
                    queue_type="similarity_candidate",
                    status="open",
                    confidence=0.78,
                    rationale="AI detected conceptual similarity but not shared family identity.",
                    suggested_action="mark_similar",
                    target_refs=[
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["roi_exec_v1"])},
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["architecture_v1"])},
                    ],
                    compare_objects=[
                        {"title": "Executive ROI", "versionId": str(SEED_IDS["roi_exec_v1"])},
                        {"title": "Architecture migration", "versionId": str(SEED_IDS["architecture_v1"])},
                    ],
                    audit_preview={
                        "action": "review_mark_similar",
                        "requiresRole": "reviewer",
                    },
                    created_at=created_at,
                ),
            }
        )

        job = IngestionJob(
            id=uuid4(),
            status="complete",
            stage="complete",
            artifact_type="deck",
            title="Executive Cloud Modernization Overview",
            work_product_version_id=SEED_IDS["work_product_v1"],
            upload_metadata={"filename": "executive-overview-seed.pptx"},
            created_at=created_at,
            updated_at=created_at,
            completed_at=created_at,
        )
        self.ingestion_jobs[job.id] = job

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
        return event

    def save_content_block(self, block: ContentBlockVersion) -> None:
        self.content_blocks[block.id] = block

    def save_storyboard(self, storyboard: Storyboard) -> None:
        self.storyboards[storyboard.id] = storyboard

    def freeze_storyboard_snapshot(
        self,
        storyboard: Storyboard,
        version_label: str | None = None,
    ) -> StoryboardSnapshot:
        snapshot_sections = tuple(deepcopy(storyboard.draft_sections))
        snapshot = StoryboardSnapshot(
            id=uuid4(),
            storyboard_id=storyboard.id,
            version_label=version_label,
            approval_state="draft",
            narrative_score=None,
            sections=snapshot_sections,
            created_at=now_utc(),
        )
        self.storyboard_snapshots[snapshot.id] = snapshot
        storyboard.current_snapshot_id = snapshot.id
        storyboard.updated_at = now_utc()
        return snapshot
