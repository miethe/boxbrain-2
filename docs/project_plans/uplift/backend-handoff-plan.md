---
title: Backend Shortfall Handoff Plan
date: 2026-07-07
status: planned
---

# BoxBrain v2 — Backend Shortfall Handoff Plan

Handoff plan for the six `large_shortfalls` in `docs/project_plans/uplift/audit-full.json`
(`backend.large_shortfalls`). Written for whichever future session(s) pick this work up — each
phase below is meant to be independently claimable, shippable, and testable without the others.

**Baseline:** `pnpm verify` green (frontend lint/typecheck/test/build + backend ruff/mypy/pytest,
63 backend tests passed / 3 gated skipped per
`docs/project_plans/implementation_reports/boxbrain-v2-mvp-initial-implementation.md`); Alembic
chain is linear `20260503_0001` → `20260505_0005`, sourced from `infra/initial_db_schema.sql`.

**Relationship to other tracked work:** `backend.quick_fixes` in `audit-full.json` (pagination
wiring, review-candidates request body, assets.py visibility+key-index, CORS env config, dead
`get_actor` removal) is a separate, smaller track (see `docs/project_plans/uplift/uplift-plan.md`
wave B2) and is assumed to land independently. Where a quick fix is the literal entry point of a
capability below (e.g. the review-candidates request body is capability 2's front door), it is
referenced for continuity, but its actual implementation may already be done by the time a session
picks up the phase that depends on it — check `git log`/current `use_cases.py` before re-doing it.
One `contract_drift` item has no quick-fix owner and is folded into capability 1 below: `GET
/api/admin/audit-events` is live end-to-end (route + use-case + OpenAPI) but nothing in
`apps/web/lib/api.ts` calls it.

---

## 1. Source-aware visibility + real RBAC

### a) Current state

- `Actor` (`services/api/app/domain/models.py:19-21`) is `{user_id: str, role: str}` — no
  tenant/org/source field anywhere in the domain model.
- Two divergent `get_actor` implementations exist: `app/api/dependencies.py:16-25` (wired into
  every route via `Depends`) and `app/dependencies.py:46-53` (dead — nothing imports it, different
  header-default semantics). Both simply trust client-supplied `X-BoxBrain-User`/`X-BoxBrain-Role`
  headers with no auth backing them.
- `apps/web/lib/api.ts:613` hardcodes `headers.set("x-boxbrain-user", ... ?? "admin")` with no
  in-app role switcher, so restricted-visibility code paths are never exercised end-to-end by
  anyone using the app as shipped.
- Visibility is a single `restricted` boolean per family/version: `content_unit_families.restricted`
  (`infra/initial_db_schema.sql:147`), `content_unit_versions.restricted` (line 184), plus the
  work-product/content-block equivalents. Enforcement is centralized and consistent:
  `app/domain/policies.py:16-17` (`can_view_restricted` = role in `{curator, reviewer, admin}`) and
  `use_cases.py`'s `_can_access_family`/`_can_access_version`/`_can_access_block`/
  `_can_access_storyboard(_snapshot)`/`_can_access_work_product_*`/`_can_access_target`
  (`use_cases.py:2373-2472`) — this dispatcher is well-factored and is the thing every new
  capability below should reuse rather than re-implement.
- `services/api/app/api/routes/assets.py` (21 lines total) never calls `get_actor` and never
  checks `restricted` — it linear-scans `stored_objects` by `metadata["key"]` and streams bytes to
  anyone who knows or guesses a key. Every JSON endpoint filters restricted objects; this raw-bytes
  path does not.
- No tenant/org membership table, no per-source ACL. A `users` table exists
  (`infra/initial_db_schema.sql:36-43`: id/email/display_name/role) but has zero ORM row in
  `db_models.py`, zero repository method, zero use-case — it is pure unused DDL.
- Auth is local/dev header-based only; no OIDC/SSO integration path exists yet.
- `GET /api/admin/audit-events` (contract-drift item, no quick-fix owner) is fully implemented
  end-to-end but `apps/web/lib/api.ts` never calls it — the Admin dashboard only reads aggregated
  counts off `AdminHealth.reviewAudit`. Closest home is here since it's part of the audit/RBAC
  story.

### b) Target end-state

PRD `docs/project_plans/init/01_BoxBrain_v2_Final_PRD.md` §7.9 requires role-based access enforcement today and is
explicit that the system must be "future-proof for source-aware permissions" — i.e. per-source/org
ACL, not just role. Implementation report's Recommended Execution Order #1 names this as the
top-priority next slice, with exit gate: "Tenant/org membership, object/source visibility tables,
and RBAC enforcement apply across outputs." Target: a real `users` row wired to org/source
membership, visibility checks extended from role-only to role+membership, an in-app role/actor
switcher for pilot rehearsal, the `assets.py` leak closed, and (eventually) auth backed by a real
identity provider instead of trusted headers.

### c) Phased implementation outline

**Phase 1 (S) — Close the leak, kill dead code, add a role switcher.** No schema change.
- Add `get_actor` + a restricted-object check to `app/api/routes/assets.py` (deny, or require
  reviewer+, when the owning version/family is restricted).
- Delete `app/dependencies.py::get_actor` or replace it with a comment redirecting future edits to
  `app/api/dependencies.py::get_actor`.
- Add a dev-only in-app role/actor switcher in `apps/web` (banner or dropdown) so restricted paths
  get exercised by testers before pilot content loads.
- Tests: assets restricted-object denial case; extend `tests/test_milestone2_visibility_api.py`.

**Phase 2 (M) — Wire the real `users` table + session identity stepping-stone.**
- Add a `UserRow` ORM model + repository reload/save methods (currently missing entirely).
- Resolve `Actor` from a real user lookup instead of an arbitrary header string (still header/dev
  auth, but backed by a row) — a stepping stone toward Phase 4.
- Wire `GET /api/admin/audit-events` into the frontend Admin dashboard (or a dedicated audit view)
  so the folded-in contract-drift item stops being dead capability.

**Phase 3 (L) — Tenant/org + source-scoped visibility.**
- Design `organizations`/`org_memberships` and `sources` tables; add `source_id`/`org_id` FKs to
  `content_unit_families/variants/versions` (and work-product/content-block equivalents)
  *alongside*, not replacing, the existing `restricted` boolean, since seed/tests depend on it.
- Extend `can_view_restricted`/`_can_access_*` to check org membership + source ACL in addition to
  role.
- Migration + backfill assigning existing seeded/ingested rows to a default org/source.

**Phase 4 (XL, likely deferred) — OIDC/SSO-ready auth.**
- Auth-provider abstraction (OIDC discovery + token validation middleware) resolving `Actor` + org
  membership from a validated session, with header-based dev auth retained behind a flag for local
  work/tests. `07_Risks_Decisions_Open_Questions.md` §5 places "SSO and permission model validated"
  under the *Production* go/no-go gate, not MVP pilot — treat this phase as optional/last and gate
  its start on open question #18 ("Which auth provider/SSO should be targeted first?").

### d) Dependencies/sequencing vs. the other five

- Must land (at least Phase 1) before Collections (capability 4), which needs the same
  `_can_access_target` filtering the audit calls out explicitly.
- Phase 3's new tables should be sequenced after capability 6 Phase 2 (missing `_refresh_repository`
  call sites fixed) so the new visibility tables don't inherit the "only refreshed on some mutation
  paths" inconsistency.
- Independent of capabilities 2, 3, 5.

### e) Risks/decisions + recommendation

- Risk R007 (permissions leak restricted content) applies directly to every phase here —
  additive-only schema changes, extend `tests/test_search_permissions.py` /
  `tests/test_milestone2_visibility_api.py` before/after each phase rather than after all of them.
- Recommendation: ship Phases 1-3 as the "pilot-ready" bar (satisfies MVP pilot go/no-go's "Basic
  RBAC is enforced"); explicitly do not block pilot readiness on Phase 4 — flag it as a distinct
  Production go/no-go milestone pending an auth-provider decision.

### f) Size

Phase 1: S · Phase 2: M · Phase 3: L · Phase 4: XL (defer)

---

## 2. AI enrichment workers / real candidate generation

### a) Current state

- `_deterministic_review_candidates()` (`use_cases.py:2134-2218`) is a synchronous O(n²)
  pairwise text-similarity sweep over every `ContentUnitVersion`, run inline inside
  `generate_review_candidates()` (`use_cases.py:1381-1409`) on every
  `POST /api/reviews/candidates/generate` call. No background job, no embedding/LLM signal — this
  despite deterministic embeddings already existing per ContentUnit/WorkProduct version
  (`embeddings` table; `_stored_embedding` helper at `use_cases.py:2012`).
- `app/api/routes/reviews.py:31-36` declares no request body for that route; the frontend's
  `generateReviewCandidates` posts `{queueType, query, limit}` that is silently dropped (this is
  quick-fix-tracked, but it is capability 2's front door — see the note at the top of this doc).
- `ai_outputs` (`infra/initial_db_schema.sql:503-517`) has a real ORM row,
  `AIOutputRow` (`app/infrastructure/db_models.py:430-443`), and a domain helper module,
  `app/domain/ingestion_search/ai_candidates.py` (`create_ai_review_candidate`/
  `to_ai_output_record`), that already encodes the suggested-only invariant — but these are three
  disconnected islands. Grep confirms zero references to `AIOutputRow` in
  `sqlalchemy_repository.py`'s `reload()`/`save_*` methods, and zero imports of `ai_candidates.py`
  helpers anywhere in `use_cases.py`. AI-output provenance/model/confidence metadata (CLAUDE.md rule
  #6) has nowhere to actually persist today, despite the scaffolding existing.
- Ingestion worker (`services/worker/boxbrain_worker/main.py:35-43`) runs the full deterministic
  PPTX pipeline synchronously via `BoxBrainUseCases.process_ingestion_job`, dispatched through a
  single `"boxbrain-ingestion"` RQ queue (`app/infrastructure/queue.py`). The `WorkerStep` enum
  (`app/domain/ingestion_search/models.py:29-36`) already defines `ENRICH_UNITS`/
  `DETECT_CANDIDATES` stages, and `IngestionStage` includes `ENRICHED`/`REVIEW_READY` — but
  `process_ingestion_job` never actually runs an enrich/detect-candidates stage. Candidate
  generation only happens via the separate, on-demand reviews endpoint above.

### b) Target end-state

PRD §7.1 ingestion requirements: "Produce AI enrichment suggestions for title, summary, taxonomy,
duplicates, variants, and similarity candidates" and "Route uncertain links to review queue instead
of silently merging." PRD MVP release definition item #9: "AI suggestions are traceable and
reviewable." Implementation report Recommended Execution Order #3: move candidate creation into
ingestion/enrichment worker stages, emitting suggested AI outputs and review items without
auto-applying graph changes. Target: candidate generation runs incrementally in an async enrichment
stage keyed off existing embeddings, persists through a real `ai_outputs` repository path, and
review items carry a status-linked reference back to their originating `ai_outputs` row
(implementation report Recommended Next Steps #5).

### c) Phased implementation outline

**Phase 1 (S/M) — Wire the request body + connect `ai_outputs` plumbing (no algorithm change).**
- Add a `ReviewCandidateGenerateRequest {queueType, query, limit}` schema, thread it through
  `routes/reviews.py` and `use_cases.generate_review_candidates` so the endpoint stops ignoring its
  payload.
- Wire `AIOutputRow` into `sqlalchemy_repository.py` (`reload()` + a new `save_ai_output`), and call
  `ai_candidates.py`'s `create_ai_review_candidate`/`to_ai_output_record` from
  `_build_review_candidate` (`use_cases.py:2220`) so every generated `ReviewItem` also persists a
  suggested-only `ai_outputs` row.
- Add an `ai_output_id` linkage (column or join table) on `review_items` so accept/reject actions
  update `ai_outputs.status`/`reviewed_by`/`reviewed_at`.

**Phase 2 (M) — Replace O(n²) text-Jaccard with embedding-based scoring.**
- Score candidates using the existing pgvector `embeddings` rows / `deterministic_text_embedding`
  instead of a full pairwise text scan, scoped by the Phase 1 `queueType`/`limit`/`query` filters.
  Keep the deterministic/test-safe embedding abstraction so tests stay hermetic.

**Phase 3 (L) — Move candidate generation into the ingestion worker (async, incremental).**
- Add an `ENRICH_UNITS`/`DETECT_CANDIDATES` stage to `process_ingestion_job` that runs
  incrementally (new/changed versions since a `last_enriched_at` marker, not a full rescan),
  emitting `ai_outputs` + `review_items` automatically per ingested WorkProduct. Report stage
  status/duration via the existing `_mark_ingestion_stage` telemetry (`use_cases.py:2563`). Keep the
  manual `POST /api/reviews/candidates/generate` endpoint as an operator-triggered full
  rescan/backfill path.

**Phase 4 (M) — Summary/taxonomy AI outputs beyond candidates.**
- Extend `ai_outputs` usage to `AIOutputType.SUMMARY`/`TAXONOMY` (enum already defines these),
  surfaced as reviewable suggestions on ContentUnit detail, not just the duplicate/variant/
  similarity/stale/approval queues.

### d) Dependencies/sequencing vs. the other five

- Phase 3's worker-side writes should follow capability 6 Phase 1 (single-worker pinning) — an
  async worker writing through the same cached-repository pattern as a multi-process API is exactly
  the divergence scenario capability 6 flags.
- Phase 1/2 are independent of capabilities 1, 3, 4, 5 and can start immediately.
- Phase 1's new request schema is exactly the kind of change capability 5's Phase 1 contract test
  should catch going forward — sequence capability 5 Phase 1 no later than in parallel with this.

### e) Risks/decisions + recommendation

- Risk R003 (AI suggestions damage graph quality): every phase must preserve the existing
  invariant that `_build_review_candidate`/`_deterministic_review_candidates` never mutate the
  graph directly — only append suggested rows.
- Decision needed: what "changed since last enrichment" means for Phase 3's incremental scan (new
  versions only vs. re-diffing on freshness/approval-state change). Recommend scoping to new/
  updated versions via a `last_enriched_at` marker to avoid reintroducing O(n²) cost at pilot scale.
- Recommendation: do Phase 1 and 2 before Phase 3 — they fix the audit's headline "silently
  ignoring the payload" bug cheaply and de-risk the scoring logic before it moves into an async
  worker context.

### f) Size

Phase 1: S/M · Phase 2: M · Phase 3: L · Phase 4: M

---

## 3. Build/export/publish manifest workflow

### a) Current state

- `build_manifests`/`build_manifest_slots` (`infra/initial_db_schema.sql:357-378`) are created by
  migration `20260503_0001_initial_schema.py`. `work_product_version_id`/`storyboard_snapshot_id`
  FKs already point at exactly the two objects (immutable Storyboard snapshots + WorkProduct
  versions) a manifest needs.
- Zero ORM models: `db_models.py`'s 24 row classes include none for build manifests. Zero
  repository/use-case/route/OpenAPI surface — grep for `build_manifest`/`BuildManifest` across
  `services/api/app` returns nothing outside the raw SQL migration.
- The frontend Publish/Package route remains entirely demo-data (implementation report: "Frontend
  remains demo-backed for Publish/Package, Plays, and Opportunities").
- The domain already has what a manifest needs: `Storyboard`/`StoryboardSnapshot`/
  `StoryboardSection`/`StoryboardSlot` (`app/domain/models.py:185-227`), with
  `StoryboardSlot.selected_object_type`/`selected_object_id` mapping 1:1 onto
  `build_manifest_slots.selected_object_type`/`selected_object_id`. Snapshot creation already does
  the deep-copy pattern a manifest would reuse (`create_storyboard_snapshot`, `use_cases.py:1086`).

### b) Target end-state

PRD §10.3: "Every published or versioned WorkProduct composition should be reproducible through a
build manifest. MVP should create manifest-compatible records even if package generation is
deferred." PRD §12 (future roadmap) explicitly places "Export to PPTX/PDF" and "Package checklist"
in the phase *after* Plays and OpportunityWorkspaces — real export generation is not MVP/pilot
scope. Implementation report Recommended Execution Order #5 sequences this last precisely because
its dependencies (Storyboard snapshots, WorkProducts, storage) already exist. Target: manifest
records + a governed preview/checklist, not a real exporter.

### c) Phased implementation outline

**Phase 1 (M) — BuildManifest domain + ORM + snapshot-to-manifest use case.**
- Add `BuildManifest`/`BuildManifestSlot` dataclasses to `domain/models.py`, ORM rows to
  `db_models.py`, and repository reload/save methods to `sqlalchemy_repository.py` (plus
  in-memory equivalents in `in_memory_repository.py` for test parity).
- Add `create_build_manifest(storyboard_snapshot_id, actor)` that deep-copies a snapshot's
  sections/slots into `build_manifest_slots` (order preserved via `order_index`), mirroring
  `create_storyboard_snapshot`.
- Add routes + OpenAPI operations: `POST /api/build-manifests`, `GET /api/build-manifests/{id}`.

**Phase 2 (M) — Governed package/export preview (no real file generation).**
- Add `GET /api/build-manifests/{id}/preview` returning an ordered, resolved-object checklist
  (title, render/thumbnail URIs, approval/freshness/restricted state) per PRD §10.3's
  "manifest-compatible records even if package generation is deferred."
- Filter the preview through `_can_access_target` (`use_cases.py:2452`) since it surfaces
  thumbnails/render URIs.

**Phase 3 (S/M) — Wire the Publish/Package frontend route to real data.**
- Replace demo-backed Publish/Package with build-manifest list/detail/preview calls; add a
  "create manifest from this snapshot" action on the Storyboard workspace.

**Phase 4 (L, explicitly out of scope for this handoff) — Real PPTX/PDF export.**
- PRD roadmap places this after Plays/OpportunityWorkspaces. Do not build; stop at Phase 3's
  governed preview.

### d) Dependencies/sequencing vs. the other five

- No hard blocking dependency — Storyboard snapshots and WorkProduct versions already exist, so
  this can start immediately.
- Sequence after capability 1 Phase 1 (assets.py fix) — the preview endpoint surfaces the same
  render/thumbnail URIs capability 1 is closing the leak on; building it before that fix reintroduces
  the same problem on a new surface.
- Benefits from capability 5 Phase 1 (contract test) already landed so the new routes ship
  contract-tested from day one.

### e) Risks/decisions + recommendation

- Decision: explicitly scope Phase 4 (real export) out of this handoff; PRD roadmap gates it behind
  Plays/OpportunityWorkspaces. Recommendation: stop at the governed preview (Phase 2) for MVP/pilot.
- Risk: low for capability 6's cache-staleness bug here specifically, since manifests reference only
  immutable objects (snapshots, versions) — still, build the new repository paths using whichever
  pattern capability 6 Phase 3 recommends rather than adding an eighth ad hoc cached collection.

### f) Size

Phase 1: M · Phase 2: M · Phase 3: S/M · Phase 4: L (deferred, out of scope)

---

## 4. Collections (saved content)

### a) Current state

- `collections`/`collection_members` (`infra/initial_db_schema.sql:551-568`: title/description/
  created_by; member_type/member_id/order_index) exist in SQL only — no `db_models.py` rows, no
  domain dataclasses, no use-case, no routes.
- PRD §7.2 Library requirements list Collections as a Library content-type tab and require "saved
  collections and temporary selection tray" — explicitly called out as missing in the
  implementation report's Library row ("Saved collections... remain").
- `apps/web`'s existing client-side "selection tray" (per `uplift-plan.md` wave 0.5, My Selection
  provider) is the ephemeral counterpart Collections should persist.

### b) Target end-state

PRD §7.2: Collections as a first-class Library tab; users save/bookmark ContentUnits,
ContentBlocks, and WorkProducts into named collections and browse them like other library content.
Audit plan_hint: treat as a net-new, family/variant-agnostic saved-refs slice, applying the same
restricted-object filtering as everything else once it exists.

### c) Phased implementation outline

**Phase 1 (M) — Collection domain + ORM + CRUD routes.**
- Add `Collection`/`CollectionMember` dataclasses, `db_models.py` rows, repository reload/save
  methods (memory + SQL). Routes: `POST /api/collections`, `GET /api/collections`,
  `GET /api/collections/{id}`, `POST /api/collections/{id}/members`,
  `DELETE /api/collections/{id}/members/{member_id}`.
- `member_type`/`member_id` is polymorphic — reuse `_can_access_target(target_type, target_id,
  actor)` (`use_cases.py:2452`) to validate and filter membership by type instead of inventing a new
  addressing scheme.

**Phase 2 (S) — Restricted-object filtering on collection reads.**
- Filter `collection_members` list output through `_can_access_target` so a viewer never sees a
  restricted member surfaced via a collection they can otherwise see (mirrors the R007 mitigation
  already applied to search/where-used/similar).

**Phase 3 (S/M) — Frontend Library "Collections" tab + save/add-to-collection actions.**
- Add the Collections tab to Library (PRD §7.2 tab list: ContentUnits, ContentBlocks,
  WorkProducts, Plays, Collections, Reviews) and "add to collection" actions from search result
  cards and detail pages (PRD §7.3).

### d) Dependencies/sequencing vs. the other five

- Sequence after capability 1 Phase 1 (assets fix landed) so Phase 2 here reuses an already-hardened
  filtering pattern rather than testing it twice, though this is not a hard blocker.
- Independent of capabilities 2, 3, 6. Can run in parallel with capability 5.

### e) Risks/decisions + recommendation

- Decision: keep collections family/variant-agnostic (save a specific version, not a family), per
  the audit's plan_hint and matching how comments/notes already target `target_type`/`target_id`
  polymorphically.
- Lowest risk of the six shortfalls; no open PRD question blocks it.

### f) Size

Phase 1: M · Phase 2: S · Phase 3: S/M

---

## 5. Generated/typed frontend API client from the OpenAPI contract

### a) Current state

- `apps/web/lib/api.ts` is a ~1,123-line hand-maintained client with no codegen step and no CI
  check against `contracts/openapi/boxbrain.v2.yaml` (1,680 lines).
- Root `package.json`'s `openapi:check` script is a trivial regex assertion that the yaml file
  starts with `openapi: 3.1.0` — it validates nothing about endpoint/schema alignment.
- Root `package.json`'s `types:generate` is `pnpm -r --if-present types:generate`, a pass-through;
  neither `apps/web/package.json` nor `services/api` define that script, so it is a documented
  no-op today (implementation report: "`pnpm types:generate` passed with no package-specific
  generators configured").
- This absence of any cross-check is exactly why the pagination and candidate-generation contract
  drift in `audit-full.json` exists undetected — two independently hand-written surfaces (yaml,
  `api.ts`) with nothing forcing agreement.

### b) Target end-state

Implementation report Dependency Notes: "Update `contracts/openapi/boxbrain.v2.yaml` with every
API change, then generate typed frontend types/client." Recommended Execution Order #4: "Generated/
checked client path replaces manual route-by-route DTO drift." Target: a codegen step wired into
`pnpm types:generate`, either fully replacing `api.ts`'s hand-written functions or, at minimum, a
CI-enforced contract test that fails the build when a route's params/response shape diverges from
the yaml.

### c) Phased implementation outline

**Phase 1 (S) — Contract test as an immediate stop-gap.**
- Add a script that walks FastAPI's route table (via the app's `/openapi.json` at test time, or a
  static walk of `app/api/routes/*.py`) against `contracts/openapi/boxbrain.v2.yaml` and asserts
  every path+method exists in both with matching query params — this catches today's exact bug
  class (silently dropped `cursor`/`limit`/`mode` params) without waiting for full codegen.
- Wire into `pnpm verify` alongside the existing trivial `openapi:check`.

**Phase 2 (M) — Generate typed request/response models (types only, not the client).**
- Add an openapi-typescript-style generation step producing
  `apps/web/lib/generated/openapi-types.ts` from the yaml, wired to the currently-no-op
  `types:generate` script in `apps/web/package.json`.
- Re-type `api.ts`'s existing hand-written functions against the generated types (functions stay,
  drift becomes a compile error).

**Phase 3 (L) — Generate the fetch client itself.**
- Replace hand-rolled request functions in `api.ts` with generated client calls, route by route,
  keeping existing exported function names/signatures stable so call sites in
  `apps/web/app/**/*.tsx` don't need to change. Retire manual fetch/JSON boilerplate per route once
  parity is confirmed.

**Phase 4 (S) — CI gate.**
- Make the Phase 1 contract test (or a build-time codegen-diff check once Phase 3 lands) a required
  `pnpm verify` step so future API changes cannot ship without updating both the yaml and the
  client.

### d) Dependencies/sequencing vs. the other five

- Phase 1 should start early — ideally landing before or in parallel with the first phase of
  capabilities 1, 3, and 4 so their new routes (assets fix, build manifests, collections) are
  contract-tested from day one.
- Phase 2/3 (full codegen) should follow after capabilities 3 and 4 add their new routes, covering
  the full route set in one pass instead of twice.

### e) Risks/decisions + recommendation

- Decision: pick the codegen tool now (types-only generator vs. a full client generator).
  Recommend types-only first (Phase 2) — lower risk, faster to land — deferring full-client
  replacement (Phase 3) until the API surface stabilizes post capabilities 1–4.
- Risk: a full client swap (Phase 3) touching every route risks regressing the demo-data fallbacks
  several routes still have (per implementation report). Recommend a route-by-route swap backed by
  existing Vitest/Playwright coverage, not a big-bang replacement.

### f) Size

Phase 1: S · Phase 2: M · Phase 3: L · Phase 4: S

---

## 6. Multi-process/multi-worker DB-mode correctness

### a) Current state

- `SqlAlchemyBoxBrainRepository` (`app/infrastructure/sqlalchemy_repository.py`) is architecturally
  an in-memory read-model cache: dict attributes populated by `reload()` (line 328+), called once
  at process startup (`app/dependencies.py:21`, `seed=False`) and then ad hoc only via
  `_refresh_repository()` (`use_cases.py:2811-2814`) before storyboard/content-block/review
  mutations (call sites at lines 1035-1242 and 1381-1455) — **not** before content-unit approval/
  canonical/freshness mutations (~846-895) or comment/note creation (~1297-1381).
- `reload()`'s dict population uses `.update(...)` merge semantics (confirmed at lines 343-391 for
  `provenance_records`/`ingestion_jobs`/`content_unit_families`/etc.) — adds/overwrites but never
  removes, so rows deleted directly in Postgres out-of-band keep appearing as present in a running
  process until restart.
- Running more than one API worker process against the same Postgres lets each process's cache
  diverge (stale reads, lost sibling-process updates) — no shared invalidation or pub/sub exists.
- No connection pool sizing is exposed in `config.py`/`database.py` (`create_engine` uses SQLAlchemy
  defaults); combined with `reload()`'s broad SELECT-everything pattern triggered by ordinary
  mutation requests, concurrent pilot load could exhaust the pool or slow full reloads well before
  real data volume grows.
- `repository` is a module-level singleton built at import time (`app/dependencies.py:15-23`);
  `SqlAlchemyBoxBrainRepository.__init__` calls `reload()` immediately, which SELECTs from tables
  that must already exist. `infra/docker-compose.app.yml` correctly gates on migration completion,
  but a bare `uvicorn` invocation without `alembic upgrade head` first crashes hard at import with
  no graceful wait or remediation message.
- A fresh containerized stack boots `BOXBRAIN_REPOSITORY=database` with `seed=False`
  (`app/dependencies.py:21`) and no seed/fixture script equivalent to the in-memory `seed()`
  fixture — a fresh stack is empty until someone manually ingests a deck.
- `BOXBRAIN_DB_SCHEMA` (`config.py:49-58`) only adjusts `search_path`/`version_table_schema`;
  migration `0001` unconditionally runs `CREATE EXTENSION IF NOT EXISTS vector`/`uuid-ossp` — this
  interaction with a non-default schema is untested.

### b) Target end-state

Not a named PRD product requirement, but foundational to every other capability's go/no-go:
`07_Risks_Decisions_Open_Questions.md` §5 requires "Core E2E flows pass" for MVP pilot and
"Performance tested at expected corpus size" for production — neither is credible with a per-process
cache that can silently diverge. Implementation report's own remaining-work note: "continue moving
high-volume read paths toward direct SQL queries where needed." Target: either (a) remaining read
paths move to direct SQL queries per request, removing the cache's correctness risk, or (b) the API
is explicitly pinned to a single worker/process for the pilot with that constraint documented
everywhere it matters, until (a) lands.

### c) Phased implementation outline

**Phase 1 (S) — Document/enforce single-worker now; ship the missing seed script.**
- Pin `uvicorn`/gunicorn worker count to 1 everywhere `BOXBRAIN_REPOSITORY=database` is used
  (Dockerfile CMD, `docker-compose.app.yml`, Makefile `api-db`/`app-*` targets); log a startup
  warning if `workers>1` is detected in database mode.
- Document the constraint in `docs/deployment/containerized-quick-start.md`.
- Add a Postgres seed/fixture script (`make seed-db`) mirroring the in-memory `seed()` fixture so a
  fresh containerized stack isn't empty for demos/smoke tests — independent of the caching fix, can
  ship in this same phase.

**Phase 2 (M) — Fix `reload()` merge semantics + missing refresh call sites.**
- Change `reload()`'s dict population to a full replace (or explicit diff-and-remove against known
  IDs) so out-of-band deletes don't linger as phantom rows.
- Add `_refresh_repository()` calls before content-unit approval/canonical/freshness mutations and
  comment/note creation, matching the coverage storyboard/review mutations already have.
- Add connection pool sizing config (`pool_size`/`max_overflow` env vars) to `config.py`/
  `database.py`.

**Phase 3 (L) — Move remaining high-volume read paths to direct SQL queries.**
- Identify which repository read paths are still full-table-scan-via-cache (e.g.
  `list_content_unit_families`, search fallback paths) and convert them to targeted, filtered/
  paginated SQL queries. This is also a prerequisite for capability 1's/quick-fix's pagination work
  to be real at scale — cursor/limit only matter once the query layer can apply them in SQL rather
  than slicing an in-memory list. Once enough paths are direct-SQL, the `reload()` cache can shrink
  to whatever write-adjacent bookkeeping it still needs.

**Phase 4 (M) — Startup robustness.**
- Add retry/backoff around the initial `reload()`/engine connection at import time
  (`app/dependencies.py`) so a standalone `uvicorn` invocation without a prior
  `alembic upgrade head` fails with a clear remediation message instead of a raw traceback.
- Add a migration test verifying `BOXBRAIN_DB_SCHEMA` + `CREATE EXTENSION` interaction on a
  non-default schema.

### d) Dependencies/sequencing vs. the other five

- Cross-cutting prerequisite: capabilities 3 (build manifests) and 4 (collections) add new
  repository read/write paths — decide their persistence pattern using whatever this capability's
  Phase 3 recommends, rather than adding two more inconsistent caches.
- Capability 2 Phase 3 (async enrichment worker) depends on this capability's Phase 1 (single-worker
  pinning) landing first.
- Capability 1 Phase 3 (tenant/org schema) should follow this capability's Phase 2 (refresh
  call-site coverage).

### e) Risks/decisions + recommendation

- Decision: choose (a) full direct-SQL migration vs. (b) a permanent single-worker pin.
  Recommendation: do Phase 1 (pin + seed script) immediately regardless — it's cheap and unblocks
  safe pilot demos — then commit to (a) as the real fix (Phase 3), since pilot-scale concurrent load
  is an explicit go/no-go gate item a permanently single-worker API cannot satisfy.
- Risk: Phase 2 touches the most frequently exercised code path in the backend. Run the full pytest
  suite plus the gated live-ingestion tests (`BOXBRAIN_RUN_LIVE_TESTS=1`) after each change, not
  just unit tests.

### f) Size

Phase 1: S · Phase 2: M · Phase 3: L · Phase 4: M

---

## Recommended session sequencing

| # | Focus | Capability · Phase(s) | Size | Why this order |
|---:|---|---|---|---|
| 1 | Stop-gap safety fixes | Cap 6 P1 (single-worker pin + seed script) + Cap 1 P1 (assets fix + dead `get_actor` + role switcher) | S+S | No schema changes; unblocks safer pilot demos immediately |
| 2 | Contract-drift tripwire | Cap 5 P1 (route/yaml contract test in `pnpm verify`) | S | Land before other capabilities add new routes so drift is caught from day one |
| 3 | Enrichment entry point | Cap 2 P1 (request body wiring + `ai_outputs` plumbing + review-item linkage) | S/M | Fixes the audit's headline "silently ignored payload" bug; unlocks Phase 2/3 |
| 4 | Cache-correctness fix | Cap 6 P2 (`reload()` merge fix + missing refresh call sites + pool sizing) | M | Must land before Caps 1P3/3/4 add more repository surface |
| 5 | Collections slice | Cap 4 P1+P2 (domain/ORM/routes + restricted filtering) | M | Small, independent, PRD-named MVP gap; reuses hardened `_can_access_target` |
| 6 | Build manifest core | Cap 3 P1 (domain/ORM + snapshot-to-manifest use case + routes) | M | No blocking dependency; snapshots + WorkProducts already exist |
| 7 | RBAC stepping-stone | Cap 1 P2 (real `users` table + session identity + audit-events UI wiring) | M | Prep before tenant/org schema (P3) |
| 8 | Candidate quality | Cap 2 P2 (embedding-based scoring, replacing O(n²) text scan) | M | Independent of schema work; de-risks logic before it moves into a worker (P3) |
| 9 | Manifest preview + UI | Cap 3 P2+P3 (governed preview endpoint + Publish/Package frontend wiring) | M+S/M | Completes PRD §10.3 "manifest-compatible records" scope |
| 10 | Typed contracts | Cap 5 P2 (generated OpenAPI types wired into `types:generate`) | M | Covers the by-then-larger route set (collections, manifests) in one pass |
| 11 | Async enrichment | Cap 2 P3 (move candidate generation into ingestion worker ENRICH/DETECT stage) | L | Depends on Cap 6 P1 (already landed session 1) |
| 12 | Tenant/org visibility | Cap 1 P3 (org/source schema + policy extension) | L | Depends on Cap 6 P2 (session 4) |
| 13 | Direct-SQL migration | Cap 6 P3 (remaining high-volume read paths off the cache) | L | Structural fix; can run as its own dedicated multi-session track |
| 14 | Full generated client | Cap 5 P3+P4 (fetch client replacement + CI gate) | L+S | Do once the API surface (post Caps 1/3/4 new routes) has stabilized |
| 15 | Polish backlog | Cap 2 P4 (summary/taxonomy outputs) + Cap 4 P3 (frontend Collections tab) + Cap 6 P4 (startup retry/backoff) | M+S/M+M | No hard sequencing constraint; schedule opportunistically |
| — | Deferred, not scheduled | Cap 1 P4 (OIDC/SSO) + Cap 3 P4 (real PPTX/PDF export) | XL / L | PRD roadmap places both after Plays/OpportunityWorkspaces — revisit only when product decides to invest there |
