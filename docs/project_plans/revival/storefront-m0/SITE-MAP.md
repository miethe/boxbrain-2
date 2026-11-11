# Storefront site map

Design only. Routes below are relative to an edition-specific host base path. The host supplies sign-on and seller authorization. There is no application identity server or browser role switch. An authorized seller may follow a host-configured link to the other deployment; an org-wide visitor is never shown seller content metadata.

## Inventory and file reads

| Page / route | Purpose and hierarchy | Reads from approved, edition-projected files |
|---|---|---|
| Multi-practice index `/` | Select a practice; title, summary and offering count; one practice still gets a useful index | Every visible `practice.md`; derived visible offering counts; no hidden-practice hints |
| Practice home `/practices/{practice}/` | Practice promise, offering overview, featured evidence; seller edition adds plays and search | Practice title, tagline, summary, body, ordered `offering_ids`, visible `play_ids`, featured collateral; situation lookup if Navigator chosen |
| Offering index `/practices/{practice}/offerings/` | Scan all offerings in curated order; description and fit | Practice ordering + Offering title, summary, outcomes, tags |
| Offering `/practices/{practice}/offerings/{slug}/` | What it is; what it entails; examples; linked collateral and related plays. Seller edition includes how to sell it | Offering frontmatter/body; collateral reverse edges from `offering_ids`; play reverse edges; approved `seller_guide` only in seller projection |
| Play index `/practices/{practice}/plays/` | Find a situation and the next sales motion | Visible Practice `play_ids`, Play title, summary, trigger; route omitted if none visible |
| Play `/practices/{practice}/plays/{slug}/` | Trigger, intent, associated offerings, ordered stages with action, exit criterion and assets, boundaries | Play body, `offering_ids`, ordered `stages` and each stage's ordered `collateral_ids`; no opportunity tracking |
| Library `/practices/{practice}/library/` | Find an appropriate artifact by query, kind, offering or tag; show title, summary, kind, format and reviewed date | Collateral records in practice plus offering titles; edition-safe search index; never full private source receipts |
| Collateral `/practices/{practice}/library/{slug}/` | Explain when to use an item, limits, related offerings and download/open action | Collateral body, kind/format, owner/review fields, resolved allowlisted asset or external URL; no embedding remote pages |
| Not found `/404.html` | Neutral missing-page message with index/library link | Static copy only; same response for absent and excluded content |

`{practice}` is Practice.slug, not its immutable key. Assets use edition-local generated paths; source directories are not directly served. Download labels distinguish `Markdown deck source`, `PDF`, `PPTX` and `External link`. Library links first open the item page; its action opens the approved artifact. External links say so and use safe new-tab attributes when opening a new tab.

## Navigation and journeys

Global: practice index, current practice, Offerings, Plays (only if visible), Library and edition label. A practice picker preserves edition; it does not carry private record IDs through URLs. Breadcrumbs: practice → type index → object. Backlinks are derived after filtering. No hidden objects appear in counts or empty-state explanations.

Seller journey: home → Repair a broken handoff → Discover/Shape/Agree stages → Service Blueprint → How to sell it → Handoff workshop guide. Showcase journey: practice index → Northstar Operations → Service Blueprint → A clearer handoff in six weeks → artifact. Both use the same offering ID and public-safe narrative. Play stages and seller guide never enter the showcase bundle.

For the fixture, seller output contains 3 offering pages, 2 play pages and 6 collateral pages; org-wide output contains 3 offering pages, 0 play pages and 4 collateral pages. Both have a practice page, offering index and library. All navigation follows these projected inventories.

## Search, filters and states

Practice-scoped search covers visible offering, play and collateral titles, summaries and safe rendered body. Library search limits results to collateral, with kind, offering and tag filters. Query plus filters combine with AND; multiple values within one facet combine with OR. Use URL query parameters for non-sensitive user queries; never log them to third-party analytics. Title matches rank ahead of body. Clear controls restore the full visible library. External destinations and binaries are not crawled or full-text indexed in the first build.

Static content needs no loading skeleton; search shows a small loading message while its local index loads. Zero results: repeat the query, offer Clear filters. Empty library: “No published resources yet.” Index failure: inline retry plus the server-rendered browse list remains usable. Missing local asset is a build failure; a remote destination may fail independently, so show its external nature. Org-wide restricted routes return the neutral 404; no restricted-content teaser. JavaScript disabled leaves complete pages and browse navigation usable; search explains its requirement. Keyboard access, visible focus, labeled controls, proper headings and live search status are required. At narrow widths, navigation collapses and content becomes one column without losing any edition-safe section.

## Direction-specific hierarchy

Editorial Atlas leads home and offering with outcome and evidence; Seller Field Guide leads home with plays and offering with the seller guide; Situation Navigator leads with authored situation selection and fit. They use the same records and routes. The selected design changes ordering and emphasis, not the publication policy. Showcase builds of Field Guide or Navigator remove private actions and lead with offerings/outcomes instead. Selection is pending; no design is implemented in M0.
