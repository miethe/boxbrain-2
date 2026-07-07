# BoxBrain v2 — Design Uplift & Backend Readiness Plan (2026-07-07 session)

Source of truth for this session's orchestration. Gap details: `audit-digest.md` (per-screen) and
`audit-full.json` (structured). Baseline: full `pnpm verify` green; API healthy in memory and
database modes; migrations apply cleanly.

## Principles

- Design truth: `src_v2/*.jsx` when a screen exists there; mock-up PNGs fill gaps.
- Domain rules from CLAUDE.md are non-negotiable (similarity ≠ family, chips vocabulary, states).
- Every wave gates on: `pnpm --filter @boxbrain/web lint + typecheck + test + build` (frontend) or
  backend ruff/mypy/pytest — then scoped commit to main.
- After Wave 0, screen waves may NOT edit shared files (`globals.css`, `ui.tsx`, `shell.tsx`,
  `lib/api.ts`); screen-specific components live in `apps/web/components/<screen>/` or
  `apps/web/features/<screen>/`.

## Waves

| Wave | Scope | Owner | Depends on |
|---|---|---|---|
| 0 | Tokens, CSS component layer, UI kit, shell/nav, fonts | Codex GPT-5.5 xhigh | — |
| 0.5 | My Selection provider + drawer (design `my_selection.jsx`) | delegate after W0 | W0 |
| 1 | Variation Explorer rebuild (flagship) — `wave-1-variation-explorer-spec.md` | Codex GPT-5.5 xhigh | W0 (+seed corpus for demo data) |
| 2a | Library rebuild (family-first browse, filters, variant expansion) | delegate | W0 |
| 2b | ContentUnit detail polish (tabs, overview/variants layout) | delegate | W0 |
| 3a | Ask BoxBrain polish | delegate | W0 |
| 3b | Reviews Hub + compare polish | delegate | W0 |
| 4a | Storyboard workspace polish | delegate | W0 |
| 4b | WorkProduct detail/deck + Publish polish | delegate | W0 |
| 5 | Home dashboard, Plays, Opportunities, Admin, Ingestion | delegate(s) | W0 |
| B1 | Seed demo corpus expansion (memory mode) | ICA (running) | — |
| B2 | Backend quick fixes: pagination wiring, review-generate body, assets visibility+index, CORS env | delegate | B1 (same files) |
| H | Handoff plan for large shortfalls (visibility/RBAC, AI enrichment, publish manifests, collections, generated client, multi-worker DB) | Fable + drafting agent | audit |

## Backend audit highlights (for B2 and H)

- Contract drift: list endpoints ignore cursor/limit/mode params the client already sends;
  `POST /api/reviews/candidates/generate` ignores its request body; `GET /api/admin/audit-events`
  unused by frontend; dead `get_actor` in `app/dependencies.py`.
- DB-mode: boots and serves with Makefile-provided env (`make api-db`); admin role gating works.
- Large shortfalls (handoff, do NOT build now): source-aware visibility/RBAC; AI enrichment
  pipeline; build/export/publish manifests; Collections; generated typed client; multi-worker
  DB-mode correctness.

## Verification & commit protocol

1. Delegate finishes → orchestrator reviews `git diff --stat` + targeted reads + runs scoped verify.
2. Visual check on key screens via dev server (web :3300 / api :8300, memory mode).
3. `git add <wave paths> && git commit` to main, one commit per wave.
4. Final: full `pnpm verify`, adversarial review pass over the session diff, implementation report.
