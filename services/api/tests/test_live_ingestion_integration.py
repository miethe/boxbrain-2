from __future__ import annotations

import io
import os
import zipfile

import pytest
from fastapi.testclient import TestClient
from redis import Redis
from rq import Queue, SimpleWorker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.infrastructure.queue import RQIngestionQueue
from app.infrastructure.sqlalchemy_repository import SqlAlchemyBoxBrainRepository
from app.infrastructure.storage import S3ObjectStorage
from app.main import create_app


pytestmark = pytest.mark.skipif(
    os.getenv("BOXBRAIN_RUN_LIVE_TESTS") != "1",
    reason="Set BOXBRAIN_RUN_LIVE_TESTS=1 after starting local Postgres, Redis, and MinIO.",
)


def _pptx_bytes(slides: list[str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("ppt/presentation.xml", "<presentation />")
        archive.writestr("docProps/core.xml", "<core />")
        for index, text_content in enumerate(slides, start=1):
            archive.writestr(
                f"ppt/slides/slide{index}.xml",
                (
                    "<p:sld xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" "
                    "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">"
                    f"<a:t>{text_content}</a:t>"
                    "</p:sld>"
                ),
            )
    return buffer.getvalue()


def test_live_database_s3_rq_ingestion_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOXBRAIN_REPOSITORY", "database")
    monkeypatch.setenv("BOXBRAIN_STORAGE", "s3")
    monkeypatch.setenv("BOXBRAIN_ENQUEUE_INGESTION", "true")

    settings = get_settings()
    redis = Redis.from_url(settings.redis_url)
    try:
        redis.ping()
    except Exception as exc:  # pragma: no cover - only reached in live env failures.
        pytest.fail(f"Redis is unavailable at {settings.redis_url}. Run make infra-up. {exc}")

    engine = create_engine(settings.database_url, pool_pre_ping=True)
    with engine.connect() as connection:
        migrated = connection.scalar(text("select to_regclass('public.ingestion_jobs')"))
        if migrated is None:
            pytest.fail("PostgreSQL schema is not migrated. Run make db-migrate before live tests.")

    session_factory = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    repository = SqlAlchemyBoxBrainRepository(session_factory, seed=False)
    storage = S3ObjectStorage(settings)
    ingestion_queue = RQIngestionQueue(settings)
    queue = Queue("boxbrain-ingestion", connection=redis)
    queue.empty()

    app = create_app(
        repository=repository,
        object_storage=storage,
        ingestion_queue=ingestion_queue,
    )
    payload = _pptx_bytes(["Cloud ROI", "Migration path"])

    with TestClient(app) as client:
        upload_response = client.post(
            "/api/uploads",
            files={
                "file": (
                    "live-deck.pptx",
                    payload,
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                )
            },
            data={"artifactType": "deck", "title": "Live Integration Deck"},
            headers={"x-boxbrain-role": "contributor", "x-boxbrain-user-id": "live-test"},
        )

        assert upload_response.status_code == 201
        queued_job = upload_response.json()
        assert queued_job["status"] == "queued"
        assert queued_job["stage"] == "uploaded"
        assert queued_job["originalObjectId"]
        assert queued_job["workProductVersionId"]
        assert queue.count == 1

        worker = SimpleWorker([queue], connection=redis)
        assert worker.work(burst=True)

        detail_response = client.get(f"/api/ingestion-jobs/{queued_job['id']}")
        assert detail_response.status_code == 200
        completed_job = detail_response.json()
        assert completed_job["status"] == "complete"
        assert completed_job["stage"] == "complete"
        assert completed_job["completedAt"]

    metadata = completed_job["uploadMetadata"]
    created_ids = metadata["createdContentUnitVersionIds"]
    assert len(created_ids) == 2
    assert storage.get_bytes(metadata["storageKey"]) == payload

    with engine.connect() as connection:
        assert (
            connection.scalar(
                text("select count(*) from stored_objects where id = :id"),
                {"id": completed_job["originalObjectId"]},
            )
            == 1
        )
        assert (
            connection.scalar(
                text("select count(*) from work_product_versions where id = :id"),
                {"id": completed_job["workProductVersionId"]},
            )
            == 1
        )
        assert (
            connection.scalar(
                text("select count(*) from ingestion_jobs where id = :id and status = 'complete'"),
                {"id": completed_job["id"]},
            )
            == 1
        )
        assert (
            connection.scalar(
                text("select count(*) from audit_events where target_id = :id"),
                {"id": completed_job["id"]},
            )
            >= 2
        )
        for content_unit_version_id in created_ids:
            assert (
                connection.scalar(
                    text(
                        "select count(*) from content_unit_versions "
                        "where id = :id and source_work_product_version_id = :work_product_id"
                    ),
                    {
                        "id": content_unit_version_id,
                        "work_product_id": completed_job["workProductVersionId"],
                    },
                )
                == 1
            )
