# BoxBrain v2 Contracts

This directory holds shared API contracts for the monorepo. The starter OpenAPI contract was copied from `docs/project_plans/init/implementation_assets/openapi.boxbrain.v2.yaml` and should be treated as the source for generated client/server types once those packages exist.

## Files

- `openapi/boxbrain.v2.yaml`: starter MVP API surface for health, ingestion, search, reviews, comments, notes, content units, content blocks, work products, and storyboards.

## Workflow

- Keep contract changes explicit and reviewable.
- Update the contract before or alongside API route changes.
- Run `pnpm openapi:check` after editing the contract.
- Add type generation under `pnpm types:generate` when frontend and backend packages are ready.
