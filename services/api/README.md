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

Run tests:

```bash
uv run pytest
```

Live integration tests are gated so the default suite stays fast:

```bash
BOXBRAIN_RUN_LIVE_TESTS=1 uv run pytest tests/test_live_ingestion_integration.py -q
```
