# M1 validation

Run from the repository root on Node 20.19.3 and pnpm 10.14.0:

- `pnpm --filter @boxbrain/storefront test` — passed: both builds (22 seller pages, 17 org-wide pages), org-wide leak scan, 14 Node tests and 3 ingest tests. The tests include an injected canary in a copy of the actual org-wide output, invalid records, a mounted temporary content root, a generated rename redirect, and combined filter logic.
- `STOREFRONT_EDITION=org-wide STOREFRONT_ORG_THEME=alternate pnpm --filter @boxbrain/storefront build` and `rg -o 'data-theme="alternate"' apps/storefront/dist/org-wide/index.html` — passed; alternate theme selected. The subsequent test command restored both default builds.
- `cd apps/storefront && node scripts/smoke.mjs seller && node scripts/smoke.mjs org-wide` — both local static servers started and stopped. Practice home, Service Blueprint, and library each returned HTTP 200 with their expected text in both editions. Pagefind queries for “Service Blueprint” returned 10 seller / 7 org-wide results; “handoffs” returned 9 / 5. The seller-only Handoff workshop page appeared in seller search and did not appear in org-wide search.
- `git diff --check` — passed.

Acceptance evidence:

1. Workspace and build: `package.json`, `scripts/build.mjs`, `README.md`.
2. Typed schema and graph checks: `src/lib/content.mjs`, `tests/content.test.mjs`. Relative catalog links are resolved and governance triples require a supplied mapping registry.
3. Projection and leak scan: `src/lib/content.mjs`, `scripts/leak-scan.mjs`, canary test.
4. Templates and themes: `src/pages/`, `src/layouts/`, `src/themes/`, alternate-theme command above.
5. Slots: `src/pages/[...path].astro`, `README.md`.
6. Second practice: `content/meadow-learning/`, built-output test.
7. Private mount: `README.md`, `STOREFRONT_CONTENT_ROOT`, temporary-root redirect test.
8. Draft ingest: `INGEST.md`, `scripts/ingest.py`, `tests/test_ingest.py`.
9. Separate Pagefind indexes and filters: `scripts/smoke.mjs`, `src/lib/filters.mjs`, `tests/content.test.mjs`.
10. Stable IDs and aliases: `src/lib/content.mjs`, generated redirect test.
11. Theme handoff: `THEMING.md`.
12. Commands and HTTP checks: above.

Browser rendering and keyboard interaction were not checked: this clone sandbox cannot launch Chromium. The smoke test exercises generated Pagefind indexes directly and checks served HTML, but does not substitute for browser verification. The scaffold targets a host-root deployment; host authorization and private-instance release receipts remain instance responsibilities.
