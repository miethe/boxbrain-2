# Hybrid Search Skill

Use this skill when implementing Ask BoxBrain, library search, recommendation retrieval, ranking profiles, or vector/lexical indexing.

## Required context

Read only the relevant portions of:

- `docs/01_BoxBrain_v2_Final_PRD.md`
- `docs/03_Architecture_Data_API_Guide.md`
- current search service code
- current database migrations for search indexes and embeddings
- API contract for search endpoints

## Ranking goals

Search should combine:

- lexical match
- semantic match
- metadata fit
- approval/trust state
- freshness
- quality/human rating
- reuse/usage signal
- context-specific boosts

The score breakdown should be inspectable. Results should include explanation chips so users understand why an item appeared.

## Family-first behavior

- Broad queries should usually return families first.
- Specific audience/version queries may return best-fit variants or versions.
- The API should support result grouping by family and object type.
- Similarity must remain a separate relationship type, not a substitute for variant identity.

## Testing checklist

- Lexical-only query returns expected fixture.
- Semantic placeholder/vector query returns expected fixture.
- Metadata filters narrow results correctly.
- Approved-only profile excludes unapproved/deprecated objects.
- Restricted content is excluded for unauthorized users.
- Explanation chips match the scoring inputs.
- Zero-result queries are logged for product telemetry.

## Do not

- Do not return unauthorized objects and hide them only in the UI.
- Do not collapse ContentUnit, ContentBlock, WorkProduct, and Play into one ambiguous result shape.
- Do not mutate governance state during search.
