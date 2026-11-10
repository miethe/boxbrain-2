# Storefront scaffold

From the repository root, install the locked workspace dependencies with `pnpm install --frozen-lockfile`, then run `pnpm --filter @boxbrain/storefront build`. This builds clean seller and org-wide sites in `apps/storefront/dist/seller` and `dist/org-wide`, generates separate Pagefind indexes and scans the org-wide output for excluded content. Run `pnpm --filter @boxbrain/storefront test` after the build.

The generic tool owns the templates, validator and fictional samples in `content/`. A private instance owns its own practice folders and approved assets. Supply its absolute path using `STOREFRONT_CONTENT_ROOT=/absolute/path/to/private/content`; the loader reads that root only and never merges it with the sample. Set `STOREFRONT_EDITION=seller` or `org-wide` to build one edition. Do not commit private material here. The default is only for local fictional preview; an instance pipeline must set the root explicitly and record the tool and content revisions in a private receipt.

Static output must be deployed behind host-provided authorization: seller files, assets and search indexes require seller-group protection; org-wide output requires organization access. These labels and the leak scan are not access control. This scaffold assumes a host-root deployment. The site does not fetch external assets or provide an identity server.

Content format and review rules are in [CONTENT-MODEL.md](../../docs/project_plans/revival/storefront-m0/CONTENT-MODEL.md). The problem-first doorway uses `situations`; the seller panel uses the independently approved `seller_guide`; evidence uses visible featured or related collateral. Each section is omitted when no eligible data exists. The ingestion workflow is in [INGEST.md](INGEST.md). Theme selection is in [THEMING.md](THEMING.md).

Optional governance triples require `STOREFRONT_GOVERNANCE_REGISTRY` to point to a JSON array of objects with `family_id`, `variant_id`, and `version_id`; every triple must match an entry. Relative Markdown links may point to approved catalog records in the same practice, and shared records cannot link to seller-only records.
