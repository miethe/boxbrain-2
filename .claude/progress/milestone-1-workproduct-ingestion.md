---
type: milestone-progress
milestone: milestone-1-workproduct-ingestion
status: in-progress
created: 2026-05-03T20:53:07Z
updated: 2026-05-03T20:53:07Z
source_report: docs/project_plans/implementation_reports/boxbrain-v2-mvp-initial-implementation.md
implementation_plan: docs/project_plans/init/02_Initial_Implementation_Plan.md
---

# Milestone 1 - WorkProduct Ingestion Foundation

## Acceptance Gate

- [ ] Uploading a deck creates a WorkProduct detail page.
- [ ] The deck renders into a filmstrip of ContentUnits.
- [ ] Each unit has preview, text, source order, provenance, and state.
- [ ] Failed processing jobs surface actionable failure reason.

## Scope

Close the PPTX-first WorkProduct ingestion path while preserving memory mode and the database/S3/RQ integration path. Broader search, governance, PDF ingestion, and Storyboard work remain later milestones.

## Task Plan

| Task | Owner | Status | Notes |
|---|---|---:|---|
| Progress tracking | Codex | complete | Create this tracker and commit separately. |
| Backend ingestion pipeline | backend worker | pending | Stage telemetry, ordered outputs, renderer adapter, improved PPTX notes extraction. |
| Persistence and API contract | backend worker | pending | Distinct render/thumbnail persistence, embedding rows, OpenAPI/schema updates. |
| Frontend ingestion and WorkProduct UI | frontend worker | pending | Output summary, retry action, PPTX-only upload affordance, API-backed generated filmstrip. |
| Validation and review | Codex | pending | Focused tests, quality gates, gated live checks where available. |
| Implementation report closeout | Codex | pending | Update status, verification, remaining gaps, and commit refs. |

## Validation Log

Commands and outcomes will be recorded here as they run.

## Commits

- pending

## Blockers

- LibreOffice is not currently detected on `PATH`; live render verification is expected to be skipped unless `soffice` is installed before validation.
