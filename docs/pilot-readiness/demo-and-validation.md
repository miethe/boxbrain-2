# Demo And Validation

This script is for a controlled Milestone 6 pilot-readiness demo. Prefer the in-memory seeded mode for a deterministic walkthrough, then repeat selected checks in database/S3/RQ mode when local infra is available.

## Demo Walkthrough

1. Start services.
   - Backend: `cd services/api && uv run uvicorn app.main:app --reload`
   - Web: `pnpm --filter @boxbrain/web dev`
   - Default web API base URL is `http://localhost:8000`.
2. Open `/`.
   - Show the operating console and primary navigation.
3. Open `/admin`.
   - Show admin-lite status, role model foundation, guardrail checks, and ingestion workspace.
   - Upload a synthetic PPTX or inspect seeded/created ingestion jobs.
4. Open `/library`.
   - Show ContentUnit family cards, WorkProducts, status chips, taxonomy, restricted indicators, and empty/error/restricted states if applicable.
5. Open `/ask`.
   - Run `approved executive cloud modernization ROI slide`.
   - Show profile, object type, approved-only, freshness, result-grain controls, explanation chips, and debug toggle.
6. Open a ContentUnit detail page.
   - Seed family: `/content-units/00000000-0000-4000-8000-000000000101`.
   - Show variants, versions, canonical state, provenance, extracted text, notes, comments, similar results, and where-used.
7. Open `/reviews`.
   - Show review queues and compare objects.
   - Resolve one candidate only if the demo environment is disposable, then show the audit event.
8. Build a reusable block.
   - Open `/content-blocks/{new-random-uuid}`.
   - Use these seed version IDs when creating the block:
     - `00000000-0000-4000-8000-000000000301`
     - `00000000-0000-4000-8000-000000000302`
9. Build a Storyboard.
   - Prefer creating a new Storyboard from the missing-state UI or API and use the returned UUID.
   - Add a section and fill at least one slot with the block from the previous step.
   - Save a snapshot and reload with `?snapshotId={snapshotId}`.
10. Open `/publish`.
    - Show final review context and call out remaining pilot caveats.

## Demo Corpus Expectations

Use synthetic decks only unless pilot legal/compliance approval says otherwise. The current seed corpus and `docs/project_plans/init/implementation_assets/seed_data_plan.md` expect:

- One 8-12 slide executive deck.
- A second deck with overlapping/similar slides.
- Executive, Technical, Board, and Regional variants.
- At least one approved canonical slide.
- At least one stale slide.
- At least one restricted/client-sensitive slide.
- Duplicate and similarity review candidates.
- At least two ContentBlocks.
- One Storyboard with sections, filled slots, and gaps.

Current deterministic seed IDs useful for demos:

- ROI family: `00000000-0000-4000-8000-000000000101`
- Architecture family: `00000000-0000-4000-8000-000000000102`
- Restricted family: `00000000-0000-4000-8000-000000000103`
- ROI executive version: `00000000-0000-4000-8000-000000000301`
- ROI board version: `00000000-0000-4000-8000-000000000302`
- Architecture version: `00000000-0000-4000-8000-000000000303`
- Restricted version: `00000000-0000-4000-8000-000000000304`
- WorkProduct version: `00000000-0000-4000-8000-000000000402`
- ContentBlock version: `00000000-0000-4000-8000-000000000502`
- Storyboard: `00000000-0000-4000-8000-000000000601`

## Search Eval Expectations

Search eval should measure whether governed retrieval helps a pilot user find the right reusable content without leaking restricted content.

Use the initial query set from the seed data plan:

1. `operating margin slide`
2. `board operating margin slide`
3. `cloud modernization ROI proof`
4. `executive cloud transformation narrative`
5. `technical architecture migration slide`
6. `stale QBR slide`
7. `EMEA modernization variant`
8. `customer proof slide`
9. `3 slide ROI story`
10. `approved executive summary deck`

For each query, record:

- Expected top family, variant, or version.
- Object types allowed in top results.
- Unacceptable results, especially restricted content for viewer-scoped requests.
- Whether explanation chips match the ranking reason.
- Precision@5 and zero-result status.
- Response time on the pilot corpus.

Initial pilot bar:

- Approved-only executive queries should return approved ROI or WorkProduct results in the top five.
- Technical queries should surface architecture content when available.
- Viewer-scoped search must not return restricted titles, thumbnails, snippets, similar results, or where-used references.
- Curator/reviewer/admin roles may see restricted content where policy allows.
- Debug output may be used by admins during eval, but demo users should judge visible result quality.

## Validation Commands

Fast local checks:

```bash
pnpm openapi:check
pnpm --filter @boxbrain/web lint
pnpm --filter @boxbrain/web typecheck
pnpm --filter @boxbrain/web test
pnpm backend:lint
pnpm backend:typecheck
pnpm backend:test
```

Composition and shell E2E:

```bash
pnpm e2e
```

Database/S3/RQ mode:

```bash
make infra-up
make db-migrate
cd services/api && BOXBRAIN_REPOSITORY=database BOXBRAIN_STORAGE=s3 BOXBRAIN_ENQUEUE_INGESTION=true uv run uvicorn app.main:app --reload
make worker-ingest
```

If Docker-compatible local infra is unavailable, use:

```bash
cd services/api && uv run alembic upgrade head --sql
```

Then report that live PostgreSQL, MinIO, Redis, and RQ verification was not performed.

## Current Caveats

- Real PPTX visual rendering is still adapter-backed placeholder work; render and thumbnail URIs are not proof of pixel-perfect slide rendering.
- Memory mode is the default deterministic demo path. Database/S3/RQ mode needs live infra, migrations, storage, and worker verification.
- Search is implemented, including database FTS/vector paths, but pilot performance targets must be measured on the actual pilot corpus.
- The web app defaults to admin-like headers through the API client. Role-specific restricted-content checks should be done with explicit API headers.
- RBAC is still basic role plumbing, not enterprise SSO.
- Plays and Opportunities are preview screens, not pilot-ready workflows.
- Use UUID Storyboard routes for reliable demos. The visible Storyboards nav entry currently points at a seeded slug-style path, while the API route expects UUIDs.
- Use synthetic demo decks unless the pilot has explicit approval to ingest confidential customer material.
