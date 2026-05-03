from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    repository_mode: str = "memory"
    database_url: str = "postgresql+psycopg://boxbrain:boxbrain@localhost:5432/boxbrain"
    storage_mode: str = "memory"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key_id: str = "boxbrain"
    s3_secret_access_key: str = "boxbrain-secret"
    s3_bucket: str = "boxbrain-artifacts"
    redis_url: str = "redis://localhost:6379/0"
    enqueue_ingestion_jobs: bool = False


def get_settings() -> Settings:
    return Settings(
        repository_mode=os.getenv("BOXBRAIN_REPOSITORY", "memory").casefold(),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://boxbrain:boxbrain@localhost:5432/boxbrain",
        ),
        storage_mode=os.getenv("BOXBRAIN_STORAGE", "memory").casefold(),
        s3_endpoint_url=os.getenv("S3_ENDPOINT_URL", "http://localhost:9000"),
        s3_access_key_id=os.getenv("S3_ACCESS_KEY_ID", os.getenv("MINIO_ROOT_USER", "boxbrain")),
        s3_secret_access_key=os.getenv(
            "S3_SECRET_ACCESS_KEY",
            os.getenv("MINIO_ROOT_PASSWORD", "boxbrain-secret"),
        ),
        s3_bucket=os.getenv("S3_BUCKET", "boxbrain-artifacts"),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        enqueue_ingestion_jobs=os.getenv("BOXBRAIN_ENQUEUE_INGESTION", "false").casefold()
        in {"1", "true", "yes"},
    )
