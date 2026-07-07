# Containerized Quick Start

This guide runs the full BoxBrain v2 MVP stack through Compose:

- Next.js web app on `http://localhost:3000`
- FastAPI API on `http://localhost:8000`
- RQ ingestion worker on the `boxbrain-ingestion` queue
- PostgreSQL with pgvector, Redis, and MinIO
- One-shot Alembic migration and MinIO bucket setup services

The existing `infra/docker-compose.local.yml` file remains the infra-only development stack. Use `infra/docker-compose.app.yml` when you want the application services containerized too.

## Prerequisites

- A Compose-compatible CLI: `docker compose`, `docker-compose`, or `podman compose`.
- Local ports available for the defaults, or overrides in `.env`.

The root `Makefile` auto-detects the Compose wrapper and can be overridden:

```bash
COMPOSE=docker-compose make app-up
```

## First Run

Create a local env file if one does not exist:

```bash
cp .env.example .env
```

Start the full stack:

```bash
make app-up
```

That command builds the API and web images, starts PostgreSQL/Redis/MinIO, creates the MinIO bucket, runs Alembic migrations, then starts the API, worker, and web services.

Check status:

```bash
make app-ps
```

Open the app:

```text
Web:        http://localhost:3000
API health: http://localhost:8000/api/health
MinIO:      http://localhost:9001
```

The MinIO console uses `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from `.env`.

## Useful Commands

```bash
make app-build      # rebuild container images
make app-up         # build and start the full app stack
make app-logs       # follow logs
make app-ps         # show service status
make app-migrate    # rerun Alembic migrations in the app stack
make seed-db        # load the demo fixture graph into Postgres (database mode)
make app-down       # stop containers
```

### Seeding the demo fixture

A fresh database-mode stack boots **empty** — the in-memory `seed()` fixture (ROI/architecture/
restricted families, a seeded WorkProduct, ContentBlock, Storyboard, and review items) only applies
to the in-memory repository. Load the equivalent graph into Postgres after migrations so demos and
smoke tests have content without ingesting a deck first:

```bash
make seed-db
```

The seed is idempotent (upsert by primary key), so it is safe to re-run. To seed inside the
containerized stack, run it against the API container's environment:

```bash
docker-compose --env-file .env -f infra/docker-compose.app.yml run --rm \
  -e BOXBRAIN_REPOSITORY=database api uv run python -m app.infrastructure.seed_database
```

To remove containers and named volumes for a clean database/object-store reset:

```bash
docker-compose --env-file .env -f infra/docker-compose.app.yml down -v
```

Use the same `COMPOSE=...` override if your local wrapper is not `docker-compose`.

## Port Overrides

Set these in `.env` before `make app-up`:

```bash
WEB_PORT=3000
API_PORT=8000
POSTGRES_PORT=5432
REDIS_PORT=6379
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
```

If the browser-facing API URL changes, set `NEXT_PUBLIC_API_BASE_URL` and rebuild the web image:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:18080 API_PORT=18080 make app-up
```

`NEXT_PUBLIC_API_BASE_URL` is baked into the client bundle at build time. The containerized web server uses `BOXBRAIN_SERVER_API_BASE_URL=http://api:8000` internally so server-rendered API calls stay on the Compose network.

## Runtime Modes

The full app Compose file runs integration mode by default:

```bash
BOXBRAIN_REPOSITORY=database
BOXBRAIN_STORAGE=s3
BOXBRAIN_ENQUEUE_INGESTION=true
BOXBRAIN_DB_SCHEMA=boxbrain
```

`BOXBRAIN_DB_SCHEMA` keeps BoxBrain tables and the Alembic version table inside an isolated PostgreSQL schema. Keep it set when pointing at a shared local database.

### Single worker required in database mode

The API **must run a single worker** whenever `BOXBRAIN_REPOSITORY=database`. The SQLAlchemy
repository is a per-process in-memory read-model cache populated at startup and refreshed on
mutations; it has **no cross-process invalidation**. Running more than one worker (or more than one
API replica against the same Postgres) lets each process's cache diverge — stale reads and
lost sibling-process updates.

The Dockerfile `CMD` and the `api` service in `infra/docker-compose.app.yml` both pin `--workers 1`.
If the effective worker count is above `1` in database mode — whether via a `uvicorn --workers N` /
`gunicorn -w N` CLI flag or a `WEB_CONCURRENCY` / `UVICORN_WORKERS` / `GUNICORN_WORKERS` /
`BOXBRAIN_API_WORKERS` env var — the API logs a startup warning (the CLI flag takes precedence, as it
does in uvicorn). This is a best-effort net; the pinned `--workers 1` command is the real guard. Do
not scale the API horizontally in this mode until the high-volume read paths move to direct SQL
queries (tracked as capability 6 Phase 3 in `docs/project_plans/uplift/backend-handoff-plan.md`).

## Validation

Static Compose validation:

```bash
docker-compose --env-file .env.example -f infra/docker-compose.app.yml config
```

Runtime smoke checks after `make app-up`:

```bash
curl http://localhost:8000/api/health
curl http://localhost:3000
```

For application regression checks outside containers:

```bash
pnpm verify
pnpm e2e
```

## Current Caveats

- This is a local/pilot Compose deployment, not a production hardening profile.
- The API is pinned to a single worker in database mode (see "Single worker required in database mode"); do not scale it horizontally yet.
- A fresh database-mode stack is empty until `make seed-db` runs or a deck is ingested.
- Auth is still the local header-driven role model, not OIDC/SSO.
- The API and worker image includes LibreOffice so the renderer adapter has `soffice` available, but visual fidelity still needs target-environment verification with real pilot decks.
- Use synthetic or approved sample decks unless pilot legal/compliance approval allows confidential content.
