"""AI output helpers that preserve human review boundaries."""

from __future__ import annotations

from typing import Any, Mapping

from .models import AIOutputStatus, AIOutputType, AIReviewCandidate


def create_ai_review_candidate(
    *,
    target_type: str,
    target_id: str,
    output_type: AIOutputType | str,
    proposed_output: Mapping[str, Any],
    pipeline_version: str,
    model_info: str,
    prompt_ref: str,
    confidence: float,
    rationale: str,
) -> AIReviewCandidate:
    """Create an AI suggestion as a suggested review candidate only."""

    if not 0.0 <= confidence <= 1.0:
        raise ValueError("confidence must be between 0.0 and 1.0")
    return AIReviewCandidate(
        target_type=target_type,
        target_id=target_id,
        output_type=output_type if isinstance(output_type, AIOutputType) else AIOutputType(output_type),
        proposed_output=dict(proposed_output),
        pipeline_version=pipeline_version,
        model_info=model_info,
        prompt_ref=prompt_ref,
        confidence=confidence,
        rationale=rationale,
        status=AIOutputStatus.SUGGESTED,
        review_required=True,
    )


def to_ai_output_record(candidate: AIReviewCandidate) -> dict[str, Any]:
    """Serialize a candidate to the planned ai_outputs table shape."""

    if candidate.status is not AIOutputStatus.SUGGESTED or not candidate.review_required:
        raise ValueError("AI helper outputs must remain suggested review candidates")
    return {
        "target_type": candidate.target_type,
        "target_id": candidate.target_id,
        "output_type": candidate.output_type.value,
        "pipeline_version": candidate.pipeline_version,
        "model_info": candidate.model_info,
        "prompt_ref": candidate.prompt_ref,
        "confidence": candidate.confidence,
        "output": {
            "proposed": dict(candidate.proposed_output),
            "rationale": candidate.rationale,
            "review_required": True,
        },
        "status": AIOutputStatus.SUGGESTED.value,
    }

