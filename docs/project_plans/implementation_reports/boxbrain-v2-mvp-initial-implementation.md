# BoxBrain v2 MVP Implementation Report

**Date:** 2026-05-03  
**Status:** Milestone 1 WorkProduct ingestion foundation complete; broader MVP still in progress  

## Summary

The repository has advanced from a seed-data MVP scaffold into a production-shaped foundation with a completed PPTX-first Milestone 1 ingestion path. It now includes a Next.js frontend, FastAPI backend, deterministic worker helpers, OpenAPI contract assets, Alembic migration wiring, SQLAlchemy persistence scaffolding, S3-compatible artifact storage adapters, Redis/RQ queue scaffolding, multipart PPTX upload, deterministic PPTX validation/extraction, ordered render output persistence, stage telemetry, WorkProduct filmstrip output, live database/S3/RQ integration coverage, tests, and verification scripts.

This is still not a completed production pilot. The current state is a credible MVP foundation: memory mode remains the default for fast local tests, while database/storage/worker integration mode is now runnable and live-verified locally.

## MVP Progress Map

**Basis:** This mapping is aligned to the MVP scope and release definition in `docs/project_plans/init/01_BoxBrain_v2_Final_PRD.md`, the milestone sequence in `docs/project_plans/init/02_Initial_Implementation_Plan.md`, and the architecture/data/API blueprint in `docs/project_plans/init/03_Architecture_Data_API_Guide.md`.

**Estimated MVP completion:** 39% `[########------------]`

This is an execution estimate against the product MVP definition, not a test coverage metric. The foundation, contracts, local app shell, seeded flows, and first persistence-backed ingestion slice are in place. The remaining work is mostly about making the full graph library, search, governance, and Storyboard flows real against PostgreSQL/S3/RQ instead of demo or memory-backed surfaces.

| MVP release item | Current status | Progress | What is complete | What remains for MVP |
|---|---:|---:|---|---|
| Upload deck and decompose into searchable ContentUnits | Milestone 1 complete | 70% | Multipart upload, S3/MinIO storage adapter, ingestion job, deterministic PPTX validation/text extraction, relationship-based speaker notes, renderer adapter, persisted render/thumbnail assets, one ordered ContentUnit per slide, provenance, state, deterministic embeddings, retry path, stage telemetry, API-backed WorkProduct filmstrip, live DB/S3/RQ integration test | Live LibreOffice render verification on a host with `soffice`, fuller layout extraction, full search indexing/ranking, richer operational dashboards |
| ContentUnit family/variant/version separation | Partially complete | 45% | Domain model and seeded/runtime records preserve family/variant/version concepts; ingestion creates initial families/versions | Full SQL-backed graph CRUD, canonical selection, variant expansion, version lineage/supersession, curator edit controls, migration coverage for all graph tables |
| Family-first Library with variant expansion | Scaffolded | 30% | Frontend route, cards, filters, seeded/demo library surfaces | API-backed family queries, SQL filters, variant/version expansion, saved collections, where-used counts, restricted-state handling |
| Search across ContentUnits, ContentBlocks, and WorkProducts | Scaffolded | 20% | Ask/Search UI scaffold, deterministic/memory search, restricted filtering for viewer search | PostgreSQL full-text indexes, pgvector embeddings, hybrid ranking, grouping by family/variant/version intent, explanation chips from real score components, search debug/admin view |
| Detail pages show variants, provenance, trust, comments, notes, where-used | Scaffolded | 35% | ContentUnit, WorkProduct, ContentBlock detail routes exist; seeded comments/notes/provenance/trust views exist | API-backed detail pages, persisted comments/notes, where-used queries, audit/activity timelines, authorized state controls |
| ContentBlocks as reusable ordered mini-stories | Scaffolded | 25% | Domain shape, seeded route, ordered membership invariant tests | Create-from-selection flow, SQL persistence, API endpoints, search/library inclusion, insert into Storyboard, block governance and where-used |
| Storyboards with sections, slots, gaps, inserted units/blocks, comments, snapshots | Scaffolded | 35% | Storyboard workspace route, domain/use case support, snapshot immutability test, ordered sections/slots | SQL persistence, create/edit APIs, insert/swap from search/library/tray, anchored comments, diagnostics, snapshot restore/detail UX |
| Reviews Hub duplicate/variant/stale/approval flows | Scaffolded | 30% | Reviews route, review item domain/use cases, audit events for review actions, AI suggestions remain reviewable | Candidate generation from ingestion/search signals, duplicate/variant/similarity/stale/approval queues backed by SQL, side-by-side compare, full accept/reject graph mutations |
| AI suggestions traceable and reviewable | Early scaffold | 20% | AI outputs table scaffolding and guardrail-oriented domain behavior | Enrichment workers, prompt/model versioning, summary/taxonomy/candidate records, human override state, review routing, provenance on AI metadata |
| Job status, audit logs, and admin controls | Partially complete | 50% | Ingestion job list/detail/retry, stage telemetry, admin health, audit event model/use cases, local role model | Queue aging/failure dashboards, persisted audit views, RBAC enforcement, SSO/OIDC-ready identity integration |

## Milestone Status Against Initial Implementation Plan

| Plan milestone | Target outcome | Status | Current evidence | Remaining gate |
|---|---|---:|---|---|
| Milestone 0 - Repo, contracts, and dev foundation | Working local environment and implementation skeleton | Complete | Next.js/FastAPI scaffolds, OpenAPI contract, Alembic setup, local PostgreSQL/Redis/MinIO compose, root verify/e2e scripts | Keep contract/type generation in CI as APIs evolve |
| Milestone 1 - WorkProduct ingestion foundation | Upload, store, process, and produce WorkProduct + ContentUnit records | Complete | Multipart upload, storage/queue abstractions, SQLAlchemy ingestion slice, PPTX validation/text extraction, relationship-based speaker notes, renderer adapter, persisted render/thumbnail URIs, ordered ContentUnits, provenance/state, deterministic embeddings, stage telemetry, retry failure detail, API-backed WorkProduct filmstrip, live DB/S3/RQ path | Gated live LibreOffice visual render verification once `soffice` is installed locally |
| Milestone 2 - Graph library and detail pages | Browse and inspect governed content by family/variant/version | In progress | Seeded library/detail surfaces, domain concepts, comments/notes/provenance scaffolds | Persisted family/variant/version graph APIs, filters, canonical/freshness controls, where-used, API-backed frontend |
| Milestone 3 - Search and Ask BoxBrain | Explainable grouped catalog search | Not started beyond scaffold | Ask UI and deterministic memory search exist | PostgreSQL FTS, pgvector, hybrid ranking, explanation chips, ranking debug view |
| Milestone 4 - Reviews Hub and governance workflows | Reviewable duplicate/variant/stale/approval workflows | Not started beyond scaffold | Review route/use cases, audit events, review item model | Candidate generation, compare panel, accept/reject graph updates, stale/approval queues |
| Milestone 5 - ContentBlocks and Storyboard core | Compose reusable mini-stories and Storyboards with snapshots | Not started beyond scaffold | Seeded ContentBlock and Storyboard routes, ordered membership and snapshot invariants | SQL-backed APIs, create/insert/swap UX, anchored comments, diagnostics |
| Milestone 6 - MVP hardening and pilot readiness | Stable pilot with tests, docs, observability, demo data | Partial foundation | `pnpm verify`, e2e, backend/frontend tests, live ingestion integration test | Core-flow E2E suite, pilot demo corpus, observability dashboard, performance/search evals, admin/curator/builder docs |

## Work Completed vs. Work To Do

| Workstream | Completed foundation | Remaining MVP work |
|---|---|---|
| Frontend shell and routes | Production-shaped app shell; routes for Ask, Library, WorkProduct, ContentUnit, Variation Explorer, Reviews, ContentBlock, Storyboard, Publish/Package, Admin, Ingestion; loading/empty/error states on ingestion | Replace demo data route by route with generated/API-backed clients; add restricted states consistently; deepen detail, review, and Storyboard interactions; expand Playwright core flows |
| Backend API and use cases | FastAPI app, route modules, Pydantic schemas, use-case layer, local actor roles, memory repository, ingestion/review/comment/note/storyboard/admin use cases | Complete SQL-backed repository coverage for catalog/search/review/storyboard/comments/notes; keep routes thin; enforce role/object permissions; update OpenAPI with every API change |
| Data model and persistence | Alembic wiring; starter schema; SQLAlchemy models for ingestion slice, stored objects, WorkProducts, ContentUnits, jobs, provenance, audit, embeddings, AI outputs | Fill gaps for ContentBlocks, Storyboards, comments/notes, review queues, similarity, source visibility, memberships, build manifests; add migrations and integration tests |
| Ingestion and workers | Upload-to-job path, S3 storage, RQ queue, renderer adapter, persisted thumbnails/previews, deterministic PPTX validation/text and notes extraction, atomic ordered slide unit creation, deterministic embeddings, stage telemetry, idempotent processing, live integration test | Live LibreOffice renderer verification on a host with `soffice`, fuller layout extraction, enrichment/candidate stages, deeper retry/resume by stage |
| Search and ranking | Deterministic search scaffold and viewer restricted filtering | PostgreSQL FTS, pgvector embeddings, hybrid scoring, family grouping, metadata/trust/freshness boosts, debug scoring view, eval set |
| Governance and reviews | Review item/use-case scaffold, audit events, seeded Reviews UI, protected AI-suggestion behavior | Candidate queues, compare panels, graph mutation actions, persisted audit views, approval/freshness/canonical controls, reviewer workflows |
| Comments and notes | Domain/use-case distinction between review comments, persistent comments, and notes | Persisted annotation APIs, anchoring to versions/storyboard slots/snapshots, searchability, pinned notes, resolution flows |
| Storyboard and ContentBlocks | Seeded routes, ordered composition invariants, immutable snapshot behavior | Create/edit Storyboards and ContentBlocks from real content; insert/swap from search/library/tray; diagnostics; anchored comments; build-manifest-compatible records |
| Security and access control | Header-driven local/dev actor model and basic viewer restricted search behavior | Tenant/org membership, object/source visibility tables, RBAC enforcement across all outputs, OIDC/SSO integration path, audit coverage for sensitive actions |
| Operations and pilot readiness | Local infra compose, Makefile commands, verification scripts, live ingestion test | Observability dashboard, queue aging/failure metrics, pilot demo dataset, performance pass, deployment docs, admin/curator/builder workflow docs |

## Recommended Execution Order

The implementation plan's sequencing still holds: identity and ingestion fidelity first, then library/search/governance, then Storyboard composition, then hardening. The next slices should be kept small enough to validate independently.

| Order | Slice | Why now | Main dependencies | Exit gate |
|---:|---|---|---|---|
| 1 | Live LibreOffice render verification and renderer hardening | The adapter exists, but this machine lacks `soffice` for live visual fidelity verification | Renderer adapter, stored render assets, gated render test | `BOXBRAIN_RUN_RENDER_TESTS=1` passes on a host with LibreOffice installed |
| 2 | Complete ingestion read model in SQL | Later library/search/detail work should not rely on memory-compatible dictionaries | SQLAlchemy repository, migrations, existing ingestion models | API list/detail/retry/process paths read generated WorkProducts/ContentUnits from PostgreSQL only in database mode |
| 3 | Baseline permissions and visibility model | Restricted content must not leak as catalog/search/detail APIs move to real data | Local actor model, tenant/object visibility tables, repository filters | Restricted content is filtered from search, thumbnails, snippets, where-used, similarity, Storyboards, and blocks |
| 4 | Graph library APIs for families, variants, versions, provenance, trust | This unlocks family-first Library and detail pages | Core graph tables, provenance/audit tables, visibility filters | Library and detail endpoints return family cards, variant expansion, latest version, provenance, and trust state |
| 5 | API-backed Library and detail frontend | Users need to inspect real ingested content before search/review can be judged | Graph library APIs, typed client or API helper | Library, WorkProduct detail, and ContentUnit detail work against live API with loading/empty/error/restricted states |
| 6 | PostgreSQL FTS and pgvector indexing | Hybrid search requires real extracted/indexed units and permission-aware result assembly | Render/extract pipeline, embeddings table, graph APIs, visibility filters | Ask/Search returns grouped family-first results with explanation chips and permission filtering |
| 7 | Review candidate generation and Reviews Hub actions | AI/search output must become governed workflow, not automatic graph mutation | Search/indexing, similarity/candidate tables, audit events | Duplicate/variant/similarity/stale/approval candidates can be accepted/rejected and audited |
| 8 | ContentBlocks create/search/insert path | Blocks depend on trusted, findable ContentUnits | Library/search APIs, block persistence | User creates an ordered block from selected units and inserts it into a Storyboard |
| 9 | Storyboard SQL-backed composition core | Composition should follow after reusable content is available | ContentBlocks, graph detail APIs, comments | User creates sections/slots/gaps, inserts units/blocks, swaps variants, comments, snapshots, and returns later |
| 10 | Pilot readiness hardening | Stabilize after core behavior exists | Core flows above | E2E suite, observability dashboard, demo corpus, search evals, workflow docs, performance targets |

## Dependency Notes

| Dependency | Blocks | Decision |
|---|---|---|
| Rendering adapter | Ingestion acceptance, WorkProduct filmstrip, ContentUnit previews, review compare panels | Use a proven renderer such as LibreOffice headless behind an adapter; keep calls out of core transactions |
| SQL graph repository | Library, details, comments/notes, reviews, Storyboard | Expand persistence behind the existing repository boundary; keep memory mode for fast tests |
| OpenAPI/client generation | Frontend API migration | Update `contracts/openapi/boxbrain.v2.yaml` with every API change, then generate typed frontend types/client |
| Embedding provider/model | Semantic search, duplicate/similarity candidates, recommendations | Start with deterministic/test-safe embedding abstraction and store model/pipeline version with rows |
| Visibility model | Search, thumbnails, similarity, where-used, Storyboard, ContentBlocks | Add tenant/org membership and object/source visibility before loading pilot content |
| Review/audit model | Canonical, approvals, duplicate/variant links, AI suggestions | All AI/human graph changes should create review/audit records; do not auto-apply uncertain AI links |

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
  - Contract-aligned ingestion job type fields for artifact type, title, upload metadata, output summary, stage telemetry, and retry count.
  - Output summary, warnings, created ContentUnit links, WorkProduct version links, and failed-job retry action.
  - PPTX-only upload affordance until other source formats are implemented.
  - Loading, empty, error, upload, and selected-job states.
- WorkProduct detail now attempts API-backed `/api/work-products/versions/{id}` data first and renders ordered generated filmstrip items when available, with demo fallback for seeded preview routes.
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
  - resolves speaker notes through slide relationship files
  - invokes a slide renderer adapter from worker processing, not the upload request
  - persists distinct render and thumbnail assets through object storage
  - creates one atomic `ContentUnitVersion` per source slide
  - preserves source order across metadata, SQL rows, WorkProduct filmstrip, and API responses
  - links each generated unit to provenance back to the source WorkProduct and stored object
  - writes deterministic text embedding records with model/version/dim metadata
  - records stage telemetry and output summary metadata
  - preserves idempotency for repeat processing of the same job
- LibreOffice-backed visual rendering is implemented behind an adapter. Unit/default tests use a fake renderer, and live LibreOffice verification is gated because this host does not currently have `soffice` on `PATH`.
- Gated live integration test coverage now verifies database/S3/RQ upload and asynchronous processing end to end when `BOXBRAIN_RUN_LIVE_TESTS=1`.

## Verification

- `pnpm verify` passed: frontend lint/typecheck/test plus backend lint/typecheck/test, with backend reporting 31 passed and 2 gated skips.
- `pnpm e2e` passed after a fresh production build.
- `pnpm --filter @boxbrain/web build` passed.
- `make infra-up` initially hit the local port `5432` conflict, then ran successfully through `docker-compose` with `POSTGRES_PORT=55432`.
- Live Alembic migration passed against PostgreSQL/pgvector:
  - `cd services/api && DATABASE_URL=postgresql+psycopg://boxbrain:boxbrain@localhost:55432/boxbrain uv run alembic upgrade head`
- Live database/S3/RQ ingestion test passed:
  - `cd services/api && BOXBRAIN_RUN_LIVE_TESTS=1 BOXBRAIN_RENDERER=fake DATABASE_URL=postgresql+psycopg://boxbrain:boxbrain@localhost:55432/boxbrain BOXBRAIN_REPOSITORY=database BOXBRAIN_STORAGE=s3 BOXBRAIN_ENQUEUE_INGESTION=true uv run pytest -q tests/test_live_ingestion_integration.py`
- Gated live LibreOffice render test skipped because `soffice`/LibreOffice is not installed on `PATH`:
  - `cd services/api && uv run pytest -q tests/test_live_rendering.py`
- Alembic offline SQL generation passed:
  - `cd services/api && uv run alembic upgrade head --sql`
- Backend:
  - `uv run ruff check .` passed.
  - `uv run mypy --explicit-package-bases app` passed.
  - `uv run pytest -q` passed: 31 tests, 2 gated tests skipped by default.
- Frontend:
  - `pnpm --filter @boxbrain/web lint` passed.
  - `pnpm --filter @boxbrain/web typecheck` passed.
  - `pnpm --filter @boxbrain/web test` passed: 8 tests.
  - Playwright smoke test passed: 1 test.

### Verification Notes

- The `docker` CLI is still not installed, but `docker-compose` is available and is now auto-detected by the Makefile.
- Local host port `5432` was already in use during verification, so live PostgreSQL verification used `POSTGRES_PORT=55432` with a matching `DATABASE_URL`.
- LibreOffice is not currently installed on `PATH`, so live visual rendering remains unverified on this host. The renderer adapter and missing-renderer failure path are covered by automated tests, and live render verification is gated behind `BOXBRAIN_RUN_RENDER_TESTS=1`.
- The local compose stack was stopped with `make infra-down` after verification.

### Milestone 1 Closeout Commits

- `ad3c8b9` - `chore(progress): track milestone 1 ingestion completion`
- `3b94338` - `feat(ingestion): add ordered render outputs and telemetry`
- `aea5589` - `feat(persistence): expose embedding repository records`
- `9d3ecda` - `feat(web): surface ingestion outputs and work product filmstrip`
- `af11700` - `test(ingestion): cover milestone 1 renderer gates`

## Current Known Gaps

- SQLAlchemy read/write and live integration coverage are focused on the ingestion slice; broader catalog/search/review/storyboard read paths still largely use the current in-memory-compatible repository shape.
- Live LibreOffice visual rendering has not been verified on this host because `soffice` is not installed; install LibreOffice and run the gated render test before pilot visual fidelity signoff.
- The worker queue is runnable and live-verified for deterministic PPTX ingestion, but richer queue aging/failure dashboards and long-running worker operations are still pending.
- Search remains deterministic/in-memory; PostgreSQL full-text and pgvector-backed search are still pending.
- Frontend remains demo-backed for most non-ingestion routes.
- Auth/RBAC is local/dev header based, not OIDC/SSO backed.
- Tenant/org membership and object/source visibility tables are still needed before pilot content.
- OpenAPI route alignment is improved, but generated client automation is not yet implemented.
- Build/export manifests, Plays, Opportunities, collections, and production publish/package workflows remain future work.

## Recommended Next Steps

1. Install LibreOffice on a verification host and run `BOXBRAIN_RUN_RENDER_TESTS=1 uv run pytest -q tests/test_live_rendering.py` for live visual fidelity signoff.
2. Persist and query the full ingestion read model from SQL instead of relying on in-memory-compatible dictionaries for database mode.
3. Add PostgreSQL full-text search and pgvector-backed semantic search with permission filtering before ranking/grouping.
4. Add tenant/org membership and object/source visibility tables and enforce restricted visibility across search, thumbnails, similarity, where-used, WorkProducts, ContentBlocks, and Storyboards.
5. Generate a typed frontend API client from OpenAPI and replace demo data route by route.
6. Expand Playwright coverage for upload, job detail, search-to-detail, review action, and storyboard snapshot flows.
7. Add admin ingestion/search health telemetry, job duration by stage, failure counts, and queue aging.
8. Add production auth integration planning for OIDC/SSO while preserving local header-driven development mode.
9. Keep AI enrichment deterministic until review-candidate persistence and accept/reject audit flows are fully wired.
