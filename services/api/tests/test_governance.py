from app.infrastructure.in_memory_repository import SEED_IDS

from .conftest import role_headers


def test_governance_actions_write_audit_events(client):
    approval_response = client.patch(
        f"/api/content-units/versions/{SEED_IDS['roi_board_v1']}/approval",
        json={"approvalState": "approved", "notes": "Finance review complete"},
        headers=role_headers("reviewer", "reviewer-1"),
    )
    assert approval_response.status_code == 200
    assert approval_response.json()["approvalState"] == "approved"

    canonical_response = client.post(
        f"/api/reviews/items/{SEED_IDS['review_variant']}/set-canonical",
        json={
            "targetVariantId": str(SEED_IDS["roi_board_variant"]),
            "reason": "Board version is preferred for pilot",
        },
        headers=role_headers("reviewer", "reviewer-1"),
    )
    assert canonical_response.status_code == 200
    assert canonical_response.json()["status"] == "accepted"

    audit_response = client.get(
        "/api/admin/audit-events",
        headers=role_headers("admin", "admin-1"),
    )
    assert audit_response.status_code == 200
    actions = [event["action"] for event in audit_response.json()]
    assert "approval_state_change" in actions
    assert "canonical_change" in actions
    assert "review_set_canonical" in actions


def test_similarity_review_does_not_merge_families(client):
    repo = client.app.state.repository
    roi_variant = repo.content_unit_variants[SEED_IDS["roi_exec_variant"]]
    architecture_variant = repo.content_unit_variants[SEED_IDS["architecture_variant"]]
    original_roi_family = roi_variant.family_id
    original_architecture_family = architecture_variant.family_id

    response = client.post(
        f"/api/reviews/items/{SEED_IDS['review_similarity']}/mark-similar",
        json={"reason": "Related, but not the same family"},
        headers=role_headers("reviewer", "reviewer-2"),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert repo.content_unit_variants[SEED_IDS["roi_exec_variant"]].family_id == original_roi_family
    assert (
        repo.content_unit_variants[SEED_IDS["architecture_variant"]].family_id
        == original_architecture_family
    )
    assert len(repo.similarity_edges) == 1


def test_viewer_cannot_perform_governance_action(client):
    response = client.patch(
        f"/api/content-units/versions/{SEED_IDS['roi_board_v1']}/approval",
        json={"approvalState": "approved"},
        headers=role_headers("viewer", "viewer-1"),
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "permission_denied"
