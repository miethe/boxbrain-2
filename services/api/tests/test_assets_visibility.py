from __future__ import annotations

from uuid import uuid4

from app.domain.models import StoredObject, now_utc
from app.infrastructure.in_memory_repository import SEED_IDS

from .conftest import role_headers


def _register_asset(client, *, key: str, restricted: bool) -> bytes:
    """Register a stored object at ``key`` and, when ``restricted``, point the
    seeded restricted content-unit version's render URI at it so
    ``is_asset_restricted`` treats the raw-bytes path as restricted.
    """
    repo = client.app.state.repository
    storage = client.app.state.object_storage
    uri = f"memory://boxbrain-artifacts/{key}"
    content = b"asset-bytes-" + key.encode()
    storage.put_bytes(key=key, content=content, content_type="image/png")
    repo.register_stored_object(
        StoredObject(
            id=uuid4(),
            object_type="render",
            storage_uri=uri,
            mime_type="image/png",
            byte_size=len(content),
            sha256="0" * 64,
            metadata={"key": key},
            created_at=now_utc(),
        )
    )
    if restricted:
        repo.content_unit_versions[SEED_IDS["restricted_v1"]].render_uri = uri
    return content


def test_viewer_denied_asset_of_restricted_object(client) -> None:
    key = "restricted/secret-render.png"
    _register_asset(client, key=key, restricted=True)

    response = client.get(f"/api/assets/{key}", headers=role_headers("viewer", "viewer-1"))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "permission_denied"


def test_reviewer_can_fetch_asset_of_restricted_object(client) -> None:
    key = "restricted/secret-render.png"
    content = _register_asset(client, key=key, restricted=True)

    response = client.get(f"/api/assets/{key}", headers=role_headers("reviewer", "reviewer-1"))

    assert response.status_code == 200
    assert response.content == content


def test_viewer_can_fetch_asset_of_unrestricted_object(client) -> None:
    key = "public/overview-render.png"
    content = _register_asset(client, key=key, restricted=False)

    response = client.get(f"/api/assets/{key}", headers=role_headers("viewer", "viewer-1"))

    assert response.status_code == 200
    assert response.content == content


def test_unknown_asset_key_returns_not_found(client) -> None:
    response = client.get(
        "/api/assets/does-not-exist.png",
        headers=role_headers("admin", "admin-1"),
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
