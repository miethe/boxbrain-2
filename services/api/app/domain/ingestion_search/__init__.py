"""Deterministic ingestion and search helpers.

These helpers intentionally avoid database and framework dependencies so API
routes and workers can import the same domain behavior.
"""

from .ai_candidates import create_ai_review_candidate, to_ai_output_record
from .embeddings import (
    DETERMINISTIC_EMBEDDING_MODEL,
    DETERMINISTIC_EMBEDDING_VERSION,
    DEFAULT_EMBEDDING_DIMS,
    coerce_embedding_vector,
    cosine_similarity,
    deterministic_text_embedding,
    pgvector_literal,
)
from .hashing import (
    content_unit_fingerprint,
    hash_bytes,
    hash_metadata,
    hash_text,
    normalize_text_for_hash,
)
from .models import (
    AIOutputStatus,
    AIOutputType,
    AIReviewCandidate,
    ApprovalState,
    ContentUnitFingerprint,
    FreshnessState,
    IngestionJobState,
    IngestionStage,
    IngestionStatus,
    RankingWeights,
    RankedResult,
    ScoreBreakdown,
    SearchDocument,
    SearchQuery,
    UploadValidationResult,
    WorkerStep,
)
from .ranking import DEFAULT_RANKING_WEIGHTS, rank_documents, score_document
from .stages import (
    PUBLIC_STAGE_ORDER,
    fail_job,
    mark_stage_complete,
    next_stage,
    next_worker_steps,
    retry_job,
    stage_progress,
)
from .validation import (
    PPTX_MIME_TYPES,
    validate_pptx_upload,
)

__all__ = [
    "AIOutputStatus",
    "AIOutputType",
    "AIReviewCandidate",
    "ApprovalState",
    "ContentUnitFingerprint",
    "DEFAULT_RANKING_WEIGHTS",
    "DEFAULT_EMBEDDING_DIMS",
    "DETERMINISTIC_EMBEDDING_MODEL",
    "DETERMINISTIC_EMBEDDING_VERSION",
    "FreshnessState",
    "IngestionJobState",
    "IngestionStage",
    "IngestionStatus",
    "PPTX_MIME_TYPES",
    "PUBLIC_STAGE_ORDER",
    "RankingWeights",
    "RankedResult",
    "ScoreBreakdown",
    "SearchDocument",
    "SearchQuery",
    "UploadValidationResult",
    "WorkerStep",
    "content_unit_fingerprint",
    "coerce_embedding_vector",
    "cosine_similarity",
    "create_ai_review_candidate",
    "deterministic_text_embedding",
    "fail_job",
    "hash_bytes",
    "hash_metadata",
    "hash_text",
    "mark_stage_complete",
    "next_stage",
    "next_worker_steps",
    "normalize_text_for_hash",
    "pgvector_literal",
    "rank_documents",
    "retry_job",
    "score_document",
    "stage_progress",
    "to_ai_output_record",
    "validate_pptx_upload",
]
