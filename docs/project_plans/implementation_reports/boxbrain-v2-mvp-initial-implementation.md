# BoxBrain v2 MVP Implementation Report

**Date:** 2026-05-05
**Status:** Milestone 4 Reviews Hub and governance workflow foundation complete; broader MVP still in progress

## Summary

The repository has advanced from a seed-data MVP scaffold into a production-shaped foundation with completed PPTX-first Milestone 1 ingestion, Milestone 2 governed graph browsing/detail foundations, Milestone 3 hybrid search/Ask BoxBrain, and a Milestone 4 Reviews Hub/governance workflow foundation. It now includes a Next.js frontend, FastAPI backend, deterministic worker helpers, OpenAPI contract assets, Alembic migration wiring, SQLAlchemy persistence scaffolding, S3-compatible artifact storage adapters, Redis/RQ queue scaffolding, multipart PPTX upload, deterministic PPTX validation/extraction, ordered render output persistence, stage telemetry, WorkProduct filmstrip output, baseline restricted visibility, ContentUnit family/variant/version APIs, comments/notes persistence in database mode, API-backed Library, ContentUnit detail write controls, database-backed hybrid search, API-backed Ask BoxBrain, deterministic review candidate generation, API-backed Reviews Hub compare/actions, SQL-backed review queue and similarity-edge persistence, tests, and verification scripts.

This is still not a completed production pilot. The current state is a credible MVP foundation: memory mode remains the default for fast local tests, while database/storage/worker integration mode is runnable, migration-verified locally, and live-verified for ingestion plus database-backed search.

## MVP Progress Map

**Basis:** This mapping is aligned to the MVP scope and release definition in `docs/project_plans/init/01_BoxBrain_v2_Final_PRD.md`, the milestone sequence in `docs/project_plans/init/02_Initial_Implementation_Plan.md`, and the architecture/data/API blueprint in `docs/project_plans/init/03_Architecture_Data_API_Guide.md`.

**Estimated MVP completion:** 62% `[############--------]`

This is an execution estimate against the product MVP definition, not a test coverage metric. The foundation, contracts, local app shell, ingestion path, graph library/detail APIs, baseline visibility safeguards, API-backed catalog/detail/search/review frontend surfaces, first PostgreSQL/pgvector hybrid search path, and first governed review workflow are in place. The remaining work is mostly about making ContentBlocks, Storyboards, source-aware permissions, and pilot operations real against PostgreSQL/S3/RQ instead of demo or memory-backed surfaces.

| MVP release item | Current status | Progress | What is complete | What remains for MVP |
|---|---:|---:|---|---|
| Upload deck and decompose into searchable ContentUnits | Milestone 1 complete | 75% | Multipart upload, S3/MinIO storage adapter, ingestion job, deterministic PPTX validation/text extraction, relationship-based speaker notes, renderer adapter, persisted render/thumbnail assets, one ordered ContentUnit per slide, provenance, state, deterministic embeddings persisted for ContentUnits and WorkProducts, retry path, stage telemetry, API-backed WorkProduct filmstrip, live DB/S3/RQ integration test | Live LibreOffice render verification on a host with `soffice`, fuller layout extraction, richer operational dashboards |
| ContentUnit family/variant/version separation | Milestone 2 foundation complete | 70% | Domain model and seeded/runtime records preserve family/variant/version concepts; ingestion creates initial families/versions; APIs expose family list/detail, variants, versions, canonical marker, approval and freshness controls, provenance, visibility-filtered similar and where-used; direct version detail no longer leaks restricted versions; detail UI can write comments, notes, canonical, approval, and freshness actions | Full curator graph editing, version lineage/supersession UX, richer SQL query methods, canonical/freshness review workflows, source-aware visibility |
| Family-first Library with variant expansion | API-backed foundation complete | 50% | Frontend route now loads live ContentUnit family and WorkProduct family APIs; family cards show canonical preview, trust/freshness, taxonomy, variant/version counts, loading/empty/error/restricted states | Saved collections, deeper filters, variant-mode browsing, where-used counts on cards, generated client automation |
| Search across ContentUnits, ContentBlocks, and WorkProducts | Milestone 3 foundation complete | 55% | API-backed Ask/Search UI, memory-mode compatibility, PostgreSQL FTS + pgvector search path for ContentUnit and WorkProduct versions, deterministic embedding vectors, family/variant/version grouping, explanation chips from ranking components, reviewer/admin debug, restricted filtering before grouping | ContentBlock SQL search, saved search persistence, richer score breakdown UI, search eval corpus, ranking tuning, generated client automation |
| Detail pages show variants, provenance, trust, comments, notes, where-used | API-backed foundation complete | 65% | ContentUnit detail now loads live family/version APIs, variants, versions, provenance, similar, where-used, comments, notes, loading/error/restricted states; write controls create persistent comments, notes, canonical variant changes, approval changes, and freshness changes; WorkProduct detail remains API-backed for generated filmstrips | Persisted activity timelines, richer compare and similar panels, source-aware permissions |
| ContentBlocks as reusable ordered mini-stories | Scaffolded | 25% | Domain shape, seeded route, ordered membership invariant tests | Create-from-selection flow, SQL persistence, API endpoints, search/library inclusion, insert into Storyboard, block governance and where-used |
| Storyboards with sections, slots, gaps, inserted units/blocks, comments, snapshots | Scaffolded | 35% | Storyboard workspace route, domain/use case support, snapshot immutability test, ordered sections/slots | SQL persistence, create/edit APIs, insert/swap from search/library/tray, anchored comments, diagnostics, snapshot restore/detail UX |
| Reviews Hub duplicate/variant/stale/approval flows | Milestone 4 foundation complete | 60% | Reviewer-gated queue/list/detail APIs, deterministic duplicate/variant/similarity/stale/approval candidate generation, API-backed Reviews Hub with compare panel and action states, generic accept/reject/request-changes controls, audited graph/trust mutations, SQL-backed review item and similarity-edge persistence, AI suggestions remain reviewable | Richer candidate scoring from ingestion/search signals, AI output row status linkage, side-by-side visual diffing, persisted reviewer assignment/SLAs, review E2E coverage |
| AI suggestions traceable and reviewable | Early scaffold | 20% | AI outputs table scaffolding and guardrail-oriented domain behavior | Enrichment workers, prompt/model versioning, summary/taxonomy/candidate records, human override state, review routing, provenance on AI metadata |
| Job status, audit logs, and admin controls | Partially complete | 55% | Ingestion job list/detail/retry, stage telemetry, admin health, audit event model/use cases, local role model, audit writes for canonical/approval/freshness/note actions, reviewer/admin-only search debug | Queue aging/failure dashboards, persisted audit views, full RBAC enforcement, SSO/OIDC-ready identity integration |

## Milestone Status Against Initial Implementation Plan

| Plan milestone | Target outcome | Status | Current evidence | Remaining gate |
|---|---|---:|---|---|
| Milestone 0 - Repo, contracts, and dev foundation | Working local environment and implementation skeleton | Complete | Next.js/FastAPI scaffolds, OpenAPI contract, Alembic setup, local PostgreSQL/Redis/MinIO compose, root verify/e2e scripts | Keep contract/type generation in CI as APIs evolve |
| Milestone 1 - WorkProduct ingestion foundation | Upload, store, process, and produce WorkProduct + ContentUnit records | Complete | Multipart upload, storage/queue abstractions, SQLAlchemy ingestion slice, PPTX validation/text extraction, relationship-based speaker notes, renderer adapter, persisted render/thumbnail URIs, ordered ContentUnits, provenance/state, deterministic embeddings, stage telemetry, retry failure detail, API-backed WorkProduct filmstrip, live DB/S3/RQ path | Gated live LibreOffice visual render verification once `soffice` is installed locally |
| Milestone 2 - Graph library and detail pages | Browse and inspect governed content by family/variant/version | Complete foundation | API-backed ContentUnit family list/detail, variant/version expansion, typed where-used, similar, provenance, persistent comments/curated notes, canonical/approval/freshness audit actions, baseline restricted visibility, API-backed Library and ContentUnit detail pages, writeable ContentUnit detail controls, restricted direct-version leak fixed | Rich curator editing UX, saved collections, generated client automation, source-aware permissions |
| Milestone 3 - Search and Ask BoxBrain | Explainable grouped catalog search | Complete foundation | Memory-compatible search path, SQLAlchemy database hybrid search over PostgreSQL FTS + pgvector for ContentUnit and WorkProduct versions, persisted embedding vectors, family/variant/version grouping, component explanation chips, reviewer/admin debug, API-backed Ask UI with filters and local saved-search skeleton, live database search probe | ContentBlock SQL search, persisted saved searches, eval corpus, ranking tuning, broader search E2E coverage |
| Milestone 4 - Reviews Hub and governance workflows | Reviewable duplicate/variant/stale/approval workflows | Complete foundation | Reviewer-gated review queue/list/detail APIs, deterministic candidate generation across duplicate/variant/similarity/stale/approval queues, API-backed Reviews Hub compare/action UI, generic accept endpoint, audited accept/reject/request-changes graph/trust mutations, SQL-backed review item and similarity-edge persistence | Ingestion-stage candidate creation, AI output status linkage, richer visual compare/diff, reviewer assignment/SLA workflow, broader E2E coverage |
| Milestone 5 - ContentBlocks and Storyboard core | Compose reusable mini-stories and Storyboards with snapshots | Not started beyond scaffold | Seeded ContentBlock and Storyboard routes, ordered membership and snapshot invariants | SQL-backed APIs, create/insert/swap UX, anchored comments, diagnostics |
| Milestone 6 - MVP hardening and pilot readiness | Stable pilot with tests, docs, observability, demo data | Partial foundation | `pnpm verify`, e2e, backend/frontend tests, live ingestion integration test | Core-flow E2E suite, pilot demo corpus, observability dashboard, performance/search evals, admin/curator/builder docs |

## Work Completed vs. Work To Do

| Workstream | Completed foundation | Remaining MVP work |
|---|---|---|
| Frontend shell and routes | Production-shaped app shell; routes for Ask, Library, WorkProduct, ContentUnit, Variation Explorer, Reviews, ContentBlock, Storyboard, Publish/Package, Admin, Ingestion; loading/empty/error states on ingestion, Library, ContentUnit detail, Ask, and Reviews; write controls on ContentUnit detail; Reviews Hub now uses API-backed queue/detail/action calls | Replace remaining demo data route by route with generated/API-backed clients; deepen Storyboard interactions; persist saved searches; expand Playwright core flows |
| Backend API and use cases | FastAPI app, route modules, Pydantic schemas, use-case layer, local actor roles, memory repository, ingestion/review/comment/note/storyboard/admin use cases, graph library APIs, baseline visibility enforcement, database hybrid search adapter, review candidate/action workflow | Complete SQL-backed repository coverage for storyboard/content blocks; keep routes thin; add source-aware object visibility; update OpenAPI with every API change |
| Data model and persistence | Alembic wiring; starter schema; SQLAlchemy models for ingestion slice, stored objects, WorkProducts, ContentUnits, jobs, provenance, audit, embeddings with pgvector values, AI outputs, comments, notes, restricted flags, review items, similarity edges | Fill gaps for ContentBlocks, Storyboards, source visibility, memberships, build manifests; add migrations and integration tests |
| Ingestion and workers | Upload-to-job path, S3 storage, RQ queue, renderer adapter, persisted thumbnails/previews, deterministic PPTX validation/text and notes extraction, atomic ordered slide unit creation, deterministic ContentUnit and WorkProduct embeddings, stage telemetry, idempotent processing, live integration test | Live LibreOffice renderer verification on a host with `soffice`, fuller layout extraction, enrichment/candidate stages, deeper retry/resume by stage |
| Search and ranking | Memory-compatible search, PostgreSQL FTS + pgvector database path for ContentUnit and WorkProduct versions, family/variant/version grouping, metadata/trust/freshness scoring, permission pre-filtering, reviewer/admin debug, API-backed Ask UI | ContentBlock SQL search, persisted saved searches, score breakdown UX, eval set, ranking tuning |
| Governance and reviews | Reviewer-gated queue/list/detail APIs, deterministic duplicate/variant/similarity/stale/approval candidate generation, API-backed Reviews Hub compare panel, accept/reject/request-changes actions, graph/trust mutations with audit events, SQL-backed review items and similarity edges, protected AI-suggestion behavior | Persisted audit views, AI output status linkage, reviewer assignment/SLAs, visual diffing, broader review workflow E2E |
| Comments and notes | Domain/use-case distinction between review comments, persistent comments, and notes; SQLAlchemy persistence and visibility-filtered list/create APIs; ContentUnit detail can create persistent comments and pinned notes | Edit/resolution flows, anchoring to storyboard slots/snapshots, searchability, richer pinned note UX |
| Storyboard and ContentBlocks | Seeded routes, ordered composition invariants, immutable snapshot behavior | Create/edit Storyboards and ContentBlocks from real content; insert/swap from search/library/tray; diagnostics; anchored comments; build-manifest-compatible records |
| Security and access control | Header-driven local/dev actor model; viewer restricted filtering for search, library/detail, thumbnails, similar, where-used, comments/notes, WorkProducts, ContentBlocks, and Storyboards | Tenant/org membership, object/source visibility tables, full RBAC enforcement, OIDC/SSO integration path |
| Operations and pilot readiness | Local infra compose, Makefile commands, verification scripts, live ingestion test | Observability dashboard, queue aging/failure metrics, pilot demo dataset, performance pass, deployment docs, admin/curator/builder workflow docs |

## Recommended Execution Order

The implementation plan's sequencing still holds: identity and ingestion fidelity first, then library/search/governance, then Storyboard composition, then hardening. The next slices should be kept small enough to validate independently.

| Order | Slice | Why now | Main dependencies | Exit gate |
|---:|---|---|---|---|
| 1 | ContentBlocks create/search/insert path | Blocks depend on trusted, findable, reviewable ContentUnits and should become searchable/composable next | Library/search/review APIs, block persistence | User creates an ordered block from selected units, finds it in search, and inserts it into a Storyboard |
| 2 | Storyboard SQL-backed composition core | Composition should follow after reusable content is available | ContentBlocks, graph detail APIs, comments | User creates sections/slots/gaps, inserts units/blocks, swaps variants, comments, snapshots, and returns later |
| 3 | Source-aware visibility and identity hardening | Baseline role-based filtering is in place; pilot content needs source/org policy before real client data | Local actor model, restricted flags, graph/search/review APIs | Tenant/org membership, object/source visibility tables, and RBAC enforcement apply across outputs |
| 4 | Pilot readiness hardening | Stabilize after core behavior exists | Core flows above | E2E suite, observability dashboard, demo corpus, search evals, workflow docs, performance targets |
| 5 | AI enrichment worker integration | Review workflow now exists, so candidate creation can move from deterministic on-demand scans into ingestion/enrichment stages | Review item APIs, AI outputs table, worker stages | Ingestion/enrichment emits suggested AI outputs and review items without auto-applying graph changes |

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
- Library now loads live `/api/content-units/families` and `/api/work-products/families` data with loading, empty, error, and restricted states.
- ContentUnit detail now loads live family/detail and version/detail APIs, including variant/version expansion, provenance, similar items, where-used references, comments, and notes.
- ContentUnit detail now includes compact write controls for persistent comments, curated notes, canonical variant selection, approval state, and freshness state.
- Ask BoxBrain now posts to the live `/api/ask` and `/api/search` endpoints with profile, object-type, approval/freshness, result-mode, debug, loading, empty, error, restricted, and local saved-search states.
- Search result cards render API scores, status chips, explanation chips, preview/summary handling, restricted-result shielding, and ContentUnit/WorkProduct/ContentBlock links.
- Frontend API helpers now cover ContentUnit family/detail, variants, versions, similar, where-used, comments, notes, WorkProduct families, governance mutation endpoints, and typed Search/Ask requests.
- The web dev/start scripts now load the repo `.env`/`.env.example` and derive the Next.js port from `WEB_PORT`, `PORT`, or `APP_URL`, so `pnpm --filter @boxbrain/web dev` respects local port overrides.
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
- ContentUnit graph APIs now support approval/freshness filters, family detail, variant/version expansion, typed where-used references, similar results, and freshness updates.
- Baseline role-based restricted visibility now filters unauthorized viewers across library/detail outputs, search scoring, thumbnails/previews, similar, where-used, comments/notes, WorkProducts, ContentBlocks, and Storyboards.
- Persistent comments and curated notes now persist through the SQLAlchemy repository in database mode while remaining compatible with memory mode.
- Canonical, approval, freshness, and note actions write audit events.
- Direct ContentUnit version detail now checks version-level visibility before returning previews, text, provenance, comments, or notes.
- Search now preserves memory-mode behavior while using the SQLAlchemy hybrid search adapter in database mode.
- Database-mode hybrid search uses PostgreSQL full-text search and pgvector cosine distance for ContentUnit and WorkProduct versions, then assembles family/variant/version results with restricted filtering before grouping.
- Deterministic embeddings are now written into the pgvector `embeddings.embedding` column for generated ContentUnit and WorkProduct search targets.
- Search explanations now come from ranking components such as keyword, semantic, metadata, trust, freshness, and rollup grouping; debug output is limited to reviewer/admin roles.

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
- Runtime Makefile targets load the selected `.env`/`.env.example` file so `DATABASE_URL`, Redis, MinIO, and schema settings are shared by compose, migrations, API, and worker commands.
- `BOXBRAIN_DB_SCHEMA` isolates BoxBrain tables and the Alembic version table in a dedicated PostgreSQL schema for safer reuse of an existing PostgreSQL database.
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

## Milestone 2 Graph Library Slice Completed

- `291ae23` - `feat(api): complete governed graph library APIs`
  - Added restricted flags to runtime schema and Alembic migration `20260504_0003`.
  - Added API/use-case support for ContentUnit family filters, freshness updates, typed where-used references, version-specific similar filtering, and visibility-filtered comments/notes.
  - Persisted comments and notes through SQLAlchemy database mode.
  - Added focused Milestone 2 visibility/API coverage.
- `3c9a502` - `feat(web): wire library and content unit detail to API`
  - Replaced demo-backed Library with API-backed ContentUnit and WorkProduct family cards.
  - Replaced demo-backed ContentUnit detail with API-backed family/version rendering, variants, versions, provenance, similar, where-used, comments, notes, and restricted/error states.
  - Added loading states and frontend API helper tests.
- `ddab2b1` - `fix(graph): close milestone 2 governance gaps`
  - Fixed restricted direct-version detail leakage by checking version-level visibility before returning detail payloads.
  - Added frontend controls for ContentUnit comments, notes, canonical selection, approval, and freshness.
  - Added database-mode comment/note persistence reload coverage and aligned active OpenAPI list params with implemented behavior.

## Milestone 3 Search and Ask Slice Completed

- `6d2b2a5` - `feat(search): add hybrid catalog ranking backend`
  - Added database-mode hybrid search behind the existing use-case boundary while preserving memory-mode search.
  - Added PostgreSQL FTS + pgvector scoring for ContentUnit and WorkProduct versions with restricted filtering before grouping.
  - Added family/variant/version grouping, ranking-component explanation chips, reviewer/admin debug, and focused backend tests.
- `eed35f5` - `feat(web): wire ask to search api`
  - Replaced the demo-backed Ask route with typed `/api/ask` and `/api/search` calls.
  - Added filters, loading/empty/error/restricted states, local saved-search skeleton, and reusable result cards.
  - Added frontend API and result-card tests.
- `c3bde21` - `test(search): cover work product embeddings`
  - Updated ingestion coverage for the new WorkProduct embedding generated alongside slide ContentUnit embeddings.

## Milestone 4 Reviews Hub and Governance Slice Completed

- Current commit - `feat(reviews): complete governance workflow foundation`
  - Added reviewer-gated review queue/list/detail APIs and deterministic candidate generation via `POST /api/reviews/candidates/generate`.
  - Generated duplicate, variant, similarity, stale, and approval candidates without auto-applying AI suggestions.
  - Added generic `POST /api/reviews/items/{review_item_id}/accept` plus typed review action responses for accept/reject/request-changes and existing action endpoints.
  - Persisted review items and similarity edges through SQLAlchemy reload paths while preserving memory mode.
  - Replaced the demo-backed Reviews page with an API-backed Reviews Hub that loads queues/items/detail, shows compare objects, handles loading/empty/error/restricted states, and records reviewer actions with reasons.
  - Updated the OpenAPI contract for candidate generation, generic accept, and `ReviewActionResponse`.

## Verification

- Focused Milestone 4 backend validation passed:
  - `cd services/api && uv run pytest -q tests/test_reviews_hub_backend.py tests/test_governance.py tests/test_api_invariants.py tests/test_milestone2_visibility_api.py tests/test_search_permissions.py`
  - Result: 22 passed.
  - `cd services/api && uv run pytest -q`
  - Result: 52 passed, 3 gated tests skipped by default.
- Focused Milestone 4 frontend validation passed:
  - `pnpm --filter @boxbrain/web test -- api.test.ts --reporter=dot`
  - Result: 22 passed across 3 test files because Vitest also picked up `features/demo/data.test.ts` and `components/search-result-card.test.tsx`.
  - `pnpm --filter @boxbrain/web typecheck` passed.
  - `pnpm --filter @boxbrain/web lint` passed.
  - `pnpm --filter @boxbrain/web build` passed.
- Full local verification passed:
  - `pnpm verify`
  - Result: OpenAPI check, frontend lint/typecheck/test, backend lint/typecheck/test all passed; backend test result was 52 passed, 3 gated tests skipped.
  - `pnpm e2e`
  - Result: 1 Playwright app-shell smoke test passed.
- Backend lint/type/static migration validation passed:
  - `cd services/api && uv run ruff check app tests/test_reviews_hub_backend.py`
  - Result: all checks passed.
  - `cd services/api && uv run mypy --explicit-package-bases app`
  - Result: no issues found in 46 source files.
  - `cd services/api && uv run alembic upgrade head --sql`
  - Result: static SQL generation passed.
- `pnpm openapi:check` passed.
- `pnpm types:generate` passed with no package-specific generators configured.
- `pnpm --filter @boxbrain/web build` passed after cleaning the generated `.next` directory.
- `pnpm e2e` passed after the fresh production build: 1 Playwright smoke test.
- Focused Milestone 2 remediation validation passed:
  - `cd services/api && uv run pytest -q tests/test_milestone2_visibility_api.py tests/test_governance.py tests/test_search_permissions.py tests/test_api_invariants.py`
  - Result: 16 passed.
  - `set -a; source .env; set +a; cd services/api && BOXBRAIN_RUN_LIVE_TESTS=1 uv run pytest -q tests/test_live_ingestion_integration.py::test_live_database_comments_and_notes_persist_after_reload`
  - Result: 1 passed.
- Focused Milestone 3 backend validation passed:
  - `cd services/api && uv run pytest -q tests/test_hybrid_search_backend.py tests/test_search_permissions.py tests/test_milestone2_visibility_api.py::test_restricted_versions_do_not_leak_through_variant_versions_similar_or_search`
  - Result: 8 passed.
  - `cd services/api && uv run pytest -q tests/test_ingestion_upload.py::test_deterministic_processor_creates_one_atomic_unit_per_slide_and_is_idempotent tests/test_hybrid_search_backend.py`
  - Result: 6 passed.
- Focused Milestone 3 frontend validation passed:
  - `pnpm --filter @boxbrain/web test -- lib/api.test.ts components/search-result-card.test.tsx`
  - Result: 17 passed across 3 test files because Vitest also picked up `features/demo/data.test.ts`.
  - `pnpm --filter @boxbrain/web typecheck` passed.
- Backend lint/type/static migration validation passed:
  - `cd services/api && uv run ruff check app/application/use_cases.py app/infrastructure/sqlalchemy_repository.py app/infrastructure/db_models.py app/domain/ingestion_search tests/test_hybrid_search_backend.py`
  - Result: all checks passed.
  - `cd services/api && uv run mypy --explicit-package-bases app/application/use_cases.py app/infrastructure/sqlalchemy_repository.py app/infrastructure/db_models.py app/domain/ingestion_search`
  - Result: no issues found in 11 source files.
  - `cd services/api && uv run alembic upgrade head --sql`
  - Result: static SQL generation passed.
- Live database/search verification passed:
  - `make infra-up` started local PostgreSQL/pgvector, Redis, and MinIO through `docker-compose`.
  - `make db-migrate` applied migrations against the repo `.env` database.
  - A deterministic ContentUnit search probe was created through `SqlAlchemyBoxBrainRepository`, then `POST /api/search` was issued with reviewer headers.
  - Result: HTTP 200, `debug.backend == "database"`, and the probe title was returned from the PostgreSQL/pgvector search path.

### Verification Notes

- The `docker` CLI is still not installed, but `docker-compose` is available and is now auto-detected by the Makefile.
- Local host port `5432` was already in use during verification, so live PostgreSQL verification used `POSTGRES_PORT=55432` with a matching `DATABASE_URL`.
- A first live database search attempt failed because the `.env` database port `5435` was not accepting connections before `make infra-up`; after starting compose and running `make db-migrate`, the live database search probe passed.
- A first `pnpm e2e` attempt timed out because an older BoxBrain dev server was already listening on port `3300`; after stopping that server and reusing the fresh production build, `pnpm e2e` passed.
- A parallel `pnpm --filter @boxbrain/web build` and `pnpm e2e` run caused a transient `.next` build artifact conflict; removing generated `.next` and rerunning build before E2E passed.
- LibreOffice is not currently installed on `PATH`, so live visual rendering remains unverified on this host. The renderer adapter and missing-renderer failure path are covered by automated tests, and live render verification is gated behind `BOXBRAIN_RUN_RENDER_TESTS=1`.
- The local compose stack is currently running after verification.

### Milestone 1 Closeout Commits

- `ad3c8b9` - `chore(progress): track milestone 1 ingestion completion`
- `3b94338` - `feat(ingestion): add ordered render outputs and telemetry`
- `aea5589` - `feat(persistence): expose embedding repository records`
- `9d3ecda` - `feat(web): surface ingestion outputs and work product filmstrip`
- `af11700` - `test(ingestion): cover milestone 1 renderer gates`

## Current Known Gaps

- SQLAlchemy read/write coverage now includes ingestion, comments/notes, restricted graph metadata, ContentUnit/WorkProduct search, review items, and similarity edges, but storyboard/content-block read paths still largely use the current in-memory-compatible repository shape.
- Live LibreOffice visual rendering has not been verified on this host because `soffice` is not installed; install LibreOffice and run the gated render test before pilot visual fidelity signoff.
- The worker queue is runnable and live-verified for deterministic PPTX ingestion, but richer queue aging/failure dashboards and long-running worker operations are still pending.
- ContentBlock search is still memory-backed; SQL-backed ContentBlock persistence/search remains pending.
- Frontend remains demo-backed for ContentBlocks, Storyboards, Publish/Package, Admin, Plays, and Opportunities; Ask, Library, ingestion, WorkProduct detail, ContentUnit detail, and Reviews now have API-backed foundations.
- Auth/RBAC is local/dev header based, not OIDC/SSO backed.
- Tenant/org membership and object/source visibility tables are still needed before pilot content; current visibility is conservative role-based restricted filtering.
- OpenAPI route alignment is improved, but generated client automation is not yet implemented.
- Build/export manifests, Plays, Opportunities, collections, and production publish/package workflows remain future work.

## Recommended Next Steps

1. Add SQL-backed ContentBlocks with create/search/insert flows.
2. Add Storyboard SQL-backed composition, slot insert/swap, anchored comments, diagnostics, and snapshot restore/detail UX.
3. Move candidate creation into ingestion/enrichment worker stages while keeping AI suggestions suggested-only until review.
4. Add AI output status linkage for accepted/rejected/generated review candidates.
5. Add tenant/org membership and object/source visibility tables while preserving the new role-based restricted filtering behavior.
6. Generate a typed frontend API client from OpenAPI and replace remaining demo data route by route.
7. Expand Playwright coverage for upload, job detail, search-to-detail, review action, storyboard snapshot, and restricted viewer flows.
8. Add admin ingestion/search/review health telemetry, job duration by stage, failure counts, and queue aging.
9. Install LibreOffice on a verification host and run `BOXBRAIN_RUN_RENDER_TESTS=1 uv run pytest -q tests/test_live_rendering.py` for live visual fidelity signoff.
10. Add production auth integration planning for OIDC/SSO while preserving local header-driven development mode.
