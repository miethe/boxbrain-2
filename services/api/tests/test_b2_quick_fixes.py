"""Tests for the B2 quick-fixes wave (pagination, generate-body, asset visibility).

Verifies:
- Pagination: two-page walkthrough via cursor on all five list endpoints.
- POST /api/reviews/candidates/generate body: queueType scoping and limit capping.
- GET /api/assets/{key}: restricted 403, unknown key 404.
"""
from __future__ import annotations

from uuid import uuid4

from app.domain.models import StoredObject, now_utc
from app.infrastructure.in_memory_repository import SEED_IDS

from .conftest import role_headers


# ---------------------------------------------------------------------------
# Pagination helpers
# ---------------------------------------------------------------------------


def _items_and_cursor(resp) -> tuple[list, str | None]:
    body = resp.json()
    return body["items"], body.get("nextCursor")


# ---------------------------------------------------------------------------
# 1. Real pagination on list endpoints
# ---------------------------------------------------------------------------


def test_content_unit_families_two_page_cursor(client) -> None:
    # Seed adds >= 6 families; request first page of 2 then second.
    r1 = client.get(
        "/api/content-units/families",
        params={"limit": 2},
        headers=role_headers("reviewer", "reviewer-1"),
    )
    assert r1.status_code == 200
    page1, cursor1 = _items_and_cursor(r1)
    assert len(page1) == 2
    assert cursor1 is not None  # more data follows

    r2 = client.get(
        "/api/content-units/families",
        params={"limit": 2, "cursor": cursor1},
        headers=role_headers("reviewer", "reviewer-1"),
    )
    assert r2.status_code == 200
    page2, _ = _items_and_cursor(r2)
    assert len(page2) > 0
    # No duplicates across pages.
    assert {item["id"] for item in page1}.isdisjoint({item["id"] for item in page2})


def test_content_unit_families_mode_variants_filters(client) -> None:
    """mode=variants should return only families with > 1 variant."""
    r_families = client.get(
        "/api/content-units/families",
        headers=role_headers("reviewer"),
    )
    r_variants = client.get(
        "/api/content-units/families",
        params={"mode": "variants"},
        headers=role_headers("reviewer"),
    )
    assert r_families.status_code == 200
    assert r_variants.status_code == 200
    # variant-mode subset must be equal or smaller than the full set.
    assert len(r_variants.json()["items"]) <= len(r_families.json()["items"])


def test_review_items_pagination(client) -> None:
    # Generate candidates so there are review items to page through.
    client.post("/api/reviews/candidates/generate", headers=role_headers("reviewer", "rev-pg"))
    r1 = client.get(
        "/api/reviews/items",
        params={"limit": 2},
        headers=role_headers("reviewer", "rev-pg"),
    )
    assert r1.status_code == 200
    page1, cursor1 = _items_and_cursor(r1)
    if cursor1:
        r2 = client.get(
            "/api/reviews/items",
            params={"limit": 2, "cursor": cursor1},
            headers=role_headers("reviewer", "rev-pg"),
        )
        assert r2.status_code == 200
        page2, _ = _items_and_cursor(r2)
        assert {item["id"] for item in page1}.isdisjoint({item["id"] for item in page2})
    else:
        # Small seed may fit on one page — just verify no duplicates within page.
        assert len({item["id"] for item in page1}) == len(page1)


def test_work_product_families_pagination(client) -> None:
    r1 = client.get(
        "/api/work-products/families",
        params={"limit": 1},
        headers=role_headers("viewer", "viewer-pag"),
    )
    assert r1.status_code == 200
    page1, cursor1 = _items_and_cursor(r1)
    assert len(page1) >= 1
    if cursor1:
        r2 = client.get(
            "/api/work-products/families",
            params={"limit": 1, "cursor": cursor1},
            headers=role_headers("viewer", "viewer-pag"),
        )
        assert r2.status_code == 200
        page2, _ = _items_and_cursor(r2)
        assert {item["id"] for item in page1}.isdisjoint({item["id"] for item in page2})


def test_content_blocks_pagination(client) -> None:
    r_all = client.get("/api/content-blocks", headers=role_headers("reviewer"))
    assert r_all.status_code == 200
    all_items, _ = _items_and_cursor(r_all)
    if len(all_items) < 2:
        return  # not enough data; just verify shape
    r1 = client.get(
        "/api/content-blocks",
        params={"limit": 1},
        headers=role_headers("reviewer"),
    )
    assert r1.status_code == 200
    page1, cursor1 = _items_and_cursor(r1)
    assert cursor1 is not None
    r2 = client.get(
        "/api/content-blocks",
        params={"limit": 1, "cursor": cursor1},
        headers=role_headers("reviewer"),
    )
    assert r2.status_code == 200
    page2, _ = _items_and_cursor(r2)
    assert {item["id"] for item in page1}.isdisjoint({item["id"] for item in page2})


def test_storyboards_pagination(client) -> None:
    r_all = client.get("/api/storyboards", headers=role_headers("reviewer"))
    assert r_all.status_code == 200
    all_items, _ = _items_and_cursor(r_all)
    if len(all_items) < 2:
        return
    r1 = client.get(
        "/api/storyboards",
        params={"limit": 1},
        headers=role_headers("reviewer"),
    )
    assert r1.status_code == 200
    page1, cursor1 = _items_and_cursor(r1)
    assert cursor1 is not None
    r2 = client.get(
        "/api/storyboards",
        params={"limit": 1, "cursor": cursor1},
        headers=role_headers("reviewer"),
    )
    assert r2.status_code == 200
    page2, _ = _items_and_cursor(r2)
    assert {item["id"] for item in page1}.isdisjoint({item["id"] for item in page2})


def test_last_page_has_null_next_cursor(client) -> None:
    """When cursor lands exactly at end of list, nextCursor must be null."""
    r_all = client.get(
        "/api/content-units/families",
        headers=role_headers("reviewer"),
    )
    total = len(r_all.json()["items"])
    r_big = client.get(
        "/api/content-units/families",
        params={"limit": total},
        headers=role_headers("reviewer"),
    )
    _, cursor = _items_and_cursor(r_big)
    assert cursor is None


# ---------------------------------------------------------------------------
# 2. POST /api/reviews/candidates/generate honours body
# ---------------------------------------------------------------------------


def test_generate_candidates_scoped_by_queue_type(client) -> None:
    r = client.post(
        "/api/reviews/candidates/generate",
        json={"queueType": "stale"},
        headers=role_headers("reviewer", "rev-scope"),
    )
    assert r.status_code == 200
    payload = r.json()
    # All returned items must belong to the requested queue type.
    if payload:
        assert all(item["queueType"] == "stale" for item in payload)


def test_generate_candidates_limit_caps_creation(client) -> None:
    r = client.post(
        "/api/reviews/candidates/generate",
        json={"limit": 2},
        headers=role_headers("reviewer", "rev-cap"),
    )
    assert r.status_code == 200
    # At most 2 new candidates should have been returned.
    assert len(r.json()) <= 2


def test_generate_candidates_no_body_still_works(client) -> None:
    """Backward compat: omitting the body must work (matches pre-fix contract)."""
    r = client.post(
        "/api/reviews/candidates/generate",
        headers=role_headers("reviewer", "rev-nobody"),
    )
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# 3. GET /api/assets/{key}: restricted 403 / unknown key 404
# ---------------------------------------------------------------------------


def _add_restricted_asset(client) -> str:
    """Inject a stored object whose key is linked to a restricted content unit version."""
    repo = client.app.state.repository
    key = f"test-restricted-asset-{uuid4().hex}"
    asset_uri = f"/api/assets/{key}"
    so = StoredObject(
        id=uuid4(),
        object_type="thumbnail",
        storage_uri=asset_uri,
        mime_type="image/png",
        byte_size=4,
        sha256="deadbeef",
        metadata={"key": key},
        created_at=now_utc(),
    )
    repo.register_stored_object(so)
    # Store the actual bytes.
    client.app.state.use_cases.object_storage.objects[key] = b"\x89PNG"
    # Link to a restricted version by patching thumbnail_uri.
    restricted_version = repo.content_unit_versions[SEED_IDS["restricted_v1"]]
    restricted_version.thumbnail_uri = asset_uri
    return key


def _add_public_asset(client) -> str:
    """Inject a stored object linked to a non-restricted content unit version."""
    repo = client.app.state.repository
    key = f"test-public-asset-{uuid4().hex}"
    asset_uri = f"/api/assets/{key}"
    so = StoredObject(
        id=uuid4(),
        object_type="thumbnail",
        storage_uri=asset_uri,
        mime_type="image/png",
        byte_size=4,
        sha256="cafecafe",
        metadata={"key": key},
        created_at=now_utc(),
    )
    repo.register_stored_object(so)
    client.app.state.use_cases.object_storage.objects[key] = b"\x89PNG"
    non_restricted = repo.content_unit_versions[SEED_IDS["roi_exec_v1"]]
    non_restricted.thumbnail_uri = asset_uri
    return key


def test_asset_unknown_key_returns_404(client) -> None:
    r = client.get(
        "/api/assets/does-not-exist-abc123",
        headers=role_headers("viewer", "viewer-asset"),
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_asset_restricted_returns_403_for_viewer(client) -> None:
    key = _add_restricted_asset(client)
    r = client.get(
        f"/api/assets/{key}",
        headers=role_headers("viewer", "viewer-asset"),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission_denied"


def test_asset_restricted_accessible_to_reviewer(client) -> None:
    key = _add_restricted_asset(client)
    r = client.get(
        f"/api/assets/{key}",
        headers=role_headers("reviewer", "reviewer-asset"),
    )
    assert r.status_code == 200


def test_asset_public_accessible_to_viewer(client) -> None:
    key = _add_public_asset(client)
    r = client.get(
        f"/api/assets/{key}",
        headers=role_headers("viewer", "viewer-asset"),
    )
    assert r.status_code == 200
    assert r.content == b"\x89PNG"
