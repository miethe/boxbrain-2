# BoxBrain v2 Risks, Decisions, and Open Questions

**Prepared on:** 2026-05-02  

---

## 1. Decision log

| ID | Decision | Rationale | Status |
|---|---|---|---|
| D001 | Use PostgreSQL as operational source of truth. | Metadata, graph relationships, manifests, comments, audit, and search metadata need ACID behavior and clear governance. | Baseline |
| D002 | Use pgvector initially for semantic retrieval. | Co-locates vectors with source metadata and avoids premature vector DB complexity. | Baseline |
| D003 | Use PostgreSQL full-text search initially. | Good MVP lexical search; external search can be added later if scale/ranking requires. | Baseline |
| D004 | Use Next.js + React + TypeScript frontend. | Strong modern web app stack and aligns with existing spec direction. | Baseline |
| D005 | Use FastAPI + Python backend. | Strong API ergonomics and Python ecosystem for document processing, AI, and workers. | Baseline |
| D006 | Treat the Claude Design single-HTML UI as reference, not source. | Production app needs typed components, accessibility, routing, API-backed state, and durable architecture. | Baseline |
| D007 | Implement family/variant/version as first-class model. | Prevents flat slide chaos and enables core differentiation. | Baseline |
| D008 | Keep similarity separate from variant/version. | Similarity is discovery/review intelligence, not identity. | Baseline |
| D009 | Make Storyboard structured rather than freeform canvas. | Ensures publishability, snapshots, comments, and build manifests. | Baseline |
| D010 | AI suggestions create candidates, not silent graph changes. | Maintains human governance and trust. | Baseline |
| D011 | Defer native slide editing. | High effort and not required for the catalog/composition wedge. | Baseline |
| D012 | Defer full OpportunityWorkspace and Plays until catalog/search/storyboard foundation is usable. | Reduces scope risk and maximizes MVP credibility. | Baseline |

---

## 2. Major risks and mitigations

### R001 — PPTX rendering and extraction fidelity

**Risk:** Slide previews, text extraction, speaker notes, and layout hints may be inconsistent across templates, fonts, embedded objects, charts, and animations.

**Impact:** High. Ingestion quality is foundational.

**Mitigation:**

- Separate visual rendering from semantic extraction.
- Use fixture decks with known tricky cases.
- Track render/extraction failure modes by file.
- Preserve original file and source refs.
- Implement stage-level retries.
- Defer advanced object-level slide editing.

### R002 — Model complexity slows implementation

**Risk:** Family/variant/version, similarity, composition, comments, notes, and provenance can overwhelm early engineering.

**Impact:** High.

**Mitigation:**

- Implement core tables early but expose only MVP workflows.
- Use explicit APIs and command endpoints.
- Keep schema tests for domain invariants.
- Avoid generic shortcuts that erase semantics.

### R003 — AI suggestions damage graph quality

**Risk:** Auto-linking or auto-merging can create incorrect families/variants and reduce trust.

**Impact:** High.

**Mitigation:**

- AI suggestions become review candidates.
- Show confidence and rationale.
- Require curator/reviewer actions for canonical/merge/link changes.
- Store human override state.

### R004 — Search relevance is noisy

**Risk:** Hybrid search may return visually plausible but contextually wrong content.

**Impact:** High for user adoption.

**Mitigation:**

- Create eval queries early.
- Track clicks and zero-result queries.
- Show explanation chips.
- Tune ranking profiles.
- Use family-first grouping to reduce clutter.

### R005 — Trust indicators become visual clutter

**Risk:** Too many chips and warnings can overwhelm users.

**Impact:** Medium.

**Mitigation:**

- Use progressive disclosure.
- Show essential chips on cards, details in drawer.
- Put deep provenance in drawer/timeline.
- Validate with real workflows.

### R006 — Storyboard becomes too broad

**Risk:** Storyboard tries to become a full authoring/canvas/editor tool.

**Impact:** High.

**Mitigation:**

- Constrain MVP to sections, slots, gaps, snapshots, comments, and insert/swap.
- Defer full slide editing.
- Keep build manifest compatibility.

### R007 — Permissions leak restricted content

**Risk:** Search grouping, similarity edges, thumbnails, or where-used references could expose restricted content.

**Impact:** High.

**Mitigation:**

- Apply permission filters before ranking/grouping output.
- Do not return unauthorized snippets or thumbnails.
- Add security tests around search and where-used.
- Audit restricted-state changes.

### R008 — Governance workload becomes too high

**Risk:** Duplicate/variant/stale queues may overwhelm curators.

**Impact:** Medium-high.

**Mitigation:**

- Prioritize high-confidence/high-impact candidates.
- Batch actions where safe.
- Use queue filters and SLA/aging indicators.
- Allow “not now” / snooze states.

### R009 — AI coding agents create architectural drift

**Risk:** Agents may flatten model semantics, introduce hidden dependencies, or alter architecture without intent.

**Impact:** Medium-high.

**Mitigation:**

- Use AGENTS.md/CLAUDE.md with domain invariants.
- Use task cards with acceptance criteria.
- Keep high-risk changes small.
- Use reviewer-agent pattern.
- Require tests and human review.

### R010 — Scope creep into sales enablement suite

**Risk:** CRM integrations, deal rooms, coaching, buyer engagement, and analytics could distract from core product.

**Impact:** Medium-high.

**Mitigation:**

- Keep MVP wedge: governed content graph + composition.
- Add integrations after usage patterns are proven.
- Position BoxBrain as complement to enablement suites, not immediate replacement.

### R011 — Content rights/compliance are under-modeled

**Risk:** Users may reuse client-sensitive, outdated, or restricted material.

**Impact:** High in enterprise contexts.

**Mitigation:**

- Include rights/restriction metadata early.
- Surface restricted/client-safe chips.
- Add package checklist later.
- Audit reuse of restricted content.

### R012 — Visual design overfits initial HTML mockup

**Risk:** Implementation recreates the visual mockup but misses data-backed states, accessibility, and scalable UX.

**Impact:** Medium.

**Mitigation:**

- Translate the mockup into component/state inventory.
- Build against real API contracts and seed data.
- Add loading/empty/error/restricted states.
- Use Storybook/Ladle or equivalent.

---

## 3. Open questions

### Product scope

1. What is the first pilot corpus: internal innovation decks, consulting/sales decks, proposal decks, or mixed enterprise materials?
2. Should MVP support only PPTX first, or PPTX + PDF from day one?
3. Are ContentUnits initially only slides/pages, or should charts/tables/text blocks be extractable in MVP?
4. Should Plays and Opportunities be visible as disabled/future modules in MVP navigation, or hidden until functional?
5. How much manual curation is expected before pilot users interact with the catalog?

### UX/design

6. Which Claude Design screens are canonical visual references?
7. Are there existing brand tokens, or should BoxBrain define its own temporary design system?
8. Should Storyboard use drag/drop in MVP or controlled insert/reorder buttons first?
9. How visual should the variant explorer be in MVP versus a simpler detail-page tab?
10. Should the Library default to grid, table, or split view for power users?

### Data/model

11. Should taxonomy be normalized from day one or stored as JSONB initially?
12. What are the minimum required taxonomy dimensions for pilot?
13. Should family/variant linking apply automatically at ingest for exact source duplicates, or always go through review?
14. How should WorkProduct-level variants differ from Storyboard snapshots in UX language?
15. What constitutes stale content in the first pilot: age, source update, manual state, or dependent object changes?

### Technical

16. What deployment environment is preferred for initial pilot?
17. Will object storage be AWS S3, MinIO, or another S3-compatible provider?
18. Which auth provider/SSO should be targeted first?
19. Are external LLM/embedding providers allowed for pilot content?
20. What security constraints apply to uploaded decks?
21. Should OpenSearch be introduced during pilot or deferred until Postgres search limits are hit?
22. Should export/package generation be built as a skeleton now or deferred entirely?

### AI agent workflow

23. Which agent should be primary for repo implementation: Claude Code, Codex, or a hybrid?
24. Should agent-generated commits be labeled or separated by branch convention?
25. Which MCP servers are worth enabling early: GitHub, Figma/design, database, docs, Linear?
26. What is the policy for agents accessing uploaded content or proprietary decks?

---

## 4. Suggested ADRs to create in the implementation repo

1. ADR-001: System of record and database choice.
2. ADR-002: Family/variant/version schema design.
3. ADR-003: Ingestion rendering/extraction strategy.
4. ADR-004: Search architecture and ranking profiles.
5. ADR-005: AI output provenance and review policy.
6. ADR-006: Storyboard model and snapshot semantics.
7. ADR-007: Permissions and restricted content handling.
8. ADR-008: Design-system and component approach.
9. ADR-009: Agentic development workflow and review rules.
10. ADR-010: Export/publish strategy.

---

## 5. Go/no-go gates

### Alpha go/no-go

- Upload/decomposition works on fixture decks.
- Library and detail pages show family/variant/version correctly.
- Search returns useful results on seed corpus.
- No major unauthorized content leakage in tests.
- Ingestion failures are visible and retryable.

### MVP pilot go/no-go

- Core E2E flows pass.
- Review queue actions are audited.
- Storyboard snapshots work.
- Search eval results are acceptable for pilot corpus.
- Basic RBAC is enforced.
- Admin has job/search health visibility.

### Production go/no-go

- SSO and permission model validated.
- Backups and retention process established.
- Security review complete.
- Performance tested at expected corpus size.
- Compliance/rights process defined.
- Support/runbook exists.

