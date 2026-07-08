from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.domain.ingestion_search import SearchDocument
from app.domain.ingestion_search.models import RankedResult, ScoreBreakdown, SearchQuery
from app.infrastructure.db_models import PGVector
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository, SEED_IDS
from app.infrastructure.sqlalchemy_repository import build_hybrid_search_sql
from app.main import create_app

from .conftest import role_headers


def test_memory_search_supports_version_result_mode(client: TestClient) -> None:
    response = client.post(
        "/api/search",
        json={"query": "operating margin payback", "resultMode": "versions", "limit": 5},
        headers=role_headers("viewer", "viewer-1"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["debug"] is None
    assert payload["items"]
    assert payload["items"][0]["objectType"] == "content_unit_version"
    assert payload["items"][0]["resultGrain"] == "version"
    assert "keyword match" in payload["items"][0]["explanationChips"]
    assert "version match" in payload["items"][0]["explanationChips"]


def test_search_debug_is_limited_to_reviewer_and_admin(client: TestClient) -> None:
    curator = client.post(
        "/api/search",
        json={"query": "client-sensitive operating margin bridge", "limit": 5},
        headers=role_headers("curator", "curator-1"),
    )
    reviewer = client.post(
        "/api/search",
        json={"query": "client-sensitive operating margin bridge", "limit": 5},
        headers=role_headers("reviewer", "reviewer-1"),
    )

    assert curator.status_code == 200
    assert reviewer.status_code == 200
    assert curator.json()["debug"] is None
    assert reviewer.json()["debug"]["filteredRestrictedCount"] == 0
    assert reviewer.json()["debug"]["backend"] == "memory"


def test_database_search_method_is_used_when_repository_exposes_it() -> None:
    class DatabaseSearchStubRepository(InMemoryBoxBrainRepository):
        def hybrid_search_documents(
            self,
            query: SearchQuery,
            *,
            object_types: set[str],
            include_restricted: bool,
            limit: int,
        ) -> list[RankedResult]:
            version = self.content_unit_versions[SEED_IDS["roi_exec_v1"]]
            variant = self.content_unit_variants[version.variant_id]
            family = self.content_unit_families[variant.family_id]
            return [
                RankedResult(
                    document=SearchDocument(
                        id=str(version.id),
                        object_type="content_unit_version",
                        title=family.family_title,
                        summary=version.summary,
                        metadata={
                            "familyId": str(family.id),
                            "variantId": str(variant.id),
                            "versionId": str(version.id),
                            "previewUri": version.thumbnail_uri,
                        },
                        approval_state=version.approval_state,
                        freshness_state=version.freshness_state,
                    ),
                    score=0.91,
                    breakdown=ScoreBreakdown(
                        lexical=0.8,
                        semantic=0.7,
                        metadata=0.0,
                        trust=1.0,
                        freshness=1.0,
                        total=0.91,
                    ),
                    explanation=("keyword match", "semantic match"),
                )
            ]

    app = create_app(DatabaseSearchStubRepository())
    with TestClient(app) as client:
        response = client.post(
            "/api/search",
            json={
                "query": "roi",
                "objectTypes": ["content_unit"],
                "resultMode": "versions",
                "limit": 5,
            },
            headers=role_headers("reviewer", "reviewer-1"),
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["debug"]["backend"] == "database"
    assert payload["items"][0]["objectId"] == str(SEED_IDS["roi_exec_v1"])


def test_hybrid_search_sql_uses_fts_pgvector_and_pre_rank_restricted_filter() -> None:
    sql = build_hybrid_search_sql(
        include_content_units=True,
        include_work_products=True,
        include_restricted=False,
    )

    assert "websearch_to_tsquery('english', :query_text)" in sql
    assert "ts_rank_cd(cuv.search_vector, query_input.ts_query, 32)" in sql
    assert "embeddings.embedding <=> query_input.query_embedding" in sql
    # The restricted filter must qualify the underlying join aliases, NOT the CTE's own
    # name — a CTE cannot reference itself in its own body (Postgres raises "missing
    # FROM-clause entry"). Guard against the regression that broke DB-mode search.
    assert "NOT (cuf.restricted OR cuv.restricted)" in sql
    assert "NOT (wpf.restricted OR wpv.restricted)" in sql
    assert "content_unit.family_restricted" not in sql
    assert "work_product.family_restricted" not in sql
    assert "content_block.version_restricted" not in sql


@pytest.mark.skipif(
    os.getenv("BOXBRAIN_RUN_LIVE_TESTS") != "1",
    reason="Set BOXBRAIN_RUN_LIVE_TESTS=1 with a migrated Postgres/pgvector at DATABASE_URL.",
)
@pytest.mark.parametrize("include_restricted", [False, True])
def test_hybrid_search_sql_executes_against_postgres(include_restricted: bool) -> None:
    """Execute the generated hybrid-search SQL against a real Postgres.

    The in-memory stub in ``test_database_search_method_is_used_when_repository_exposes_it``
    replaces ``hybrid_search_documents`` wholesale, so the real SQL was never run in CI —
    which let a CTE self-reference bug (``NOT (content_unit.family_restricted OR ...)``,
    invalid because a CTE cannot reference its own name) ship undetected and 500 every
    non-privileged search/ask and the admin search-eval in database mode. This exercises
    the SQL end-to-end; an empty catalog is fine — the point is that it parses and runs,
    especially the ``include_restricted=False`` filter branch.
    """
    from app.infrastructure.database import SessionLocal
    from app.infrastructure.sqlalchemy_repository import SqlAlchemyBoxBrainRepository

    repository = SqlAlchemyBoxBrainRepository(SessionLocal, seed=False)
    results = repository.hybrid_search_documents(
        SearchQuery(text="operating margin payback"),
        object_types=set(),
        include_restricted=include_restricted,
        limit=10,
    )
    assert isinstance(results, list)


def test_pgvector_type_binds_and_reads_real_vectors() -> None:
    vector_type = PGVector(3)
    bind = vector_type.bind_processor(None)
    read = vector_type.result_processor(None, None)

    assert bind([0.1, 0.2, 0.3]) == "[0.10000000,0.20000000,0.30000000]"
    assert read("[0.10000000,0.20000000,0.30000000]") == [0.1, 0.2, 0.3]
    assert bind([0.1, 0.2]) is None
