# BoxBrain v2 MVP Architecture Notes

Generated: 2026-05-03

## Current Shape

- Monorepo scaffold:
  - `apps/web`: Next.js App Router frontend.
  - `services/api`: FastAPI backend with domain/application/API layers.
  - `services/worker`: deterministic ingestion/search helper surface.
  - `contracts/openapi`: starter OpenAPI contract copied from the planning bundle.
  - `infra`: local Postgres/pgvector, Redis, and MinIO compose setup.
- The app is seed-data backed. It is intentionally production-shaped, but not yet connected to PostgreSQL/MinIO adapters.
- Frontend routes are implemented for the primary MVP surfaces and preview-only deferred modules.

## Important Guardrails Implemented

- ContentUnit atomicity is enforced in `ContentUnitVersion.__post_init__`.
- Restricted content is filtered before viewer search output.
- Similarity review creates similarity edges without changing family identity.
- Governance actions require elevated roles and write audit events.
- Storyboard snapshots are deep-copied and immutable relative to draft edits.
- ContentBlock members preserve explicit `orderIndex`.
- AI/review suggestions remain review items until a reviewer action is taken.

## Verification Status

- `pnpm verify` passes.
- `pnpm e2e` passes.
- `pnpm --filter @boxbrain/web build` passes.
- Backend tests: 25 passing.
- Frontend unit tests: 3 passing.
- Playwright smoke tests: 1 passing.

## Known Technical Debt

- API persistence is in-memory; SQLAlchemy/Alembic adapters are still next.
- PPTX processing is represented by validation/stage/ranking helpers, not full LibreOffice/python-pptx rendering.
- Frontend data is mostly seeded locally with an API client fallback; deeper React Query integration remains.
- Contract and backend route coverage are close but not fully generated from one source.
