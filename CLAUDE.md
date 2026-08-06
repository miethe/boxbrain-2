# CLAUDE.md — BoxBrain v2 Claude Code Instructions

## ⏸️ STATUS: PAUSED 2026-08-05 (HAR-006) — read before starting any roadmap work

**Roadmap and pilot-readiness work is stopped.** No named pilot user exists, so feature work here has
no signal attached. If you were dispatched to advance the roadmap, close pilot-readiness gaps, or pick
up a phase from `docs/project_plans/`: **stop and report back** — that task is based on superseded
state.

**Still in scope while paused** (all narrow, none of it roadmap work):

- **Security fixes** — never gated on this pause. The `assets.py` restricted-content leak is already
  fixed (`d1dec83`); if you find another, fix it.
- **Harvest** — extracting the family/variant/version/composition governance model as spec input for
  SkillMeat artifact dedup and MeatyWiki supersession.
- Keeping the tree buildable (dependency/security bumps), not extending it.

**Reversal condition — exactly one:** a *named* external pilot user. Then the pause lifts and the
Mission below applies again as written.

Decision record: `agentic_meta_dev/docs/portfolio-intelligence/artifacts/08-decision-queue.md`
§ HAR-006.

---

## Mission *(applies when the pause above is lifted)*

Help build BoxBrain v2: a governed enterprise slide/content graph and Storyboard platform. Focus on durable, typed, testable implementation. The initial Claude Design HTML is a visual reference only; reimplement production UI using real components and API-backed state.

## Non-negotiable domain rules

1. ContentUnit is atomic.
2. Version, Variant, Similarity, and Composition are separate relationship types.
3. Families, variants, and versions are first-class objects.
4. Similarity never silently creates family membership.
5. AI suggestions create candidates unless a human action accepts them.
6. Governance actions require audit events.
7. Provenance must be preserved through ingestion, derivation, and publishing.
8. Storyboard snapshots must preserve section/slot order and selected object refs.
9. Review comments, persistent comments, and notes are distinct.
10. Permission filtering must happen before returning search/grouped results.

## Working style

- For multi-file or uncertain work: explore first, plan briefly, then code.
- For small obvious fixes: implement directly and verify.
- Prefer targeted tests during iteration and full verification before final handoff.
- Use ripgrep/file search before guessing.
- Keep diffs scoped.
- Do not flatten the domain model to save time.
- Do not introduce dependencies without explaining why.

## Docs index

```text
Read relevant files only:
- docs/01_BoxBrain_v2_Final_PRD.md
- docs/02_Initial_Implementation_Plan.md
- docs/03_Architecture_Data_API_Guide.md
- docs/04_Product_Research_and_Design_Patterns.md
- docs/05_AI_Agent_Development_Playbook.md
- docs/07_Risks_Decisions_Open_Questions.md
- implementation_assets/openapi.boxbrain.v2.yaml
- implementation_assets/initial_db_schema.sql
```

## Verification commands

Update these after repo initialization.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
ruff check .
pytest
mypy app
alembic upgrade head
pnpm verify
```

## UI implementation reminders

- Build accessible components.
- Use status chips for approval/freshness/canonical/restricted/link-source.
- Include loading, empty, error, and restricted states.
- Storyboard is structured: sections and slots, not a freeform canvas.
- Detail pages should expose variants, versions, similar, comments, notes, provenance, where-used.
- Search cards should show explanation chips and trust indicators.

## Backend implementation reminders

- Use transactions for governance commands.
- Write audit events for state/link/canonical/review actions.
- Preserve source order for extracted slides.
- Keep ingestion stages idempotent and retryable.
- Store AI outputs with model/pipeline/prompt/confidence metadata.
- Use explicit command endpoints for high-impact actions.


## AOS operating doctrine (look-first / save-after)

The launchpad's shared, token-tight doctrine index —
[`../agentic_meta_dev/.claude/rules/aos-operating-rules.md`](../agentic_meta_dev/.claude/rules/aos-operating-rules.md)
(sibling-repo relative path) — splits each AOS subsystem's **look-first** instruction from its
**save-after** gate (or "advisory only"). Consult it before reaching for a subsystem.
**Fallback:** if this repo is relocated or cloned standalone (the launchpad is not a sibling
directory), re-vendor the file locally at `.claude/rules/aos-operating-rules.md`.

> Installed via the `aos-native-by-default` initiative (IntentTree node `node_01KXKEH3QWGK404JBMHW1RWCTQ`).
