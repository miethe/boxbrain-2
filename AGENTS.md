# AGENTS.md — BoxBrain v2 Repository Instructions

> ## ⏸️ PAUSED 2026-08-05 (HAR-006) — no named pilot user
>
> Roadmap and pilot-readiness work is **stopped**. If your task is to advance the roadmap or close
> pilot-readiness gaps, **stop and report back** — it is based on superseded state. Still in scope:
> security fixes (never gated on the pause), harvesting the family/variant/version/composition
> governance model, and keeping the tree buildable. Reversal condition is exactly one: a *named*
> external pilot user. Detail: `CLAUDE.md` § STATUS.

## Project summary

BoxBrain v2 is a governed enterprise slide/content catalog and composition platform. It ingests decks and business artifacts, decomposes them into atomic ContentUnits, organizes them into families/variants/versions, supports ContentBlocks and Storyboards, and exposes provenance, trust, comments, notes, review queues, and hybrid search.

## Current implementation state

As of 2026-05-03, this repo is a production-shaped MVP foundation, not a completed production pilot.

- `apps/web` contains a Next.js App Router frontend with the main BoxBrain shell, MVP routes, preview-only Plays/Opportunities routes, and an API-backed ingestion upload/job monitor.
- `services/api` contains a FastAPI backend with domain/application/API layers, seeded in-memory mode, SQLAlchemy/Alembic persistence scaffolding, S3-compatible storage adapters, Redis/RQ queue scaffolding, multipart PPTX upload, deterministic PPTX validation/extraction, and invariant tests.
- `services/worker` contains deterministic ingestion/search helpers plus an RQ-compatible ingestion job entrypoint.
- `contracts/openapi/boxbrain.v2.yaml` is the active local OpenAPI contract aligned with implemented routes.
- `infra/docker-compose.local.yml` defines local PostgreSQL/pgvector, Redis, and MinIO. Database schema initialization is via Alembic, not Docker init SQL.
- Memory repository/storage/queue modes remain the default for fast local tests. Database/S3/RQ paths are available behind environment settings and need live Docker/PostgreSQL/MinIO verification.
- Real PPTX visual rendering is not implemented yet; render/thumbnail URIs are placeholders. Search is still mostly deterministic/in-memory rather than PostgreSQL FTS + pgvector.

## Critical domain invariants

- ContentUnit is atomic. Never model a multi-slide bundle as one ContentUnit.
- Keep Version, Variant, Similarity, and Composition separate.
- Family -> Variant -> Version applies to ContentUnits, ContentBlocks, WorkProducts, and Plays.
- Similarity edges do not imply shared family identity.
- Composition must preserve ordered membership.
- Storyboard snapshots must be immutable once saved.
- Review comments, persistent comments, and notes are distinct systems.
- AI suggestions must be traceable and reviewable. Do not silently merge families, set canonical variants, approve content, or overwrite approved metadata.
- Provenance is required for major versions and generated/derived content.
- Governance actions must write audit events.
- Restricted content must not leak through search, thumbnails, snippets, where-used, or similarity output.

## Docs index

Read only the relevant docs before changing code.

```text
[BoxBrain Docs Index]
|current_report: docs/project_plans/implementation_reports/boxbrain-v2-mvp-initial-implementation.md
|product: docs/project_plans/init/01_BoxBrain_v2_Final_PRD.md
|implementation: docs/project_plans/init/02_Initial_Implementation_Plan.md
|architecture: docs/project_plans/init/03_Architecture_Data_API_Guide.md
|research: docs/project_plans/init/04_Product_Research_and_Design_Patterns.md
|agent_playbook: docs/project_plans/init/05_AI_Agent_Development_Playbook.md
|backlog: docs/project_plans/init/06_Roadmap_Backlog.csv
|risks: docs/project_plans/init/07_Risks_Decisions_Open_Questions.md
|source_research: docs/project_plans/init/08_Source_Research_Registry.md
|handoff_spec: docs/project_plans/init/boxbrain-v2-project-handoff/boxbrain-v2-spec.md
|active_openapi: contracts/openapi/boxbrain.v2.yaml
|starter_openapi: docs/project_plans/init/implementation_assets/openapi.boxbrain.v2.yaml
|starter_schema: docs/project_plans/init/implementation_assets/initial_db_schema.sql
|runtime_schema: infra/initial_db_schema.sql
|IMPORTANT: Prefer these docs and repo code over model memory.
```

## Expected stack

- Frontend: Next.js, React, TypeScript.
- Backend: FastAPI, Python, Pydantic.
- Database: PostgreSQL with pgvector.
- Search: PostgreSQL full-text + pgvector initially.
- Storage: S3-compatible object storage.
- Queue: Redis-backed worker framework; RQ is the current MVP queue scaffold.

## Common commands

```bash
# Root
pnpm verify
pnpm e2e
pnpm openapi:check
pnpm types:generate

# Frontend
pnpm --filter @boxbrain/web lint
pnpm --filter @boxbrain/web typecheck
pnpm --filter @boxbrain/web test
pnpm --filter @boxbrain/web build

# Backend
pnpm backend:lint
pnpm backend:typecheck
pnpm backend:test
cd services/api && uv run ruff check .
cd services/api && uv run mypy --explicit-package-bases app
cd services/api && uv run pytest -q
cd services/api && uv run alembic upgrade head --sql

# Local infra and migrations
make infra-up
make db-migrate
make infra-down
make infra-logs
```

If Docker is unavailable, `make infra-up` cannot run. In that case, verify Alembic syntax with `cd services/api && uv run alembic upgrade head --sql` and clearly report that live PostgreSQL migration verification was not performed.

## Runtime mode knobs

```bash
# Defaults: fast in-memory local/test behavior
BOXBRAIN_REPOSITORY=memory
BOXBRAIN_STORAGE=memory
BOXBRAIN_ENQUEUE_INGESTION=false

# Database/storage/queue integration mode
BOXBRAIN_REPOSITORY=database
BOXBRAIN_STORAGE=s3
BOXBRAIN_ENQUEUE_INGESTION=true
DATABASE_URL=postgresql+psycopg://boxbrain:boxbrain@localhost:5432/boxbrain
S3_ENDPOINT_URL=http://localhost:9000
S3_BUCKET=boxbrain-artifacts
REDIS_URL=redis://localhost:6379/0
```

Use `make infra-up && make db-migrate` before exercising database mode locally.

## Implementation guidance

- Keep routes thin. Route modules should call `BoxBrainUseCases` and return Pydantic schemas.
- Keep persistence behind repository/storage/queue adapters. Do not wire SQL, S3, or Redis directly into route handlers.
- Keep memory mode working unless a task explicitly removes it.
- For ingestion changes, follow `.codex/skills/slide-ingest/SKILL.md`: validate synchronously, preserve source binaries, create provenance, make jobs retryable/idempotent, and keep heavy parsing/rendering asynchronous.
- Real renderer integration should wrap a proven renderer such as LibreOffice headless behind an adapter; do not bury renderer calls in core transactions.
- AI enrichment must create candidate/review records and audit trails. Do not auto-apply AI recommendations.
- API changes must update `contracts/openapi/boxbrain.v2.yaml`.
- User-facing frontend changes must include loading, empty, error, and restricted states where relevant.

## Workflow

- For non-trivial changes, explore first, then propose a brief plan, then implement.
- Use existing patterns before introducing new abstractions.
- Prefer small, reviewable diffs.
- Add or update tests for domain invariants and command endpoints.
- After changes, summarize changed files, tests run, and any residual risks.
- Do not add new production dependencies without a clear reason.
- Do not commit secrets or real confidential content.
- This workspace path may not be a Git repository. If `git status` fails, do not assume no changes exist; use file inspection and command verification instead.

## Definition of done

- Acceptance criteria are satisfied.
- Types/schemas/contracts are updated.
- Relevant tests pass or a clear reason is provided.
- API changes are reflected in OpenAPI if applicable.
- Migrations are included for schema changes.
- Permissions/audit/provenance are considered.
- Loading/empty/error/restricted UI states are handled for user-facing changes.
- AI-generated metadata remains traceable and reviewable.
