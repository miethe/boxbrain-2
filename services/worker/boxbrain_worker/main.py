from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID


INGESTION_STAGES = (
    "validate_file",
    "render_pages",
    "extract_text",
    "create_units",
    "embed_units",
    "enrich_units",
    "detect_candidates",
)


@dataclass(frozen=True, slots=True)
class WorkerStageResult:
    job_id: UUID
    stage: str
    status: str
    metadata: dict[str, Any] = field(default_factory=dict)
    completed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def run_stage(job_id: UUID, stage: str) -> WorkerStageResult:
    if stage not in INGESTION_STAGES:
        raise ValueError(f"Unknown ingestion stage: {stage}")
    return WorkerStageResult(job_id=job_id, stage=stage, status="complete")


def process_ingestion_job(job_id: str) -> dict[str, Any]:
    """RQ entrypoint for deterministic MVP PPTX ingestion."""

    from app.dependencies import repository, object_storage, slide_renderer
    from app.application.use_cases import BoxBrainUseCases

    use_cases = BoxBrainUseCases(repository, object_storage=object_storage, slide_renderer=slide_renderer)
    job = use_cases.process_ingestion_job(UUID(job_id))
    return job.model_dump(mode="json")
