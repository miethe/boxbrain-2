# AGENTS.md — BoxBrain v2 Repository Instructions

## Project summary

BoxBrain v2 is a governed enterprise slide/content catalog and composition platform. It ingests decks and business artifacts, decomposes them into atomic ContentUnits, organizes them into families/variants/versions, supports ContentBlocks and Storyboards, and exposes provenance, trust, comments, notes, review queues, and hybrid search.

## Critical domain invariants

- ContentUnit is atomic. Never model a multi-slide bundle as one ContentUnit.
- Keep Version, Variant, Similarity, and Composition separate.
- Family -> Variant -> Version applies to ContentUnits, ContentBlocks, WorkProducts, and Plays.
- Similarity edges do not imply shared family identity.
- Composition must preserve ordered membership.
- Storyboard snapshots must be immutable once saved.
- Review comments, persistent comments, and notes are distinct systems.
- AI suggestions must be traceable and reviewable. Do not silently merge families, set canonical variants, approve content, or overwrite approved metadata.
- Provenance is required for major versions and generated/derived content.
- Governance actions must write audit events.
- Restricted content must not leak through search, thumbnails, snippets, where-used, or similarity output.

## Docs index

Read only the relevant docs before changing code.

```text
[BoxBrain Docs Index]
|product: docs/01_BoxBrain_v2_Final_PRD.md
|implementation: docs/02_Initial_Implementation_Plan.md
|architecture: docs/03_Architecture_Data_API_Guide.md
|research: docs/04_Product_Research_and_Design_Patterns.md
|agent_playbook: docs/05_AI_Agent_Development_Playbook.md
|risks: docs/07_Risks_Decisions_Open_Questions.md
|openapi: implementation_assets/openapi.boxbrain.v2.yaml
|schema: implementation_assets/initial_db_schema.sql
|IMPORTANT: Prefer these docs and repo code over model memory.
```

## Expected stack

- Frontend: Next.js, React, TypeScript.
- Backend: FastAPI, Python, Pydantic.
- Database: PostgreSQL with pgvector.
- Search: PostgreSQL full-text + pgvector initially.
- Storage: S3-compatible object storage.
- Queue: Redis-backed worker framework.

## Common commands

Update these once the repo is initialized.

```bash
# Frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e

# Backend
ruff check .
pytest
mypy app
alembic upgrade head

# Contracts
pnpm openapi:check
pnpm types:generate

# All
pnpm verify
```

## Workflow

- For non-trivial changes, explore first, then propose a brief plan, then implement.
- Use existing patterns before introducing new abstractions.
- Prefer small, reviewable diffs.
- Add or update tests for domain invariants and command endpoints.
- After changes, summarize changed files, tests run, and any residual risks.
- Do not add new production dependencies without a clear reason.
- Do not commit secrets or real confidential content.

## Definition of done

- Acceptance criteria are satisfied.
- Types/schemas/contracts are updated.
- Relevant tests pass or a clear reason is provided.
- API changes are reflected in OpenAPI if applicable.
- Migrations are included for schema changes.
- Permissions/audit/provenance are considered.
- Loading/empty/error/restricted UI states are handled for user-facing changes.
- AI-generated metadata remains traceable and reviewable.

