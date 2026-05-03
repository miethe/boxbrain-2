# Slide Ingest Skill

Use this skill when implementing or modifying deck ingestion, slide extraction, rendering, provenance, or async ingest jobs.

## Required context

Read only the relevant portions of:

- `docs/01_BoxBrain_v2_Final_PRD.md`
- `docs/03_Architecture_Data_API_Guide.md`
- `implementation_assets/initial_db_schema.sql`
- current ingest worker code
- current migration files

## Domain invariants

- A `ContentUnit` is atomic. One source slide/page/visual becomes one ContentUnit version, not a bundle.
- A `WorkProductVersion` represents the source artifact revision.
- Provenance must connect extracted ContentUnit versions back to the source WorkProduct version and original file/object storage URI.
- Extraction jobs must be retryable and idempotent where practical.
- Heavy parsing/rendering must happen asynchronously.
- Do not discard source binaries or rendered assets unless retention policy explicitly allows it.

## Preferred implementation pattern

1. Validate file metadata and permissions synchronously.
2. Persist WorkProduct family/variant/version and ProvenanceRecord.
3. Store file in object storage.
4. Create ingest job with a deterministic idempotency key.
5. Worker extracts slide/page units.
6. Worker creates render assets, extracted text, notes, thumbnail references, and candidate taxonomy.
7. Worker records job events and index-refresh events.
8. AI enrichment runs as a separate optional step after deterministic extraction.

## Tests to add or update

- Upload acknowledgement is fast and does not run full extraction synchronously.
- Retry does not create duplicate units when idempotency key matches.
- Failed extraction records useful job error state.
- Provenance exists for every created ContentUnitVersion.
- Search index refresh is requested after successful extraction.

## Do not

- Do not connect external AI calls directly inside core extraction transaction.
- Do not merge variants or families during ingest without creating a review item.
- Do not set canonical based only on model confidence.
