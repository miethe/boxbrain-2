# BoxBrain v2 MVP Implementation Findings

Generated: 2026-05-03

## What Worked

- The handoff design language translated cleanly into a reusable Next.js shell with dark nav, light workspace, compact cards, chips, slide thumbnails, review panels, storyboard sections, and preview modules.
- The seeded FastAPI domain model is enough to verify the critical invariants before adding database persistence.
- Keeping Plays and Opportunities as preview-only modules reduced scope risk while preserving the handoff navigation.
- Offline/system font fallbacks were necessary because `next/font` attempted to reach Google Fonts during build in the restricted environment.

## Risks To Address Next

- The current ingestion flow validates PPTX metadata and models stages, but does not yet render slides or extract text from actual files.
- The OpenAPI contract is copied into `contracts/`; backend schemas are manually aligned rather than generated from the contract.
- RBAC is local/dev header driven. A real auth provider and tenant/org model need to replace it before pilot content.
- Search ranking is deterministic seed logic. PostgreSQL full-text and pgvector adapters are required for realistic corpus behavior.

## Suggested Next Engineering Slice

1. Add Alembic migration wiring from `infra/initial_db_schema.sql`.
2. Add SQLAlchemy repositories for catalog, reviews, storyboards, ingestion jobs, audit events, comments, and notes.
3. Replace the in-memory repository dependency with a database-backed adapter under feature flags.
4. Implement real PPTX artifact storage in MinIO and a worker path for validation, render, extract, index.
5. Generate the frontend API client from `contracts/openapi/boxbrain.v2.yaml` and replace local demo fallbacks route by route.
