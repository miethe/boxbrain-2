"""Simple deterministic hybrid ranking."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

from .embeddings import cosine_similarity, deterministic_text_embedding, tokenize
from .models import (
    ApprovalState,
    FreshnessState,
    RankedResult,
    RankingWeights,
    ScoreBreakdown,
    SearchDocument,
    SearchQuery,
)

DEFAULT_RANKING_WEIGHTS = RankingWeights()
_APPROVAL_SCORE = {
    ApprovalState.APPROVED.value: 1.0,
    ApprovalState.REVIEW.value: 0.65,
    ApprovalState.DRAFT.value: 0.40,
    ApprovalState.DEPRECATED.value: 0.12,
    ApprovalState.ARCHIVED.value: 0.0,
}
_FRESHNESS_SCORE = {
    FreshnessState.FRESH.value: 1.0,
    FreshnessState.AGING.value: 0.60,
    FreshnessState.STALE.value: 0.20,
}


def rank_documents(
    query: SearchQuery | str,
    documents: Iterable[SearchDocument],
    *,
    weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
    now: datetime | None = None,
    limit: int | None = None,
) -> list[RankedResult]:
    resolved_query = query if isinstance(query, SearchQuery) else SearchQuery(text=query)
    timestamp = now or datetime.now(timezone.utc)
    query_embedding = deterministic_text_embedding(resolved_query.text)

    results: list[RankedResult] = []
    for document in documents:
        if not _is_visible_to_query(document, resolved_query):
            continue
        breakdown = score_document(
            resolved_query,
            document,
            weights=weights,
            now=timestamp,
            query_embedding=query_embedding,
        )
        results.append(
            RankedResult(
                document=document,
                score=breakdown.total,
                breakdown=breakdown,
                explanation=_explain_score(breakdown),
            )
        )

    results.sort(key=lambda item: (item.score, item.document.id), reverse=True)
    return results if limit is None else results[:limit]


def score_document(
    query: SearchQuery | str,
    document: SearchDocument,
    *,
    weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
    now: datetime | None = None,
    query_embedding: tuple[float, ...] | None = None,
) -> ScoreBreakdown:
    resolved_query = query if isinstance(query, SearchQuery) else SearchQuery(text=query)
    timestamp = now or datetime.now(timezone.utc)
    lexical = _lexical_score(resolved_query.text, document)
    semantic = _semantic_score(resolved_query.text, document, query_embedding=query_embedding)
    metadata = _metadata_score(resolved_query, document)
    trust = _trust_score(document)
    freshness = _freshness_score(document, timestamp)
    total = (
        weights.lexical * lexical
        + weights.semantic * semantic
        + weights.metadata * metadata
        + weights.trust * trust
        + weights.freshness * freshness
    )
    return ScoreBreakdown(
        lexical=round(lexical, 6),
        semantic=round(semantic, 6),
        metadata=round(metadata, 6),
        trust=round(trust, 6),
        freshness=round(freshness, 6),
        total=round(total, 6),
    )


def _lexical_score(query_text: str, document: SearchDocument) -> float:
    query_tokens = set(tokenize(query_text))
    if not query_tokens:
        return 0.0

    doc_text = _document_text(document)
    doc_tokens = set(tokenize(doc_text))
    if not doc_tokens:
        return 0.0

    overlap = len(query_tokens.intersection(doc_tokens)) / len(query_tokens)
    title_tokens = set(tokenize(document.title))
    title_overlap = len(query_tokens.intersection(title_tokens)) / len(query_tokens)
    phrase_boost = 0.15 if " ".join(tokenize(query_text)) in " ".join(tokenize(doc_text)) else 0.0
    return min(1.0, overlap + (0.10 * title_overlap) + phrase_boost)


def _semantic_score(
    query_text: str,
    document: SearchDocument,
    *,
    query_embedding: tuple[float, ...] | None = None,
) -> float:
    if not query_text.strip():
        return 0.0

    resolved_query_embedding = query_embedding or deterministic_text_embedding(query_text)
    document_embedding = tuple(document.embedding or deterministic_text_embedding(_document_text(document)))
    similarity = cosine_similarity(resolved_query_embedding, document_embedding)
    return max(0.0, min(1.0, similarity))


def _metadata_score(query: SearchQuery, document: SearchDocument) -> float:
    scores: list[float] = []
    if query.taxonomy:
        scores.extend(_mapping_overlap_scores(query.taxonomy, document.taxonomy))
    if query.metadata_filters:
        scores.extend(_mapping_overlap_scores(query.metadata_filters, document.metadata))
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def _trust_score(document: SearchDocument) -> float:
    approval_state = _enum_value(document.approval_state)
    score = _APPROVAL_SCORE.get(approval_state, _APPROVAL_SCORE[ApprovalState.DRAFT.value])

    client_safe = document.metadata.get("client_safe")
    rights_state = str(document.metadata.get("rights_state", "")).casefold()
    if client_safe is False:
        score = min(score, 0.25)
    if rights_state in {"restricted", "expired", "unknown"}:
        score = min(score, 0.35)
    if document.is_restricted:
        score = min(score, 0.70)
    return score


def _freshness_score(document: SearchDocument, now: datetime) -> float:
    freshness_state = _enum_value(document.freshness_state)
    state_score = _FRESHNESS_SCORE.get(freshness_state, _FRESHNESS_SCORE[FreshnessState.FRESH.value])
    if document.updated_at is None:
        return state_score

    updated_at = document.updated_at
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    resolved_now = now if now.tzinfo is not None else now.replace(tzinfo=timezone.utc)
    age_days = max(0.0, (resolved_now - updated_at).total_seconds() / 86400)
    recency_score = max(0.0, 1.0 - (age_days / 365))
    return (0.70 * state_score) + (0.30 * recency_score)


def _mapping_overlap_scores(
    requested: Mapping[str, Any],
    actual: Mapping[str, Any],
) -> list[float]:
    scores: list[float] = []
    for key, requested_value in requested.items():
        requested_values = _normalize_values(requested_value)
        if not requested_values:
            continue
        actual_values = _normalize_values(actual.get(key))
        overlap = len(requested_values.intersection(actual_values)) / len(requested_values)
        scores.append(overlap)
    return scores


def _normalize_values(value: Any) -> set[str]:
    if value is None:
        return set()
    if isinstance(value, str):
        return {value.casefold()}
    if isinstance(value, Mapping):
        return {f"{key}:{item}".casefold() for key, item in value.items()}
    try:
        iterator = iter(value)
    except TypeError:
        return {str(value).casefold()}
    return {str(item).casefold() for item in iterator}


def _document_text(document: SearchDocument) -> str:
    values = [
        document.title,
        document.summary,
        document.text,
        document.speaker_notes,
        *_flatten_mapping_values(document.taxonomy),
        *_flatten_mapping_values(document.metadata),
    ]
    return " ".join(str(value) for value in values if value is not None)


def _flatten_mapping_values(mapping: Mapping[str, Any]) -> list[str]:
    flattened: list[str] = []
    for value in mapping.values():
        if isinstance(value, str):
            flattened.append(value)
        elif isinstance(value, Mapping):
            flattened.extend(_flatten_mapping_values(value))
        else:
            try:
                flattened.extend(str(item) for item in value)
            except TypeError:
                flattened.append(str(value))
    return flattened


def _is_visible_to_query(document: SearchDocument, query: SearchQuery) -> bool:
    if not document.is_restricted:
        return True
    if document.restricted_to_principal_ids:
        return bool(query.principal_ids.intersection(document.restricted_to_principal_ids))
    return query.include_restricted


def _explain_score(breakdown: ScoreBreakdown) -> tuple[str, ...]:
    explanations: list[str] = []
    if breakdown.lexical > 0:
        explanations.append("lexical")
    if breakdown.semantic > 0:
        explanations.append("semantic")
    if breakdown.metadata > 0:
        explanations.append("metadata")
    if breakdown.trust >= 0.65:
        explanations.append("trusted")
    if breakdown.freshness >= 0.6:
        explanations.append("fresh")
    return tuple(explanations)


def _enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)
