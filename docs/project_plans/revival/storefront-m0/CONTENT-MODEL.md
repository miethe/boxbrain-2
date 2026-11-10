# Files-first storefront content model

Design contract, 2026-11-10. No site implementation is included. The sample is entirely fictional. The canonical examples are under [sample-practice](sample-practice/); the field tables below are the normative schema for a future validator.

## Objects and boundaries

A **Practice** owns a storefront and an ordered list of offerings and plays. An **Offering** describes a repeatable service: what it is, what work it entails, examples, fit and how to sell it. A **Play** is an ordered sales motion for a recognizable buyer situation, connecting stages, offerings and collateral. A **Collateral** record describes one reusable artifact or external link. A deck remains one storefront artifact, not one atomic v2 ContentUnit; later decomposition creates slide units with provenance back to this artifact. No existing v2 entity or API changes in M0.

Audience is `org-wide` or `seller-only`; it means internal readership, never permission to share outside the organization. The seller build contains both; the org-wide build contains only org-wide objects and files. Do not put seller paragraphs inside an org-wide Markdown body. Offering sales advice is a separate seller-only file, referenced by `seller_guide`, not a hidden HTML tab.

## Identity and relations

IDs use `bb:<practice-key>:<type>:<opaque-key>`, e.g. `bb:northstar:offering:001`. Practice keys match `[a-z][a-z0-9-]{1,31}`, types are `practice|offering|play|collateral`, opaque keys are three digits in this sample (production may use UUIDs). IDs are case-sensitive, globally unique within the mounted content set and immutable across renames, moves and publication. Allocate once; never recycle a retired ID. `slug` is mutable routing text, unique per type per practice. Store old slugs in `aliases` on rename and generate redirects only within the same edition. Practice key is identity, independent of its folder slug; changing it requires an explicit migration map.

`practice_id` on each child is the owning edge. Practice `offering_ids` and `play_ids` define curated order and must list every owned offering/play exactly once. Play `offering_ids` is ordered; stage `collateral_ids` is ordered. Collateral `offering_ids` gives its applicable offerings. Offering collateral and play backlinks are derived by ID, avoiding a second writable copy. No cross-practice edges in the first build; a future extension must explicitly allow and permission-check them. Similar titles never imply shared family identity.

Optional `governance` reserves explicit `family_id`, `variant_id`, `version_id` strings for later v2 mapping; all three or none, accepted only against a supplied mapping registry. Never synthesize governance approval, merge families or equate a git revision to a domain version. Git commit + source provenance identify the current file revision. Composition order remains the list order.

## Layout

```text
<content-root>/
  northstar-operations/
    practice.md
    offerings/<slug>.md
    plays/<slug>.md
    collateral/<slug>.md
    seller/<offering-slug>.md
    assets/org-wide/<filename>.md
    assets/seller-only/<filename>.md
```

Content root is explicit at build time; the checked-in sample is `sample-practice/`. Private instance repos use the same layout. No private tree is copied into this repository. Markdown frontmatter is YAML; examples deliberately use JSON object notation (a YAML-compatible subset), between `---` delimiters, to make the fixture inspectable without a YAML dependency. No MDX, raw HTML, embedded scripts, remote includes or executable templates. Rich assets may be PDF/PPTX in a private instance; sample deck/white-paper sources are complete small Markdown artifacts so this design package needs no binary authoring tool.

## Common frontmatter (all four object types)

Every table row is a field, its type, requiredness and example. Unknown keys fail. Non-empty means trimmed text; arrays cannot contain duplicates. Dates are quoted ISO calendar dates.

| Field | Type | Required | Example |
|---|---|---|---|
| schema_version | integer, exactly 1 | yes | `1` |
| type | enum of four object types | yes | `offering` |
| id | stable ID string | yes | `bb:northstar:offering:001` |
| slug | lowercase kebab string | yes | `service-blueprint` |
| title | non-empty string, max 100 chars | yes | `Service Blueprint` |
| summary | non-empty plain string, max 240 chars | yes | `Map the journey, find the handoffs, agree what changes.` |
| audience | `org-wide` or `seller-only` | yes | `org-wide` |
| status | `draft`, `approved`, `retired` | yes | `approved` |
| owner | non-empty role label | yes | `Practice editor` |
| reviewed_on | date string | approved only | `2026-11-10` |
| reviewed_by | non-empty human/role label | approved only | `Sample curator` |
| tags | list of kebab strings | yes, may be empty | `["service-design"]` |
| aliases | list of former slugs | no, default empty | `["journey-map"]` |
| governance | object, three registry-backed ID strings | no | `{"family_id":"f-1","variant_id":"v-1","version_id":"r-1"}` |

For this fictional fixture, `Sample curator` is a fictional editorial role and approval denotes fixture readiness only. Real instance approval requires a human receipt, never an agent assertion.

## Practice frontmatter

Common fields plus:

| Field | Type | Required | Example |
|---|---|---|---|
| key | immutable practice key | yes | `northstar` |
| tagline | non-empty string | yes | `Make complex operations work.` |
| offering_ids | ordered list of Offering IDs | yes, non-empty | `["bb:northstar:offering:001"]` |
| play_ids | ordered list of Play IDs | yes, may be empty | `["bb:northstar:play:001"]` |
| featured_collateral_ids | ordered list of Collateral IDs | yes, may be empty | `["bb:northstar:collateral:002"]` |
| situations | ordered list of objects below | yes, non-empty | see sample practice |

Each situation has `key` (unique kebab string), `label` (string), `offering_id` (owned Offering ID), `play_id` (owned Play ID or null), `collateral_id` (owned Collateral ID or null). Null produces an offering link without a play/asset CTA. This small authored lookup powers the Situation Navigator; it is not AI recommendation. Body must contain `## About` and `## Who we help`.

## Offering frontmatter

Common fields plus:

| Field | Type | Required | Example |
|---|---|---|---|
| practice_id | Practice ID | yes | `bb:northstar:practice:001` |
| outcomes | ordered non-empty list of strings | yes | `["Shared service map"]` |
| good_fit | non-empty list of strings | yes | `["Work crosses several teams"]` |
| not_fit | non-empty list of strings | yes | `["Only one approval needs changing"]` |
| alternative_offering_ids | ordered Offering ID list | yes, may be empty | `["bb:northstar:offering:002"]` |
| seller_guide | path relative to practice directory | yes | `seller/service-blueprint.md` |

Body must have `## What it is`, `## What it entails`, `## Examples`. Examples identify fictional or permission-cleared evidence; no unverified outcome claims. Seller guide has its own schema below, so org-wide body never carries sales tactics.

## Play frontmatter

Common fields plus:

| Field | Type | Required | Example |
|---|---|---|---|
| practice_id | Practice ID | yes | `bb:northstar:practice:001` |
| trigger | non-empty buyer-situation string | yes | `Nobody owns the handoff.` |
| offering_ids | ordered non-empty Offering ID list | yes | `["bb:northstar:offering:001"]` |
| stages | ordered non-empty list of stage objects | yes | see below |

Stage object fields: `key` (unique kebab string), `title` (non-empty string), `action` (non-empty string), `exit_criterion` (non-empty string), `collateral_ids` (ordered list, may be empty). Example: `{"key":"discover","title":"Discover","action":"Ask where work waits.","exit_criterion":"Sponsor names one handoff to explore.","collateral_ids":["bb:northstar:collateral:001"]}`. Stage order is authoritative; this borrows v1 vocabulary, not v1 runtime code. Body contains `## Intent` and `## Boundaries`. Plays may be org-wide only if all their text is appropriate there; both sample plays are seller-only.

## Collateral frontmatter

Common fields plus:

| Field | Type | Required | Example |
|---|---|---|---|
| practice_id | Practice ID | yes | `bb:northstar:practice:001` |
| kind | `deck`, `case-study`, `white-paper`, `one-pager`, `external-link` | yes | `deck` |
| offering_ids | ordered non-empty Offering ID list | yes | `["bb:northstar:offering:001"]` |
| asset_path | relative practice path | local artifact only | `assets/org-wide/service-blueprint-overview.md` |
| external_url | HTTPS absolute URL | external-link only | `https://example.org/` |
| format | `markdown`, `pdf`, `pptx`, `html` | yes | `markdown` |
| source | provenance object | yes | see below |
| rights | `fictional-original`, `approved-internal`, `link-only` | yes | `fictional-original` |

Exactly one of `asset_path` and `external_url`. External links require `format: html` and `rights: link-only`. Source fields: `origin` (opaque source receipt, e.g. `fictional:northstar/deck-001`), `locator` (e.g. `sections 1-4` or slide range), `captured_on` (date). Source registry details remain in the private instance; no credentials or internal location in public/sample source. Body has `## Use` and `## Limits`. No fabricated download extensions: label sample decks as Markdown deck sources. Links open explicitly as external; the reserved example-domain sample is a link behavior fixture, not a substantive reading endorsement.

## Seller guide frontmatter (supporting file, not a fifth catalog entity)

| Field | Type | Required | Example |
|---|---|---|---|
| schema_version | integer 1 | yes | `1` |
| type | literal `seller-guide` | yes | `seller-guide` |
| offering_id | owning Offering ID | yes | `bb:northstar:offering:001` |
| audience | literal `seller-only` | yes | `seller-only` |
| status | `draft`, `approved`, `retired` | yes | `approved` |
| reviewed_on | date string | approved only | `2026-11-10` |
| reviewed_by | role/string | approved only | `Sample curator` |

Body requires `## Listen for`, `## Ask`, `## Position`, `## Avoid promising`, `## Next step`. Its approval is independent of the parent offering; missing/unapproved guide means no seller section until corrected, with a build warning. Invalid or unsafe paths always fail even for unpublished files.

## Build validation contract

1. Parse strict frontmatter and exact allowed fields; verify field types, required values, enums, date validity (not future), IDs, slugs and headings. Fail with path and field. Reject ambiguous dates, YAML tags/anchors, duplicate keys, raw HTML, scripts, JavaScript URLs and unsupported extensions. Render Markdown through an escaped/sanitized renderer.
2. Resolve every reference against the full input registry before edition projection; verify ownership, target type, curated coverage and list order. Cycles in alternative offerings are allowed (navigation); self-edges are rejected. No file path escapes, absolute paths or symlinks; resolve canonical paths beneath the practice directory, including assets.
3. Approved objects require review metadata; only approved objects enter a release. Draft/retired items and their assets never publish. A reference to a draft target from a published object fails rather than silently publishing it. Retired IDs remain reserved in source history.
4. Partition source files by audience before rendering, then derive links/navigation/search/counts from the projected registry. Org-wide Practice curation may contain seller-only IDs in source: prune them without serializing their ID, title or existence. Likewise prune situation play/asset pointers and backlinks. A projected empty relationship removes its section. No restricted stub, placeholder, omitted-count hint or redirect is emitted.
5. Shared org-wide objects may only directly link org-wide approved collateral or body files. Seller-only assets live only in `assets/seller-only`; org-wide assets only in `assets/org-wide`. Copy by resolved referenced-asset allowlist, never directory glob. Reject a local asset referenced by conflicting audiences. Do not auto-fetch external URLs. Restrict production destinations via a private domain allowlist and human review.
6. Emit separate seller and org-wide artifacts from clean temporary directories. Check generated HTML, JavaScript, search shards, metadata, sitemap, source maps, manifests and copied assets against a seller-only ID/title/path/unique-phrase canary set; treat match as release failure. No service worker or runtime role toggle. Host access boundaries must protect seller output and downloads; sign-on alone does not establish seller membership.
7. Broken Markdown links, slug/alias collisions, orphaned asset paths, case-mismatched refs and duplicate IDs fail. Every release records content commit, tool commit, edition and included IDs in a private build receipt. Only edition-safe included IDs may ship in its output manifest.
8. Sample acceptance: one Practice, three Offerings, two Plays, six Collateral, three seller guides, five local artifacts and one external-link record; all relations resolve. Seller projection has 12 catalog objects; org-wide projection has 8 (Practice + 3 Offerings + 4 Collateral), no play pages and no seller guides. These are fixture counts, not production requirements.
