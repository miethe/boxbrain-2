from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.sql import Select

from app.domain.models import ContentBlockMember, ContentBlockVersion, now_utc
from app.infrastructure.db_models import (
    ContentBlockFamilyRow,
    ContentBlockMemberRow,
    ContentBlockVariantRow,
    ContentBlockVersionRow,
)
from app.infrastructure.in_memory_repository import SEED_IDS
from app.infrastructure.sqlalchemy_repository import (
    SqlAlchemyBoxBrainRepository,
    build_hybrid_search_sql,
)

from .conftest import role_headers


class _FakeSession:
    def __init__(self, rows_by_model: dict[type[object], list[object]] | None = None) -> None:
        self.rows_by_model = rows_by_model or {}
        self.merged: list[object] = []
        self.executed: list[object] = []

    def scalars(self, statement: Select) -> list[object]:
        model = statement.column_descriptions[0]["entity"]
        return self.rows_by_model.get(model, [])

    def merge(self, row: object) -> None:
        self.merged.append(row)

    def execute(self, statement: object) -> None:
        self.executed.append(statement)

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None

    def close(self) -> None:
        return None


def test_content_block_create_still_persists_in_memory_mode(client: TestClient) -> None:
    response = client.post(
        "/api/content-blocks",
        json={
            "title": "Margin improvement sequence",
            "summary": "Reusable margin improvement storyline.",
            "members": [
                {
                    "memberType": "content_unit_version",
                    "memberId": str(SEED_IDS["roi_exec_v1"]),
                    "orderIndex": 0,
                }
            ],
        },
        headers=role_headers("contributor", "contributor-1"),
    )

    assert response.status_code == 201
    block_id = response.json()["id"]

    detail = client.get(
        f"/api/content-blocks/{block_id}",
        headers=role_headers("viewer", "viewer-1"),
    )
    assert detail.status_code == 200
    assert detail.json()["title"] == "Margin improvement sequence"


def test_memory_search_returns_content_blocks_without_legacy_side_scan(client: TestClient) -> None:
    response = client.post(
        "/api/search",
        json={
            "query": "modernization economics",
            "objectTypes": ["content_block"],
            "limit": 5,
        },
        headers=role_headers("viewer", "viewer-1"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert [item["objectType"] for item in payload["items"]] == ["content_block_version"]
    assert payload["items"][0]["resultGrain"] == "block"
    assert "ordered composition" in payload["items"][0]["explanationChips"]


def test_sqlalchemy_repository_saves_content_block_family_variant_version_and_members() -> None:
    fake_session = _FakeSession()
    repository = SqlAlchemyBoxBrainRepository(lambda: fake_session, seed=False)
    block = ContentBlockVersion(
        id=uuid4(),
        family_id=uuid4(),
        title="Executive ROI sequence",
        summary="Ordered ROI storyline.",
        block_type="sequence",
        approval_state="draft",
        members=[
            ContentBlockMember(
                id=uuid4(),
                member_type="content_unit_version",
                member_id=uuid4(),
                order_index=0,
                role="setup",
            ),
            ContentBlockMember(
                id=uuid4(),
                member_type="content_unit_variant",
                member_id=uuid4(),
                order_index=1,
                role="detail",
                is_required=False,
                notes="Any executive variant is acceptable.",
            ),
        ],
        created_at=now_utc(),
    )

    repository.save_content_block(block)

    family_row, variant_row, version_row, first_member_row, second_member_row = fake_session.merged
    assert isinstance(family_row, ContentBlockFamilyRow)
    assert family_row.id == block.family_id
    assert family_row.title == block.title
    assert isinstance(variant_row, ContentBlockVariantRow)
    assert variant_row.family_id == block.family_id
    assert variant_row.latest_version_id == block.id
    assert isinstance(version_row, ContentBlockVersionRow)
    assert version_row.id == block.id
    assert version_row.variant_id == variant_row.id
    assert version_row.summary == block.summary
    assert isinstance(first_member_row, ContentBlockMemberRow)
    assert isinstance(second_member_row, ContentBlockMemberRow)
    assert [first_member_row.order_index, second_member_row.order_index] == [0, 1]
    assert fake_session.executed


def test_sqlalchemy_repository_reloads_content_blocks_from_rows() -> None:
    family_id = uuid4()
    variant_id = uuid4()
    version_id = uuid4()
    created_at = now_utc()
    member_a = ContentBlockMemberRow(
        id=uuid4(),
        block_version_id=version_id,
        member_type="content_unit_version",
        member_id=uuid4(),
        order_index=1,
        role="detail",
        is_required=True,
    )
    member_b = ContentBlockMemberRow(
        id=uuid4(),
        block_version_id=version_id,
        member_type="content_unit_variant",
        member_id=uuid4(),
        order_index=0,
        role="setup",
        is_required=False,
        notes="Variant can be swapped.",
    )
    fake_session = _FakeSession(
        {
            ContentBlockFamilyRow: [
                ContentBlockFamilyRow(
                    id=family_id,
                    title="Reloaded block",
                    summary="Family summary.",
                    block_type="sequence",
                    canonical_variant_id=variant_id,
                    taxonomy={},
                    created_at=created_at,
                    updated_at=created_at,
                )
            ],
            ContentBlockVariantRow: [
                ContentBlockVariantRow(
                    id=variant_id,
                    family_id=family_id,
                    variant_label="Canonical",
                    variant_type="sequence",
                    is_canonical=True,
                    linked_by="manual",
                    linked_confidence=1.0,
                    latest_version_id=version_id,
                    created_at=created_at,
                    updated_at=created_at,
                )
            ],
            ContentBlockVersionRow: [
                ContentBlockVersionRow(
                    id=version_id,
                    variant_id=variant_id,
                    version_number="v1.0",
                    summary="Version summary.",
                    restricted=True,
                    approval_state="review",
                    freshness_state="fresh",
                    created_at=created_at,
                )
            ],
            ContentBlockMemberRow: [member_a, member_b],
        }
    )

    repository = SqlAlchemyBoxBrainRepository(lambda: fake_session, seed=False)

    block = repository.content_blocks[version_id]
    assert block.family_id == family_id
    assert block.title == "Reloaded block"
    assert block.summary == "Version summary."
    assert block.restricted is True
    assert [member.order_index for member in block.members] == [0, 1]
    assert [member.member_type for member in block.members] == [
        "content_unit_variant",
        "content_unit_version",
    ]


def test_hybrid_search_sql_includes_content_blocks_and_restricted_filtering() -> None:
    sql = build_hybrid_search_sql(
        include_content_units=False,
        include_work_products=False,
        include_content_blocks=True,
        include_restricted=False,
    )

    assert "JOIN content_block_versions cbv ON TRUE" in sql
    assert "ts_rank_cd(" in sql
    assert "cbv.search_vector" in sql
    assert "embeddings.target_type = 'content_block_version'" in sql
    # Filter on the join alias, not the CTE's own name — a CTE cannot reference itself
    # in its own body (Postgres "missing FROM-clause entry"); see the DB-mode 500 fix.
    assert "NOT cbv.restricted" in sql
    assert "content_block.version_restricted" not in sql
