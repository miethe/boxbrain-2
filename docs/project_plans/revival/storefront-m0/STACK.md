# Static storefront stack decision

## Recommendation

Use **Astro with Markdown content collections, TypeScript schema validation and Pagefind**, in a future `apps/storefront` package beside the existing applications. Astro's build-time content loading and schema validation suit this small typed file graph, while pages can remain static HTML and search can run in the browser. [Astro content collections](https://docs.astro.build/en/guides/content-collections/) document these mechanisms; [Pagefind](https://pagefind.app/docs/) indexes static output for browser search. **Next.js static export** is viable and shares the existing frontend stack, but its server-feature constraints and React application conventions add coordination cost for a content-only front door; see [static export guidance](https://nextjs.org/docs/app/guides/static-exports). **Eleventy** is a strong low-JavaScript alternative with flexible [frontmatter](https://www.11ty.dev/docs/data-frontmatter/), but the proposed typed graph validation would need more project-owned integration. Astro is a design recommendation, not an installed dependency or a claim that a specific version has been tested. Pin supported releases and review dependency/security policy in the first build leg. Source documentation checked 2026-11-10.

## Content mount and reproducibility

The tool repo owns templates, schemas and fictional fixtures only. An instance repo owns `<root>/<practice>/...` Markdown and approved assets. The private CI job checks out a pinned tool commit and a pinned instance commit into sibling directories with separate credentials, then supplies an explicit absolute `STOREFRONT_CONTENT_ROOT` path. The loader reads only that root; production must fail if it is missing, invalid or accidentally points at sample content. No default fallback or merging real and fictional trees. Do not put private content in a tool repo submodule, commit it here, or let a bundler import the raw instance tree into browser code. Build receipts record both commits and schema version privately. Local preview can deliberately select the checked-in sample root.

Build inputs also include required `STOREFRONT_EDITION=org-wide|seller`, a configured static base path and the instance's approved external-domain list. Names are a proposed interface, not implemented commands. Fail closed on unset/unknown edition. No client secrets. A clean edition-specific output folder contains HTML, CSS, minimal JavaScript, search shards and referenced allowed assets. It must deploy under a base path without hard-coded host names.

## Adding the second practice

Create another practice folder in the instance repo, allocate a unique immutable key and IDs, copy the schema structure rather than Northstar's identity, author its Practice and children, and approve them. Validation scans immediate practice folders; routes and the multi-practice index derive from the registry with no template change or manual route registration. The first build includes a two-practice fixture test to prove this mechanism without committing real practice content. No cross-practice relationships until a later contract adds them.

## Search and publication boundary

Generate pages from a prefiltered registry, then run Pagefind separately on each clean edition output. Index only marked content regions; omit global navigation, private provenance receipts and hidden material. Expose kind, offering, practice and tags as filter metadata. Use a small browser UI with no remote search service, embedding API or external analytics. The initial library indexes record text, not remote links or binaries. Rebuild on accepted content changes; no live content fetch or runtime identity lookup.

The org-wide build must never receive seller text in its render inputs. Load files in a trusted build process, partition objects and supporting files, project relationships, then render/copy/index the selected edition. Copy only assets referenced by included objects; never copy a whole content directory into `public/`. Audit the final artifact including JS, JSON, index shards, source maps and download paths using seeded private canaries. The sample's expected projection is specified in CONTENT-MODEL.md.

An edition label or CSS visibility is not access control. Deploy seller output behind host-provided seller-group authorization, including direct asset requests; protect org-wide output behind organizational sign-on. If the selected host can only enforce one company-wide group, deploy only the org-wide build until a separate protected seller deployment exists. Never publish seller assets merely because the site has login. Host configuration is verified by its authorized operator; no host endpoint or identity code belongs in this generic repo.

## Integration boundary

No changes to `apps/web`, API, worker, domain entities or OpenAPI. Stable IDs and content provenance allow a later explicit mapping into v2 families/variants/versions; no ingestion call to v2 is required for the first usable storefront. Updates happen by file PR and human approval. Deployment is an instance concern, separate from this design node.
