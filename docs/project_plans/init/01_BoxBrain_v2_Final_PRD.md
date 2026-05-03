# BoxBrain v2 Final PRD

**Product:** BoxBrain v2  
**Version:** 2.0 implementation PRD  
**Status:** Final planning baseline  
**Prepared for:** Nick Miethe  
**Prepared on:** 2026-05-02  
**Source basis:** Canonical BoxBrain v2 specification, available prior project context, and external product/design/agent-development research.  

---

## 1. Executive summary

BoxBrain v2 is a governed enterprise slide/content catalog and composition platform. Its first wedge is a full slide catalog platform: ingest decks and business artifacts, decompose them into reusable atomic content units, organize those units into families/variants/versions, expose trust and provenance, and help users assemble new storyboards and work products without starting from blank.

The larger product vision is not merely a searchable slide library. BoxBrain is a **content graph and orchestration layer** for reusable business materials. It treats slides, pages, charts, text blocks, proof sets, mini-stories, decks, plays, and opportunity-specific storyboards as related but distinct objects. AI helps extract, summarize, cluster, recommend, compare, and scaffold; humans remain authoritative for approval, canonical relationships, publishing, and sensitive governance decisions.

The implementation should prioritize a buildable, high-signal MVP:

1. Ingest decks and decompose them into `WorkProduct` and `ContentUnit` records.
2. Make family/variant/version separation real and visible.
3. Provide family-first library browsing and hybrid search.
4. Add comments, notes, provenance, trust state, and review queues.
5. Build a structured Storyboard workspace with sections, slots, snapshots, and insert/swap workflows.
6. Support ContentBlocks as reusable mini-stories.
7. Prepare for Plays, OpportunityWorkspaces, packaging, and advanced governance as later phases.

---

## 2. Product thesis

### 2.1 Problem

AI has made it easier to generate content but harder to know which content should be trusted, reused, adapted, retired, or combined. Enterprise teams are surrounded by decks, pitch materials, briefs, templates, old proposals, executive updates, proof points, and bespoke slides. The bottleneck has shifted from creation to:

- finding the right artifact quickly;
- distinguishing a current approved asset from an outdated copy;
- understanding whether two similar slides are variants, duplicates, or unrelated lookalikes;
- reusing strong narrative blocks without copying fragile deck files;
- building a new deck or brief while preserving provenance and reviewability;
- capturing institutional editorial guidance that lives in chat threads, comments, and human memory.

### 2.2 Product answer

BoxBrain v2 makes reusable content governable and composable by modeling it at the right grain:

- **ContentUnit:** atomic reusable object, initially most often a slide.
- **ContentBlock:** a reusable grouped mini-story or subassembly.
- **WorkProduct:** an artifact such as a deck, brief, proposal, board pack, one-pager, or document.
- **Play:** a repeatable strategy or narrative blueprint.
- **OpportunityWorkspace:** a context-specific workspace for tailoring plays and assets.
- **Storyboard:** the operating surface for arranging, comparing, annotating, and versioning compositions.

### 2.3 Differentiation

BoxBrain is differentiated by the combination of:

- slide-native and artifact-native decomposition;
- family/variant/version modeling as a primary UX concept;
- explicit separation between version, variant, similarity, and composition;
- governed recommendations with provenance, confidence, approval, freshness, where-used, and rights indicators;
- Storyboard as the core composition workspace;
- review queues for AI-suggested duplicates, variant links, stale content, and approvals;
- build manifests that make composed work products reproducible.

---

## 3. Goals, non-goals, and success criteria

### 3.1 Product goals

| Goal | Description | MVP relevance |
|---|---|---|
| Govern reusable content | Make content discoverable, trusted, versioned, and reviewable. | Critical |
| Reduce slide/deck chaos | Avoid flat lists of duplicate slides and old decks. | Critical |
| Accelerate composition | Let users assemble new storyboards and work products from reusable content. | Critical |
| Preserve provenance | Show where content came from, what it derives from, and where it is used. | Critical |
| Enable human-led AI | AI suggests, ranks, clusters, and explains; humans approve and govern. | Critical |
| Prepare for opportunity orchestration | Support future live pursuit/workspace recommendations. | Post-MVP foundation |

### 3.2 Non-goals for MVP

The MVP should **not** attempt to be:

- a full PowerPoint replacement;
- a pixel-perfect browser-native slide editor;
- a fully autonomous content publishing agent;
- a full CRM/sales enablement suite;
- an enterprise DAM clone;
- a generic vector-search demo;
- a workflow system with every approval-route edge case.

### 3.3 Success metrics

| Metric category | Metric | MVP target direction |
|---|---|---|
| Ingestion | % uploaded decks successfully decomposed into renderable slide units | High and improving; track failure reasons |
| Search quality | Search click-through rate, precision@5 on curated eval set, zero-result rate | Improve weekly during pilot |
| Reuse | # ContentUnits/Blocks added to Storyboards; reuse rate by family | Rising usage |
| Trust | % reused content that is approved/fresh/trusted | High for external-facing outputs |
| Governance | Review queue throughput and aging | Queue should not grow unbounded |
| Speed | Time from upload to searchable thumbnails | Fast enough for async workflow; acknowledge upload < 3s |
| Composition | Time to create a useful first storyboard from existing content | Lower than manual deck hunting |
| Quality | Narrative diagnostics accepted/fixed by users | Useful signal, not noisy decoration |

---

## 4. Personas and jobs to be done

### 4.1 Primary personas

#### Builder

A consultant, seller, strategist, product marketer, solution engineer, or innovation lead who needs to find content and assemble a new deck or brief quickly.

**Jobs:**

- Find the best slide or story for a use case.
- Compare variants for executive, technical, board, regional, or industry contexts.
- Add assets to a storyboard without losing provenance.
- Avoid accidentally using stale or unapproved material.

#### Curator

A content owner, enablement lead, brand/content strategist, or product marketing owner responsible for maintaining reusable assets.

**Jobs:**

- Review AI-suggested duplicates, variants, and similarities.
- Set canonical variants.
- Approve/deprecate content.
- Add official usage notes and guidance.
- Track gaps and stale areas.

#### Reviewer

A subject-matter expert, legal/compliance reviewer, executive stakeholder, or brand reviewer.

**Jobs:**

- Review content or storyboard snapshots.
- Resolve comments and change requests.
- Inspect provenance and usage restrictions.
- Approve or request changes.

#### Admin

A system owner responsible for security, ingestion sources, roles, audit, and configuration.

**Jobs:**

- Configure connectors, roles, and permissions.
- Monitor ingestion/search/indexing health.
- Manage taxonomy and retention policy.
- Audit risky content usage.

### 4.2 Secondary future personas

#### Opportunity lead

A live account/pursuit owner who wants recommendations tied to an account, audience, buying stage, offering, and risk profile.

#### Play designer

A strategist who creates reusable blueprint flows for recurring motions such as discovery workshops, board updates, transformation pitches, or proposal accelerators.

---

## 5. Core product model

### 5.1 Entity hierarchy

| Level | Entity | User-facing role |
|---|---|---|
| Atomic | ContentUnit | A reusable slide/page/chart/visual/text block. |
| Mid-layer | ContentBlock | A mini-story or grouped reusable sequence. |
| Artifact | WorkProduct | A deck, brief, document, one-pager, proposal, board pack, or similar artifact. |
| Strategy | Play | A repeatable flow or strategic blueprint. |
| Context | OpportunityWorkspace | A live workspace for account/pursuit/context-specific recommendations. |
| Composition surface | Storyboard | The workspace where content is arranged, reviewed, and versioned. |

### 5.2 Relationship types

BoxBrain must strictly separate these relationship types:

| Relationship | Meaning | Example | Governance implication |
|---|---|---|---|
| Version | Same variant over time | v1.0 to v1.1 of the same executive slide | May merge, supersede, approve, deprecate |
| Variant | Purposeful alternate branch in same family | Board vs technical version of same concept | Human-reviewable canonical and branch labels |
| Similarity | Related but not same family identity | Two ROI slides from different offerings | Helpful discovery, not merge by default |
| Composition | Ordered inclusion in larger object | Slide included in ContentBlock or Storyboard slot | Must preserve order, role, and build manifest |

### 5.3 Family-first principle

Library and broad search should default to **families**, not flat variants or versions. Users should see a conceptual family card first, then expand to variants and latest versions. Variant-first and version-first search should still be possible when the query is specific.

---

## 6. MVP scope

### 6.1 MVP must include

| Capability | MVP requirement |
|---|---|
| WorkProduct ingestion | Upload deck-like artifact, store binary, render previews, create WorkProduct version. |
| ContentUnit extraction | Extract slides/pages as atomic units, including thumbnail/render URI, text, notes where available, source order, and source provenance. |
| Family/variant/version model | Create families and variants for ContentUnits and WorkProducts; support canonical selection and latest version. |
| Library | Family-first browsing, filters, family cards, expand to variants/versions, detail pages. |
| Hybrid search | Lexical + semantic + metadata fit + trust/freshness signals; grouped results. |
| Ask BoxBrain | Natural-language search entry with mixed results and explanation chips. |
| ContentBlocks | Create a reusable ordered grouping of ContentUnits; insert into Storyboard. |
| Storyboard core | Sections, slots, gap placeholders, content insertion, simple swap, snapshots, comments. |
| Comments and notes | Separate review comments, persistent comments, and curated notes. |
| Provenance | Source origin, derived-from links, ingestion job, created/imported/generated metadata. |
| Trust states | Draft/review/approved/deprecated/archived, canonical, freshness, AI/manual/hybrid link source. |
| Reviews Hub | At least duplicate candidates, variant linking, stale content, and approvals. |
| Audit trail | Record sensitive state changes and review actions. |
| Local/admin setup | Seed data, roles, basic admin configuration. |

### 6.2 MVP should defer

| Deferred capability | Reason to defer |
|---|---|
| Full opportunity orchestration | Requires a stable library/search/storyboard foundation first. |
| Play variants and play-to-opportunity workflows | Valuable but should not block core content catalog MVP. |
| Advanced packaging/publish routing | Needs robust build manifest and storyboard snapshots first. |
| Native browser slide editing | High complexity and less central than trusted retrieval/reuse. |
| Deep CRM/source connectors | Start with upload/import and add connectors after usage patterns are clear. |
| Advanced rights/compliance rules engine | Start with visible metadata and manual states before complex policies. |
| OpenSearch/Elasticsearch | Use PostgreSQL full-text initially; add external search only after scale or ranking needs justify it. |

---

## 7. Functional requirements

### 7.1 Ingestion and decomposition

#### Requirements

- Upload supported files through UI and API.
- Store original binary in S3-compatible object storage.
- Create ingestion job with visible status.
- Render deck pages/slides to thumbnails and preview images.
- Extract text, speaker notes, slide titles, source order, and basic layout/object hints.
- Compute content hashes for dedupe candidates.
- Generate embeddings for extracted text and optionally visual/image representation.
- Create initial WorkProduct family/variant/version.
- Create ContentUnit families/variants/versions for each extracted slide/page.
- Attach provenance records to WorkProductVersion and ContentUnitVersion.
- Produce AI enrichment suggestions for title, summary, taxonomy, duplicates, variants, and similarity candidates.
- Route uncertain links to review queue instead of silently merging.

#### Acceptance criteria

- User can upload a deck and see job status within 3 seconds.
- Completed job produces a WorkProduct detail page with preview filmstrip.
- Each slide appears as an atomic ContentUnitVersion with render, text, source order, and provenance.
- Failures are visible and retryable.
- No AI-suggested family/variant merge is applied without trace.

### 7.2 Library

#### Requirements

- Default library view is family-first.
- Support content-type tabs: ContentUnits, ContentBlocks, WorkProducts, Plays, Collections, Reviews.
- Family cards show canonical preview, title, summary, variant count, version count, approval/freshness state, taxonomy chips, usage count, and quick expand.
- Expand family to show variants with latest version, variant label, link source, confidence, and quick actions.
- Toggle between family mode and variant mode.
- Provide filters for taxonomy, approval state, freshness, source, created/updated date, owner, usage, and content type.
- Support saved collections and temporary selection tray.

#### Acceptance criteria

- Broad library browsing does not expose every variant/version flat by default.
- User can navigate from family card to detail page, variants, versions, similar items, provenance, comments, notes, and where-used.

### 7.3 Search and Ask BoxBrain

#### Requirements

- Search across ContentUnits, ContentBlocks, WorkProducts, and Plays.
- Combine lexical full-text search, semantic vector search, metadata match, trust state, freshness, usage, and context boosts.
- Group broad results by family.
- Support direct variant/version result when query specificity is high.
- Show explanation chips such as “approved,” “matches board audience,” “fresh,” “used in 4 decks,” “AI-similar,” or “exact phrase match.”
- Provide filters and sort/ranking profiles.
- Allow add-to-storyboard, add-to-collection, compare, and save-search actions from result cards.

#### Acceptance criteria

- Query “operating margin slide” returns families first.
- Query “board operating margin slide” can elevate the Board variant.
- Query with exact deck/version metadata can return the specific version.
- Ranking components are inspectable for debugging.

### 7.4 Detail pages

#### Shared requirements

All major detail pages should expose:

- overview/summary;
- canonical and trust state;
- variants and versions;
- similar content;
- comments;
- notes;
- activity/audit;
- provenance;
- ratings/assessments;
- where-used;
- quick actions.

#### ContentUnit detail

Must support:

- canonical preview;
- variant explorer;
- version history lane;
- similarity pane;
- usage and source deck references;
- approval/freshness controls for authorized users.

#### ContentBlock detail

Must support:

- ordered members;
- role labels per member;
- purpose/audience tags;
- insert into Storyboard;
- where-used;
- variants/versions if enabled.

#### WorkProduct detail

Must support:

- deck/document preview;
- filmstrip;
- source manifest/table of included units;
- variants and versions;
- storyboard entry point;
- provenance and approval state.

### 7.5 ContentBlocks

#### Requirements

- Users can create ContentBlocks from selected ContentUnit variants/versions.
- Blocks preserve ordered members, member type, selected ID, required flag, role, and notes.
- Blocks can be inserted into Storyboard slots as reusable mini-stories.
- Blocks can be searched, filtered, commented on, rated, and governed.

#### Acceptance criteria

- User can select 3 slides from search/library and create a reusable “ROI story” block.
- User can insert the block into a Storyboard section and inspect its underlying units.

### 7.6 Storyboard workspace

#### Requirements

- Storyboard supports modes: WorkProduct, Play, Opportunity.
- MVP should fully implement WorkProduct mode and foundational model support for other modes.
- Storyboard has sections and slots.
- Slots can hold ContentUnit, ContentBlock, WorkProduct reference, or gap placeholder.
- Users can add, rename, reorder, collapse, and expand sections.
- Users can insert content from search/library/tray.
- Users can compare alternatives and swap selected object.
- Users can snapshot a Storyboard.
- Users can comment at storyboard, section, slot, and selected-object levels.
- Diagnostics panel should start with practical checks: duplicate content, missing proof, stale/unapproved selections, estimated read time, and weak/gap slots.

#### Acceptance criteria

- User can create a storyboard, add three sections, add slides/blocks/gaps, save snapshot, and return later.
- Snapshot preserves slot order and selected object IDs.
- Comments remain anchored to the correct snapshot/section/slot.

### 7.7 Reviews Hub

#### Requirements

Review queues should include:

- New Items;
- Duplicate Candidates;
- Variant Linking;
- Similarity Review;
- Stale Content;
- Approvals;
- Comment Resolution.

Review actions should include:

- mark as variant;
- mark as similar;
- merge versions;
- set canonical;
- not duplicate;
- approve;
- deprecate;
- request changes;
- resolve comment.

#### Acceptance criteria

- AI-suggested duplicate/variant candidate appears in review queue with rationale, confidence, side-by-side preview, metadata, and provenance.
- Reviewer can accept or reject the candidate and the action is audited.

### 7.8 Comments, persistent comments, and notes

#### Requirements

BoxBrain must support three distinct annotation systems:

1. **Review comments:** workflow-bound, threaded, anchor-aware, version/snapshot-aware, open/resolved.
2. **Persistent comments:** longer-lived entity-level conversation, searchable, optionally pinned.
3. **Notes:** durable curated editorial/governance knowledge, usually owner-managed and prominently surfaced.

#### Acceptance criteria

- Users can distinguish informal feedback from official guidance.
- Notes are not accidentally lost when review comments are resolved.
- Review comments can be tied to a storyboard slot or version.

### 7.9 Governance, trust, and permissions

#### Requirements

- Support roles: Viewer, Contributor, Curator, Reviewer, Admin.
- Support approval states: draft, review, approved, deprecated, archived.
- Support freshness states: fresh, aging, stale.
- Track link source: manual, AI, hybrid.
- Track AI confidence and human override state where relevant.
- Support audit logs for state changes, merge/link actions, approvals, deprecations, and publishing.
- Enforce role-based access to restricted content.
- Future-proof for source-aware permissions and retention/deletion workflows.

#### Acceptance criteria

- Viewer cannot approve, merge, or set canonical.
- Restricted content does not appear in search for unauthorized users.
- Every governance action creates an audit event.

---

## 8. UX requirements

### 8.1 Navigation

Top-level navigation:

- Ask BoxBrain
- Library
- Storyboards
- Plays
- Opportunities
- Reviews
- Admin

For MVP, Plays and Opportunities may be visible as future/limited modules only if doing so does not create UX confusion. The current build should prioritize Ask, Library, Storyboards, Reviews, and Admin.

### 8.2 Key surfaces

| Surface | Primary user goal | MVP status |
|---|---|---|
| Ask BoxBrain | Search/recommend content from natural language | Required |
| Library | Browse governed catalog | Required |
| ContentUnit detail | Inspect variants, versions, trust, provenance, similar content | Required |
| ContentBlock detail | Inspect ordered mini-story and reuse it | Required |
| WorkProduct detail | Inspect source deck/artifact and extracted units | Required |
| Storyboard | Compose, compare, snapshot, and review | Required |
| Reviews Hub | Govern AI/human review queues | Required |
| Admin | Manage ingestion, roles, taxonomy, health | MVP-light |
| Plays | Define repeatable narrative patterns | Post-MVP |
| OpportunityWorkspace | Tailor to live pursuits/context | Post-MVP |

### 8.3 Core interaction patterns

#### Family card

A family card should include:

- canonical preview;
- family title;
- short summary;
- type icon;
- variant/version counts;
- trust/freshness chips;
- taxonomy chips;
- quick actions: expand, open, add, compare, note.

#### Variant explorer

The premium interaction should be a multi-axis explorer:

- horizontal axis: related/similar families and conceptual siblings;
- vertical axis: variants within the selected family;
- history lane: versions for selected variant;
- labels: canonical, approved, generated, manual-link, AI-link, current, prior version, technical, executive, board, regional.

#### Storyboard composition

Storyboard should feel like a structured, reviewable workspace rather than a freeform canvas. The design should favor controlled drag/drop, slot cards, section headers, content trays, compare panels, and provenance drawers.

#### Trust display

Trust is not a hidden metadata field. It should be visible on cards, search results, detail headers, storyboard slots, and publish/package checklists.

### 8.4 Accessibility and usability

- Keyboard support for search, card navigation, filter chips, Storyboard section/slot operations, and review actions.
- Clear focus states.
- Sufficient color contrast for trust/freshness/approval chips.
- Non-color labels for status indicators.
- Empty states that suggest useful next actions.
- Loading states for ingestion and search.
- Error states with retry and human-readable explanation.

---

## 9. AI requirements and boundaries

### 9.1 AI may

- summarize source artifacts;
- generate slide/unit titles and summaries;
- suggest taxonomy;
- suggest variants and duplicates;
- suggest similarity edges;
- suggest canonical candidates;
- generate ContentBlock candidates;
- recommend content for Storyboard gaps;
- identify stale or risky content;
- summarize comments and notes;
- create initial storyboard sections;
- generate speaker-note suggestions;
- explain ranking/rationale.

### 9.2 AI may not silently

- merge families;
- reassign variants;
- set canonical status;
- overwrite approved metadata;
- remove comments or notes;
- alter build manifests;
- approve or publish externally-facing content;
- hide provenance or confidence signals.

### 9.3 AI provenance

All AI-generated or AI-linked metadata must record:

- source pipeline/model reference where feasible;
- generated field name;
- confidence;
- timestamp;
- human override state;
- review result where applicable.

---

## 10. Data and architecture requirements

### 10.1 System of record

PostgreSQL is the system of record for metadata, graph relationships, comments, notes, manifests, audit logs, search metadata, and operational state. Object storage is the system of record for binaries and rendered assets. Vector retrieval starts with pgvector.

### 10.2 Required architecture components

- Next.js + React + TypeScript frontend.
- FastAPI + Python backend.
- PostgreSQL with pgvector.
- PostgreSQL full-text search initially.
- S3-compatible object storage.
- Redis queue and worker framework.
- OIDC/enterprise SSO-ready authentication.
- Background job telemetry.
- API-first contracts.

### 10.3 Build manifest

Every published or versioned WorkProduct composition should be reproducible through a build manifest. MVP should create manifest-compatible records even if package generation is deferred.

---

## 11. MVP release definition

MVP is complete when:

1. A user can upload a deck and see it decomposed into searchable ContentUnits.
2. ContentUnits support family/variant/version separation.
3. Library supports family-first browsing and variant expansion.
4. Search works across ContentUnits, ContentBlocks, and WorkProducts.
5. Users can inspect variants, versions, provenance, trust, comments, notes, and where-used.
6. Users can create ContentBlocks from multiple ContentUnits.
7. Users can create Storyboards with sections, slots, gaps, inserted units/blocks, comments, and snapshots.
8. Reviews Hub supports duplicate/variant/stale/approval review flows.
9. AI suggestions are traceable and reviewable.
10. The system exposes job status, audit logs, and basic admin controls.

---

## 12. Future roadmap themes

### Phase after MVP: Plays

- Play families, variants, versions.
- Play Storyboards.
- Play steps and recommended content families/blocks.
- Play success criteria and fit diagnostics.

### Phase after Plays: OpportunityWorkspaces

- Opportunity context model.
- Recommended plays/work products/content.
- Account-specific relevance and rationale.
- Candidate comparisons.
- Saved selections and decision log.

### Phase after OpportunityWorkspaces: Packaging and publish

- Export to PPTX/PDF.
- Package checklist.
- Approval routing.
- Compliance validation.
- Version summary and provenance report.

### Advanced intelligence

- Stronger visual similarity.
- Graph-based recommendations.
- Human feedback learning loops.
- Usage-aware freshness and trust scoring.
- Automated content gap detection.
- Agentic curation assistants.

---

## 13. Product guardrails

1. Do not overload ContentUnit into a bundle.
2. Do not collapse variant, version, similarity, and composition into one relationship table without typed semantics.
3. Do not expose all variants/versions flat by default.
4. Do not blur review comments, persistent comments, and curated notes.
5. Do not let AI silently change canonical relationships.
6. Do not treat Storyboard as a side feature.
7. Do not optimize for AI generation at the expense of content trust.
8. Do not build a PowerPoint clone before the governed graph works.
9. Do not hide provenance behind admin-only screens.
10. Do not allow scope creep into CRM/sales-enablement platform replacement before the catalog/composition wedge is excellent.
