# Adversarial-review fix batch (confirmed findings)

Repo: /Users/miethe/dev/homelab/development/boxbrain-2. All findings below were CONFIRMED by
adversarial reviewers with file:line evidence. Implement exactly; keep every existing test green.

## 1. HIGH — Frontend silently truncates paginated lists at 25 (no consumer of nextCursor)

Backend list endpoints now paginate (default limit 25, `{items, nextCursor}` envelope). No frontend
code walks pages. Fix in `apps/web/lib/api.ts`:
- Extend `listWorkProductFamilies`, `listContentBlocks`, `listStoryboards` to accept an optional
  `{ cursor?: string; limit?: number }` input (pattern-match `listContentUnitFamilies`).
- Add cursor-walking helpers `listAllContentUnitFamilies`, `listAllWorkProductFamilies`,
  `listAllContentBlocks`, `listAllStoryboards` that loop pages (per-page limit 100) until
  `nextCursor` is null, with a hard safety cap of 40 pages; concatenate items.
- Update these call sites to use the walkers: `apps/web/features/library/use-library-catalog.ts`
  (all list calls incl. families), `apps/web/app/(shell)/storyboards/[id]/page.tsx` (~line 217),
  `apps/web/app/(shell)/content-blocks/[id]/page.tsx` (~132), `apps/web/app/(shell)/content-units/[id]/page.tsx`
  (~267), `apps/web/app/(shell)/work-products/[id]/page.tsx` (~104), and the
  `listContentUnitFamilies({})` call inside `loadExplorer` in
  `apps/web/components/variation-explorer/variation-explorer-client.tsx`.
- Add vitest coverage in `apps/web/lib/api.test.ts` for one walker (two pages then null cursor;
  assert concatenation and that the cursor is passed through).

## 2. MEDIUM — Offset cursors duplicate/skip items when the collection mutates between pages

`services/api/app/application/pagination.py` uses a plain offset. Repro: page1 limit=1, insert an
item that sorts before page1's item, request page2 → page1's item repeats and a real item is
skipped. Fix: hybrid cursor — encode base64 JSON `{"i": <last_item_id>, "o": <offset>}`. On decode,
locate `i` in the current sorted sequence and resume AFTER it; if the id is gone, fall back to the
stored offset. Keep the function signature/envelope identical. Update
`services/api/tests/test_b2_quick_fixes.py` only where cursor-format assumptions break, and ADD a
mutation-during-walk regression test reproducing the scenario above (no duplicates, no skipped
surviving items).

## 3. HIGH — Storyboard tray maps custom Ask items to a guaranteed 422

`apps/web/components/storyboards/library-tray.tsx` (~line 384): items with `type === "asset"` map
straight to `selectedObjectId: item.id`, but Ask's "Add custom content" creates ids like
`custom-1699...-123` and the backend Pydantic-validates `selectedObjectId: UUID` → 422. Fix: only
offer selection items whose id matches a UUID regex as placeable; render non-UUID items disabled
with `title="Custom items can't be placed in storyboards yet"`.

## 4. MEDIUM — Library ContentUnit selections can never reach the storyboard tray, and carry the wrong id grain

`apps/web/components/library/content-unit-view.tsx` (~483, ~561): SelectionItems for content units
store `variant.id`, but storyboard slot creation needs a content-unit VERSION id
(`_get_content_unit_version` on the backend). Store the variant's `latestVersionId` as the item id
(skip/disable add when it's missing) and keep the subtitle as the version label. Then fix the dead
filter in `library-tray.tsx` (~385): `item.type === "contentunit" && item.subtitle?.toLowerCase().includes("version")`
never matches (subtitles are "v1.0"); replace with `item.type === "contentunit"` + UUID id check
(from fix 3), mapping to `selectedObjectType: "content_unit_version"`.

## 5. MEDIUM — Comment Resolution panel conflates comment kinds (domain rule 9)

`apps/web/components/reviews/comment-resolution-panel.tsx`: threads group by target only and every
reply is hardcoded `kind: "review_comment"` even on `persistent_comment` threads. Fix: surface each
thread's kind as a Badge chip (review_comment = ai tone label "Review", persistent_comment =
neutral "Comment", note kinds excluded), and replies must inherit the thread's kind. Keep
`reviews-hub.tsx` fetching as-is.

## Verification (all must pass)

- `pnpm --filter @boxbrain/web lint && pnpm --filter @boxbrain/web typecheck && pnpm --filter @boxbrain/web test && pnpm --filter @boxbrain/web build`
- `cd services/api && uv run ruff check . && uv run mypy --explicit-package-bases app && uv run pytest -q`
- `cd apps/web && pnpm exec playwright test` (5 e2e tests; servers are self-managed by the config —
  ensure ports 18080/3300 are free first with pkill if needed).
- Do NOT commit. End with files changed + verification results.
