from __future__ import annotations

import os
import re
from dataclasses import dataclass, field


_SCHEMA_NAME_RE = re.compile(r"^[a-z_][a-z0-9_]*$")


@dataclass(frozen=True, slots=True)
class Settings:
    repository_mode: str = "memory"
    database_url: str = "postgresql+psycopg://boxbrain:boxbrain@localhost:5432/boxbrain"
    database_schema: str | None = None
    storage_mode: str = "memory"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key_id: str = "boxbrain"
    s3_secret_access_key: str = "boxbrain-secret"
    s3_bucket: str = "boxbrain-artifacts"
    redis_url: str = "redis://localhost:6379/0"
    enqueue_ingestion_jobs: bool = False
    renderer_mode: str = "libreoffice"
    # Comma-separated list of allowed CORS origins.  When empty the default
    # allow_origin_regex (localhost/127.0.0.1) is used so local dev is unaffected.
    cors_origins: tuple[str, ...] = field(default_factory=tuple)


def get_settings() -> Settings:
    return Settings(
        repository_mode=os.getenv("BOXBRAIN_REPOSITORY", "memory").casefold(),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://boxbrain:boxbrain@localhost:5432/boxbrain",
        ),
        database_schema=database_schema_from_env(),
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
        renderer_mode=os.getenv("BOXBRAIN_RENDERER", "libreoffice").casefold(),
        cors_origins=_cors_origins_from_env(),
    )


def _cors_origins_from_env() -> tuple[str, ...]:
    raw = os.getenv("BOXBRAIN_CORS_ORIGINS", "").strip()
    if not raw:
        return ()
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


def database_schema_from_env() -> str | None:
    raw_schema = os.getenv("BOXBRAIN_DB_SCHEMA", "").strip()
    if not raw_schema:
        return None
    if not _SCHEMA_NAME_RE.fullmatch(raw_schema):
        raise ValueError(
            "BOXBRAIN_DB_SCHEMA must be a lowercase PostgreSQL identifier "
            "using letters, numbers, and underscores."
        )
    return raw_schema
