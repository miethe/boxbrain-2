# From selected direction to first usable storefront

Entry condition: Nick selects a pair in OPTIONS.md, or approves one revised hybrid pair. This plan authorizes no build in M0. Each row is one future whole-node leg: its owner finishes implementation, relevant tests, hooks, commit and reviewable PR before returning. No partial handoff between a writer and a separate fixer. One integration owner sequences merges and rechecks dependent work. Default execution lane is default delegated lane; no additional agents are dispatched by this design package.

## Leg 1 — Content loader and release boundary

**Lane:** default delegated lane. **Depends on:** direction decision and this schema. **Return:** one PR with an isolated `apps/storefront` package, pinned static stack, schema loader and fixture tests.

Acceptance criteria:

1. Content root and edition are explicit required build inputs; production rejects sample fallback and unknown editions. Existing apps remain independently buildable.
2. Validate the complete file graph, field tables, ownership, ordered membership, path containment, review metadata and assets. Error messages name file and field. Invalid references, traversal/symlinks, duplicate identities, unsafe Markdown and missing assets have meaningful failure tests.
3. Project the registry before rendering and asset copy. A fixture with private unique canaries proves org-wide output lacks seller IDs, text and downloads; draft/retired files never publish.
4. Original sample works and a second fictional practice is added only through files. A content rename preserves ID and produces an edition-safe alias redirect.
5. Both clean static exports record tool/content revisions and included IDs; no runtime server or identity dependency. Tool documentation explains private mounts without actual private values.

## Leg 2 — Complete browse journeys in the selected direction

**Lane:** default delegated lane, with browser verification on an a browser-capable host. **Depends on:** merged leg 1. **Return:** one PR and screenshot evidence for desktop/mobile.

Acceptance criteria:

1. Implement all SITE-MAP.md pages and edition-aware navigation from files, including multi-practice index, offering anatomy, ordered play stages and collateral detail actions. Sample download labels match actual formats.
2. The chosen pair's hierarchy is recognizable at 1600×1000; keyboard use and 390px-wide layouts work without clipping. Full content remains available without JavaScript.
3. Seller journey reaches a play, sales guide and useful asset; org-wide journey reaches an offering, fictional case and approved artifact. No hidden content appears in navigation/counts/404s.
4. Cover empty library, missing route, unavailable seller guide and external-link affordance. Static content has no artificial loading state.
5. Inspect actual rendered captures, correct unreadable text and record differences from M0 mockups, including the issues in OPTIONS.md. This clone sandbox cannot run Chromium; use the stated browser lane, not a failed local capture claim.

## Leg 3 — Search and library completion

**Lane:** default delegated lane. **Depends on:** merged leg 2. **Return:** one PR with edition-specific Pagefind indexing, usable filters and tests.

Acceptance criteria:

1. Search visible titles/summaries/body; library query plus kind/offering/tag filters follows SITE-MAP.md semantics and can be reset. Practice selection never mixes records across practices unexpectedly.
2. Check a known title query, a body query, combined filters and zero results; unavailable index shows retry while browse remains usable. Keyboard focus and announced result counts are verified.
3. Final artifact scan covers HTML, JSON/JS, search shards, metadata, sitemap, source maps and copied assets. Private canaries and excluded IDs remain absent from org-wide output.
4. Rebuild the same content revision in clean directories and compare included IDs, routes and asset hashes. No remote analytics, content fetches or binary indexing introduced.

## Leg 4 — Private instance content rehearsal

**Lane:** the default delegated lane in an approved private execution environment; credentials and source access remain with its operator. **Depends on:** merged leg 3 and content-owner authorization. **Return:** private instance PR plus source reconciliation and correction receipts, never copied here.

Acceptance criteria:

1. Owner selects a bounded source batch covering the initial practice's most useful offerings and collateral. Every source gets an emitted ID or a named exception; inaccessible sources do not silently disappear.
2. Follow INGEST.md, preserve original binaries privately, use stable IDs and source locators, draft first and exercise one human correction before approval.
3. Same-batch retry emits no duplicate records; changed input creates a reviewable revision; published metadata is never silently overwritten.
4. Build both editions with truthful formats/rights/audience, inspect key journeys, and verify public tool repo/diffs/logs contain no real material. Owner accepts content readiness and names ongoing reviewers.

## Leg 5 — Host rehearsal and first usable release

**Lane:** default delegated lane for the packaging/documentation PR; **authorized internal platform operator** for identity-group configuration and publication because those require private platform access and organizational authority. This is the only planned separate action; no identity server is written. **Depends on:** accepted private content and leg 4 receipts. **Return:** tool/instance deployment runbook PR and private operator verification receipt.

Acceptance criteria:

1. Static output works under a configured base path on the chosen internal host. Host sign-on protects org-wide pages/assets; seller-group authorization protects every seller page, asset and search shard.
2. Operator tests signed-out, org-wide-only and seller identities, including direct asset paths. If group separation is unavailable, ship only org-wide output until it exists.
3. Test cache invalidation, rollback to a pinned accepted revision and removal of a previously seller-only asset, including old downloads and indexes. Record exactly what was checked privately.
4. A seller finds an offering, explains its boundaries and retrieves an appropriate asset; an org-wide reader explores the practice and can retrieve only allowed collateral. Practice owner signs off the first usable release.
5. Capture refresh ownership, content-review cadence and recovery instructions. Keep v2 catalog integration, authoring UI, opportunity tracking, personalization and generative recommendations outside this release.

## Completion and future governance

The first usable site is reached only after these content, journey and host checks pass. Static build success alone is insufficient. Later v2 work maps stable artifact IDs into explicit family/variant/version records and immutable ordered compositions through a new scoped node; it must not reinterpret whole decks as atomic units. Future work nodes must be filed when the direction is chosen; these legs are a plan, not already created or dispatched IntentTree nodes.
