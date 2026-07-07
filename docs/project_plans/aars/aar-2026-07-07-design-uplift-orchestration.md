---
title: BoxBrain v2 Design Uplift Orchestration — After-Action Review
date: 2026-07-07
type: aar
session: design-uplift
---

# AAR — BoxBrain v2 Design Uplift Orchestration (2026-07-07)

## 1. Intent

Bring the barebones-but-green BoxBrain v2 MVP up to the Claude Design spec (10 screens across
`src_v2/*.jsx` + mock-ups) without flattening the domain model, close a batch of backend contract
gaps found along the way, and leave a phased handoff plan for the large shortfalls (visibility/RBAC,
AI enrichment, publish manifests) rather than building them ad hoc. The session was run as a single
orchestrated pass: audit, then parallel implementation waves, then adversarial verification, on a
baseline of full `pnpm verify` green.

## 2. What happened

1. **Audit fan-out** — 11 parallel agents produced a structured per-screen gap schema
   (`audit-digest.md` + `audit-full.json`) against `src_v2/*.jsx` and mock-up PNGs.
2. **Wave 0 (Codex GPT-5.5, xhigh)** — foundation: full design-system CSS layer, fonts, expanded
   typed UI kit, shell/nav parity. Declared frozen; no later wave could touch shared files
   (`globals.css`, `ui.tsx`, `shell.tsx`, `lib/api.ts`).
3. **8-way parallel screen waves** — file-disjoint ownership across Codex (xhigh), ICA delegates,
   and Claude agents: My Selection (0.5), Variation Explorer flagship (1), Library (2a), CU detail
   (2b), Ask BoxBrain (3a), Reviews Hub (3b), Storyboard (4a), WorkProduct/Publish (4b), Home/Plays/
   Opportunity (5a), Admin/Ingestion (5b), plus B1 (seed corpus expansion) and B2 (backend quick
   fixes) run alongside.
4. **Per-wave gates** — each delegate's output was checked via `git diff --stat` + targeted reads,
   gated on lint/typecheck/test(/build) before a scoped commit straight to `main`.
5. **Post-wave fixes** — same-origin API rewrite proxy, seed-thumbnail nulling, explorer
   canonicalization-loop fix, storyboards index page.
6. **Adversarial two-reviewer pass** — independent review over the full session diff produced
   `review-fixes-spec.md`: 1 critical, 3 high, and several medium confirmed findings.
7. **Fix batch** — all confirmed findings implemented in one delegated pass, re-verified.
8. **Close-out** — full `pnpm verify` green (web lint/typecheck/vitest/build; backend ruff/mypy/
   pytest; OpenAPI check), Playwright e2e 5/5 green, both memory and database/S3/RQ backend modes
   boot cleanly. 20 commits landed on `main` (`ec41ffe`..`9fb7d97`).

## 3. What went well

- **Structured-schema audit fan-out was cheap and reusable.** 11 agents against a fixed gap schema
  produced directly actionable per-screen specs; worth re-running after any major UI change.
- **File-disjoint wave ownership made 8-way parallel writers safe.** No merge conflicts, no cross-
  wave stepping-on-toes, because shared files were frozen after Wave 0 and screen work was scoped to
  `components/<screen>/` / `features/<screen>/`.
- **Seed-corpus expansion (B1) landed before the flagship wave**, so the Variation Explorer had real
  similarity edges (0.71–0.98) and family data to render against instead of an empty demo.
- **Per-wave green gates kept `main` always-green** — no broken intermediate state despite 8+
  concurrent delegates and mixed model providers (Codex, ICA, Claude).
- **The honest-empty-state rule held across all 10 screens** — no screen fabricated data for
  features without a backing API (ratings, usage analytics, share/collections all render disabled
  or empty rather than fake).

## 4. What went poorly / surprises

- **Green-per-wave ≠ correct.** The adversarial pass — not any per-wave gate — caught the two most
  serious defects: a critical governance-integrity bug (Reviews compare "swap" was display-only,
  while set-canonical/merge-versions applied server-side to the item's *own* target order — a
  reviewer could unknowingly record a decision against the wrong object) and a silent pagination
  truncation (frontend never consumed `nextCursor`, so Library/where-used surfaces silently capped
  at 25 items). Both are the kind of bug that passes lint/typecheck/tests/build cleanly.
- **Next.js dev-server chunk cache corrupted under multi-agent churn**, compounded by a delegate
  running `pnpm build` against the same live dev server's `.next` directory.
- **`NEXT_PUBLIC_*` build-time URL baking broke client fetches** in prod/e2e contexts; fixed by
  replacing it with a runtime-configured rewrite proxy (`BOXBRAIN_API_PROXY_TARGET`) for same-origin
  `/api/*` access.
- **React streaming creates a transient duplicate-DOM window** that hard-fails Playwright's strict
  mode locators — needed explicit settled-navigation waits added to specs.
- **One delegate stalled mid-wave** and had to be resumed via a follow-up message with targeted fix
  instructions rather than a full restart.
- **IDE diagnostics were persistently stale during multi-agent churn** — the diagnostics stream was
  actively misleading; `tsc`/typecheck output was the only trustworthy signal.
- **`op story capture` failed to run from this repo** — path resolution appears bound to another
  environment, so this AAR had to be authored manually instead of through the pipeline.

## 5. Lessons / actions

| Lesson | Apply next time |
|---|---|
| Gates prove "doesn't crash," not "is correct" | Always run an adversarial claims-vs-code pass over the full diff before calling orchestrated waves done, especially for governance/write-path logic. |
| Shared-file edits under parallel waves cause churn even when git doesn't conflict | Freeze shared files (`globals.css`, `ui.tsx`, `shell.tsx`, `lib/api.ts`) immediately after the foundation wave; enforce via wave brief, not just convention. |
| Delegates default to plausible-looking API shapes instead of the real ones | Give delegates explicit "curl the live API before wiring" instructions in the wave brief. |
| `next build` and a live dev server share `.next` and corrupt each other | Never let delegates run `next build` against a directory a dev server is using; use a separate build dir or serialize build vs. dev-server use. |
| Build-time env baking breaks portability across dev/prod/e2e | Prefer a runtime-resolved API base (rewrite proxy) over `NEXT_PUBLIC_*` baking in any Next.js app. |
| An empty demo undersells a flagship screen | Expand/verify seed data before UI waves that will be demoed against it, not after. |
| Streamed SSR pages have a transient duplicate-DOM window | Treat streamed-SSR pages as needing settled-navigation waits in e2e, not just a mount check. |

## 6. Follow-ups

- Execute the backend-handoff-plan sessions (`docs/project_plans/uplift/backend-handoff-plan.md`),
  source-aware visibility/RBAC first, then AI enrichment pipeline, publish/export manifests,
  Collections, generated typed client, multi-worker DB-mode correctness.
- Plays and Opportunities remain preview-only surfaces with no backend domain — scope and build the
  real domain model when prioritized.
- Fix the `op story capture` path-resolution bug on this machine so future AARs flow through the
  gated Signal→System pipeline instead of being authored by hand.
