from __future__ import annotations

from typing import Any

from fastapi import Header

from app.config import get_settings
from app.domain.models import Actor
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository
from app.infrastructure.queue import build_ingestion_queue
from app.infrastructure.storage import build_object_storage


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


def get_repository():
    return repository


def get_object_storage():
    return object_storage


def get_ingestion_queue():
    return ingestion_queue


def get_actor(
    x_boxbrain_user: str = Header(default="viewer"),
    x_boxbrain_role: str | None = Header(default=None),
) -> Actor:
    role = x_boxbrain_role or x_boxbrain_user
    if role not in {"viewer", "contributor", "curator", "reviewer", "admin"}:
        role = "viewer"
    return Actor(user_id=x_boxbrain_user, role=role)
