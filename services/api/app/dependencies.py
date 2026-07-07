from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository
from app.infrastructure.queue import build_ingestion_queue
from app.infrastructure.storage import build_object_storage
from app.application.slide_renderer import build_slide_renderer


settings = get_settings()
repository: Any
if settings.repository_mode == "database":
    from app.infrastructure.database import SessionLocal
    from app.infrastructure.sqlalchemy_repository import SqlAlchemyBoxBrainRepository

    repository = SqlAlchemyBoxBrainRepository(SessionLocal, seed=False)
else:
    repository = InMemoryBoxBrainRepository(seed=True)

object_storage = build_object_storage(settings)
ingestion_queue = build_ingestion_queue(settings)
slide_renderer = build_slide_renderer(settings)


def get_repository():
    return repository


def get_object_storage():
    return object_storage


def get_ingestion_queue():
    return ingestion_queue


def get_slide_renderer():
    return slide_renderer
