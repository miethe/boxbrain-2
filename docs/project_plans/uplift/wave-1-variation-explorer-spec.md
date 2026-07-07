# Wave 1 — ContentUnit Variation Explorer Rebuild (flagship)

Design truth: `docs/project_plans/init/boxbrain-v2-project-handoff/project/src_v2/routes_5.jsx`
(`RouteVariationExplorer`) + mock `.../project/uploads/content-unit-explorer.png`. The `ve-*` CSS
classes were ported to `apps/web/app/globals.css` in Wave 0 — use them.

Replace `apps/web/app/(shell)/variation-explorer/page.tsx` (currently a static placeholder) with a
fully API-backed explorer. Match the design layout precisely: header row with actions; left column =
horizontal Similar Concepts rail → (Variations vertical stack | large center preview) → pagination →
bottom panels (Included in Plays / Included in WorkProducts / Actions); right rail = ContentUnit
Details / Similarity & Relevance / Extracted Text, sticky.

## Domain rules (non-negotiable, from CLAUDE.md)

- Similar concepts are SIMILARITY relationships — never present them as family members. Label the
  rail exactly as design does ("Similar Concepts", "% Match") and re-anchor on click; do not imply
  family membership.
- The vertical "Variations" stack mixes two distinct object kinds; keep them visually distinct with
  badges: family variants (badge `Canonical` ok-tone for the canonical variant, otherwise the
  variant label/type e.g. `Style Alt` warn-tone) and prior versions of the selected variant (badge
  `Prior Version` primary-tone, caption `v{versionNumber} · {date}`).
- Permission handling: 403/404 from any call renders the restricted/error state used by
  `content-units/[id]/page.tsx` — follow its existing pattern.

## Routing & data flow (client component, follow existing fetch patterns in content-units/[id]/page.tsx)

- URL contract: `/variation-explorer?family=<familyId>&variant=<variantId>&version=<versionId>` —
  all optional. Resolution order: version param → its variant/family context; family param → its
  canonical variant → latest version; nothing → first family from `listContentUnitFamilies({})`.
  Keep state in the URL (router.replace) so back/forward and sharing work.
- API calls (all in `apps/web/lib/api.ts` already): `listContentUnitFamilies`,
  `getContentUnitFamily`, `listContentUnitVariants(familyId)`,
  `listContentUnitVersions(variantId)`, `getContentUnitVersion(versionId)`,
  `listSimilarContentUnits(versionId)`, `listContentUnitWhereUsed(versionId)`.
- NOTE: check at runtime (API on http://localhost:8300, seeded memory mode) whether
  `ContentUnitVersionDetail` exposes `familyId` or variant context; if version→family cannot be
  derived from the payload, resolve context by always passing `family` in links you generate and
  falling back to first-family default otherwise. Do not guess fields — curl the endpoints first
  and wire what actually exists.
- Similar scores: inspect actual score range from `/api/content-unit-versions/{id}/similar` (0..1
  vs 0..100) and normalize to integer percent, clamped 0–100.

## Sections

### Header row
- Title "ContentUnit Variation Explorer" + info icon (tooltip: "Explore similar concepts
  horizontally and alternate versions vertically."), subtitle per design.
- Actions right: `Share` (copies current URL via clipboard, transient "Copied" state),
  `Compare (n)` (see Compare below), `Add to Deck` split-button (primary; menu items: "Add to
  Storyboard…" → links to `/storyboards`, "Add to Collection" → disabled "Coming soon").

### Similar Concepts rail (horizontal)
- `ve-rail` / `ve-rail-track` / `ve-arrow` / `ve-concept` classes. Cards: match label
  (`Best Match` for the highest-scored item, else `{n}% Match`), slide preview (thumbnailUri image
  when present, else `SlideThumb` fallback with the item title), title, mono `ID: {objectId}`.
- The currently anchored unit renders as a `ve-concept current` card with the blue check
  (`ve-concept-check`) at its natural position (first), labeled `Selected`.
- Clicking a similar card re-anchors the explorer to that unit (update URL params, refetch).
- Left/right arrow buttons scroll the track; ArrowLeft/ArrowRight keys move a roving selection.
  The track itself is `overflow-x: auto` with scroll-snap (extend the ported CSS if the Wave 0
  version is a fixed 5-col grid — design intent is a swipeable rail).
- Empty state: "No similar concepts yet" card. Loading: 4 skeleton cards.

### Variations stack (vertical, left of preview)
- Section head "Variations" + up/down icons + "Swipe / scroll vertically" hint per design.
- `ve-variant` cards as described in Domain rules; selected card = `current`. Click selects: a
  variant card → that variant's latest version in the preview; a prior-version card → that version.
- Show up to 3 cards, then `View all {n} variations` expander (local state) per design.
- ArrowUp/ArrowDown keys move through the stack.

### Center preview
- Card with expand icon top-right (opens `renderUri` in a new tab when present; hidden otherwise).
- If `renderUri`/`thumbnailUri` exists: render the image (constrain 16:9, `object-fit: contain`,
  neutral backdrop). Else: structured fallback — title (26px, tight tracking, blue accent
  underline bar), `summary` text, and a large `SlideThumb`; do NOT fabricate metrics/charts that
  aren't in the data.
- Below content: footer strip `Source: {provenance source}` · page index per design when data exists.
- Pagination strip beneath the card: `{current} / {total}` across the similar-rail order with round
  prev/next icon buttons (re-anchor to prev/next similar unit).

### Bottom panels (3-col grid `1fr 1fr 220px`)
- "Included in Plays" — where-used refs with `objectType === "play"`. Expect zero in current
  backend: render the panel with an honest empty state ("Not referenced by any plays yet").
- "Included in WorkProducts" — refs with `objectType` work-product-ish (`work_product`,
  `workproduct`, `work_product_version` — check actual values via curl); rows: title, sub caption,
  right mono `Page {orderIndex+1}` when orderIndex present. Refs with storyboard types: if present,
  list them in this panel under a "Storyboards" subheading rather than dropping them.
- "Actions" panel: `Add to Deck` (same as header split primary action), `Add to Collection`
  (disabled, "Coming soon" title), `Add to Play` (disabled, "Plays are preview-only"),
  `Download Slide` (anchor download of renderUri; hidden when none), `View Source File` (link to
  provenance source uri when present; hidden when none). Blue link-style rows per design.

### Right rail (sticky)
- **ContentUnit Details**: ContentUnit ID (mono + copy-to-clipboard icon button with aria-label and
  copied feedback), Source (provenance source file name), Last Updated (createdAt formatted
  `MMM d, yyyy`; include actor if payload has one), File Location (mono; provenance path/uri if
  present), Tags (blue `tag sm` chips from whatever taxonomy/tags the payload exposes; else omit the
  row), plus a row of `StatusBadge`s for approvalState/freshnessState (tones: approved=ok,
  needs_review/stale=warn, draft=neutral).
- **Similarity & Relevance**: Best Match % (ok-colored bar), Average Similarity % (primary bar),
  Total Similar Concepts count — computed from the similar list; skeleton while loading.
- **Extracted Text**: `extractedText` in the muted rounded box, "Copy all" link (clipboard),
  line-clamped ~8 lines with "Show more"/"Show less" toggle. Omit card when no text.

### Compare (self-contained polish)
- Cmd/Ctrl-click (and a small checkbox on hover, `card-hover-show`) on similar-rail or variation
  cards toggles compare selection (max 2, FIFO). Header button label `Compare ({n})`, enabled at 2.
- Clicking opens a modal (accessible: focus trap, Esc closes, aria-modal) with the two previews
  side-by-side + their key metadata rows (version, approval, freshness, updated). Local state only —
  no backend calls beyond data already loaded.

## States & a11y
- Every async region: loading skeleton, error (retry button), empty, restricted variants.
- All icon-only buttons have aria-labels; rail/stack are keyboard navigable; focus-visible rings.
- `data-testid`s: `ve-rail`, `ve-concept-<objectId>`, `ve-variant-<id>`, `ve-preview`,
  `ve-details-rail`, `ve-compare-open`.

## Tests & verification
- Extract pure helpers to `apps/web/features/variation-explorer/lib.ts` (or similar): score
  normalization, variations-stack assembly (variants+versions ordering), where-used partitioning.
  Unit-test them with vitest (happy path + empty + malformed).
- `pnpm --filter @boxbrain/web lint && typecheck && test` green; `pnpm --filter @boxbrain/web build` green.
- Manual: with dev servers up (web :3300, api :8300 memory mode), load `/variation-explorer` and one
  deep link with params; verify no console errors. Do not start/stop servers; they are already running.
- Do NOT commit.
