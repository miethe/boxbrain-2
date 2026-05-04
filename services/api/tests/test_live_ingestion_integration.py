from __future__ import annotations

import io
import os
import zipfile
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from redis import Redis
from rq import Queue, SimpleWorker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.domain.models import (
    ContentUnitFamily,
    ContentUnitVariant,
    ContentUnitVersion,
    ProvenanceRecord,
    now_utc,
)
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


def _assert_postgres_schema_is_migrated(engine) -> None:
    with engine.connect() as connection:
        migrated = connection.scalar(text("select to_regclass('public.ingestion_jobs')"))
        if migrated is None:
            pytest.fail("PostgreSQL schema is not migrated. Run make db-migrate before live tests.")


def test_live_database_s3_rq_ingestion_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOXBRAIN_REPOSITORY", "database")
    monkeypatch.setenv("BOXBRAIN_STORAGE", "s3")
    monkeypatch.setenv("BOXBRAIN_ENQUEUE_INGESTION", "true")
    monkeypatch.setenv("BOXBRAIN_RENDERER", "fake")

    settings = get_settings()
    redis = Redis.from_url(settings.redis_url)
    try:
        redis.ping()
    except Exception as exc:  # pragma: no cover - only reached in live env failures.
        pytest.fail(f"Redis is unavailable at {settings.redis_url}. Run make infra-up. {exc}")

    engine = create_engine(settings.database_url, pool_pre_ping=True)
    _assert_postgres_schema_is_migrated(engine)

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


def test_live_database_comments_and_notes_persist_after_reload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BOXBRAIN_REPOSITORY", "database")
    monkeypatch.setenv("BOXBRAIN_STORAGE", "memory")
    monkeypatch.setenv("BOXBRAIN_ENQUEUE_INGESTION", "false")

    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    _assert_postgres_schema_is_migrated(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    repository = SqlAlchemyBoxBrainRepository(session_factory, seed=False)

    provenance = ProvenanceRecord(
        id=uuid4(),
        origin_type="uploaded_source",
        source_system="database_persistence_test",
        source_refs=["db-comment-note-test"],
        pipeline_version="test-v1",
        created_at=now_utc(),
    )
    family = ContentUnitFamily(
        id=uuid4(),
        family_title="Database persistence target",
        conceptual_summary="Public content unit used for comment and note persistence.",
        unit_type="slide",
        taxonomy={},
    )
    variant = ContentUnitVariant(
        id=uuid4(),
        family_id=family.id,
        variant_label="Default",
        variant_type="source",
        variant_dimensions={},
        is_canonical=True,
        linked_by="manual",
        linked_confidence=None,
        latest_version_id=None,
    )
    version = ContentUnitVersion(
        id=uuid4(),
        variant_id=variant.id,
        version_number="v1.0",
        render_uri="/test/db-persistence/render.png",
        thumbnail_uri="/test/db-persistence/thumb.png",
        summary="Database persistence target version.",
        approval_state="draft",
        freshness_state="fresh",
        quality_score=None,
        usage_score=None,
        extracted_text="Database persistence target version.",
        speaker_notes=None,
        provenance_id=provenance.id,
        created_at=now_utc(),
    )
    variant.latest_version_id = version.id
    repository.save_provenance_record(provenance)
    repository.save_content_unit(
        family,
        variant,
        version,
        source_work_product_version_id=None,
        source_order_index=1,
        text_hash="db-comment-note-test",
        visual_hash=None,
    )

    app = create_app(repository=repository)
    with TestClient(app) as client:
        comment_response = client.post(
            "/api/comments",
            json={
                "kind": "persistent_comment",
                "targetType": "content_unit_version",
                "targetId": str(version.id),
                "body": "Persist this database comment.",
            },
            headers={"x-boxbrain-role": "contributor", "x-boxbrain-user-id": "db-commenter"},
        )
        note_response = client.post(
            "/api/notes",
            json={
                "targetType": "content_unit_version",
                "targetId": str(version.id),
                "title": "Persistence guidance",
                "body": "Persist this database note.",
                "isPinned": True,
            },
            headers={"x-boxbrain-role": "curator", "x-boxbrain-user-id": "db-curator"},
        )

    assert comment_response.status_code == 201
    assert note_response.status_code == 201
    comment = comment_response.json()
    note = note_response.json()

    reloaded_repository = SqlAlchemyBoxBrainRepository(session_factory, seed=False)
    comment_id = UUID(comment["id"])
    note_id = UUID(note["id"])

    assert comment_id in reloaded_repository.comments
    assert note_id in reloaded_repository.notes
    assert reloaded_repository.comments[comment_id].body == "Persist this database comment."
    assert reloaded_repository.notes[note_id].is_pinned is True
