from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository
from app.main import create_app


@pytest.fixture()
def client() -> Iterator[TestClient]:
    app = create_app(InMemoryBoxBrainRepository())
    with TestClient(app) as test_client:
        yield test_client


def role_headers(role: str, user_id: str | None = None) -> dict[str, str]:
    return {
        "x-boxbrain-role": role,
        "x-boxbrain-user-id": user_id or f"seed-{role}",
    }
