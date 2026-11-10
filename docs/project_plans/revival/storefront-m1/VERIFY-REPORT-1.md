# BoxBrain M1 storefront: independent verification (PR #5, head 99a653a)

Checkout: /Volumes/SKNVME/aos-scratch/boxbrain-m1-verify/repo (branch leg/Z8026RFC-20261110T225313Z-96815).
VERIFIED DIFF: 83 files, +4952/-33 vs 32018ab (45 apps/storefront, 34 docs/project_plans, AGENTS.md, CLAUDE.md, PR-BODY.md, pnpm-lock.yaml). Claimed symbols (loadContent, scan, ingest.py, themes, aliases) present on disk. Verdict: PASS-WITH-GAPS.

## Criteria
1. MET. `pnpm install --frozen-lockfile` then `pnpm --filter @boxbrain/storefront build` (or `pnpm build` in app) builds seller (15 records) + org-wide (11 records). apps/storefront/README.md:3. Path: live-smoke.
2. MET. Emptied `owner` -> build exits 1; removed `outcomes` -> exit 1 with "decision-flow.md: outcomes: Required" (content.mjs:25 parse). Reverted via git checkout.
3. MET with one weakness. Marker ZQXMARKER7731 in seller guide, seller-only collateral, seller-only asset, play: org-wide dist (HTML/JS/JSON/pagefind fragments+index, gunzipped) 0 hits; seller dist has it (3 HTML + asset; 3 fragments + 1 index). Exclusion is at load (content.mjs projection ~line 77). Leak scan: planting seller-only title in org practice.md failed build ("Leak detected ... Handoff workshop guide"). WEAKNESS: scripts/leak-scan.mjs:4 scans raw bytes; Pagefind fragments/index are gzip, so a canary there is NOT detected (proved with gzip control). Mitigated only because index derives from scanned HTML.
4. PARTIAL. All SITE-MAP routes emitted (index, practice home, offerings idx/offering, plays idx/play, library, collateral, 404). But it is ONE monolithic template (src/pages/[...path].astro, 36 lines, markup inline) plus a shared layout, not separate semantic templates. Theme = `data-theme` attr + CSS; per-edition select works (SELLER=alternate, ORG default -> seller attr alternate, org neutral; same content). But Layout.astro:2-3 statically imports both CSS files, so both ship in both editions, and themes cannot alter markup. alternate.css is 1 line.
5. MET. Doorway ("Explore by situation"), how-to-sell (seller only; absent in org-wide decision-flow), evidence (absent in Meadow after emptying featured_collateral_ids; related-collateral block absent where none visible). Plays absent for Meadow.
6. MET. Meadow Learning renders in both editions; grep of src/ for practice names: none (only scripts/smoke.mjs hardcodes northstar, a test script).
7. MET. STOREFRONT_CONTENT_ROOT=/Volumes/.../extcontent (modified copy) built, edited title appeared, edits to featured IDs honoured.
8. MET. ingest.py turned a manifest (deck + external link) into 2 records: audience seller-only, status draft, no reviewed_*. Dropped into content root they loaded cleanly and were excluded from both editions. 3 python tests pass.
9. MET. Browser: search "handoff" seller 9 results incl. seller-only items; org-wide 5 results, none seller-only; "workshop" org-wide returns only service-blueprint. Library filter kind: seller 6->1, org 4->1, clear restores, zero-state message shown. Index files checked separately (see 3). Caveat: search results include nav pages ("Plays", "Library") as noise; pagefind reports 0 filters (filtering is client-side JS on data attributes, not Pagefind).
10. MET. Test 5/8 (rename keeps id, alias emits redirect page). Redirect pages use meta-refresh only.
11. PARTIAL. Env-var selection instructions work as written. Missing: adding a THIRD theme requires editing Layout.astro imports (not documented); "theme-specific layout components" has no place to live.
12. MET. `pnpm test`: node 14/14 pass, python 3/3 pass (17 total), after build.

## Browser (Playwright 1.49.1 / Chromium headless, installed into scratch pw/; browser cache added under ~/Library/Caches/ms-playwright/chromium_headless_shell-1148)
Served each dist at / via python http.server. Home, offering, library, index at 1600x1000 and home at 390x844, both editions. No horizontal scroll anywhere (scrollWidth == innerWidth). Console errors, failed requests, HTTP >=400: none in either edition. Visual: plain unstyled-neutral, readable, no overlap/clipping on pages. Library filter widgets are cramped: three `select multiple` boxes ~4 rows, Kind list scrolls (5 options in seller), labels bottom-aligned/oddly wrapped, Tag select shows only "All" (no tags in sample collateral), so a dead control. Seller offering: "How to sell it" h2 then guide sections also h2 (flat hierarchy, seller-guide.md headings not nested). Practice home phone: nav wraps to two rows, otherwise fine.

## Diff hygiene
- Employer names / model ids / internal endpoints: no real employer name, no model ids, no internal URLs. Hits: docs/project_plans/revival/storefront-m0/PLAN.md lines 1845/1868/1879 mention the "ICA" lane and "employer-authorized"; CLAUDE.md/AGENTS.md status block says "a consulting practice at Nick's employer" (name deliberately omitted) and names "Nick". Only example.org URLs.
- Outside apps/storefront and docs/: PR-BODY.md committed at repo root (surprise; PR scratch, should not be in tree), pnpm-lock.yaml (+2571, expected). apps/storefront/.astro/ is not gitignored (untracked after build).
- CLAUDE.md/AGENTS.md: pause banner replaced with REVIVED 2026-11-10; sensible and consistent; reversal text removed, "Mission" no longer conditional. Both files edited consistently.
- PR-BODY.md claims AC4 met "apps/storefront/src/pages/" and AC9 browser lane remained; VALIDATION.md honest that browser check was outstanding. AC10 listed unmet by author.

## Top defects
1. apps/storefront/scripts/leak-scan.mjs:4: scans bytes only; gzip Pagefind artifacts are blind spots; leak-scan canary for search index not meaningful.
2. apps/storefront/src/pages/[...path].astro (whole file) + src/layouts/Layout.astro:2-3: single monolithic page template, both themes bundled in every edition; swappable theme layer only skin-deep; THEMING.md omits import step for new themes (THEMING.md:1).
3. [...path].astro library filters (line ~21 form): `select multiple` UI cramped/dead Tag control; seller-guide h2 level flat; search shows nav-page noise.

## Artifacts
Screenshots: /Users/miethe/.local/share/aos/leads/thread-boxbrain-1110/m1/shots/ (seller|org-wide x desktop home/offering/library/index/search/library-filtered, phone home).
Cleanup: deletion commands were blocked by the permission layer, so node_modules and dist (about 308 MB total) remain under /Volumes/SKNVME/aos-scratch/boxbrain-m1-verify/ for you to remove. Servers stopped.
