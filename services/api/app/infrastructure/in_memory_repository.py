from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
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
    # --- Demo market-opportunity corpus (additive; continues numbering from 0801) ---
    # ContentUnit families (0801-0806)
    "market_overview_family": UUID("00000000-0000-4000-8000-000000000801"),
    "market_regional_family": UUID("00000000-0000-4000-8000-000000000802"),
    "market_industry_family": UUID("00000000-0000-4000-8000-000000000803"),
    "market_tamsamsom_family": UUID("00000000-0000-4000-8000-000000000804"),
    "market_addressable_family": UUID("00000000-0000-4000-8000-000000000805"),
    "market_competitive_family": UUID("00000000-0000-4000-8000-000000000806"),
    # ContentUnit variants (0901-0908)
    "market_overview_clean_variant": UUID("00000000-0000-4000-8000-000000000901"),
    "market_overview_dark_variant": UUID("00000000-0000-4000-8000-000000000902"),
    "market_overview_condensed_variant": UUID("00000000-0000-4000-8000-000000000903"),
    "market_regional_variant": UUID("00000000-0000-4000-8000-000000000904"),
    "market_industry_variant": UUID("00000000-0000-4000-8000-000000000905"),
    "market_tamsamsom_variant": UUID("00000000-0000-4000-8000-000000000906"),
    "market_addressable_variant": UUID("00000000-0000-4000-8000-000000000907"),
    "market_competitive_variant": UUID("00000000-0000-4000-8000-000000000908"),
    # ContentUnit versions (1001-1012)
    "market_overview_clean_v1": UUID("00000000-0000-4000-8000-000000001001"),
    "market_overview_clean_v2": UUID("00000000-0000-4000-8000-000000001002"),
    "market_overview_clean_v3": UUID("00000000-0000-4000-8000-000000001003"),
    "market_overview_dark_v1": UUID("00000000-0000-4000-8000-000000001004"),
    "market_overview_condensed_v1": UUID("00000000-0000-4000-8000-000000001005"),
    "market_regional_v1": UUID("00000000-0000-4000-8000-000000001006"),
    "market_industry_v1": UUID("00000000-0000-4000-8000-000000001007"),
    "market_industry_v2": UUID("00000000-0000-4000-8000-000000001008"),
    "market_tamsamsom_v1": UUID("00000000-0000-4000-8000-000000001009"),
    "market_addressable_v1": UUID("00000000-0000-4000-8000-000000001010"),
    "market_addressable_v2": UUID("00000000-0000-4000-8000-000000001011"),
    "market_competitive_v1": UUID("00000000-0000-4000-8000-000000001012"),
    # WorkProduct family/version (1101-1102)
    "exec_summary_family": UUID("00000000-0000-4000-8000-000000001101"),
    "exec_summary_v1": UUID("00000000-0000-4000-8000-000000001102"),
    # ContentBlock family/version (1201-1202)
    "market_block_v1": UUID("00000000-0000-4000-8000-000000001201"),
    "market_block_family": UUID("00000000-0000-4000-8000-000000001202"),
    # Review items (1301-1302)
    "review_market_similarity": UUID("00000000-0000-4000-8000-000000001301"),
    "review_market_stale": UUID("00000000-0000-4000-8000-000000001302"),
    # Similarity edges (1401-1405)
    "sim_overview_regional": UUID("00000000-0000-4000-8000-000000001401"),
    "sim_overview_industry": UUID("00000000-0000-4000-8000-000000001402"),
    "sim_overview_tamsamsom": UUID("00000000-0000-4000-8000-000000001403"),
    "sim_overview_addressable": UUID("00000000-0000-4000-8000-000000001404"),
    "sim_overview_competitive": UUID("00000000-0000-4000-8000-000000001405"),
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
        self.stored_object_by_key: dict[str, StoredObject] = {}
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

        self._seed_market_corpus(created_at)

    def _seed_market_corpus(self, created_at: datetime) -> None:
        """Additive demo corpus themed on the Market Opportunity Overview mock.

        Adds visible ContentUnit families, versions, confirmed similarity edges,
        a second WorkProduct + ContentBlock for where-used, and review/comment/note
        rows so the Variation Explorer, Library, Reviews, and Search surfaces render
        with realistic content. Similarity edges stay separate from family identity.
        """

        def april(day: int) -> datetime:
            return datetime(2024, 4, day, 12, 0, tzinfo=timezone.utc)

        # A second uploaded WorkProduct the market ContentUnits were decomposed from,
        # and the generated provenance shared by the market ContentUnit versions.
        exec_summary_provenance = ProvenanceRecord(
            id=uuid4(),
            origin_type="uploaded_source",
            source_system="seed_fixture",
            source_refs=["Executive Summary - Q2 2024"],
            pipeline_version="seed-v1",
            created_at=april(24),
        )
        market_provenance = ProvenanceRecord(
            id=uuid4(),
            origin_type="generated_or_derived",
            source_system="seed_fixture",
            parent_refs=[{"objectType": "work_product_version", "id": str(SEED_IDS["exec_summary_v1"])}],
            source_refs=["Executive Summary - Q2 2024", "market opportunity section"],
            model_info="deterministic seed",
            pipeline_version="seed-v1",
            created_at=april(24),
        )
        self.provenance_records[exec_summary_provenance.id] = exec_summary_provenance
        self.provenance_records[market_provenance.id] = market_provenance

        self.content_unit_families.update(
            {
                SEED_IDS["market_overview_family"]: ContentUnitFamily(
                    id=SEED_IDS["market_overview_family"],
                    family_title="Market Opportunity Overview",
                    conceptual_summary=(
                        "Flagship market-sizing narrative anchoring the growth story: TAM, CAGR, and "
                        "customer reach for the digital transformation opportunity."
                    ),
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Market Strategy"],
                        "technologies": ["Digital Transformation"],
                        "audiences": ["executive", "board"],
                        "purposes": ["market_sizing", "growth_story"],
                        "tags": ["market opportunity", "tam", "cagr", "approved"],
                    },
                ),
                SEED_IDS["market_regional_family"]: ContentUnitFamily(
                    id=SEED_IDS["market_regional_family"],
                    family_title="Market Opportunity (Regional)",
                    conceptual_summary="Regional cut of the market opportunity with geography-weighted TAM.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Market Strategy"],
                        "audiences": ["executive"],
                        "purposes": ["market_sizing"],
                        "tags": ["market opportunity", "regional", "tam"],
                    },
                ),
                SEED_IDS["market_industry_family"]: ContentUnitFamily(
                    id=SEED_IDS["market_industry_family"],
                    family_title="Industry Growth Drivers",
                    conceptual_summary="Structural drivers accelerating industry demand through 2028.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Market Strategy"],
                        "audiences": ["executive", "technical"],
                        "purposes": ["market_analysis"],
                        "tags": ["growth drivers", "market opportunity", "trends"],
                    },
                ),
                SEED_IDS["market_tamsamsom_family"]: ContentUnitFamily(
                    id=SEED_IDS["market_tamsamsom_family"],
                    family_title="TAM/SAM/SOM Analysis",
                    conceptual_summary="Layered addressable-market breakdown from total to obtainable share.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Market Strategy"],
                        "audiences": ["board"],
                        "purposes": ["market_sizing"],
                        "tags": ["tam", "sam", "som", "market opportunity"],
                    },
                ),
                SEED_IDS["market_addressable_family"]: ContentUnitFamily(
                    id=SEED_IDS["market_addressable_family"],
                    family_title="Addressable Market",
                    conceptual_summary="Bottom-up addressable-market estimate with customer-count build.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Market Strategy"],
                        "audiences": ["executive"],
                        "purposes": ["market_sizing"],
                        "tags": ["addressable market", "market opportunity", "draft"],
                    },
                ),
                SEED_IDS["market_competitive_family"]: ContentUnitFamily(
                    id=SEED_IDS["market_competitive_family"],
                    family_title="Competitive Landscape Snapshot",
                    conceptual_summary="Snapshot of competitor positioning within the market opportunity.",
                    unit_type="slide",
                    taxonomy={
                        "offerings": ["Market Strategy"],
                        "audiences": ["executive"],
                        "purposes": ["market_analysis"],
                        "tags": ["competitive landscape", "market opportunity", "stale"],
                    },
                ),
            }
        )

        self.content_unit_variants.update(
            {
                SEED_IDS["market_overview_clean_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_overview_clean_variant"],
                    family_id=SEED_IDS["market_overview_family"],
                    variant_label="Clean",
                    variant_type="style",
                    variant_dimensions={"style": "clean", "audience": "executive"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_overview_clean_v3"],
                ),
                SEED_IDS["market_overview_dark_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_overview_dark_variant"],
                    family_id=SEED_IDS["market_overview_family"],
                    variant_label="Executive Dark",
                    variant_type="style",
                    variant_dimensions={"style": "dark", "audience": "executive"},
                    is_canonical=False,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_overview_dark_v1"],
                ),
                SEED_IDS["market_overview_condensed_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_overview_condensed_variant"],
                    family_id=SEED_IDS["market_overview_family"],
                    variant_label="Condensed",
                    variant_type="audience",
                    variant_dimensions={"style": "clean", "audience": "board"},
                    is_canonical=False,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_overview_condensed_v1"],
                ),
                SEED_IDS["market_regional_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_regional_variant"],
                    family_id=SEED_IDS["market_regional_family"],
                    variant_label="Regional cut",
                    variant_type="audience",
                    variant_dimensions={"audience": "executive", "scope": "regional"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_regional_v1"],
                ),
                SEED_IDS["market_industry_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_industry_variant"],
                    family_id=SEED_IDS["market_industry_family"],
                    variant_label="Growth drivers",
                    variant_type="audience",
                    variant_dimensions={"audience": "executive"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_industry_v2"],
                ),
                SEED_IDS["market_tamsamsom_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_tamsamsom_variant"],
                    family_id=SEED_IDS["market_tamsamsom_family"],
                    variant_label="Layered breakdown",
                    variant_type="audience",
                    variant_dimensions={"audience": "board"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_tamsamsom_v1"],
                ),
                SEED_IDS["market_addressable_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_addressable_variant"],
                    family_id=SEED_IDS["market_addressable_family"],
                    variant_label="Bottom-up build",
                    variant_type="audience",
                    variant_dimensions={"audience": "executive"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_addressable_v2"],
                ),
                SEED_IDS["market_competitive_variant"]: ContentUnitVariant(
                    id=SEED_IDS["market_competitive_variant"],
                    family_id=SEED_IDS["market_competitive_family"],
                    variant_label="Landscape snapshot",
                    variant_type="audience",
                    variant_dimensions={"audience": "executive"},
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=None,
                    latest_version_id=SEED_IDS["market_competitive_v1"],
                ),
            }
        )

        overview_extracted_text = (
            "Market Opportunity Overview. A substantial and growing market opportunity driven by "
            "digital transformation across the enterprise. $42B Total Addressable Market. "
            "+18% CAGR through 2028. 120M+ Potential Customers. Demand concentrated in cloud, "
            "data, and AI modernization budgets."
        )

        self.content_unit_versions.update(
            {
                SEED_IDS["market_overview_clean_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_overview_clean_v1"],
                    variant_id=SEED_IDS["market_overview_clean_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-overview-clean-v1.png",
                    thumbnail_uri="/seed/thumbs/market-overview-clean-v1.png",
                    summary="First market opportunity draft: $38B TAM and +15% CAGR placeholder figures.",
                    approval_state="approved",
                    freshness_state="aging",
                    quality_score=0.81,
                    usage_score=0.34,
                    extracted_text=(
                        "Market Opportunity Overview. Growing market opportunity from digital "
                        "transformation. $38B Total Addressable Market. +15% CAGR through 2027."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(18),
                ),
                SEED_IDS["market_overview_clean_v2"]: ContentUnitVersion(
                    id=SEED_IDS["market_overview_clean_v2"],
                    variant_id=SEED_IDS["market_overview_clean_variant"],
                    version_number="v2.0",
                    render_uri="/seed/renders/market-overview-clean-v2.png",
                    thumbnail_uri="/seed/thumbs/market-overview-clean-v2.png",
                    summary="Revised market opportunity with $40B TAM and refreshed customer reach.",
                    approval_state="approved",
                    freshness_state="aging",
                    quality_score=0.88,
                    usage_score=0.55,
                    extracted_text=(
                        "Market Opportunity Overview. Growing market opportunity driven by digital "
                        "transformation. $40B Total Addressable Market. +17% CAGR through 2028. "
                        "100M+ Potential Customers."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(20),
                ),
                SEED_IDS["market_overview_clean_v3"]: ContentUnitVersion(
                    id=SEED_IDS["market_overview_clean_v3"],
                    variant_id=SEED_IDS["market_overview_clean_variant"],
                    version_number="v3.0",
                    render_uri="/seed/renders/market-overview-clean-v3.png",
                    thumbnail_uri="/seed/thumbs/market-overview-clean-v3.png",
                    summary="Approved market opportunity anchor: $42B TAM, +18% CAGR, 120M+ customers.",
                    approval_state="approved",
                    freshness_state="fresh",
                    quality_score=0.96,
                    usage_score=0.83,
                    extracted_text=overview_extracted_text,
                    speaker_notes=(
                        "Open with the $42B TAM headline, then walk the +18% CAGR and 120M+ customer "
                        "reach. Land the digital-transformation demand driver before transitioning to "
                        "the regional and TAM/SAM/SOM detail."
                    ),
                    provenance_id=market_provenance.id,
                    created_at=april(24),
                ),
                SEED_IDS["market_overview_dark_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_overview_dark_v1"],
                    variant_id=SEED_IDS["market_overview_dark_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-overview-dark-v1.png",
                    thumbnail_uri="/seed/thumbs/market-overview-dark-v1.png",
                    summary="Executive dark-theme styling of the approved market opportunity anchor.",
                    approval_state="approved",
                    freshness_state="fresh",
                    quality_score=0.9,
                    usage_score=0.48,
                    extracted_text=overview_extracted_text,
                    speaker_notes="Use the dark styling for keynote-stage projection.",
                    provenance_id=market_provenance.id,
                    created_at=april(24),
                ),
                SEED_IDS["market_overview_condensed_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_overview_condensed_v1"],
                    variant_id=SEED_IDS["market_overview_condensed_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-overview-condensed-v1.png",
                    thumbnail_uri="/seed/thumbs/market-overview-condensed-v1.png",
                    summary="Condensed board cut of the market opportunity headline metrics.",
                    approval_state="review",
                    freshness_state="fresh",
                    quality_score=0.79,
                    usage_score=0.29,
                    extracted_text=(
                        "Market Opportunity. $42B TAM. +18% CAGR through 2028. 120M+ customers. "
                        "Condensed board summary."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(22),
                ),
                SEED_IDS["market_regional_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_regional_v1"],
                    variant_id=SEED_IDS["market_regional_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-regional-v1.png",
                    thumbnail_uri="/seed/thumbs/market-regional-v1.png",
                    summary="Regional near-duplicate of the anchor: $42B TAM split across geographies.",
                    approval_state="approved",
                    freshness_state="fresh",
                    quality_score=0.93,
                    usage_score=0.61,
                    extracted_text=(
                        "Market Opportunity Overview. A substantial and growing market opportunity "
                        "driven by digital transformation. $42B Total Addressable Market. +18% CAGR "
                        "through 2028. 120M+ Potential Customers. Weighted by region: Americas, EMEA, APAC."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(19),
                ),
                SEED_IDS["market_industry_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_industry_v1"],
                    variant_id=SEED_IDS["market_industry_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-industry-v1.png",
                    thumbnail_uri="/seed/thumbs/market-industry-v1.png",
                    summary="Initial industry growth-driver list for the market opportunity story.",
                    approval_state="review",
                    freshness_state="aging",
                    quality_score=0.74,
                    usage_score=0.3,
                    extracted_text=(
                        "Industry Growth Drivers. Cloud migration, data consolidation, and AI adoption "
                        "expand the market opportunity through 2028."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(15),
                ),
                SEED_IDS["market_industry_v2"]: ContentUnitVersion(
                    id=SEED_IDS["market_industry_v2"],
                    variant_id=SEED_IDS["market_industry_variant"],
                    version_number="v2.0",
                    render_uri="/seed/renders/market-industry-v2.png",
                    thumbnail_uri="/seed/thumbs/market-industry-v2.png",
                    summary="Updated industry growth drivers with quantified budget expansion.",
                    approval_state="review",
                    freshness_state="fresh",
                    quality_score=0.85,
                    usage_score=0.44,
                    extracted_text=(
                        "Industry Growth Drivers. Cloud, data, and AI modernization budgets grow the "
                        "market opportunity at +18% CAGR through 2028."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(23),
                ),
                SEED_IDS["market_tamsamsom_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_tamsamsom_v1"],
                    variant_id=SEED_IDS["market_tamsamsom_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-tamsamsom-v1.png",
                    thumbnail_uri="/seed/thumbs/market-tamsamsom-v1.png",
                    summary="Layered TAM/SAM/SOM breakdown for the market opportunity.",
                    approval_state="approved",
                    freshness_state="fresh",
                    quality_score=0.91,
                    usage_score=0.57,
                    extracted_text=(
                        "TAM SAM SOM Analysis. $42B total addressable market, $12B serviceable "
                        "addressable market, $3B serviceable obtainable market for the opportunity."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(21),
                ),
                SEED_IDS["market_addressable_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_addressable_v1"],
                    variant_id=SEED_IDS["market_addressable_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-addressable-v1.png",
                    thumbnail_uri="/seed/thumbs/market-addressable-v1.png",
                    summary="First bottom-up addressable-market build for the opportunity.",
                    approval_state="review",
                    freshness_state="aging",
                    quality_score=0.7,
                    usage_score=0.22,
                    extracted_text=(
                        "Addressable Market. Bottom-up build: 120M potential customers times average "
                        "contract value estimates the market opportunity."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(16),
                ),
                SEED_IDS["market_addressable_v2"]: ContentUnitVersion(
                    id=SEED_IDS["market_addressable_v2"],
                    variant_id=SEED_IDS["market_addressable_variant"],
                    version_number="v2.0",
                    render_uri="/seed/renders/market-addressable-v2.png",
                    thumbnail_uri="/seed/thumbs/market-addressable-v2.png",
                    summary="Draft revision of the addressable-market build pending review.",
                    approval_state="draft",
                    freshness_state="fresh",
                    quality_score=0.76,
                    usage_score=0.18,
                    extracted_text=(
                        "Addressable Market. Refined bottom-up build sizing the market opportunity "
                        "with segment-level customer counts and contract values."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=april(25),
                ),
                SEED_IDS["market_competitive_v1"]: ContentUnitVersion(
                    id=SEED_IDS["market_competitive_v1"],
                    variant_id=SEED_IDS["market_competitive_variant"],
                    version_number="v1.0",
                    render_uri="/seed/renders/market-competitive-v1.png",
                    thumbnail_uri="/seed/thumbs/market-competitive-v1.png",
                    summary="Stale competitive snapshot; refresh before reuse in the opportunity story.",
                    approval_state="review",
                    freshness_state="stale",
                    quality_score=0.6,
                    usage_score=0.12,
                    extracted_text=(
                        "Competitive Landscape Snapshot. Competitor positioning across the market "
                        "opportunity; figures predate the latest funding rounds."
                    ),
                    speaker_notes=None,
                    provenance_id=market_provenance.id,
                    created_at=datetime(2024, 3, 10, 12, 0, tzinfo=timezone.utc),
                ),
            }
        )

        # Confirmed similarity edges from the anchor's latest canonical version to the other
        # market units' latest versions. These are separate from family identity: they never
        # move a variant between families (domain rule 4).
        anchor_version_id = SEED_IDS["market_overview_clean_v3"]
        similarity_specs = [
            ("sim_overview_regional", SEED_IDS["market_regional_v1"], 0.98,
             "Near-duplicate market sizing with matching TAM and CAGR headline figures."),
            ("sim_overview_addressable", SEED_IDS["market_addressable_v2"], 0.82,
             "Shares the addressable-market framing and customer-count build."),
            ("sim_overview_industry", SEED_IDS["market_industry_v2"], 0.79,
             "Overlapping growth-driver and CAGR narrative."),
            ("sim_overview_tamsamsom", SEED_IDS["market_tamsamsom_v1"], 0.75,
             "Shared total-addressable-market anchor figure."),
            ("sim_overview_competitive", SEED_IDS["market_competitive_v1"], 0.71,
             "Same market-opportunity context, different analytical lens."),
        ]
        for edge_key, target_version_id, score, rationale in similarity_specs:
            self.similarity_edges[SEED_IDS[edge_key]] = SimilarityEdge(
                id=SEED_IDS[edge_key],
                source_version_id=anchor_version_id,
                target_version_id=target_version_id,
                score=score,
                rationale=rationale,
                confirmed_by="curator-seed",
                created_at=created_at,
            )

        # Second WorkProduct the market units appear in (where-used via filmstrip order).
        self.work_product_families[SEED_IDS["exec_summary_family"]] = WorkProductFamily(
            id=SEED_IDS["exec_summary_family"],
            title="Executive Summary - Q2 2024",
            artifact_type="deck",
            summary="Quarterly executive summary featuring the market opportunity story.",
            preview_uri="/seed/work-products/executive-summary-q2.png",
            variant_count=1,
            version_count=1,
        )
        self.work_product_versions[SEED_IDS["exec_summary_v1"]] = WorkProductVersion(
            id=SEED_IDS["exec_summary_v1"],
            family_id=SEED_IDS["exec_summary_family"],
            title="Executive Summary - Q2 2024",
            artifact_type="deck",
            version_number="v1.0",
            approval_state="approved",
            preview_uri="/seed/work-products/executive-summary-q2.png",
            filmstrip_version_ids=[
                SEED_IDS["market_overview_clean_v3"],
                SEED_IDS["market_regional_v1"],
                SEED_IDS["market_tamsamsom_v1"],
            ],
            provenance_id=exec_summary_provenance.id,
        )

        # ContentBlock giving the anchor a second where-used reference (block + work product).
        self.content_blocks[SEED_IDS["market_block_v1"]] = ContentBlockVersion(
            id=SEED_IDS["market_block_v1"],
            family_id=SEED_IDS["market_block_family"],
            title="Market opportunity narrative",
            summary="Ordered market-opportunity story for executive briefings.",
            block_type="sequence",
            approval_state="review",
            members=[
                ContentBlockMember(
                    id=uuid4(),
                    member_type="content_unit_version",
                    member_id=SEED_IDS["market_overview_clean_v3"],
                    order_index=0,
                    role="market_anchor",
                ),
                ContentBlockMember(
                    id=uuid4(),
                    member_type="content_unit_version",
                    member_id=SEED_IDS["market_regional_v1"],
                    order_index=1,
                    role="regional_context",
                ),
            ],
            created_at=created_at,
        )

        # Two persistent comments + one pinned curator note on the anchor's latest version.
        for body in (
            "Confirm the $42B TAM figure against the latest analyst report before publishing.",
            "Great anchor slide - reused this in three exec briefings already.",
        ):
            persistent_comment = Comment(
                id=uuid4(),
                kind="persistent_comment",
                target_type="content_unit_version",
                target_id=SEED_IDS["market_overview_clean_v3"],
                anchor={},
                body=body,
                created_at=created_at,
            )
            self.comments[persistent_comment.id] = persistent_comment

        anchor_note = Note(
            id=uuid4(),
            target_type="content_unit_version",
            target_id=SEED_IDS["market_overview_clean_v3"],
            title="Canonical market opportunity anchor",
            body="Lead every growth pitch with this slide; keep TAM/CAGR figures in sync with finance.",
            note_type="usage_guidance",
            is_pinned=True,
            created_at=created_at,
            updated_at=created_at,
        )
        self.notes[anchor_note.id] = anchor_note

        # Review items referencing the new units: the 0.98 near-duplicate pair and the stale unit.
        self.review_items.update(
            {
                SEED_IDS["review_market_similarity"]: ReviewItem(
                    id=SEED_IDS["review_market_similarity"],
                    queue_type="similarity_candidate",
                    status="open",
                    confidence=0.98,
                    rationale="Regional cut is a near-duplicate of the approved anchor; confirm similarity without merging families.",
                    suggested_action="mark_similar",
                    target_refs=[
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["market_overview_clean_v3"])},
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["market_regional_v1"])},
                    ],
                    compare_objects=[
                        {"title": "Market Opportunity Overview", "versionId": str(SEED_IDS["market_overview_clean_v3"])},
                        {"title": "Market Opportunity (Regional)", "versionId": str(SEED_IDS["market_regional_v1"])},
                    ],
                    audit_preview={
                        "action": "review_mark_similar",
                        "requiresRole": "reviewer",
                    },
                    created_at=created_at,
                ),
                SEED_IDS["review_market_stale"]: ReviewItem(
                    id=SEED_IDS["review_market_stale"],
                    queue_type="stale_candidate",
                    status="open",
                    confidence=0.9,
                    rationale="Competitive Landscape Snapshot is stale; review before reuse in the market story.",
                    suggested_action="deprecate",
                    target_refs=[
                        {"objectType": "content_unit_version", "id": str(SEED_IDS["market_competitive_v1"])},
                    ],
                    compare_objects=[
                        {"title": "Competitive Landscape Snapshot", "versionId": str(SEED_IDS["market_competitive_v1"])},
                    ],
                    audit_preview={
                        "action": "review_deprecate",
                        "requiresRole": "reviewer",
                    },
                    created_at=created_at,
                ),
            }
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
        return event

    def register_stored_object(self, obj: StoredObject) -> None:
        """Keep ``stored_object_by_key`` in sync when a new StoredObject is added.

        Call this every time a StoredObject is inserted into ``stored_objects``.
        Both the in-memory and SQLAlchemy adapters rely on this hook to maintain the
        O(1) key-based lookup used by ``GET /api/assets/{key}``.
        """
        self.stored_objects[obj.id] = obj
        key = obj.metadata.get("key")
        if key:
            self.stored_object_by_key[key] = obj

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
