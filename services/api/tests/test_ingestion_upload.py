from __future__ import annotations

import io
import zipfile
from uuid import UUID

from fastapi.testclient import TestClient

from app.application.slide_renderer import SlideRenderError, SlideRenderer
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository
from app.main import create_app

from .conftest import role_headers


def _pptx_bytes(slides: list[str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("ppt/presentation.xml", "<presentation />")
        archive.writestr("docProps/core.xml", "<core />")
        for index, text in enumerate(slides, start=1):
            archive.writestr(
                f"ppt/slides/slide{index}.xml",
                (
                    "<p:sld xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" "
                    "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">"
                    f"<a:t>{text}</a:t>"
                    "</p:sld>"
                ),
            )
    return buffer.getvalue()


def test_multipart_upload_creates_stored_object_work_product_and_job(client):
    payload = _pptx_bytes(["Cloud ROI", "Migration path"])

    response = client.post(
        "/api/uploads",
        files={
            "file": (
                "deck.pptx",
                payload,
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        },
        data={"artifactType": "deck", "title": "Pilot Deck"},
        headers=role_headers("contributor", "contributor-1"),
    )

    assert response.status_code == 201
    job = response.json()
    assert job["status"] == "queued"
    assert job["stage"] == "uploaded"
    assert job["originalObjectId"]
    assert job["workProductVersionId"]

    repo = client.app.state.repository
    assert UUID(job["originalObjectId"]) in repo.stored_objects
    assert UUID(job["workProductVersionId"]) in repo.work_product_versions


def test_non_pptx_upload_fails_with_actionable_job_state(client):
    response = client.post(
        "/api/uploads",
        files={"file": ("brief.pdf", b"%PDF-1.7", "application/pdf")},
        data={"artifactType": "deck", "title": "Bad Deck"},
        headers=role_headers("contributor", "contributor-1"),
    )

    assert response.status_code == 202
    job = response.json()
    assert job["status"] == "failed"
    assert job["stage"] == "validate_file"
    assert job["errorCode"] == "unsupported_file_type"


def test_deterministic_processor_creates_one_atomic_unit_per_slide_and_is_idempotent(client):
    payload = _pptx_bytes(["Cloud ROI", "Migration path"])
    upload = client.post(
        "/api/uploads",
        files={
            "file": (
                "deck.pptx",
                payload,
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        },
        data={"artifactType": "deck", "title": "Pilot Deck"},
        headers=role_headers("contributor", "contributor-1"),
    ).json()

    first = client.app.state.use_cases.process_ingestion_job(UUID(upload["id"]))
    second = client.app.state.use_cases.process_ingestion_job(UUID(upload["id"]))

    assert first.status == "complete"
    assert second.status == "complete"
    repo = client.app.state.repository
    assert len(repo.content_unit_versions) == 6
    created_ids = repo.ingestion_jobs[UUID(upload["id"])].upload_metadata[
        "createdContentUnitVersionIds"
    ]
    assert len(created_ids) == 2
    assert all(repo.content_unit_versions[UUID(value)].source_slide_count == 1 for value in created_ids)
    assert len(set(created_ids)) == 2
    created_versions = [repo.content_unit_versions[UUID(value)] for value in created_ids]
    assert [version.source_order_index for version in created_versions] == [1, 2]
    assert created_versions[0].render_uri
    assert created_versions[0].thumbnail_uri
    assert created_versions[0].render_uri != created_versions[0].thumbnail_uri
    assert repo.work_product_versions[UUID(upload["workProductVersionId"])].filmstrip_version_ids == [
        UUID(value) for value in created_ids
    ]
    assert repo.work_product_versions[UUID(upload["workProductVersionId"])].preview_uri == created_versions[0].thumbnail_uri
    content_unit_embeddings = [
        embedding
        for embedding in repo.embeddings.values()
        if embedding.target_type == "content_unit_version"
    ]
    work_product_embeddings = [
        embedding
        for embedding in repo.embeddings.values()
        if embedding.target_type == "work_product_version"
        and embedding.target_id == UUID(upload["workProductVersionId"])
    ]
    assert len(content_unit_embeddings) == 2
    assert len(work_product_embeddings) == 1
    assert first.outputSummary is not None
    assert first.outputSummary.createdContentUnitVersionIds == [UUID(value) for value in created_ids]


class MissingRenderer(SlideRenderer):
    renderer_name = "missing-test-renderer"

    def render_pptx(self, *, content: bytes, filename: str, slide_count: int):
        raise SlideRenderError(
            "renderer_unavailable",
            "LibreOffice renderer is not installed or not on PATH. Install LibreOffice and retry.",
        )


def test_renderer_failure_records_actionable_job_state():
    app = create_app(InMemoryBoxBrainRepository(), slide_renderer=MissingRenderer())
    payload = _pptx_bytes(["Cloud ROI"])

    with TestClient(app) as client:
        upload = client.post(
            "/api/uploads",
            files={
                "file": (
                    "deck.pptx",
                    payload,
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                )
            },
            data={"artifactType": "deck", "title": "Pilot Deck"},
            headers=role_headers("contributor", "contributor-1"),
        ).json()

        job = client.app.state.use_cases.process_ingestion_job(UUID(upload["id"]))

    assert job.status == "failed"
    assert job.stage == "rendered"
    assert job.errorCode == "renderer_unavailable"
    assert "LibreOffice" in (job.errorMessage or "")
    assert job.stageTelemetry["rendered"]["status"] == "failed"
