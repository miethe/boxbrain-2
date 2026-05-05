from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.domain.models import (
    ContentUnitFamily,
    ContentUnitVariant,
    ContentUnitVersion,
    ReviewItem,
    SimilarityEdge,
    now_utc,
)
from app.infrastructure.in_memory_repository import SEED_IDS
from app.infrastructure.sqlalchemy_repository import SqlAlchemyBoxBrainRepository

from .conftest import role_headers


def test_viewer_cannot_read_review_queues(client: TestClient) -> None:
    response = client.get("/api/reviews/items", headers=role_headers("viewer", "viewer-1"))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "permission_denied"


def _add_content_unit_version(
    repo,
    *,
    family_title: str,
    text: str,
    approval_state: str = "approved",
    freshness_state: str = "fresh",
) -> UUID:
    family = ContentUnitFamily(
        id=uuid4(),
        family_title=family_title,
        conceptual_summary=family_title,
        unit_type="slide",
        taxonomy={"tags": text.split()[:3]},
    )
    variant = ContentUnitVariant(
        id=uuid4(),
        family_id=family.id,
        variant_label="Default",
        variant_type="source",
        variant_dimensions={},
        is_canonical=True,
        linked_by="manual",
        linked_confidence=None,
        latest_version_id=None,
    )
    provenance = next(iter(repo.provenance_records.values()))
    version = ContentUnitVersion(
        id=uuid4(),
        variant_id=variant.id,
        version_number="v1.0",
        render_uri=None,
        thumbnail_uri=None,
        summary=text,
        approval_state=approval_state,
        freshness_state=freshness_state,
        quality_score=0.8,
        usage_score=0.2,
        extracted_text=text,
        speaker_notes=None,
        provenance_id=provenance.id,
    )
    variant.latest_version_id = version.id
    repo.content_unit_families[family.id] = family
    repo.content_unit_variants[variant.id] = variant
    repo.content_unit_versions[version.id] = version
    return version.id


def test_generate_review_candidates_covers_governance_queues_without_auto_applying(
    client: TestClient,
) -> None:
    repo = client.app.state.repository
    _add_content_unit_version(
        repo,
        family_title="Duplicate ROI one",
        text="identical cloud roi margin slide",
    )
    _add_content_unit_version(
        repo,
        family_title="Duplicate ROI two",
        text="identical cloud roi margin slide",
    )
    _add_content_unit_version(
        repo,
        family_title="Related operating case",
        text="operating margin savings payback roadmap",
    )
    _add_content_unit_version(
        repo,
        family_title="Related platform case",
        text="operating margin platform roadmap",
    )
    existing_edges = dict(repo.similarity_edges)

    response = client.post(
        "/api/reviews/candidates/generate",
        headers=role_headers("reviewer", "reviewer-1"),
    )

    assert response.status_code == 200
    payload = response.json()
    queue_types = {item["queueType"] for item in payload}
    assert {"duplicate", "variant", "similarity", "stale", "approval"}.issubset(queue_types)
    assert all(item["status"] == "open" for item in payload)
    assert any(item["source"] == "deterministic_ai" for item in payload)
    assert repo.similarity_edges == existing_edges

    second_response = client.post(
        "/api/reviews/candidates/generate",
        headers=role_headers("reviewer", "reviewer-1"),
    )
    assert second_response.status_code == 200
    assert second_response.json() == []


def test_accept_variant_candidate_links_variants_after_review(client: TestClient) -> None:
    repo = client.app.state.repository
    left_id = _add_content_unit_version(
        repo,
        family_title="Cloud operating case",
        text="cloud operating margin savings payback roadmap executive",
    )
    right_id = _add_content_unit_version(
        repo,
        family_title="Cloud board operating case",
        text="cloud operating margin savings payback roadmap board",
    )
    left_variant = repo.content_unit_variants[repo.content_unit_versions[left_id].variant_id]
    right_variant = repo.content_unit_variants[repo.content_unit_versions[right_id].variant_id]
    assert left_variant.family_id != right_variant.family_id

    client.post("/api/reviews/candidates/generate", headers=role_headers("reviewer", "reviewer-2"))
    review_item = next(
        item
        for item in repo.review_items.values()
        if item.queue_type == "variant"
        and {ref["id"] for ref in item.target_refs} == {str(left_id), str(right_id)}
    )
    response = client.post(
        f"/api/reviews/items/{review_item.id}/accept",
        json={"reason": "Human confirmed alternate audience variant."},
        headers=role_headers("reviewer", "reviewer-2"),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert response.json()["action"] == "mark-variant"
    assert response.json()["reviewItemId"] == str(review_item.id)
    assert right_variant.family_id == left_variant.family_id
    assert right_variant.linked_by == "hybrid"
    assert any(event.action == "variant_link_change" for event in repo.audit_events)
    assert any(event.action == "review_mark_variant" for event in repo.audit_events)


def test_accept_similarity_candidate_records_edge_without_merging_families(
    client: TestClient,
) -> None:
    repo = client.app.state.repository
    left_id = _add_content_unit_version(
        repo,
        family_title="Transformation roadmap",
        text="transformation cloud migration roadmap savings",
    )
    right_id = _add_content_unit_version(
        repo,
        family_title="Transformation architecture",
        text="transformation cloud architecture roadmap platform",
    )
    left_variant = repo.content_unit_variants[repo.content_unit_versions[left_id].variant_id]
    right_variant = repo.content_unit_variants[repo.content_unit_versions[right_id].variant_id]
    left_family = left_variant.family_id
    right_family = right_variant.family_id

    client.post("/api/reviews/candidates/generate", headers=role_headers("reviewer", "reviewer-3"))
    review_item = next(
        item
        for item in repo.review_items.values()
        if item.queue_type == "similarity"
        and {ref["id"] for ref in item.target_refs} == {str(left_id), str(right_id)}
    )
    response = client.post(
        f"/api/reviews/items/{review_item.id}/accept",
        json={"reason": "Related but not the same family."},
        headers=role_headers("reviewer", "reviewer-3"),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert repo.content_unit_variants[left_variant.id].family_id == left_family
    assert repo.content_unit_variants[right_variant.id].family_id == right_family
    assert any(
        edge.source_version_id == left_id and edge.target_version_id == right_id
        for edge in repo.similarity_edges.values()
    )


def test_request_changes_on_approval_candidate_updates_version_status(
    client: TestClient,
) -> None:
    repo = client.app.state.repository
    client.post("/api/reviews/candidates/generate", headers=role_headers("reviewer", "reviewer-4"))
    review_item = next(
        item
        for item in repo.review_items.values()
        if item.queue_type == "approval"
        and item.target_refs[0]["id"] == str(SEED_IDS["architecture_v1"])
    )

    response = client.post(
        f"/api/reviews/items/{review_item.id}/request-changes",
        json={"reason": "Needs dependency sequencing cleanup."},
        headers=role_headers("reviewer", "reviewer-4"),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    assert repo.content_unit_versions[SEED_IDS["architecture_v1"]].approval_state == "review"
    assert any(event.action == "review_request_changes" for event in repo.audit_events)


class _FakeSession:
    def __init__(self) -> None:
        self.merged: list[object] = []

    def merge(self, row: object) -> None:
        self.merged.append(row)

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None

    def close(self) -> None:
        return None


def test_sqlalchemy_repository_persists_review_items_and_similarity_edges() -> None:
    fake_session = _FakeSession()
    repository = SqlAlchemyBoxBrainRepository.__new__(SqlAlchemyBoxBrainRepository)
    repository.session_factory = lambda: fake_session
    repository.review_items = {}
    repository.similarity_edges = {}

    item = ReviewItem(
        id=uuid4(),
        queue_type="similarity",
        status="open",
        confidence=0.7,
        rationale="Related concepts.",
        suggested_action="mark_similar",
        target_refs=[{"objectType": "content_unit_version", "id": str(uuid4())}],
        compare_objects=[{"title": "A"}],
        source="deterministic_ai",
        audit_preview={"autoApplied": False},
        created_at=now_utc(),
    )
    edge = SimilarityEdge(
        id=uuid4(),
        source_version_id=uuid4(),
        target_version_id=uuid4(),
        score=0.7,
        rationale="Human confirmed.",
        confirmed_by="reviewer-5",
        created_at=now_utc(),
    )

    repository.save_review_item(item, resolved_by="reviewer-5", resolution_notes="done")
    repository.save_similarity_edge(edge)

    review_row, edge_row = fake_session.merged
    assert review_row.queue_type == "similarity"
    assert review_row.metadata_["compareObjects"] == [{"title": "A"}]
    assert review_row.metadata_["auditPreview"] == {"autoApplied": False}
    assert edge_row.source_object_type == "content_unit_version"
    assert edge_row.target_object_id == edge.target_version_id
    assert edge_row.created_by == "reviewer-5"
