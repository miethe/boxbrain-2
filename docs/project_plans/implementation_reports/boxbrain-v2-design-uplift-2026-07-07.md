# BoxBrain v2 — Design Uplift & Backend Readiness Session Report

**Date:** 2026-07-07
**Scope:** Bring the barebones-but-green MVP up to the Claude Design spec (design JSX in
`docs/project_plans/init/boxbrain-v2-project-handoff/project/src_v2/` + mock-ups in
`.../project/uploads/`), fix backend readiness gaps, and plan large shortfalls for future sessions.
**Method:** Orchestrated waves — an 11-agent design-gap audit fan-out, then file-disjoint
implementation waves across Codex GPT-5.5 (xhigh), ICA delegates, and Claude agent teams, each
gated on lint/typecheck/tests before scoped commits to main, closed by a two-reviewer adversarial
pass over the full session diff with confirmed findings fixed.

## What shipped (all on main, per-wave commits)

| Wave | Delivery |
|---|---|
| 0 | Design foundation: full design-system CSS component layer ported (badges/chips/stat cards/meters/score pills/match bars/ve-* explorer classes/tray/palette), Instrument Sans + JetBrains Mono via next/font, expanded typed UI kit (`ui.tsx`), sidebar/topbar design parity with Spaces group and design active states |
| 0.5 | My Selection system: typed localStorage-persisted store, topbar pill, accessible grouped slide-out drawer with quick actions; consumed by Library/Ask/Storyboard/CU detail |
| 1 | **ContentUnit Variation Explorer rebuilt (flagship)** — URL-driven, API-backed: horizontal similar-concepts rail (match badges, selection ring, keyboard nav), vertical variations stack with domain-distinct variant/version badges, center preview with honest render fallback, sticky details rail (ID/source/tags, similarity meters, extracted text), included-in panels, share/compare/add-to-deck |
| 2a | Library: five tabs with live counts, real filter facets, family grid with expand-to-variants table, similarity + insights rails, search-results mode, multi-select Add-to-Storyboard writing real storyboard/section/slots |
| 2b | ContentUnit detail: working tab system (7 tabs + overview sub-panels), trust & quality from real signals, variant carousel, versions rail, provenance grid, threaded comments + distinct notes, real slide-position metadata, wired header actions |
| 3a | Ask BoxBrain: AI composer panel (mode/filter/example chips), tabbed result sections with live counts (+ Content Blocks tab for domain correctness), rank badges, icon-mapped explanation chips, selection rail |
| 3b | Reviews Hub: queue tab strip with real counts, sortable/filterable list with confidence rings, compare workspace with AI-analysis panel, five-tab evidence strip, compare drawer; all governance write actions preserved |
| 4a | Storyboard workspace: three-panel composition (canvas with section/slot DnD + keyboard reorder, AI-ranked library tray, five-tab inspector), snapshot diff/compare, anchored threaded comments + notes, honest metrics strip |
| 4b | WorkProduct detail (tabs, deck carousel, composition table, collaboration rail) + scoped `/publish/[id]` package-review flow (stepper, checklist, outputs, distribution preview) |
| 5a | Home dashboard (live stats, attention feed, signal-driven suggestions panel), Plays (category tabs + new detail route), Opportunity workspace — preview surfaces clearly bannered |
| 5b | Admin five-tab dashboard (pipeline/queue telemetry, search & eval, audit-log browser on the previously-unconsumed audit-events API) + Ingestion polish (restricted states, skeletons, honest upload copy) |
| B1 | Seed corpus expanded to a design-matching demo story: 6 market-story families, similarity edges 0.71–0.98 powering the explorer rail, where-used refs, comments/notes, 2 new review items (additive; deterministic IDs) |
| B2 | Backend quick fixes: real cursor/limit pagination on all list endpoints (+ families `mode`), generate-candidates request body honored, asset visibility enforcement + keyed lookup, env-configurable CORS, dead code removed; OpenAPI updated |
| — | New `/storyboards` index page (replaces hardcoded nav deep-link; fixes hanging RSC prefetch of a 404 route) |
| — | Same-origin API architecture: browser fetches `/api/*` proxied by a runtime-configured Next rewrite (`BOXBRAIN_API_PROXY_TARGET`) — kills build-time URL baking and browser CORS coupling |

## Adversarial verification (two independent reviewers over the full diff)

Confirmed findings, all fixed in-session:
- **Critical:** Reviews compare "swap" was display-only while set-canonical/merge-versions apply
  server-side to the item's own target order — a reviewer could record a governance decision
  against the wrong object. Swap control removed; display order locked to `target_refs` order.
- **High:** review-comment reply target silently reset to target[0] whenever any background version
  prefetch resolved → comments could post to the wrong version. Reset now keyed to actual target-id
  changes only.
- **High:** frontend never consumed `nextCursor` → Library/where-used surfaces silently truncate at
  25 items. Cursor-walking list helpers added and wired to all call sites.
- **High:** storyboard tray mapped Ask "custom content" items straight into slot creation → guaranteed
  422; UUID guard + disabled affordance added.
- **Medium:** offset cursors duplicate/skip under concurrent mutation → hybrid last-id cursor with
  offset fallback + regression test; Comment Resolution panel conflated comment kinds (rule 9) →
  kind chips + replies inherit thread kind; Library ContentUnit selections carried variant ids (dead
  vs the version-grain slot API) → store latest version id; CU "See all" links now preserve the
  selected version; explorer canonicalization loop fixed; fake seeded asset URIs nulled.
- Reviewers explicitly confirmed clean: asset-visibility enforcement, seed referential integrity
  (automated sweep), similarity never creating family membership, in-memory/SQLAlchemy pagination
  parity, selection-store SSR safety, same-origin/rewrite change.

## Verification status

- `pnpm verify` fully green: OpenAPI check, web lint/typecheck/vitest, backend ruff/mypy/pytest.
- Playwright e2e: 5/5 green (specs reconciled to the new IA; streamed-navigation settling added;
  storyboard section titles promoted to real headings for a11y).
- Both backend modes boot: memory (default, seeded) and database/S3/RQ via `make api-db` with
  migrations applied against compose Postgres; admin role-gating verified.
- Visual gates: flagship + Library + Storyboard + Home screenshot-reviewed against mock-ups.

## Known limitations / next sessions

- Large shortfalls are planned, not built — see `docs/project_plans/uplift/backend-handoff-plan.md`
  (source-aware visibility/RBAC, AI enrichment pipeline, publish/export manifests, Collections,
  generated typed client, multi-worker DB-mode correctness) with phased outlines and sequencing.
- Plays/Opportunities remain preview surfaces (no backend domain), clearly bannered.
- Star ratings, usage analytics, comment reactions, share/collections APIs don't exist — UIs render
  honest empty/disabled states.
- Audit trail: per-object activity timelines derive from loaded data; the global audit-events API is
  admin-gated and surfaced only in Admin.
- LibreOffice render verification still gated on a host with `soffice` (unchanged from MVP report).

## Orchestration notes (for future sessions)

- Per-screen wave prompts + shared rules live in `docs/project_plans/uplift/` (screen-wave-brief,
  audit-digest, per-wave specs). The audit fan-out (11 parallel agents, structured gap schema)
  proved cheap and highly reusable — re-run it after major UI changes.
- File-disjoint wave ownership made 8-way parallel implementation safe; shared files were frozen
  after Wave 0 and only touched by the orchestrator.
- Green-per-wave ≠ done: both FIX-FIRST verdicts came from the adversarial pass, not the gates.
