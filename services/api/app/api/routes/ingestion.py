import json
from typing import Any, cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(tags=["ingestion"])


@router.post("/uploads", response_model=s.IngestionJob)
async def create_upload(
    request: Request,
    response: Response,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.IngestionJob:
    content_type_header = request.headers.get("content-type", "")
    if content_type_header.startswith("application/json"):
        metadata = s.UploadMetadataRequest.model_validate(await request.json())
        job = use_cases.create_upload_job(metadata, actor)
        response.status_code = (
            status.HTTP_202_ACCEPTED if job.status == "failed" else status.HTTP_201_CREATED
        )
        return job

    form = await request.form()
    file = form.get("file")
    if file is None or not hasattr(file, "read"):
        raise HTTPException(status_code=422, detail="multipart field 'file' is required")
    upload_file = cast(Any, file)
    artifact_type = str(form.get("artifactType") or "deck")
    title_value = form.get("title")
    title = str(title_value) if title_value is not None else None
    taxonomy_value = form.get("taxonomy")
    payload = await upload_file.read()
    parsed_taxonomy = {}
    if taxonomy_value:
        try:
            parsed = json.loads(str(taxonomy_value))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="taxonomy must be valid JSON") from exc
        parsed_taxonomy = parsed if isinstance(parsed, dict) else {}
    job = use_cases.create_uploaded_artifact(
        filename=upload_file.filename or "",
        content_type=upload_file.content_type,
        content=payload,
        artifact_type=artifact_type,
        title=title,
        taxonomy=parsed_taxonomy,
        actor=actor,
    )
    response.status_code = status.HTTP_202_ACCEPTED if job.status == "failed" else status.HTTP_201_CREATED
    return job


@router.get("/ingestion-jobs", response_model=list[s.IngestionJob])
def list_ingestion_jobs(
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> list[s.IngestionJob]:
    return use_cases.list_ingestion_jobs()


@router.get("/ingestion-jobs/{job_id}", response_model=s.IngestionJob)
def get_ingestion_job(
    job_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> s.IngestionJob:
    return use_cases.get_ingestion_job(job_id)


@router.post("/ingestion-jobs/{job_id}/retry", response_model=s.IngestionJob, status_code=status.HTTP_202_ACCEPTED)
def retry_ingestion_job(
    job_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.IngestionJob:
    return use_cases.retry_ingestion_job(job_id, actor)
