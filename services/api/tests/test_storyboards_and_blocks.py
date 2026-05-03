from app.infrastructure.in_memory_repository import SEED_IDS

from .conftest import role_headers


def test_storyboard_snapshot_is_immutable_after_draft_slot_update(client):
    headers = role_headers("contributor", "contributor-1")
    storyboard = client.post(
        "/api/storyboards",
        json={"title": "Immutable snapshot test", "mode": "work_product"},
        headers=headers,
    ).json()
    section = client.post(
        f"/api/storyboards/{storyboard['id']}/sections",
        json={"title": "Economic case", "orderIndex": 0},
        headers=headers,
    ).json()
    slot = client.post(
        f"/api/storyboard-sections/{section['id']}/slots",
        json={
            "slotType": "content_unit",
            "selectedObjectType": "content_unit_version",
            "selectedObjectId": str(SEED_IDS["roi_exec_v1"]),
            "orderIndex": 0,
            "purpose": "Snapshot original selection",
        },
        headers=headers,
    ).json()
    snapshot = client.post(
        f"/api/storyboards/{storyboard['id']}/snapshots",
        json={"versionLabel": "v1"},
        headers=headers,
    ).json()

    update_response = client.patch(
        f"/api/storyboard-slots/{slot['id']}",
        json={"selectedObjectId": str(SEED_IDS["architecture_v1"])},
        headers=headers,
    )
    assert update_response.status_code == 200

    snapshot_response = client.get(f"/api/storyboard-snapshots/{snapshot['id']}")
    assert snapshot_response.status_code == 200
    frozen_slot = snapshot_response.json()["sections"][0]["slots"][0]
    assert frozen_slot["selectedObjectId"] == str(SEED_IDS["roi_exec_v1"])


def test_content_block_preserves_ordered_membership(client):
    response = client.post(
        "/api/content-blocks",
        json={
            "title": "Ordered ROI block",
            "members": [
                {
                    "memberType": "content_unit_version",
                    "memberId": str(SEED_IDS["roi_board_v1"]),
                    "orderIndex": 1,
                    "role": "detail",
                },
                {
                    "memberType": "content_unit_version",
                    "memberId": str(SEED_IDS["roi_exec_v1"]),
                    "orderIndex": 0,
                    "role": "setup",
                },
            ],
        },
        headers=role_headers("contributor", "contributor-1"),
    )

    assert response.status_code == 201
    members = response.json()["members"]
    assert [member["orderIndex"] for member in members] == [0, 1]
    assert [member["memberId"] for member in members] == [
        str(SEED_IDS["roi_exec_v1"]),
        str(SEED_IDS["roi_board_v1"]),
    ]
