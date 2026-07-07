# Deferred Design Stubs — v0.1

This document outlines design problems and forward-looking directions for HTML Capsules features deferred from v0.1 release. These are not commitments, but rather **problem statements** that clarify scope, dependencies, and future decision points.

Each stub records:
- **ID** — DEFERRED-001 through DEFERRED-008
- **Title** — feature or subsystem name
- **Origin** — which Open Question (OQ) or architectural decision spawned it
- **Current behavior** — what v0.1 does instead (the workaround)
- **Future direction** — one-paragraph sketch of how to address it post-v1
- **Dependencies/blockers** — what must land first (e.g., portal backend, multi-tenant governance)

These stubs help future planning sessions promote items from candidate to tracked initiatives without re-litigating design trade-offs already encoded in the Decisions Block.

---

## DEFERRED-001: MeatyWiki Portal Route

**Origin**: OQ-1 (Local-first vs. backend-first architecture decision)

**Title**: Portal UI for capsule gallery, authenticated rendering, metadata indexing

**Current behavior**: Capsules are local-only static HTML files. No portal route. All distribution is via SkillMeat bundle (file-based propagation).

**Future direction**: Post-trial usage, if ≥3 orgs adopt capsules, build a MeatyWiki portal route (`/portal/capsules/:id`) that indexes capsules, renders them with authenticated metadata, and provides a capsule gallery view. This unblocks DEFERRED-002 and DEFERRED-007 (authenticated writeback).

**Dependencies/blockers**: Requires MeatyWiki backend + auth layer + capsule storage schema (UUID PKs, timestamps, org scoping). Post-trial gate (Phase 5 criterion #3: ≥1 successful cross-project install).

---

## DEFERRED-002: Authenticated Writeback API + Direct Application

**Origin**: OQ-3 (Writeback approval gate decision)

**Title**: Direct API endpoints for writeback application (`POST /writebacks/apply`) with audit trail and per-target permissions

**Current behavior**: Capsules export `writeback.bundle.json` and copy-paste snippets. Humans approve and apply manually (no agent auto-write).

**Future direction**: Once the portal (DEFERRED-001) exists with auth + permissions model, add a native SkillMeat writeback endpoint (`POST /api/v1/writebacks/apply`) that accepts a capsule bundle, validates permissions per target (meatywiki, ccdash, skillmeat, etc.), logs audit trail, and applies the writeback atomically. Agents can then call this endpoint post-review, compressing the candidate→review→promote round-trip.

**Dependencies/blockers**: Blocked on DEFERRED-001 (portal/backend existence). Also requires per-target RBAC model (who can promote to which system) and audit logging infrastructure.

---

## DEFERRED-003: Multi-User Realtime Collaboration

**Origin**: Product scope discussion (v0.1 is single-user local-first)

**Title**: Realtime capsule editing, @mentions, comments, shared sessions

**Current behavior**: Capsules are static files. No collaboration surface. Multiple users read the same capsule; edits are file-based (git merge).

**Future direction**: If SkillMeat becomes team-oriented (not just personal), add a realtime collaboration layer (websockets, CRDTs, or a database-backed shared state) allowing multiple users to edit planning capsules, discuss via @mentions, and surface consensus views. Depends on MeatyWiki Portal (DEFERRED-001) to host the realtime surface.

**Dependencies/blockers**: Blocked on portal backend + team scoping + websocket infrastructure. Out of scope until SkillMeat is architected for multi-user.

---

## DEFERRED-004: UI Runtime / Framework Adoption Per-Template

**Origin**: OQ-4 (JavaScript budget & framework caveat)

**Title**: Conditional framework adoption (React, Svelte, Astro) for specific capsule types when vanilla JS is insufficient

**Current behavior**: All templates use vanilla JS only (≤10KB per capsule, no external scripts, CSP `default-src 'none'`). Constraints applied globally.

**Future direction**: Once a specific capsule type proves too complex for vanilla JS (e.g., interactive diff viewer, timeline with draggable events, evidence graph explorer) OR the portal (DEFERRED-001) enables hosted runtime, allow **opt-in per-template** framework adoption with **explicit rationale recorded in that template's SPEC.md**. Vanilla JS remains the default; frameworks are exceptions with documented trade-offs.

**Dependencies/blockers**: Blocked on either (a) a specific use case surfacing during Phase 5 trial that vanilla JS cannot reasonably handle, or (b) the portal infrastructure allowing hosted Svelte/React components. Requires amendment to OQ-4 caveat policy before implementation.

---

## DEFERRED-005: CCDash Execution Event Schema Extension

**Origin**: Writeback target discovery (CCDash integration)

**Title**: Extend CCDash execution event schema to include capsule metadata and writeback targets

**Current behavior**: CCDash events are independent of capsule system. Writeback bundle exports CCDash target but assumes a static schema (execution log, result, metadata). No capsule-specific event enrichment.

**Future direction**: If CCDash becomes the primary execution event sink for agentic work, extend its event schema to include `capsule_id`, `capsule_type`, and writeback bundle references. Allows CCDash UI to render capsules inline and apply writebacks directly from execution view.

**Dependencies/blockers**: Blocked on CCDash schema governance and writeback API (DEFERRED-002). Also requires coordination with CCDash team on event format changes.

---

## DEFERRED-006: IntentTree Node Update Automation

**Origin**: Writeback target discovery (IntentTree integration)

**Title**: Automated node graph updates when capsule writebacks promote intent/evidence state

**Current behavior**: IntentTree writeback export is a snapshot. IntentTree itself is not yet implemented, so automation deferred. Manually applicable via copy-paste.

**Future direction**: When IntentTree exists, add an automated hook that applies a writeback bundle's IntentTree target by updating node metadata, recomputing evidence graphs, and invalidating stale parent/child relationships. Requires IntentTree API surface and a transaction model for multi-node updates.

**Dependencies/blockers**: Blocked on IntentTree architecture + API spec. Also depends on writeback API (DEFERRED-002) to exist first.

---

## DEFERRED-007: Automated Writeback Applier

**Origin**: OQ-3 (Writeback approval gate caveat)

**Title**: Agent-driven writeback application to all targets post-review without human copy-paste

**Current behavior**: Agents halt after capsule emission. Humans review writeback bundle and manually apply to each target (meatywiki, ccdash, skillmeat, intenttree) via copy-paste or manual edits.

**Future direction**: Once writeback API (DEFERRED-002) is implemented and per-target permissions exist, allow agents to apply pre-approved writebacks automatically. Requires a "review gate" stage where a human (or automated validator) marks a capsule's writeback bundle as approved, then agents call the writeback API (post-approval only) to promote changes atomically to all targets.

**Dependencies/blockers**: Blocked on DEFERRED-002 (writeback API) and DEFERRED-001 (portal for permissions + audit trail). Also requires explicit agent RBAC (which targets can an agent write to).

---

## DEFERRED-008: Per-Capsule Retention Policy Enforcement

**Origin**: Governance & archival discussion (multi-tenant future)

**Title**: Configurable lifecycle policies per capsule (deletion after N days, archival, retention tiers)

**Current behavior**: Capsules follow their source artifact's git lifecycle. No separate retention logic. Ephemeral local capsules can be `.gitignore`'d (e.g., `*.capsule.local.html`).

**Future direction**: Once SkillMeat is multi-tenant (DEFERRED-001 portal) and orgs want compliance/governance, add a retention policy model: per-capsule or per-org (default keep forever, compliance teams set 90-day purge, audit trails archived separately). Requires metadata tracking (created_at, last_accessed, retention_class) and async cleanup jobs.

**Dependencies/blockers**: Blocked on portal backend + RBAC + compliance requirements. Out of scope until multi-tenant governance is architected (post-Phase 5 trial).

---

## Summary Table

| ID | Title | Origin | Blocked By | Post-Phase-5 Gate |
|---|---|---|---|---|
| DEFERRED-001 | Portal route | OQ-1 | None (tier 2 initiative) | Trial: ≥1 cross-project install |
| DEFERRED-002 | Authenticated writeback API | OQ-3 | DEFERRED-001 | Portal shipped |
| DEFERRED-003 | Realtime collaboration | Product scope | DEFERRED-001 + team scoping | Team feature request |
| DEFERRED-004 | Framework adoption (per-template) | OQ-4 | Use case discovery OR DEFERRED-001 | Template complexity + written rationale |
| DEFERRED-005 | CCDash event schema extension | Target discovery | CCDash team coordination | CCDash schema change approved |
| DEFERRED-006 | IntentTree node automation | Target discovery | IntentTree API + DEFERRED-002 | IntentTree shipped |
| DEFERRED-007 | Automated writeback applier | OQ-3 caveat | DEFERRED-002 + DEFERRED-001 | Approval gate + RBAC |
| DEFERRED-008 | Retention policy enforcement | Governance | DEFERRED-001 + compliance req | Multi-tenant + audit trail |

---

## Next Steps

These stubs inform future roadmap sessions. When promoting an item from deferred to tracked initiative:

1. Check its blockers (e.g., is DEFERRED-001 complete?).
2. Re-read the Decisions Block (`.claude/plans/html_capsules_agentic_os_bundle/decisions-block.md`) to understand the trade-offs.
3. Author a new OQ or feature spike if scope changes.
4. Record the decision in that initiative's decisions block.

**Last updated**: 2026-05-15 (Phase 5, task P5-T06)
