# BoxBrain API

FastAPI backend scaffold for the BoxBrain v2 MVP.

The current adapter is a seeded in-memory repository so the frontend and worker flows can integrate against stable routes before the PostgreSQL adapter lands.

Run locally in default memory mode:

```bash
uv run uvicorn app.main:app --reload
```

Run locally against PostgreSQL, MinIO, and Redis/RQ after `make infra-up && make db-migrate`:

```bash
make api-db
make worker-ingest
```

`make db-migrate`, `make api-db`, and `make worker-ingest` load the repo env file selected by the root Makefile. To reuse an existing PostgreSQL database safely, set `DATABASE_URL` for that database and set `BOXBRAIN_DB_SCHEMA=boxbrain` so BoxBrain tables and `alembic_version` are isolated from other applications.

Run tests:

```bash
uv run pytest
```

Live integration tests are gated so the default suite stays fast:

```bash
BOXBRAIN_RUN_LIVE_TESTS=1 uv run pytest tests/test_live_ingestion_integration.py -q
```
