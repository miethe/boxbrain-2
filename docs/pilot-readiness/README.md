# BoxBrain v2 Pilot Readiness Docs

**Status:** Milestone 6 documentation slice, grounded in current code as of 2026-05-05.

Milestone 6 in `docs/project_plans/init/02_Initial_Implementation_Plan.md` calls for pilot hardening, seed/demo data, regression and E2E coverage, a scripted walkthrough, search eval expectations, and admin/curator/builder workflow documentation. These docs describe what can be shown with the current MVP routes and where pilot caveats remain.

## Current Route Map

| Surface | Frontend route | Backing API routes | Pilot role |
| --- | --- | --- | --- |
| Home console | `/` | mixed API-backed summaries | Entry point for the demo narrative. |
| Governed retrieval | `/ask` | `POST /api/ask`, `POST /api/search` | Search/Ask validation and ranking review. |
| Library | `/library` | `GET /api/content-units/families`, `GET /api/work-products/families` | Curator browse path for families, variants, versions, and WorkProducts. |
| ContentUnit detail | `/content-units/{familyId-or-versionId}` | ContentUnit family/version/similar/where-used/comment/note endpoints | Curator review, provenance, approval, freshness, notes, and comments. |
| Reviews | `/reviews` | `GET /api/reviews/*`, `POST /api/reviews/*` | Human approval path for AI/generated candidates and governance actions. |
| Ingestion workspace | `/ingestion`, embedded in `/admin` | `POST /api/uploads`, `GET /api/ingestion-jobs`, `POST /api/ingestion-jobs/{id}/retry` | Admin/operator upload, job telemetry, failure recovery. |
| Admin-lite | `/admin` | `GET /api/admin/health`, `GET /api/admin/audit-events`, ingestion APIs | Pilot operations and audit readiness. |
| ContentBlocks | `/content-blocks/{id}` | `GET/POST /api/content-blocks` | Builder reuse units for ordered slide sequences. |
| Storyboards | `/storyboards/{uuid}` | `GET/POST /api/storyboards`, sections, slots, snapshots, diagnostics | Builder composition, immutable snapshot, diagnostics, comments. |
| Publish review | `/publish` | seeded/live API context | Builder closeout screen for publish readiness. |
| Plays, Opportunities | `/plays`, `/opportunities` | preview/seed data only | Visible future-state previews, not pilot-critical workflows. |

## Docs In This Slice

- `workflows.md`: role-based admin, curator, and builder workflow runbooks.
- `demo-and-validation.md`: demo walkthrough, demo corpus/search eval expectations, validation commands, and caveats.

## Pilot Readiness Position

The MVP is suitable for a controlled pilot demo using synthetic or approved sample content. It is not yet a production pilot for confidential customer data until renderer, authz, DB/S3/RQ, search performance, and restricted-content verification are validated in the target environment.
