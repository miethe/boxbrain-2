from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.domain.models import IngestionJob, now_utc
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository
from app.infrastructure.queue import NoopIngestionQueue
from app.main import create_app


def test_admin_health_returns_pilot_readiness_observability_summary() -> None:
    queue = NoopIngestionQueue()
    app = create_app(InMemoryBoxBrainRepository(), ingestion_queue=queue)

    with TestClient(app) as client:
        response = client.get("/api/admin/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["ingestion"]["totalJobs"] == 1
    assert payload["ingestion"]["statusCounts"]["complete"] == 1
    assert payload["queue"]["adapter"] == "NoopIngestionQueue"
    assert payload["queue"]["status"] == "healthy"
    assert payload["catalog"]["contentUnitFamilies"] == 3
    assert payload["catalog"]["contentUnitVersions"] == 4
    assert payload["searchIndex"]["backend"] == "memory"
    assert payload["searchIndex"]["restrictedContentUnitVersions"] == 1
    assert payload["reviewAudit"]["openReviewItems"] == 2
    assert payload["composition"]["contentBlockMembers"] == 2
    assert payload["composition"]["storyboardDraftSlots"] == 1
    assert payload["searchEval"]["status"] == "pass"
    assert payload["searchEval"]["passedCases"] == payload["searchEval"]["totalCases"]

    restricted_case = next(
        case
        for case in payload["searchEval"]["cases"]
        if case["name"] == "restricted_viewer_exclusion"
    )
    assert restricted_case["passed"] is True
    assert "Restricted candidates excluded from viewer search." in restricted_case["notes"]


def test_admin_health_surfaces_failed_retried_jobs_and_stage_failures() -> None:
    repo = InMemoryBoxBrainRepository(seed=False)
    failed_job = IngestionJob(
        id=uuid4(),
        status="failed",
        stage="rendered",
        artifact_type="deck",
        title="Broken pilot deck",
        upload_metadata={
            "stageTelemetry": {
                "validated": {"status": "complete"},
                "rendered": {"status": "failed", "errorCode": "render_failed"},
            }
        },
        error_code="render_failed",
        error_message="Renderer failed",
        retry_count=2,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    repo.ingestion_jobs[failed_job.id] = failed_job
    queue = NoopIngestionQueue()
    queue.enqueue_ingestion_job(failed_job.id)
    app = create_app(repo, ingestion_queue=queue)

    with TestClient(app) as client:
        response = client.get("/api/admin/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded"
    assert payload["ingestion"]["failedJobs"] == 1
    assert payload["ingestion"]["retriedJobs"] == 1
    assert payload["ingestion"]["totalRetries"] == 2
    assert payload["ingestion"]["retryableFailures"] == 1
    assert payload["ingestion"]["recentFailures"][0]["jobId"] == str(failed_job.id)
    assert payload["queue"]["status"] == "degraded"
    assert payload["queue"]["failedJobCount"] == 1
    assert payload["queue"]["enqueuedJobCount"] == 1
    assert payload["stages"]["completedStageCounts"]["validated"] == 1
    assert payload["stages"]["failedStageCounts"]["rendered"] == 1
    assert payload["stages"]["stagesWithFailures"] == ["rendered"]


def test_local_browser_origins_can_call_api() -> None:
    app = create_app(InMemoryBoxBrainRepository())

    with TestClient(app) as client:
        response = client.options(
            "/api/search",
            headers={
                "origin": "http://127.0.0.1:3301",
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type,x-boxbrain-user,x-boxbrain-role",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3301"
