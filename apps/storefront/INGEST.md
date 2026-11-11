# Draft intake skeleton

Follow the inventory, extraction, provenance and human review workflow in [the M0 ingest runbook](../../docs/project_plans/revival/storefront-m0/INGEST.md). This script only creates metadata drafts; it does not extract, copy, validate or approve source material. Run it in the authorized private instance, never against real source material in this tool repository.

Create a JSON manifest with `practice_key`, `practice_id`, a non-empty `offering_ids` array and a non-empty `sources` array. Each source has `title`, `type` (a collateral kind), and `path`. Local paths must be instance-relative under `assets/seller-only` and include an explicit `rights` of `fictional-original` or `approved-internal`; external links use HTTPS and `type: external-link`. Paths are references, not copied files. The operator must establish rights and place authorized assets before attempting publication.

```sh
python3 apps/storefront/scripts/ingest.py /private/path/manifest.json /private/path/collateral
python3 -m unittest discover -s apps/storefront/tests -v
```

Drafts are seller-only and require human review. IDs are derived from the source location, so preserve the location or explicitly migrate the ID on a move. The script refuses to overwrite existing drafts; reconcile revisions manually. Its placeholder provenance and summaries must be replaced during review. This is not a batch receipt, a source extractor, or a publication pipeline.
