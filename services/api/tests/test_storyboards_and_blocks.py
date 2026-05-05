from __future__ import annotations

from uuid import uuid4

from sqlalchemy.sql import Select

from app.domain.models import Storyboard, StoryboardSection, StoryboardSlot, now_utc
from app.infrastructure.db_models import (
    StoryboardRow,
    StoryboardSectionRow,
    StoryboardSlotRow,
    StoryboardSnapshotRow,
)
from app.infrastructure.in_memory_repository import SEED_IDS
from app.infrastructure.sqlalchemy_repository import SqlAlchemyBoxBrainRepository

from .conftest import role_headers


class _FakeSession:
    def __init__(self, rows_by_model: dict[type[object], list[object]] | None = None) -> None:
        self.rows_by_model = rows_by_model or {}
        self.merged: list[object] = []
        self.executed: list[object] = []
        self.commit_count = 0

    def scalars(self, statement: Select) -> list[object]:
        model = statement.column_descriptions[0]["entity"]
        return self.rows_by_model.get(model, [])

    def merge(self, row: object) -> None:
        self.merged.append(row)

    def execute(self, statement: object) -> None:
        self.executed.append(statement)

    def commit(self) -> None:
        self.commit_count += 1

    def rollback(self) -> None:
        return None

    def close(self) -> None:
        return None

    def reset_tracking(self) -> None:
        self.merged.clear()
        self.executed.clear()
        self.commit_count = 0


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


def test_sqlalchemy_repository_reloads_storyboard_drafts_and_snapshots_from_distinct_rows() -> None:
    storyboard_id = uuid4()
    snapshot_id = uuid4()
    draft_section_id = uuid4()
    snapshot_section_id = uuid4()
    draft_slot_id = uuid4()
    snapshot_slot_id = uuid4()
    created_at = now_utc()
    fake_session = _FakeSession(
        {
            StoryboardRow: [
                StoryboardRow(
                    id=storyboard_id,
                    mode="work_product",
                    title="Reloaded storyboard",
                    current_snapshot_id=snapshot_id,
                    created_at=created_at,
                    updated_at=created_at,
                )
            ],
            StoryboardSnapshotRow: [
                StoryboardSnapshotRow(
                    id=snapshot_id,
                    storyboard_id=storyboard_id,
                    version_label="v1",
                    approval_state="draft",
                    narrative_score=0.8,
                    created_at=created_at,
                )
            ],
            StoryboardSectionRow: [
                StoryboardSectionRow(
                    id=draft_section_id,
                    storyboard_id=storyboard_id,
                    snapshot_id=None,
                    row_kind="draft",
                    title="Mutable draft",
                    order_index=0,
                ),
                StoryboardSectionRow(
                    id=snapshot_section_id,
                    storyboard_id=storyboard_id,
                    snapshot_id=snapshot_id,
                    row_kind="snapshot",
                    title="Frozen snapshot",
                    order_index=0,
                ),
            ],
            StoryboardSlotRow: [
                StoryboardSlotRow(
                    id=draft_slot_id,
                    section_id=draft_section_id,
                    slot_type="content_unit",
                    selected_object_type="content_unit_version",
                    selected_object_id=uuid4(),
                    order_index=0,
                    purpose="Draft selection",
                    is_required=True,
                    ai_recommended=False,
                    metadata_={},
                ),
                StoryboardSlotRow(
                    id=snapshot_slot_id,
                    section_id=snapshot_section_id,
                    slot_type="gap",
                    selected_object_type=None,
                    selected_object_id=None,
                    order_index=0,
                    purpose="Frozen gap",
                    is_required=False,
                    ai_recommended=False,
                    metadata_={},
                ),
            ],
        }
    )

    repository = SqlAlchemyBoxBrainRepository(lambda: fake_session, seed=False)

    storyboard = repository.storyboards[storyboard_id]
    snapshot = repository.storyboard_snapshots[snapshot_id]
    assert storyboard.draft_sections[0].id == draft_section_id
    assert storyboard.draft_sections[0].slots[0].id == draft_slot_id
    assert snapshot.sections[0].id == snapshot_section_id
    assert snapshot.sections[0].slots[0].id == snapshot_slot_id
    assert storyboard.draft_sections[0].id != snapshot.sections[0].id


def test_sqlalchemy_repository_freezes_storyboard_snapshot_as_immutable_transactional_copy() -> None:
    fake_session = _FakeSession()
    repository = SqlAlchemyBoxBrainRepository(lambda: fake_session, seed=False)
    draft_section_id = uuid4()
    draft_slot_id = uuid4()
    selected_object_id = uuid4()
    storyboard = Storyboard(
        id=uuid4(),
        mode="work_product",
        title="Transactional storyboard",
        draft_sections=[
            StoryboardSection(
                id=draft_section_id,
                storyboard_id=uuid4(),
                title="Draft section",
                summary=None,
                order_index=0,
                slots=[
                    StoryboardSlot(
                        id=draft_slot_id,
                        section_id=draft_section_id,
                        slot_type="content_unit",
                        selected_object_type="content_unit_version",
                        selected_object_id=selected_object_id,
                        order_index=0,
                        purpose="Original selection",
                        is_required=True,
                    )
                ],
            )
        ],
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    storyboard.draft_sections[0].storyboard_id = storyboard.id
    fake_session.reset_tracking()

    snapshot = repository.freeze_storyboard_snapshot(storyboard, "v1")

    snapshot_section = snapshot.sections[0]
    snapshot_slot = snapshot_section.slots[0]
    assert snapshot_section.id != draft_section_id
    assert snapshot_slot.id != draft_slot_id
    assert snapshot_slot.section_id == snapshot_section.id
    assert snapshot_slot.selected_object_id == selected_object_id
    assert storyboard.current_snapshot_id == snapshot.id
    assert repository.storyboard_snapshots[snapshot.id] is snapshot
    assert fake_session.commit_count == 1
    assert any(isinstance(row, StoryboardSnapshotRow) for row in fake_session.merged)
    assert any(
        isinstance(row, StoryboardSectionRow) and row.row_kind == "snapshot"
        for row in fake_session.merged
    )
    assert any(isinstance(row, StoryboardSlotRow) for row in fake_session.merged)
