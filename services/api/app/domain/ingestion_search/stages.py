"""Visible ingestion job stage model and retry helpers."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone

from .models import IngestionJobState, IngestionStage, IngestionStatus, WorkerStep

PUBLIC_STAGE_ORDER = (
    IngestionStage.UPLOADED,
    IngestionStage.VALIDATED,
    IngestionStage.RENDERED,
    IngestionStage.EXTRACTED,
    IngestionStage.INDEXED,
    IngestionStage.ENRICHED,
    IngestionStage.REVIEW_READY,
    IngestionStage.COMPLETE,
)

_STAGE_INDEX = {stage: index for index, stage in enumerate(PUBLIC_STAGE_ORDER)}
_WORKER_STEPS_BY_STAGE = {
    IngestionStage.UPLOADED: (WorkerStep.VALIDATE_FILE,),
    IngestionStage.VALIDATED: (WorkerStep.RENDER_PAGES,),
    IngestionStage.RENDERED: (WorkerStep.EXTRACT_TEXT,),
    IngestionStage.EXTRACTED: (WorkerStep.CREATE_UNITS, WorkerStep.EMBED_UNITS),
    IngestionStage.INDEXED: (WorkerStep.ENRICH_UNITS,),
    IngestionStage.ENRICHED: (WorkerStep.DETECT_CANDIDATES,),
    IngestionStage.REVIEW_READY: (),
    IngestionStage.COMPLETE: (),
}


def coerce_stage(stage: IngestionStage | str) -> IngestionStage:
    return stage if isinstance(stage, IngestionStage) else IngestionStage(stage)


def coerce_status(status: IngestionStatus | str) -> IngestionStatus:
    return status if isinstance(status, IngestionStatus) else IngestionStatus(status)


def next_stage(stage: IngestionStage | str) -> IngestionStage | None:
    current = coerce_stage(stage)
    index = _STAGE_INDEX[current]
    if index == len(PUBLIC_STAGE_ORDER) - 1:
        return None
    return PUBLIC_STAGE_ORDER[index + 1]


def next_worker_steps(stage: IngestionStage | str) -> tuple[WorkerStep, ...]:
    return _WORKER_STEPS_BY_STAGE[coerce_stage(stage)]


def stage_progress(stage: IngestionStage | str) -> float:
    current = coerce_stage(stage)
    return _STAGE_INDEX[current] / (len(PUBLIC_STAGE_ORDER) - 1)


def mark_stage_complete(
    job: IngestionJobState,
    completed_stage: IngestionStage | str,
    *,
    now: datetime | None = None,
) -> IngestionJobState:
    """Mark a public ingestion milestone complete.

    Re-marking the same or an earlier stage is idempotent. Skipping stages is
    rejected because stage observability and retries depend on ordered progress.
    """

    current = coerce_stage(job.stage)
    completed = coerce_stage(completed_stage)
    current_index = _STAGE_INDEX[current]
    completed_index = _STAGE_INDEX[completed]

    if completed_index < current_index:
        return job
    if completed_index > current_index + 1:
        raise ValueError(f"cannot skip ingestion stage from {current.value} to {completed.value}")

    timestamp = now or datetime.now(timezone.utc)
    status = IngestionStatus.COMPLETE if completed is IngestionStage.COMPLETE else IngestionStatus.RUNNING
    return replace(
        job,
        status=status,
        stage=completed,
        error_code=None,
        error_message=None,
        updated_at=timestamp,
        completed_at=timestamp if completed is IngestionStage.COMPLETE else job.completed_at,
    )


def fail_job(
    job: IngestionJobState,
    *,
    error_code: str,
    error_message: str,
    failed_stage: IngestionStage | str | None = None,
    now: datetime | None = None,
) -> IngestionJobState:
    timestamp = now or datetime.now(timezone.utc)
    return replace(
        job,
        status=IngestionStatus.FAILED,
        stage=coerce_stage(failed_stage) if failed_stage is not None else coerce_stage(job.stage),
        error_code=error_code,
        error_message=error_message,
        updated_at=timestamp,
    )


def retry_job(job: IngestionJobState, *, now: datetime | None = None) -> IngestionJobState:
    if coerce_status(job.status) is not IngestionStatus.FAILED:
        raise ValueError("only failed ingestion jobs can be retried")
    timestamp = now or datetime.now(timezone.utc)
    return replace(
        job,
        status=IngestionStatus.QUEUED,
        error_code=None,
        error_message=None,
        updated_at=timestamp,
        completed_at=None,
    )

