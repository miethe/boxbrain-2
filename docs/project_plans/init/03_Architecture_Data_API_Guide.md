# BoxBrain v2 Architecture, Data, and API Guide

**Prepared on:** 2026-05-02  
**Purpose:** Technical blueprint for the initial implementation.  

---

## 1. Architectural posture

BoxBrain v2 should be implemented as an API-first web application with a strongly typed domain model and explicit provenance. The product should feel AI-native, but the system of record should remain deterministic and auditable.

### Recommended stack

| Layer | Initial choice | Rationale |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Strong app shell, component ecosystem, server/client rendering flexibility. |
| UI | Tailwind + shadcn/ui or equivalent accessible primitives | Fast implementation with durable design-system patterns. |
| Backend | FastAPI, Python, Pydantic | Strong API ergonomics, async support, Python ecosystem for document processing and AI. |
| Database | PostgreSQL | Source of truth for metadata, graph, comments, audit, manifests. |
| Vector | pgvector | Keep early retrieval co-located with metadata and avoid premature vector-database complexity. |
| Lexical search | PostgreSQL full-text search | Good MVP capability, easy with Postgres source-of-record. |
| Object storage | S3-compatible storage | Store binaries, renders, thumbnails, extracted artifacts. |
| Queue | Redis + worker framework | Async ingestion, rendering, embeddings, AI enrichment. |
| Auth | OIDC/enterprise SSO-ready | Enterprise path without overbuilding on day one. |
| Telemetry | Postgres-first events, later warehouse/ClickHouse | Useful early analytics without operational sprawl. |

---

## 2. System boundaries

### 2.1 Frontend modules

```text
frontend/
  app/
    (auth)/
    (shell)/
      ask/
      library/
      content-units/[id]/
      content-blocks/[id]/
      work-products/[id]/
      storyboards/[id]/
      reviews/
      admin/
  features/
    ask/
    library/
    content-units/
    content-blocks/
    work-products/
    storyboards/
    reviews/
    comments/
    provenance/
    taxonomy/
  components/
    status-chips/
    cards/
    filters/
    preview/
    compare/
    layout/
  lib/
    api/
    auth/
    telemetry/
    types/
```

### 2.2 Backend modules

```text
backend/
  app/
    api/
      routes/
        content_units.py
        content_blocks.py
        work_products.py
        storyboards.py
        search.py
        reviews.py
        comments.py
        notes.py
        ingestion.py
        admin.py
    domain/
      catalog/
      storyboard/
      governance/
      search/
      ingestion/
      ai_enrichment/
      permissions/
    db/
      models.py
      migrations/
      repositories/
    workers/
      ingest.py
      render.py
      extract.py
      embed.py
      enrich.py
      review_candidates.py
    schemas/
    services/
    tests/
```

---

## 3. Domain model

### 3.1 Core object pattern

Most reusable objects follow this structure:

```text
Family -> Variant -> Version
```

Where:

- **Family** = conceptual identity.
- **Variant** = intentional alternate form.
- **Version** = time-based revision of a variant.

The pattern applies to:

- ContentUnits;
- ContentBlocks;
- WorkProducts;
- Plays.

Similarity remains separate from family membership.

### 3.2 Core tables

#### ContentUnits

- `content_unit_families`
- `content_unit_variants`
- `content_unit_versions`

#### ContentBlocks

- `content_block_families`
- `content_block_variants`
- `content_block_versions`
- `content_block_members`

#### WorkProducts

- `work_product_families`
- `work_product_variants`
- `work_product_versions`
- `work_product_members`
- `build_manifests`
- `build_manifest_slots`

#### Storyboards

- `storyboards`
- `storyboard_snapshots`
- `storyboard_sections`
- `storyboard_slots`

#### Shared graph/governance

- `similarity_edges`
- `provenance_records`
- `comments`
- `notes`
- `assessments`
- `review_items`
- `audit_events`
- `taxonomy_terms` or JSON taxonomy fields initially
- `collections`
- `collection_members`
- `ingestion_jobs`
- `stored_objects`
- `embeddings`

### 3.3 Relationship rules

| Rule | Implementation guidance |
|---|---|
| ContentUnit is atomic | A ContentUnitVersion should represent one slide/page/visual/chart/table/text block, never a multi-slide pack. |
| Composition is ordered | Use explicit member/order tables for blocks, work products, and storyboards. |
| Variant is not similarity | Do not auto-merge variant and similarity semantics. Similarity edges can support review. |
| Versions supersede versions | Version lineage should preserve supersedes links. |
| AI suggestions are candidates | AI link/merge suggestions create review items until accepted. |
| Provenance is required | Major versions should have a provenance record. |

---

## 4. Ingestion architecture

### 4.1 Ingestion pipeline

```text
Upload
  -> Store original binary
  -> Create WorkProduct source/version shell
  -> Validate file
  -> Render slides/pages
  -> Extract text/notes/metadata
  -> Create ContentUnit versions
  -> Compute hashes
  -> Generate embeddings
  -> AI enrichment: title/summary/taxonomy
  -> Candidate detection: duplicate/variant/similarity
  -> Review queue routing
  -> Mark job complete
```

### 4.2 Worker stages

| Stage | Output | Retry strategy |
|---|---|---|
| `validate_file` | file type/size/status | safe retry |
| `render_pages` | preview images + thumbnails | safe retry; overwrite stage artifacts |
| `extract_text` | text, notes, slide title candidates | safe retry |
| `create_units` | ContentUnit versions and source links | idempotent by source file + slide index + hash |
| `embed_units` | vector rows | idempotent by object/version + model |
| `enrich_units` | summary/taxonomy suggestions | idempotent by prompt/pipeline version |
| `detect_candidates` | review items and similarity edges | idempotent by pair + candidate type |

### 4.3 Rendering and extraction guidance

PPTX processing is a known fidelity risk. Treat rendering and semantic extraction as different outputs:

- **Rendering:** use headless LibreOffice or a similar service for visual previews and thumbnails.
- **Text extraction:** use XML/python-pptx-style parsing for text boxes, speaker notes, slide titles, and structural hints.
- **Visual similarity:** start with image hashes and optionally multimodal embeddings later.
- **Source identity:** store source deck ID, source slide index, original file hash, extracted text hash, and visual hash.

### 4.4 Stored object types

| Type | Examples |
|---|---|
| Original binary | PPTX, PDF, DOCX |
| Rendered preview | slide/page PNG or JPG |
| Thumbnail | smaller preview image |
| Extracted text artifact | JSON/XML extraction result |
| AI output artifact | optional JSON with summary/taxonomy/candidates |
| Export/package artifact | future PPTX/PDF output |

---

## 5. Search and ranking architecture

### 5.1 Search components

| Component | Initial implementation |
|---|---|
| Lexical | PostgreSQL `tsvector` over titles, summaries, extracted text, notes, taxonomy. |
| Semantic | pgvector embeddings per object/version. |
| Metadata fit | Structured matching over taxonomy, variant dimensions, approval, freshness, source. |
| Trust | Approval state, rights, client safety, curated notes. |
| Freshness | Last update, approval age, source age, dependent object changes. |
| Usage | Reuse count, successful storyboard/work-product inclusion, positive ratings. |
| Context | Search profile, opportunity/storyboard context, desired audience/artifact type. |

### 5.2 Search result grouping

Search should select result grain based on query specificity:

| Query type | Example | Preferred result grain |
|---|---|---|
| Broad concept | “operating margin slide” | Family |
| Audience-specific | “board operating margin slide” | Variant, grouped under family |
| Exact source/version | “Q2 2025 board update v5 margin slide” | Version |
| Mini-story | “3 slide ROI story” | ContentBlock |
| Artifact | “modernization proposal deck” | WorkProduct |

### 5.3 Composite score

Initial scoring formula can start as configurable weights:

```text
composite_score =
  0.22 * lexical_match +
  0.25 * semantic_match +
  0.15 * metadata_fit +
  0.10 * approval_signal +
  0.08 * freshness_score +
  0.08 * quality_score +
  0.06 * reuse_score +
  0.03 * similarity_signal +
  0.03 * context_specific_boost
```

Weights should be tunable by ranking profile.

### 5.4 Ranking profiles

- General library search.
- Executive content.
- Technical content.
- Opportunity recommendation.
- Duplicate review.
- Similarity review.
- Approved-only retrieval.

### 5.5 Evaluation

Create a small curated eval set early:

- 30–50 representative queries.
- Expected families/variants/versions.
- Bad-result examples.
- Search profile expectations.
- Notes on why results should rank high.

Run evals before/after ranking changes.

---

## 6. AI enrichment architecture

### 6.1 AI tasks

| Task | Input | Output | Human review? |
|---|---|---|---|
| Summarize unit | extracted text + visual context | title, summary | optional edit |
| Suggest taxonomy | extracted text/source metadata | tags/terms | curator review or low-risk auto-suggest |
| Duplicate candidate | hashes + semantic similarity | review item | yes |
| Variant candidate | family/variant similarity + dimensions | review item | yes |
| Similarity edge | semantic/visual/structural similarity | similarity edge or review item | optional |
| Storyboard recommendation | section purpose + query context | ranked units/blocks | user selection |
| Diagnostics | storyboard slots + metadata | warnings/scores | user review |

### 6.2 AI output storage

Store AI outputs as structured records with:

- target object type and ID;
- output field or candidate type;
- prompt/pipeline version;
- model/provider reference;
- confidence;
- explanation/rationale;
- raw output JSON when useful;
- accepted/rejected/overridden status;
- reviewer ID and timestamp.

### 6.3 Prompt versioning

Prompts should live in repo and be versioned. Each job output should include pipeline version. Prompt changes should be treated like code changes with tests/evals.

### 6.4 Agentic vs deterministic steps

Prefer deterministic code for:

- file validation;
- rendering;
- text extraction;
- hash generation;
- permissions;
- audit;
- exact relationship updates.

Use AI for:

- summarization;
- taxonomy suggestions;
- semantic matching;
- recommendations;
- review rationale;
- diagnostics language.

---

## 7. API design principles

### 7.1 API posture

- Resource-oriented REST for core objects.
- Explicit nested routes for variants, versions, comments, notes, provenance, where-used.
- Separate command endpoints for governance actions.
- Query endpoints for search/recommendation.
- Server-generated IDs.
- Cursor pagination for lists.
- Consistent envelopes for errors and job status.

### 7.2 Representative endpoints

#### Ingestion

```http
POST   /api/uploads
GET    /api/ingestion-jobs/{id}
POST   /api/ingestion-jobs/{id}/retry
```

#### ContentUnits

```http
GET    /api/content-units/families
GET    /api/content-units/families/{id}
GET    /api/content-units/families/{id}/variants
GET    /api/content-units/variants/{id}/versions
GET    /api/content-units/versions/{id}
GET    /api/content-units/{id}/similar
GET    /api/content-units/{id}/where-used
PATCH  /api/content-units/variants/{id}
PATCH  /api/content-units/versions/{id}/approval
```

#### Search

```http
POST   /api/search
POST   /api/ask
POST   /api/recommendations/storyboard-slot
```

#### Storyboards

```http
POST   /api/storyboards
GET    /api/storyboards/{id}
POST   /api/storyboards/{id}/snapshots
POST   /api/storyboards/{id}/sections
PATCH  /api/storyboard-sections/{id}
POST   /api/storyboard-sections/{id}/slots
PATCH  /api/storyboard-slots/{id}
POST   /api/storyboards/{id}/analyze
```

#### Reviews

```http
GET    /api/reviews/queues
GET    /api/reviews/items
GET    /api/reviews/items/{id}
POST   /api/reviews/items/{id}/mark-variant
POST   /api/reviews/items/{id}/mark-similar
POST   /api/reviews/items/{id}/merge-versions
POST   /api/reviews/items/{id}/set-canonical
POST   /api/reviews/items/{id}/reject
POST   /api/reviews/items/{id}/approve
POST   /api/reviews/items/{id}/request-changes
```

### 7.3 Error model

Use consistent errors:

```json
{
  "error": {
    "code": "permission_denied",
    "message": "You do not have permission to approve this version.",
    "details": {
      "requiredRole": "reviewer"
    }
  }
}
```

---

## 8. Permissions and security

### 8.1 Roles

| Role | Capabilities |
|---|---|
| Viewer | View permitted content, search, inspect metadata. |
| Contributor | Upload content, create storyboards, comment, suggest changes. |
| Curator | Edit taxonomy, notes, family/variant relationships, content blocks. |
| Reviewer | Approve/deprecate, resolve review queues, request changes. |
| Admin | Configure roles, sources, taxonomy, retention, system settings. |

### 8.2 Object access

Start with role-based permissions plus object/source visibility. Later, add finer-grained inheritance.

Initial rules:

- Family inherits to variants and versions.
- WorkProduct access should not automatically expose restricted units to unauthorized users outside that context.
- Storyboard access includes its snapshots and comments.
- Restricted content should not leak through search snippets, thumbnails, or similarity edges.

### 8.3 Audit events

Audit at least:

- upload/import;
- approval state change;
- freshness state change;
- canonical change;
- variant link/merge;
- similarity confirmation;
- note create/update/delete;
- restricted metadata change;
- publish/export action;
- permission change.

---

## 9. Observability

### 9.1 Product telemetry

- Search queries, filters, clicked results, zero-result queries.
- Add-to-storyboard actions.
- ContentBlock creation and reuse.
- Review actions and queue aging.
- Notes viewed/pinned/created.
- Storyboard snapshots and diagnostics ignored/fixed.

### 9.2 Operational telemetry

- Ingestion job duration by stage.
- Failure rate by file type/source.
- Render/extract/index latencies.
- Search P50/P95.
- Embedding generation cost/latency.
- AI enrichment confidence distribution.
- Worker queue depth.
- Object storage errors.

### 9.3 Search telemetry

- Query string.
- Query intent classification.
- Result count.
- Top result IDs and scores.
- Clicked result.
- Add-to-storyboard result.
- User feedback.

---

## 10. Performance targets

| Area | Target |
|---|---|
| Search P50 | < 2 seconds |
| Search P95 | < 5 seconds |
| Detail page after cached assets | < 2 seconds |
| Upload acknowledgment | < 3 seconds |
| Ingestion | async, stage-visible, retryable |
| Library browse | paginated, lazy-loaded thumbnails |
| Storyboard interaction | local optimistic updates for reorder/slot operations |

---

## 11. Data migration and evolution guidance

- Start with explicit tables for core families/variants/versions rather than one generic polymorphic object table.
- Shared edges and annotations can be polymorphic with strong target-type enums.
- Preserve JSONB taxonomy initially for flexibility, but plan eventual normalized taxonomy if curation demands it.
- Avoid premature graph database migration; Postgres edge tables are sufficient for MVP.
- Keep object storage paths content-addressed or version-addressed.
- Treat embeddings as model-versioned rows; do not overwrite without trace.

---

## 12. Build-vs-buy considerations

| Capability | Recommendation |
|---|---|
| PPTX visual rendering | Use existing render tooling/service, wrap with robust pipeline. |
| Object storage | Use S3-compatible managed or MinIO locally. |
| OIDC/SSO | Use established auth library/provider integration. |
| Comments | Build lightweight domain-specific comments due to anchoring requirements. |
| Search | Build initial Postgres/pgvector hybrid; defer external search. |
| Slide editing | Do not build MVP native editor. |
| Export/publishing | Defer complex export; design manifests now. |

---

## 13. Technical guardrails

1. Do not let UI state mutate graph relationships without API command endpoints.
2. Do not create ContentUnits that contain multiple slides.
3. Do not delete provenance records when merging or deprecating.
4. Do not store AI suggestions as if they were human-approved metadata.
5. Do not let search return unauthorized content through grouped family results.
6. Do not make thumbnails the only representation of content; preserve extracted text and structured metadata.
7. Do not hard-code ranking weights in UI.
8. Do not put frequently changing instructions into AGENTS.md/CLAUDE.md; keep those in docs or task prompts.
9. Do not overbuild connectors before upload/import and core catalog work.
10. Do not build Storyboard as a freeform canvas without manifest-compatible structure.
