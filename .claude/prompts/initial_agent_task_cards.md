# BoxBrain v2 Initial Agent Task Cards

Use these cards as copy-ready prompts for Claude Code, Codex, or another repo-aware coding agent after the repository exists. Each task is intentionally bounded and includes acceptance criteria.

---

## Task 0 — Repository scaffold and contracts

**Goal:** Create the initial monorepo/app scaffold without implementing business logic.

**Agent prompt:**

```text
Read AGENTS.md, CLAUDE.md, docs/01_BoxBrain_v2_Final_PRD.md, docs/02_Initial_Implementation_Plan.md, and docs/03_Architecture_Data_API_Guide.md only as needed. Create the initial BoxBrain v2 repo scaffold with:
- Next.js + React + TypeScript frontend
- FastAPI backend
- PostgreSQL/pgvector-ready database config
- Redis worker placeholder
- MinIO/S3-compatible local storage config
- OpenAPI contract location
- SQL migration location
- shared docs folder

Do not implement ingestion, AI, or search yet. Add README instructions for local startup. Add smoke tests that prove frontend and backend boot.

Before editing, summarize your plan. After editing, run available tests/lint and report results.
```

**Acceptance criteria:**

- Repo has clear `apps/web`, `apps/api`, `workers`, `docs`, `migrations`, and `infra` or equivalent structure.
- Local services can be started from documented commands.
- Backend exposes `/health`.
- Frontend loads a placeholder shell.
- Test/lint commands exist even if minimal.

---

## Task 1 — Core database migration

**Goal:** Convert the starter SQL into production-shaped migrations.

**Agent prompt:**

```text
Read docs/03_Architecture_Data_API_Guide.md and implementation_assets/initial_db_schema.sql. Implement the first database migration for core BoxBrain entities:
- users/orgs placeholder if needed
- content unit families, variants, versions
- work product families, variants, versions
- content block families, variants, versions, members
- provenance records
- similarity edges
- comments, persistent comments, notes
- review items
- audit events

Preserve the domain invariants:
- ContentUnit is atomic.
- Family, variant, version are separate tables.
- Similarity is not variant identity.
- AI suggestions cannot silently set canonical.

Add database-level constraints where practical and API/domain tests where not practical.
```

**Acceptance criteria:**

- Migration runs cleanly on an empty database.
- Core tables have foreign keys, timestamps, state enums/checks, and indexes for common lookup paths.
- Unit/integration tests cover at least five core invariants.
- Audit/event tables exist for future state transitions.

---

## Task 2 — WorkProduct ingestion skeleton

**Goal:** Implement async ingest lifecycle without full PPTX parsing yet.

**Agent prompt:**

```text
Implement the MVP ingest lifecycle:
- POST /api/work-products/ingest accepts metadata and an uploaded file or object-storage reference.
- Persist a WorkProduct family/variant/version and ProvenanceRecord.
- Create an ingest job with status.
- Worker picks up job and produces placeholder ContentUnit records from a fixture extractor.
- Add GET /api/jobs/{id}.

Do not call external AI models yet. Make all processing deterministic and testable with fixtures.
```

**Acceptance criteria:**

- Ingest request returns within the target acknowledgement window.
- Job status transitions are recorded.
- Fixture deck creates deterministic content units with provenance back to source work product.
- Failed jobs can be retried safely.
- Tests cover idempotency and basic error paths.

---

## Task 3 — Family-first library UI

**Goal:** Build the first real product surface.

**Agent prompt:**

```text
Build the Library MVP UI using typed API data and mock/fixture data if backend endpoints are incomplete.

Required interactions:
- family-first ContentUnit view
- expand family to variants and latest versions
- toggle family/variant browse mode
- trust badges for approval/freshness/canonical/generated/manual-link/AI-link
- quick action placeholder: add to tray/storyboard
- empty/loading/error states

Use the Claude Design single-html output only as visual inspiration. Do not copy production code from it. Ensure accessibility for keyboard navigation and semantic labels.
```

**Acceptance criteria:**

- Library page renders family cards and expansion states.
- User can toggle between family-first and all-variants modes.
- Badges and counts render from data.
- Component tests cover expansion, toggle, and empty states.
- No hard-coded business object IDs outside fixtures.

---

## Task 4 — Hybrid search endpoint and Ask BoxBrain shell

**Goal:** Implement search architecture before advanced AI ranking.

**Agent prompt:**

```text
Implement the first hybrid search path:
- PostgreSQL full-text search over titles, extracted text, summaries, notes.
- pgvector column and query path, with fixture embeddings or deterministic placeholder vectors.
- scoring profile object that combines lexical, semantic, metadata, trust, freshness, and quality signals.
- GET/POST search endpoint that can group by object type and return explanations.
- Ask BoxBrain frontend shell with query box, filters, grouped mixed results, explanation chips, and add-to-tray placeholders.

Keep the ranking function inspectable and unit-tested. Do not hard-code opaque magic values without comments.
```

**Acceptance criteria:**

- Search returns ContentUnits, ContentBlocks, WorkProducts, and Plays when data exists.
- Result rows include score breakdown and explanation chips.
- Family-first grouping is supported.
- Tests cover lexical-only, vector-only placeholder, metadata filter, and approved-only profile.

---

## Task 5 — Review Hub duplicate/variant queue

**Goal:** Make human governance real early.

**Agent prompt:**

```text
Implement Reviews Hub MVP for duplicate and variant review:
- review_items table/API if not already present
- list queues for New Items, Duplicate Candidates, Variant Linking, Similarity Review, Stale Content, Approvals
- detail/compare panel using two candidate objects
- actions: mark-variant, mark-similar, not-duplicates, set-canonical request, approve/deprecate placeholder
- every action writes audit event and preserves AI rationale/confidence

Use command endpoints for mutation. Do not allow direct metadata mutation from the review page.
```

**Acceptance criteria:**

- Reviewer can resolve a duplicate candidate.
- Variant action creates a variant relationship only through validated command logic.
- Similarity action creates a SimilarityEdge and does not merge families.
- UI shows before/after state and rationale.
- Tests verify audit events for each action.

---

## Task 6 — Storyboard MVP

**Goal:** Build the primary composition surface.

**Agent prompt:**

```text
Implement Storyboard MVP:
- Storyboard, Snapshot, Section, Slot APIs.
- UI for section-based assembly.
- Add section, rename section, reorder section.
- Add gap slot, add ContentUnit slot, add ContentBlock slot.
- Slot cards show selected object, trust badge, version/variant label, comments count placeholder.
- Save snapshot.
- Snapshot preserves ordered sections and slots.

Keep WorkProduct/Play/Opportunity modes extensible, but implement WorkProduct mode first.
```

**Acceptance criteria:**

- User can create a storyboard with sections and slots.
- User can add a selected ContentUnit or ContentBlock to a slot.
- User can save and reload a snapshot with order intact.
- Storyboard actions are audited.
- Tests cover ordering, snapshot immutability, and required-slot behavior.

---

## Task 7 — Comment, persistent comment, and note separation

**Goal:** Implement the three annotation models without blurring them.

**Agent prompt:**

```text
Implement annotation APIs and UI components for:
- review comments: threaded, status open/resolved, version/snapshot-aware
- persistent comments: entity-level discussion, searchable, optionally pinned
- notes: durable curated editorial/governance knowledge

Add anchor types for family, variant, version, storyboard snapshot, section, slot, relationship edge. Add tests proving that resolving a review comment does not delete notes or persistent comments.
```

**Acceptance criteria:**

- Three annotation types have distinct API paths or explicit type handling.
- UI labels make the distinction clear.
- Search indexes notes and persistent comments.
- Audit events are written for note changes and review-comment resolution.

---

## Task 8 — AI recommendation stub with provenance

**Goal:** Create safe AI scaffolding before connecting production models.

**Agent prompt:**

```text
Create a deterministic recommendation service interface that can later be backed by model calls:
- taxonomy suggestion
- duplicate/similarity candidate generation
- storyboard section suggestions
- slot content recommendations

For now, use deterministic fixture logic. Every recommendation must include source, confidence, explanation, model/pipeline placeholder, and human review state. Do not auto-apply canonical changes.
```

**Acceptance criteria:**

- Recommendation records are persisted separately from accepted domain state.
- UI can display recommendation rationale and confidence.
- Accept/reject actions are explicit and audited.
- Tests prove recommendations do not silently alter canonical metadata.

---

## Task 9 — Publish/package placeholder

**Goal:** Prepare WorkProduct packaging without overbuilding export.

**Agent prompt:**

```text
Implement a publish/package checklist page for a WorkProductVersion:
- manifest summary
- trust and approval checklist
- provenance summary
- rights/compliance placeholder
- output options placeholder: PPTX, PDF, one-pager excerpt, collection
- validation results placeholder

Do not implement binary export unless explicitly in scope. The goal is to validate workflow and data dependencies.
```

**Acceptance criteria:**

- Publish page can load a WorkProductVersion and its manifest.
- Checklist shows blocking and non-blocking validation items.
- Publish action is disabled when required validation fails.
- Audit event is written for publish attempt.

