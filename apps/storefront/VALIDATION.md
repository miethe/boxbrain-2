# M1 validation

Run from the repository root with Node 20.19.3 and pnpm 10.14.0:

- `pnpm install --frozen-lockfile` — passed.
- `STOREFRONT_SELLER_THEME=alternate STOREFRONT_ORG_THEME=neutral pnpm --filter @boxbrain/storefront test` — passed: both edition builds (22 seller and 17 org-wide pages), org-wide leak scan, 17 Node tests and 3 Python tests.
- `cd apps/storefront && node scripts/smoke.mjs seller && node scripts/smoke.mjs org-wide` — six HTTP fetches returned 200 with expected text. Pagefind found the seller-only workshop in seller results and omitted it in org-wide results.
- `git diff --check` — passed.

Evidence for the six gap-closing items:

1. Theme architecture: `src/themes/`, `src/lib/view-models.mjs`, `src/lib/view-models.d.ts` and the theme test in `tests/content.test.mjs`. The test builds both layouts against identical seller content, checks their home and offering order and content, and checks selected and absent CSS markers in the edition outputs.
2. Leak scan: `scripts/leak-scan.mjs` and `scripts/build.mjs` scan excluded IDs, titles, unique source/asset filenames and content, including gzip fragments and encoded bundle strings. The test plants gzip and base64 controls and verifies a clean scan.
3. Filters and headings: `src/components/Interactions.astro` restores and writes URL parameters; theme library components expose labeled checkbox facets, omit empty tags and retain no-script lists. Offering components nest seller-guide headings under the panel. Tests cover facet matching, generated controls and heading levels.
4. Theme instructions: `THEMING.md`. The theme test follows its copy, register and build procedure in an isolated scratch copy with a fixture theme and verifies its marker; no edits outside that directory and one config entry are used.
5. Hygiene: `.gitignore`, `docs/project_plans/revival/storefront-m0/PLAN.md`; root `PR-BODY.md` removed and PR text retained under `.leg/`.
6. Revalidation: commands and counts above; `tests/content.test.mjs` and `scripts/smoke.mjs` provide executable evidence.

Browser rendering, keyboard interaction and URL restoration in a browser were not rechecked: this clone sandbox cannot launch Chromium. Static output and shared filter logic were checked; visual and interactive verification remains for a browser-capable lane. Host authorization and private-instance release remain instance responsibilities.
