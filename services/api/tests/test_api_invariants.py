from __future__ import annotations

from uuid import UUID

from app.infrastructure.in_memory_repository import SEED_IDS
from .conftest import role_headers


def test_viewer_search_does_not_leak_restricted_content(client) -> None:
    response = client.post(
        "/api/search",
        json={"query": "client-sensitive operating margin bridge", "limit": 10},
        headers=role_headers("viewer"),
    )

    assert response.status_code == 200
    payload = response.json()
    titles = [item["title"] for item in payload["items"]]
    assert "Client-sensitive operating margin bridge" not in titles
    assert all(not item["statusChips"]["isRestricted"] for item in payload["items"])


def test_reviewer_action_creates_audit_event(client) -> None:
    review_id = str(SEED_IDS["review_variant"])
    response = client.post(
        f"/api/reviews/items/{review_id}/mark-variant",
        json={"reason": "Confirmed by curator in side-by-side review."},
        headers=role_headers("reviewer"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "accepted"
    assert payload["auditEventId"]
    assert any(event.action == "review_mark_variant" for event in client.app.state.repository.audit_events)


def test_storyboard_snapshot_is_immutable_copy(client) -> None:
    storyboard_id = str(SEED_IDS["storyboard"])
    response = client.post(
        f"/api/storyboards/{storyboard_id}/snapshots",
        json={"versionLabel": "test-snapshot"},
        headers=role_headers("contributor"),
    )
    assert response.status_code == 200
    snapshot = response.json()

    original_title = snapshot["sections"][0]["title"]
    client.app.state.repository.storyboards[SEED_IDS["storyboard"]].draft_sections[0].title = "Mutated draft title"

    stored = client.app.state.repository.storyboard_snapshots[UUID(snapshot["id"])]
    assert stored.sections[0].title == original_title


def test_upload_rejects_non_pptx_with_clear_error(client) -> None:
    response = client.post(
        "/api/uploads",
        json={"artifactType": "deck", "title": "PDF seed", "filename": "seed.pdf"},
        headers=role_headers("contributor"),
    )
    assert response.status_code == 202
    payload = response.json()
    assert payload["status"] == "failed"
    assert payload["errorCode"] == "unsupported_file_type"
