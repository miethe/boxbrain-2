# Backend — Demo Seed Corpus Expansion (memory mode)

File: `services/api/app/infrastructure/in_memory_repository.py` (the `seed()` method and
`SEED_IDS`). Goal: the seeded memory-mode API currently exposes only 2 visible ContentUnit
families, 3 versions, and ZERO similarity edges — every rich UI surface (Variation Explorer
similar rail, Library, Reviews compare, search) looks empty. Expand the corpus so the app demos
like the design mock-ups.

Theme the new content to the design mock story (see
`docs/project_plans/init/boxbrain-v2-project-handoff/project/uploads/content-unit-explorer.png`
narrative): a "Market Opportunity Overview" anchor unit plus sibling market-analysis concepts.

## Hard constraints

- ADDITIVE ONLY: do not change any existing `SEED_IDS` key, existing object's ID, or existing
  field values — backend tests and the Playwright e2e suite reference them. New IDs follow the
  same deterministic pattern (`00000000-0000-4000-8000-000000000NNN`, continue numbering from a
  free range e.g. 0801+; group by object type like the existing map).
- `cd services/api && uv run ruff check . && uv run mypy --explicit-package-bases app && uv run pytest -q`
  must be green when done. If a test asserts exact seeded counts, update that assertion —
  nothing else in test logic.
- Follow the existing construction patterns in `seed()` exactly (same dataclasses, same field
  style). Read the domain models first (`services/api/app/domain/`) rather than guessing fields.
- Do NOT commit. Do not touch any other file except (if strictly needed) count-asserting tests.

## Content to add

1. **Market story families** (6 new ContentUnit families, all unrestricted):
   - `Market Opportunity Overview` — the flagship anchor. 3 variants: canonical "Clean"
     (approved/fresh), "Executive Dark" style-alt, plus the canonical variant carrying versions
     v1→v3 (older versions dated Apr 18 / Apr 20 / Apr 24 2024 style progression; distinct
     summaries). Rich `extracted_text` matching the mock: "Market Opportunity Overview / A
     substantial and growing market opportunity driven by digital transformation... / $42B Total
     Addressable Market / +18% CAGR through 2028 / 120M+ Potential Customers...". Speaker notes on
     the canonical latest version.
   - `Market Opportunity (Regional)`, `Industry Growth Drivers`, `TAM/SAM/SOM Analysis`,
     `Addressable Market`, `Competitive Landscape Snapshot` — 1-2 variants each, 1-2 versions,
     varied approval (approved/needs_review/draft) and freshness (fresh/stale) states, varied
     quality/usage scores, distinct extracted_text/summaries.
2. **Similarity edges**: between the anchor's latest canonical version and the other market
   units' latest versions with scores ~0.71–0.82 (and one 0.98-ish near-duplicate edge from
   `Market Opportunity (Regional)`). First read how the similar-listing use case traverses
   `similarity_edges` (direction, which ID grain it matches on — version vs variant vs family)
   and seed edges so `GET /api/content-units/{anchor_version_id}/similar` returns ≥4 items and
   the reverse lookups work for at least one other unit. Similarity must NOT imply family
   membership — these stay separate families.
3. **Where-used**: give the anchor + 2 other new units `parent_refs` (or the equivalent
   mechanism already used at seed time) referencing the existing seeded WorkProduct version with
   order indexes, mirroring the existing pattern; if a second WorkProduct family/version is easy
   to add following existing patterns, add one ("Executive Summary — Q2 2024") and reference it too.
4. **Comments & notes**: 2 persistent comments + 1 pinned curator note on the anchor's latest
   version, matching existing comment/note seed patterns.
5. **Review items**: 2 new items referencing new units — one `similarity_candidate` (the 0.98
   near-duplicate pair) and one `stale_candidate` (a stale market unit). Follow existing ReviewItem
   seed shapes.
6. **Search visibility**: whatever indexing/embedding step existing seeded units get (deterministic
   embeddings etc.), apply the same to new units so they appear in `/api/search` and `/api/ask`.

## Verification

- Run the three backend checks above.
- With the API running in memory mode, curl:
  `/api/content-units/families?page_size=20` (≥8 visible families),
  `/api/content-units/{anchor_version}/similar` (≥4 items with scores),
  `/api/content-units/{anchor_version}/where-used` (≥2 refs),
  `/api/search` POST for "market opportunity" (returns new units).
  The API dev server auto-reloads on file save if running; do not start/stop servers yourself —
  if no server is running, verify via pytest only and print the curl commands you would run.
- Print a summary: new SEED_IDS added, counts per collection, any test assertions updated.
