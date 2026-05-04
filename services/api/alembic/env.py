from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy import text

from app.config import database_schema_from_env
from app.infrastructure.database import Base
from app.infrastructure import db_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    return os.getenv(
        "DATABASE_URL",
        config.get_main_option("sqlalchemy.url")
        or "postgresql+psycopg://boxbrain:boxbrain@localhost:5432/boxbrain",
    )


def _database_schema() -> str | None:
    return database_schema_from_env()


def _configure_schema(schema: str | None) -> None:
    if not schema:
        return
    context.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    context.execute(f"SET search_path TO {schema}, public")


def run_migrations_offline() -> None:
    schema = _database_schema()
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=schema,
    )

    _configure_schema(schema)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    schema = _database_schema()
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _database_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        if schema:
            connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
            connection.execute(text(f"SET search_path TO {schema}, public"))
            connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=schema,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
