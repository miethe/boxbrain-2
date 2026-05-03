from __future__ import annotations

from uuid import UUID

from redis import Redis
from rq import Queue

from app.config import Settings, get_settings


class IngestionQueue:
    def enqueue_ingestion_job(self, job_id: UUID) -> None:
        raise NotImplementedError


class NoopIngestionQueue(IngestionQueue):
    def __init__(self) -> None:
        self.enqueued_job_ids: list[UUID] = []

    def enqueue_ingestion_job(self, job_id: UUID) -> None:
        self.enqueued_job_ids.append(job_id)


class RQIngestionQueue(IngestionQueue):
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.redis = Redis.from_url(self.settings.redis_url)
        self.queue = Queue("boxbrain-ingestion", connection=self.redis)

    def enqueue_ingestion_job(self, job_id: UUID) -> None:
        self.queue.enqueue(
            "services.worker.boxbrain_worker.main.process_ingestion_job",
            str(job_id),
            job_timeout="10m",
        )


def build_ingestion_queue(settings: Settings | None = None) -> IngestionQueue:
    resolved = settings or get_settings()
    if resolved.enqueue_ingestion_jobs:
        return RQIngestionQueue(resolved)
    return NoopIngestionQueue()
