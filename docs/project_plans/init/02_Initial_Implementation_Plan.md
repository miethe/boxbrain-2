# BoxBrain v2 Initial Implementation Plan

**Prepared on:** 2026-05-02  
**Planning horizon:** MVP foundation through first pilot  
**Recommended build style:** API-first, contract-driven, agent-assisted, test-gated  

---

## 1. Implementation strategy

Build BoxBrain v2 as a governed graph library first, then layer composition and orchestration on top. The fastest path to a credible product is not to implement every visionary surface at once; it is to make the core content identity model real and usable:

1. **Ingest and decompose work products.**
2. **Represent slide/page units as governed ContentUnits.**
3. **Make family/variant/version visible and actionable.**
4. **Deliver search and family-first browsing.**
5. **Add review queues and trust indicators.**
6. **Build Storyboard as the first composition workspace.**
7. **Only then expand into Plays, OpportunityWorkspaces, and packaging.**

This plan assumes the Claude Design single-HTML UI is a strong visual reference but not production code. The production implementation should recreate the design through durable components, typed data contracts, and accessible interaction patterns.

---

## 2. Recommended team shape

A small, focused team can build the MVP efficiently if the product boundaries stay crisp.

| Role | Primary responsibility | Minimum allocation |
|---|---|---|
| Product/technical owner | Scope, acceptance criteria, model decisions, review | 0.5–1.0 |
| Full-stack lead | Architecture, repo setup, API contracts, integration | 1.0 |
| Backend/data engineer | FastAPI, ingestion, data model, workers, search | 1.0 |
| Frontend engineer | Next.js, component system, Library, Storyboard, Reviews | 1.0 |
| AI/search engineer | enrichment, embeddings, ranking, duplicate/similarity workflows | 0.5–1.0 |
| Design/product reviewer | translate Claude Design into production flows, UX QA | 0.25–0.5 |
| QA/reviewer | test plans, seeded scenarios, regression checks | 0.25–0.5 |

With strong agentic coding assistance, some roles can be combined, but the responsibilities should remain distinct. In particular, keep the **data model owner**, **frontend component owner**, and **reviewer/QA voice** clear.

---

## 3. Milestone roadmap

### Milestone 0 — Repo, contracts, and dev foundation

**Target:** Week 0–1  
**Outcome:** A working local development environment and implementation skeleton.

#### Deliverables

- Monorepo or coordinated repos initialized.
- Next.js frontend scaffold with TypeScript, routing, component library, lint/typecheck/test setup.
- FastAPI backend scaffold with OpenAPI generation, health checks, migration setup.
- PostgreSQL + pgvector + Redis + MinIO local services.
- Initial database schema migration.
- AGENTS.md and CLAUDE.md added to repo.
- Seed data strategy and demo fixture folder.
- CI checks for frontend, backend, migration, and API contract.

#### Acceptance gate

- `docker compose up` starts local services.
- Backend health endpoint responds.
- Frontend loads shell navigation.
- A migration creates core tables.
- CI can run typecheck/lint/test commands.

---

### Milestone 1 — WorkProduct ingestion foundation

**Target:** Weeks 1–3  
**Outcome:** Upload a deck-like file, store it, process it asynchronously, and produce WorkProduct + ContentUnit records.

#### Deliverables

- Upload API and UI.
- Object storage integration.
- Ingestion job table and status UI.
- File metadata and provenance record creation.
- PPTX/PDF render pipeline to slide/page images.
- Text and speaker-note extraction where supported.
- Content hash generation.
- WorkProduct family/variant/version creation.
- ContentUnit family/variant/version creation.
- Basic error/retry path.

#### Acceptance gate

- Uploading a deck creates a WorkProduct detail page.
- The deck renders into a filmstrip of ContentUnits.
- Each unit has preview, text, source order, provenance, and state.
- Failed processing jobs surface actionable failure reason.

#### Technical note

Start with a practical ingestion stack. For PPTX, use a combination of LibreOffice headless rendering for visual fidelity and XML/python-pptx-style extraction for text/metadata. Do not assume one library will solve both rendering fidelity and semantic extraction perfectly.

---

### Milestone 2 — Graph library and detail pages

**Target:** Weeks 3–6  
**Outcome:** Users can browse and inspect governed content by family, variant, and version.

#### Deliverables

- Library landing page with content-type tabs.
- Family-first ContentUnit cards.
- WorkProduct cards and detail pages.
- ContentUnit detail page with variants, versions, provenance, comments, notes, where-used.
- Variant expansion and canonical marker.
- Basic taxonomy filters.
- Manual edit controls for curators.
- Persistent comments and curated notes.
- Basic audit log.

#### Acceptance gate

- User can browse families without seeing every version flat.
- User can expand a family and inspect variants/versions.
- User can add a note and a persistent comment.
- Curator can set canonical, approval state, and freshness state.

---

### Milestone 3 — Search and Ask BoxBrain

**Target:** Weeks 5–8  
**Outcome:** Search works across the catalog and returns explainable, grouped results.

#### Deliverables

- PostgreSQL full-text indexes.
- Embedding generation and pgvector indexes.
- Search API with lexical, semantic, metadata, trust, freshness, and usage components.
- Query intent heuristics for family/variant/version result grouping.
- Ask BoxBrain UI.
- Explanation chips.
- Filter panel.
- Search debug/admin view for ranking analysis.
- Saved search skeleton.

#### Acceptance gate

- Broad queries return family-first results.
- Specific queries can return variants or versions.
- Search results show reason/rationale chips.
- Debug view shows component scores for selected results.

---

### Milestone 4 — Reviews Hub and governance workflows

**Target:** Weeks 7–10  
**Outcome:** AI/human suggestions become reviewable governance workflows.

#### Deliverables

- Duplicate candidate model and queue.
- Variant linking queue.
- Similarity review queue.
- Stale content queue.
- Approval queue.
- Side-by-side compare panel.
- Actions: mark variant, mark similar, merge versions, set canonical, not duplicate, approve, deprecate, request changes.
- AI rationale and confidence display.
- Audit events for all review actions.

#### Acceptance gate

- AI-generated candidate appears in Reviews Hub with confidence and rationale.
- Reviewer can accept/reject and the graph updates correctly.
- Audit log records action, actor, target, and prior/new state.

---

### Milestone 5 — ContentBlocks and Storyboard core

**Target:** Weeks 9–13  
**Outcome:** Users can compose reusable mini-stories and assemble a storyboard with snapshots.

#### Deliverables

- ContentBlock family/variant/version model.
- Create ContentBlock from selected ContentUnits.
- ContentBlock detail page.
- Storyboard model and APIs.
- Storyboard workspace UI with sections and slots.
- Insert ContentUnit/ContentBlock from search, library, or tray.
- Gap placeholders.
- Slot swap and compare skeleton.
- Storyboard snapshot creation.
- Per-storyboard, per-section, and per-slot comments.
- Initial diagnostics: duplicate detection, unapproved/stale content warning, estimated read time, required gap count.

#### Acceptance gate

- User can build a storyboard from existing content.
- User can create and insert a ContentBlock.
- User can snapshot and return to the storyboard.
- Comments remain anchored.
- Diagnostics catch obvious duplicates and stale/unapproved selections.

---

### Milestone 6 — MVP hardening and pilot readiness

**Target:** Weeks 13–16  
**Outcome:** Stable pilot with seed/demo data, testing, documentation, and observable operations.

#### Deliverables

- Role-based access and basic permission enforcement.
- Ingestion/search/job observability dashboard.
- Regression test suite.
- Playwright E2E tests for core user flows.
- Demo dataset and scripted walkthrough.
- Performance pass for common pages and search.
- Content quality/ranking eval set.
- Documentation for admin, curator, and builder workflows.

#### Acceptance gate

- Core flows pass E2E tests.
- Search performance meets initial target on pilot corpus.
- Upload/ingestion failures are observable and recoverable.
- Demo walkthrough can be executed without engineering help.

---

## 4. First 30/60/90-day plan

### First 30 days

**Theme:** Make the graph and ingestion foundation real.

- Finalize repo and local dev services.
- Implement core schema and migrations.
- Build upload and ingestion job foundation.
- Render deck pages/slides and extract text.
- Create WorkProduct and ContentUnit versions.
- Build minimal WorkProduct detail and ContentUnit detail views.
- Establish AGENTS.md/CLAUDE.md and agent task cards.
- Create seed/demo fixture set.

**End-of-month demo:** Upload a deck, inspect rendered slides as ContentUnits, view provenance, and browse the initial library.

### First 60 days

**Theme:** Make retrieval and governance usable.

- Implement family-first Library.
- Add variants, versions, canonical states, comments, notes.
- Implement hybrid search and Ask BoxBrain.
- Add filters and explanation chips.
- Implement review queues for duplicate/variant suggestions.
- Add audit trail and basic RBAC.

**End-of-month demo:** Search for a slide concept, inspect a family, compare variants, approve/set canonical, and resolve a variant-review queue item.

### First 90 days

**Theme:** Make composition real.

- Implement ContentBlocks.
- Implement Storyboard sections/slots/gaps.
- Add insert/swap from Library/Search.
- Add snapshots and anchored comments.
- Add basic diagnostics.
- Harden E2E tests and demo walkthrough.
- Prepare pilot release.

**End-of-month demo:** Build a storyboard from existing slides and blocks, save a snapshot, review comments, and show diagnostics/trust warnings.

---

## 5. Workstream breakdown

### 5.1 Frontend workstream

#### Core stack recommendation

- Next.js App Router.
- React + TypeScript.
- Tailwind CSS + shadcn/ui or equivalent accessible primitives.
- TanStack Query for server-state fetching/caching.
- Zustand or context reducers for local storyboard UI state.
- dnd-kit for controlled drag/drop.
- React Hook Form + Zod for forms.
- Playwright for E2E.
- Storybook or Ladle for component states.

#### Component architecture

- `app/(shell)` for authenticated app layout.
- `features/library` for cards, filters, list/grid views.
- `features/content-units` for details and variant explorer.
- `features/work-products` for preview and filmstrip.
- `features/storyboards` for sections/slots/snapshots.
- `features/reviews` for queue and compare panel.
- `components/status` for trust/freshness/approval chips.
- `components/provenance` for provenance drawer/timeline.
- `components/comments` for shared annotation UI.

### 5.2 Backend/API workstream

#### Core stack recommendation

- FastAPI.
- SQLAlchemy 2.x or SQLModel with Alembic migrations.
- Pydantic models for request/response schemas.
- PostgreSQL with pgvector.
- Redis + RQ/Celery/Dramatiq for ingestion and AI jobs.
- MinIO locally, S3-compatible storage in deployment.
- OpenAPI generated and validated in CI.

#### Service boundaries

- `ingestion`: uploads, job orchestration, render/extract workers.
- `catalog`: family/variant/version CRUD and details.
- `search`: hybrid retrieval, ranking, explainability.
- `governance`: review queues, approvals, audit, trust state.
- `storyboard`: sections, slots, snapshots, comments.
- `ai_enrichment`: summarization, taxonomy, candidates, diagnostics.
- `authz`: roles, permissions, object access.

### 5.3 AI/search workstream

#### MVP AI tasks

- Text summarization for WorkProducts and ContentUnits.
- Taxonomy suggestion.
- Embedding generation.
- Duplicate candidate detection via content hashes + embeddings.
- Similarity suggestions.
- Variant link suggestions.
- Storyboard gap recommendations.
- Basic diagnostics.

#### Guardrails

- AI suggestions create candidate records, not final governance decisions.
- AI-generated metadata has provenance.
- Prompts and model settings are versioned.
- Human overrides are stored.
- Ranking behavior is evaluated against curated queries.

### 5.4 Data/workers workstream

#### Ingestion stages

1. `uploaded`: file stored and job created.
2. `validated`: file type, size, and basic safety checks complete.
3. `rendered`: slide/page previews generated.
4. `extracted`: text, notes, and metadata extracted.
5. `indexed`: text search and embeddings created.
6. `enriched`: AI summaries/taxonomy/candidates created.
7. `review_ready`: candidates routed to review queues.
8. `complete`: all required outputs ready.

#### Idempotency

- Uploads should have content hashes.
- Jobs should be retryable by stage.
- Unit creation should avoid duplicate records for the same source slide/version.
- Failed stage outputs should be safe to overwrite on retry.

---

## 6. Initial implementation architecture diagram

```text
+------------------+       +------------------+       +----------------------+
| Next.js Frontend | <---> | FastAPI Backend  | <---> | PostgreSQL + pgvector |
|                  |       |                  |       | metadata/graph/search |
+---------+--------+       +--------+---------+       +-----------+----------+
          |                         |                             |
          |                         |                             |
          |                         v                             |
          |                +------------------+                   |
          |                | Redis Queue      |                   |
          |                +--------+---------+                   |
          |                         |                             |
          |                         v                             |
          |                +------------------+                   |
          |                | Workers          |                   |
          |                | render/extract/  |                   |
          |                | embed/enrich     |                   |
          |                +--------+---------+                   |
          |                         |                             |
          v                         v                             v
+------------------+       +------------------+       +----------------------+
| Browser previews |       | Object Storage   |       | Optional OpenSearch  |
| thumbnails/UI    |       | binaries/renders |       | later-scale search   |
+------------------+       +------------------+       +----------------------+
```

---

## 7. Acceptance test scenarios

### Scenario 1 — Ingest deck

1. User uploads a PPTX.
2. System acknowledges upload and creates job.
3. User sees job progress.
4. Job completes.
5. User opens WorkProduct detail.
6. Filmstrip displays rendered slides.
7. User opens a slide ContentUnit and sees text, provenance, source deck, and approval state.

### Scenario 2 — Find and inspect family

1. User searches “operating margin board slide.”
2. System returns family-first results with a Board variant elevated.
3. User expands family card.
4. User compares Executive, Board, and Technical variants.
5. User opens detail and reads curated note.

### Scenario 3 — Resolve duplicate candidate

1. AI identifies two slides as duplicate candidates.
2. Candidate appears in Reviews Hub.
3. Reviewer opens compare panel.
4. Reviewer marks them as variants or not duplicates.
5. System updates graph and audit log.

### Scenario 4 — Build storyboard

1. User creates new WorkProduct Storyboard.
2. User adds sections: Context, Value, Proof, Next Steps.
3. User adds ContentUnits and a ContentBlock.
4. User inserts a gap placeholder.
5. System warns one slide is stale.
6. User swaps to an approved variant.
7. User saves snapshot.

---

## 8. Implementation priorities and sequencing rationale

### Priority 1 — Identity model before intelligence

Search and AI recommendations are only useful when the underlying identity model is trustworthy. Family/variant/version separation and provenance should be implemented early, not bolted on after a flat slide table.

### Priority 2 — Ingestion fidelity before fancy recommendations

The catalog is only as credible as the extracted units. Rendering, text extraction, provenance, and retryable jobs are MVP-critical.

### Priority 3 — Reviewable AI before autonomous AI

AI confidence will be uneven at first. Make it useful through review queues, side-by-side compare, confidence, and rationale.

### Priority 4 — Storyboard after search/library basics

Storyboard needs reusable content to work. Build it once users can reliably find, inspect, and trust units.

### Priority 5 — Plays and opportunities after composition

Plays and OpportunityWorkspaces are strategically important, but they become much stronger when Storyboard, ContentBlocks, and recommendations already exist.

---

## 9. Suggested deployment path

### Local development

- Docker Compose for PostgreSQL/pgvector, Redis, MinIO.
- Frontend and backend run locally.
- Seed fixture decks and generated thumbnails.

### Internal alpha

- Single environment.
- OIDC optional or stubbed.
- Restricted users.
- Manual fixture uploads.
- Observability dashboards.

### Pilot

- SSO enabled.
- Object storage and database backups.
- Role-based permissions.
- Ingestion monitoring.
- Basic retention policy.
- Limited approved corpus.

### Production readiness

- Secure secret handling.
- Infrastructure-as-code.
- Audit log export.
- Data retention/deletion workflows.
- Disaster recovery plan.
- Load/performance testing.
- Source connector security review.

---

## 10. Definition of done

For every feature ticket:

- API and UI behavior match acceptance criteria.
- Types and schemas are updated.
- Migrations are included when needed.
- Unit tests or integration tests cover core logic.
- E2E test added for user-facing critical path where relevant.
- Audit/provenance behavior is handled for governance actions.
- Permissions are considered.
- Error/empty/loading states are implemented.
- Documentation or agent instructions are updated if patterns change.
- AI-generated behavior is traceable and reviewable.

---

## 11. Suggested sprint cadence

Use two-week sprints with one additional weekly technical/product review session.

| Ritual | Purpose |
|---|---|
| Sprint planning | Select work from backlog with acceptance criteria. |
| Mid-sprint demo | Catch UX/data-model drift early. |
| Agent review | Inspect agent-generated diffs and update instructions. |
| Search/governance eval | Track retrieval and AI suggestion quality. |
| End-sprint demo | Show working product flows, not just code. |
| Decision log update | Capture model/scope/architecture decisions. |

---

## 12. Initial epics

1. Repository and local development foundation.
2. Core data model and migrations.
3. Upload and ingestion jobs.
4. Rendering and extraction pipeline.
5. WorkProduct and ContentUnit details.
6. Family-first Library.
7. Comments, notes, provenance, and audit.
8. Hybrid search and Ask BoxBrain.
9. AI enrichment and review candidates.
10. Reviews Hub.
11. ContentBlocks.
12. Storyboard workspace.
13. RBAC and admin controls.
14. Observability and pilot hardening.

