# BoxBrain v2 MVP Implementation Report

**Date:** 2026-05-03  
**Status:** MVP scaffold plus live-verified persistence-backed ingestion foundation implemented  

## Summary

The repository has advanced from a seed-data MVP scaffold into a production-shaped foundation with the first real ingestion and persistence slice. It now includes a Next.js frontend, FastAPI backend, deterministic worker helpers, OpenAPI contract assets, Alembic migration wiring, SQLAlchemy persistence scaffolding, S3-compatible artifact storage adapters, Redis/RQ queue scaffolding, multipart PPTX upload, deterministic PPTX validation/extraction, live database/S3/RQ integration coverage, tests, and verification scripts.

This is still not a completed production pilot. The current state is a credible MVP foundation: memory mode remains the default for fast local tests, while database/storage/worker integration mode is now runnable and live-verified locally.

## Architecture Implemented

- `apps/web`: Next.js App Router, TypeScript, Tailwind, ESLint, Vitest, Playwright.
- `services/api`: FastAPI with domain, application use cases, schemas, route modules, policies, in-memory infrastructure, and new database/storage/queue adapters.
- `services/api/alembic`: Alembic wiring and initial migration sourced from `infra/initial_db_schema.sql`.
- `services/worker`: deterministic ingestion/search helper package plus an RQ-compatible ingestion job entrypoint.
- `contracts/openapi/boxbrain.v2.yaml`: MVP API contract aligned with implemented route paths and methods.
- `infra/docker-compose.local.yml`: local PostgreSQL/pgvector, Redis, and MinIO services. Database schema initialization now flows through Alembic instead of Docker init SQL.
- Root scripts: `pnpm verify`, `pnpm e2e`, `make infra-up`, `make db-migrate`, `make api-db`, `make worker-ingest`, OpenAPI checks, backend lint/typecheck/test commands.

## Frontend Features Completed

- Handoff-inspired app shell: dark sidebar, sticky topbar, workspace switcher, selection tray, status chips, cards, filters, tabs, meters, and slide previews.
- MVP routes:
  - Home
  - Ask BoxBrain
  - Library
  - WorkProduct detail
  - ContentUnit detail
  - Variation Explorer
  - Reviews v2
  - ContentBlock detail
  - Storyboard workspace
  - Publish/Package review
  - Admin-lite
  - Ingestion upload/job monitor
- Preview-only routes:
  - Plays
  - Opportunities
- API-backed ingestion workspace:
  - Multipart source upload to `/api/uploads`.
  - Ingestion job list from `/api/ingestion-jobs`.
  - Ingestion job detail from `/api/ingestion-jobs/{id}`.
  - Frontend API retry helper for `/api/ingestion-jobs/{id}/retry`.
  - Contract-aligned ingestion job type fields for artifact type, title, upload metadata, and retry count.
  - Loading, empty, error, upload, and selected-job states.
- Existing demo-backed surfaces remain intact for routes not yet moved to generated/API-backed data.

## Backend Features Completed

- Seeded domain model for ContentUnits, WorkProducts, ContentBlocks, Storyboards, comments, notes, review items, ingestion jobs, provenance, audit events, similarity edges, and stored objects.
- Application use cases for catalog, search, ingestion, review actions, comments, notes, storyboards, and admin health.
- Header-driven local/dev actor model for Viewer, Contributor, Curator, Reviewer, and Admin.
- Restricted-content filtering for viewer search.
- Review actions write audit events and preserve AI suggestions as reviewable candidates.
- Storyboard snapshots deep-copy draft sections and remain immutable after draft edits.
- ContentBlock ordered membership is preserved.
- JSON upload metadata compatibility remains for existing scaffold tests and clients.
- Contract-aligned multipart `/api/uploads` path now accepts a binary `file`, `artifactType`, `title`, and optional taxonomy JSON.

## Persistence, Storage, and Ingestion Slice Completed

- Backend dependencies added:
  - `SQLAlchemy 2.x`
  - `Alembic`
  - `psycopg`
  - `python-multipart`
  - `boto3`
  - `redis`
  - `rq`
- Alembic wiring added under `services/api/alembic`.
- Initial migration reads the starter schema from `infra/initial_db_schema.sql`.
- `make db-migrate` added for applying backend migrations.
- `BOXBRAIN_REPOSITORY=database` selects the SQLAlchemy-backed repository; memory mode remains the default.
- SQLAlchemy row models added for the ingestion/persistence slice, including stored objects, provenance records, WorkProducts, ContentUnits, ingestion jobs, audit events, embeddings, and AI outputs.
- `SqlAlchemyBoxBrainRepository` added behind the existing repository/use-case boundary.
- Object storage abstraction added:
  - Memory storage for tests/local default.
  - S3/MinIO-compatible storage when `BOXBRAIN_STORAGE=s3`.
- Queue abstraction added:
  - No-op queue for tests/local default.
  - RQ queue when `BOXBRAIN_ENQUEUE_INGESTION=true`.
- Compose command detection now supports `docker compose`, `docker-compose`, and `podman compose`, with `COMPOSE=...` override support.
- `make api-db` runs FastAPI in PostgreSQL/S3/RQ mode.
- `make worker-ingest` runs the local RQ worker against the `boxbrain-ingestion` queue with the import path and integration-mode environment configured.
- Database-mode ingestion list/detail/retry/process paths refresh the SQLAlchemy read model before reading jobs, so API and worker processes can see each other's persisted state.
- Multipart upload creates:
  - `stored_objects` record
  - provenance record
  - WorkProduct family/version in the runtime model
  - ingestion job with source object and WorkProduct references
  - audit event
- Deterministic PPTX processor added:
  - validates OpenXML PPTX structure
  - computes source hashes
  - extracts slide text from PPTX XML
  - creates one atomic `ContentUnitVersion` per source slide
  - links each generated unit to provenance back to the source WorkProduct and stored object
  - preserves idempotency for repeat processing of the same job
- Rendering remains a placeholder URI adapter; LibreOffice-backed visual rendering is still pending.
- Gated live integration test coverage now verifies database/S3/RQ upload and asynchronous processing end to end when `BOXBRAIN_RUN_LIVE_TESTS=1`.

## Verification

- `pnpm verify` passed.
- `pnpm e2e` passed after a fresh production build.
- `pnpm --filter @boxbrain/web build` passed.
- `make infra-up` ran successfully through `docker-compose` after moving PostgreSQL to host port `55432` because local port `5432` was already allocated.
- Live Alembic migration passed against PostgreSQL/pgvector:
  - `cd services/api && DATABASE_URL=postgresql+psycopg://boxbrain:boxbrain@localhost:55432/boxbrain uv run alembic upgrade head`
- Live database/S3/RQ ingestion test passed:
  - `cd services/api && BOXBRAIN_RUN_LIVE_TESTS=1 DATABASE_URL=postgresql+psycopg://boxbrain:boxbrain@localhost:55432/boxbrain BOXBRAIN_REPOSITORY=database BOXBRAIN_STORAGE=s3 BOXBRAIN_ENQUEUE_INGESTION=true uv run pytest -q tests/test_live_ingestion_integration.py`
- Alembic offline SQL generation passed:
  - `cd services/api && uv run alembic upgrade head --sql`
- Backend:
  - `uv run ruff check .` passed.
  - `uv run mypy --explicit-package-bases app` passed.
  - `uv run pytest -q` passed: 28 tests, 1 gated live integration test skipped by default.
- Frontend:
  - `pnpm --filter @boxbrain/web lint` passed.
  - `pnpm --filter @boxbrain/web typecheck` passed.
  - `pnpm --filter @boxbrain/web test` passed: 7 tests.
  - Playwright smoke test passed: 1 test.

### Verification Notes

- The `docker` CLI is still not installed, but `docker-compose` is available and is now auto-detected by the Makefile.
- Local host port `5432` was already in use during verification, so live PostgreSQL verification used `POSTGRES_PORT=55432` with a matching `DATABASE_URL`.
- The local compose stack was stopped with `make infra-down` after verification.

## Current Known Gaps

- SQLAlchemy read/write and live integration coverage are focused on the ingestion slice; broader catalog/search/review/storyboard read paths still largely use the current in-memory-compatible repository shape.
- Real PPTX visual rendering is not implemented yet; slide render and thumbnail URIs are placeholders.
- The worker queue is runnable and live-verified for deterministic PPTX ingestion, but richer job telemetry and long-running worker operations are still pending.
- Search remains deterministic/in-memory; PostgreSQL full-text and pgvector-backed search are still pending.
- Frontend remains demo-backed for most non-ingestion routes.
- Auth/RBAC is local/dev header based, not OIDC/SSO backed.
- Tenant/org membership and object/source visibility tables are still needed before pilot content.
- OpenAPI route alignment is improved, but generated client automation is not yet implemented.
- Build/export manifests, Plays, Opportunities, collections, and production publish/package workflows remain future work.

## Recommended Next Steps

1. Replace placeholder render/thumbnail URIs with a real PPTX rendering adapter, likely LibreOffice headless for MVP visual fidelity.
2. Persist and query the full ingestion read model from SQL instead of relying on in-memory-compatible dictionaries for database mode.
3. Add PostgreSQL full-text search and pgvector-backed semantic search with permission filtering before ranking/grouping.
4. Add tenant/org membership and object/source visibility tables and enforce restricted visibility across search, thumbnails, similarity, where-used, WorkProducts, ContentBlocks, and Storyboards.
5. Generate a typed frontend API client from OpenAPI and replace demo data route by route.
6. Expand Playwright coverage for upload, job detail, search-to-detail, review action, and storyboard snapshot flows.
7. Add admin ingestion/search health telemetry, job duration by stage, failure counts, and queue aging.
8. Add production auth integration planning for OIDC/SSO while preserving local header-driven development mode.
9. Keep AI enrichment deterministic until review-candidate persistence and accept/reject audit flows are fully wired.
