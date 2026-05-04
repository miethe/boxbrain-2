from __future__ import annotations

from uuid import uuid4

from app.domain.models import (
    ContentBlockMember,
    ContentBlockVersion,
    ContentUnitVersion,
    SimilarityEdge,
    StoryboardSlot,
    now_utc,
)
from app.infrastructure.in_memory_repository import SEED_IDS

from .conftest import role_headers


def test_content_unit_family_list_filters_by_approval_and_freshness(client) -> None:
    approved = client.get(
        "/api/content-units/families",
        params={"approvalState": "approved"},
        headers=role_headers("viewer", "viewer-1"),
    )
    stale = client.get(
        "/api/content-units/families",
        params={"freshnessState": "stale"},
        headers=role_headers("viewer", "viewer-1"),
    )

    assert approved.status_code == 200
    assert [item["id"] for item in approved.json()["items"]] == [str(SEED_IDS["roi_family"])]
    assert stale.status_code == 200
    assert stale.json()["items"] == []


def test_freshness_update_writes_audit_event(client) -> None:
    response = client.patch(
        f"/api/content-units/versions/{SEED_IDS['architecture_v1']}/freshness",
        json={"freshnessState": "stale", "notes": "Reference architecture is outdated"},
        headers=role_headers("curator", "curator-1"),
    )

    assert response.status_code == 200
    assert response.json()["freshnessState"] == "stale"
    audit_response = client.get("/api/admin/audit-events", headers=role_headers("admin", "admin-1"))
    assert audit_response.status_code == 200
    event = next(
        event
        for event in audit_response.json()
        if event["action"] == "freshness_state_change"
    )
    assert event["priorState"] == {"freshnessState": "aging"}
    assert event["newState"] == {"freshnessState": "stale"}


def test_where_used_returns_typed_visible_references(client) -> None:
    response = client.get(
        f"/api/content-units/{SEED_IDS['roi_exec_v1']}/where-used",
        headers=role_headers("viewer", "viewer-1"),
    )

    assert response.status_code == 200
    references = response.json()
    assert {reference["objectType"] for reference in references} == {
        "content_block_version",
        "storyboard",
        "work_product_version",
    }
    assert all(reference["objectId"] for reference in references)
    assert all("title" in reference for reference in references)


def test_viewer_cannot_read_where_used_for_restricted_version(client) -> None:
    response = client.get(
        f"/api/content-units/{SEED_IDS['restricted_v1']}/where-used",
        headers=role_headers("viewer", "viewer-1"),
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_restricted_containers_are_hidden_from_viewer_outputs(client) -> None:
    repo = client.app.state.repository
    block = ContentBlockVersion(
        id=uuid4(),
        family_id=uuid4(),
        title="Restricted finance story",
        summary="Contains restricted financial bridge.",
        block_type="sequence",
        approval_state="draft",
        members=[
            ContentBlockMember(
                id=uuid4(),
                member_type="content_unit_version",
                member_id=SEED_IDS["restricted_v1"],
                order_index=0,
            )
        ],
        created_at=now_utc(),
    )
    repo.content_blocks[block.id] = block
    repo.storyboards[SEED_IDS["storyboard"]].draft_sections[0].slots.append(
        StoryboardSlot(
            id=uuid4(),
            section_id=SEED_IDS["storyboard_section"],
            slot_type="content_unit",
            selected_object_type="content_unit_version",
            selected_object_id=SEED_IDS["restricted_v1"],
            order_index=1,
            purpose="Restricted appendix",
            is_required=False,
        )
    )
    repo.work_product_families[SEED_IDS["work_product_family"]].restricted = True

    block_list = client.get("/api/content-blocks", headers=role_headers("viewer", "viewer-1"))
    storyboard_list = client.get("/api/storyboards", headers=role_headers("viewer", "viewer-1"))
    work_product_list = client.get("/api/work-products/families", headers=role_headers("viewer", "viewer-1"))

    assert block_list.status_code == 200
    assert str(block.id) not in {item["id"] for item in block_list.json()["items"]}
    assert storyboard_list.status_code == 200
    assert str(SEED_IDS["storyboard"]) not in {item["id"] for item in storyboard_list.json()["items"]}
    assert work_product_list.status_code == 200
    assert work_product_list.json()["items"] == []

    reviewer_detail = client.get(
        f"/api/content-blocks/{block.id}",
        headers=role_headers("reviewer", "reviewer-1"),
    )
    assert reviewer_detail.status_code == 200


def test_comments_and_notes_respect_restricted_target_visibility(client) -> None:
    comment = client.post(
        "/api/comments",
        json={
            "kind": "persistent_comment",
            "targetType": "content_unit_version",
            "targetId": str(SEED_IDS["restricted_v1"]),
            "body": "Reviewer-only margin note.",
        },
        headers=role_headers("reviewer", "reviewer-1"),
    )
    note = client.post(
        "/api/notes",
        json={
            "targetType": "content_unit_version",
            "targetId": str(SEED_IDS["restricted_v1"]),
            "body": "Only reuse after finance approval.",
            "isPinned": True,
        },
        headers=role_headers("curator", "curator-1"),
    )

    assert comment.status_code == 201
    assert note.status_code == 201

    viewer_comments = client.get("/api/comments", headers=role_headers("viewer", "viewer-1"))
    viewer_notes = client.get("/api/notes", headers=role_headers("viewer", "viewer-1"))
    reviewer_comments = client.get(
        "/api/comments",
        params={"targetType": "content_unit_version", "targetId": str(SEED_IDS["restricted_v1"])},
        headers=role_headers("reviewer", "reviewer-1"),
    )

    assert comment.json()["id"] not in {item["id"] for item in viewer_comments.json()}
    assert note.json()["id"] not in {item["id"] for item in viewer_notes.json()}
    assert comment.json()["id"] in {item["id"] for item in reviewer_comments.json()}
    assert any(event.action == "note_create" for event in client.app.state.repository.audit_events)


def test_restricted_versions_do_not_leak_through_variant_versions_similar_or_search(client) -> None:
    repo = client.app.state.repository
    restricted_version_id = uuid4()
    source_version = repo.content_unit_versions[SEED_IDS["roi_exec_v1"]]
    restricted_version = ContentUnitVersion(
        id=restricted_version_id,
        variant_id=SEED_IDS["roi_exec_variant"],
        version_number="v0.9",
        render_uri="/seed/restricted/secret-render.png",
        thumbnail_uri="/seed/restricted/secret-thumb.png",
        summary="secret-only-board-appendix",
        approval_state="draft",
        freshness_state="stale",
        quality_score=None,
        usage_score=None,
        extracted_text="secret-only-board-appendix confidential margin detail",
        speaker_notes="Do not disclose outside reviewers.",
        provenance_id=source_version.provenance_id,
        restricted=True,
        created_at=now_utc(),
    )
    repo.content_unit_versions[restricted_version.id] = restricted_version
    edge_id = uuid4()
    repo.similarity_edges[edge_id] = SimilarityEdge(
        id=edge_id,
        source_version_id=SEED_IDS["roi_exec_v1"],
        target_version_id=restricted_version.id,
        score=0.98,
        rationale="Restricted appendix details.",
    )

    version_list = client.get(
        f"/api/content-units/variants/{SEED_IDS['roi_exec_variant']}/versions",
        headers=role_headers("viewer", "viewer-1"),
    )
    similar = client.get(
        f"/api/content-units/{SEED_IDS['roi_exec_v1']}/similar",
        headers=role_headers("viewer", "viewer-1"),
    )
    search = client.post(
        "/api/search",
        json={"query": "secret-only-board-appendix", "limit": 10},
        headers=role_headers("viewer", "viewer-1"),
    )
    restricted_detail = client.get(
        f"/api/content-units/versions/{restricted_version.id}",
        headers=role_headers("viewer", "viewer-1"),
    )
    reviewer_detail = client.get(
        f"/api/content-units/versions/{restricted_version.id}",
        headers=role_headers("reviewer", "reviewer-1"),
    )

    assert version_list.status_code == 200
    assert str(restricted_version.id) not in {item["id"] for item in version_list.json()["items"]}
    assert similar.status_code == 200
    assert str(restricted_version.id) not in {item["objectId"] for item in similar.json()}
    assert search.status_code == 200
    assert search.json()["items"] == []
    assert restricted_detail.status_code == 404
    assert restricted_detail.json()["error"]["code"] == "not_found"
    assert reviewer_detail.status_code == 200
    assert reviewer_detail.json()["id"] == str(restricted_version.id)
