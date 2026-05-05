# Pilot Workflows

Use these as operator-facing runbooks for the Milestone 6 demo and pilot readiness checks. The frontend API client sends an admin-scoped default user header in the web app; direct API probes should set `x-boxbrain-user` and `x-boxbrain-role` explicitly.

## Admin Workflow

Goal: confirm the system is observable, uploads are trackable, failures are recoverable, and governance actions leave an audit trail.

1. Open `/admin`.
2. Confirm the admin-lite status cards and guardrail checklist render.
3. Use the embedded ingestion workspace to upload a PPTX or inspect existing jobs.
4. For each ingestion job, check status, stage, retry count, output summary, warnings, and created ContentUnit/WorkProduct links.
5. Retry failed jobs from the workspace or `POST /api/ingestion-jobs/{jobId}/retry`.
6. Confirm audit events with `GET /api/admin/audit-events` after review, approval, canonical, or freshness actions.

Relevant APIs:

- `GET /api/health`
- `GET /api/admin/health`
- `GET /api/admin/audit-events`
- `POST /api/uploads`
- `GET /api/ingestion-jobs`
- `GET /api/ingestion-jobs/{jobId}`
- `POST /api/ingestion-jobs/{jobId}/retry`

## Curator Workflow

Goal: inspect governed content, validate variants/versions, manage trust states, and keep AI suggestions reviewable.

1. Open `/library`.
2. Inspect ContentUnit family cards and WorkProduct cards.
3. Open a family at `/content-units/{familyId}`.
4. Review variant/version grouping, canonical state, approval state, freshness state, provenance, extracted text, comments, notes, similar items, and where-used references.
5. Use approval/freshness controls only when the current content state supports the decision.
6. Open `/reviews`.
7. Generate or inspect review candidates.
8. Compare candidate objects and choose an explicit action such as mark variant, mark similar, set canonical, approve, reject, or request changes.
9. Confirm governance outcomes through audit events.

Relevant APIs:

- `GET /api/content-units/families`
- `GET /api/content-units/families/{familyId}`
- `GET /api/content-units/families/{familyId}/variants`
- `GET /api/content-units/variants/{variantId}/versions`
- `GET /api/content-units/versions/{versionId}`
- `POST /api/content-units/variants/{variantId}/canonical`
- `PATCH /api/content-units/versions/{versionId}/approval`
- `PATCH /api/content-units/versions/{versionId}/freshness`
- `GET /api/content-units/{versionId}/similar`
- `GET /api/content-units/{versionId}/where-used`
- `GET/POST /api/comments`
- `GET/POST /api/notes`
- `GET/POST /api/reviews/*`

## Builder Workflow

Goal: compose reusable content into a Storyboard, freeze an immutable snapshot, and review diagnostics before publish.

1. Search in `/ask` for approved building blocks, for example `approved executive cloud modernization ROI slide`.
2. Open promising ContentUnits or WorkProducts and confirm provenance, approval, freshness, and restricted status.
3. Create or open a ContentBlock at `/content-blocks/{id}`. The current UI supports creating a block from one ContentUnit version UUID per line when the requested block is missing.
4. Create or open a Storyboard at `/storyboards/{uuid}`. The reliable live path is to create a Storyboard through the API/UI first, then use the returned UUID.
5. Add sections and slots, then fill slots with ContentUnit versions, ContentBlock versions, WorkProduct refs, or gaps.
6. Run diagnostics from the Storyboard page and resolve critical warnings before publish review.
7. Add anchored comments where review context is needed.
8. Save a snapshot. Treat snapshots as immutable demo evidence.
9. Open `/publish` for the final review screen.

Relevant APIs:

- `POST /api/search`
- `POST /api/ask`
- `GET/POST /api/content-blocks`
- `GET/POST /api/storyboards`
- `POST /api/storyboards/{storyboardId}/sections`
- `PATCH /api/storyboard-sections/{sectionId}`
- `POST /api/storyboard-sections/{sectionId}/slots`
- `PATCH /api/storyboard-slots/{slotId}`
- `POST /api/storyboards/{storyboardId}/analyze`
- `GET/POST /api/storyboards/{storyboardId}/snapshots`
- `GET /api/storyboard-snapshots/{snapshotId}`
