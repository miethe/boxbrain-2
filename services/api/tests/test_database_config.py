from __future__ import annotations

import pytest

from app.config import database_schema_from_env, get_settings
from app.infrastructure import database


def test_settings_reads_optional_database_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOXBRAIN_DB_SCHEMA", "boxbrain")

    assert get_settings().database_schema == "boxbrain"


def test_database_schema_rejects_unsafe_identifier(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOXBRAIN_DB_SCHEMA", "boxbrain;drop_schema")

    with pytest.raises(ValueError, match="BOXBRAIN_DB_SCHEMA"):
        database_schema_from_env()


def test_build_engine_applies_schema_search_path(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: dict[str, object] = {}

    def fake_create_engine(url: str, **kwargs: object) -> object:
        calls["url"] = url
        calls["kwargs"] = kwargs
        return object()

    monkeypatch.setenv("BOXBRAIN_DB_SCHEMA", "boxbrain")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@localhost:5432/shared")
    monkeypatch.setattr(database, "create_engine", fake_create_engine)

    database.build_engine()

    assert calls["url"] == "postgresql+psycopg://user:pass@localhost:5432/shared"
    assert calls["kwargs"] == {
        "pool_pre_ping": True,
        "connect_args": {"options": "-csearch_path=boxbrain,public"},
    }
