"""Shared models for deterministic ingestion/search helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Mapping, Sequence


class IngestionStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    COMPLETE = "complete"


class IngestionStage(str, Enum):
    UPLOADED = "uploaded"
    VALIDATED = "validated"
    RENDERED = "rendered"
    EXTRACTED = "extracted"
    INDEXED = "indexed"
    ENRICHED = "enriched"
    REVIEW_READY = "review_ready"
    COMPLETE = "complete"


class WorkerStep(str, Enum):
    VALIDATE_FILE = "validate_file"
    RENDER_PAGES = "render_pages"
    EXTRACT_TEXT = "extract_text"
    CREATE_UNITS = "create_units"
    EMBED_UNITS = "embed_units"
    ENRICH_UNITS = "enrich_units"
    DETECT_CANDIDATES = "detect_candidates"


class ApprovalState(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class FreshnessState(str, Enum):
    FRESH = "fresh"
    AGING = "aging"
    STALE = "stale"


class AIOutputType(str, Enum):
    SUMMARY = "summary"
    TAXONOMY = "taxonomy"
    DUPLICATE_CANDIDATE = "duplicate_candidate"
    VARIANT_CANDIDATE = "variant_candidate"
    SIMILARITY_CANDIDATE = "similarity_candidate"
    DIAGNOSTICS = "diagnostics"


class AIOutputStatus(str, Enum):
    SUGGESTED = "suggested"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    OVERRIDDEN = "overridden"


@dataclass(frozen=True)
class UploadValidationResult:
    valid: bool
    filename: str
    normalized_file_type: str | None = None
    artifact_type: str | None = None
    content_hash: str | None = None
    file_size_bytes: int = 0
    slide_count: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class IngestionJobState:
    id: str
    status: IngestionStatus = IngestionStatus.QUEUED
    stage: IngestionStage = IngestionStage.UPLOADED
    original_object_id: str | None = None
    work_product_version_id: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass(frozen=True)
class ContentUnitFingerprint:
    source_file_hash: str
    source_order_index: int
    text_hash: str
    notes_hash: str
    visual_hash: str | None
    metadata_hash: str
    content_hash: str


@dataclass(frozen=True)
class SearchDocument:
    id: str
    object_type: str
    title: str = ""
    summary: str = ""
    text: str = ""
    speaker_notes: str = ""
    taxonomy: Mapping[str, Sequence[str] | str] = field(default_factory=dict)
    metadata: Mapping[str, Any] = field(default_factory=dict)
    embedding: Sequence[float] | None = None
    approval_state: ApprovalState | str = ApprovalState.DRAFT
    freshness_state: FreshnessState | str = FreshnessState.FRESH
    updated_at: datetime | None = None
    is_restricted: bool = False
    restricted_to_principal_ids: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class SearchQuery:
    text: str
    taxonomy: Mapping[str, Sequence[str] | str] = field(default_factory=dict)
    metadata_filters: Mapping[str, Any] = field(default_factory=dict)
    principal_ids: frozenset[str] = field(default_factory=frozenset)
    include_restricted: bool = False


@dataclass(frozen=True)
class RankingWeights:
    lexical: float = 0.30
    semantic: float = 0.30
    metadata: float = 0.15
    trust: float = 0.15
    freshness: float = 0.10


@dataclass(frozen=True)
class ScoreBreakdown:
    lexical: float
    semantic: float
    metadata: float
    trust: float
    freshness: float
    total: float


@dataclass(frozen=True)
class RankedResult:
    document: SearchDocument
    score: float
    breakdown: ScoreBreakdown
    explanation: tuple[str, ...] = ()


@dataclass(frozen=True)
class AIReviewCandidate:
    target_type: str
    target_id: str
    output_type: AIOutputType
    proposed_output: Mapping[str, Any]
    pipeline_version: str
    model_info: str
    prompt_ref: str
    confidence: float
    rationale: str
    status: AIOutputStatus = AIOutputStatus.SUGGESTED
    review_required: bool = True

