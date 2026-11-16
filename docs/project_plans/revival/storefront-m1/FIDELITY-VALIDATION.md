# Storefront v2 component fidelity validation

The pass retains Field Guide for sellers, Editorial for the organization, and the seller situation doorway, using the existing v2 prototype as the component reference. See [carryover scope](V2-CARRYOVER.md) and [theme contract](../../../../apps/storefront/THEMING.md).

Validation on 2026-11-16:

- `STOREFRONT_SELLER_THEME=field-guide STOREFRONT_ORG_THEME=editorial pnpm test` passed: 127 web tests, 21 storefront tests, three ingestion tests. Both edition builds and the org-wide leak scan passed. The first attempt found missing installed dependencies; a frozen-lockfile install resolved that prerequisite.
- The org-wide output test checks all HTML for Plays links, checks the absence of the Plays directory, and verifies Editorial has no Plays template files. Browse templates are shared through theme index exports.
- Chromium inspected seller home, seller offering, seller library, org-wide home and org-wide offering at 1600×1000, and both homes at 390×844. The seven captures, per-capture observations and DOM checks are attached to the tracking node.
- No horizontal overflow, overlapping text, unlabelled search inputs or browser page errors were found. One h1 appeared per route. The seller doorway heading starts at approximately y=276 on desktop and y=524 on phone. All four organizational entry cards are visible together on desktop; phone cards stack.
- Computed text contrast sampling over the theme shell returned a minimum 4.55:1. The doorway eyebrow was darkened after its initial 4.37:1 result. Whole-card focus outlines, interactive home search, library filtering, empty results, reset and the no-JavaScript library navigation form passed browser checks.

The component references are `library-all.png`, `content-unit-library.png`, `library-search.png` and `plays-detail-view.png` under the original handoff's `project/uploads/`. The retained differences are deliberate: type tiles replace visual previews; no avatars, sample people, metrics, AI rail or unavailable application controls are reproduced. The offering body remains prose; native facets retain the storefront's existing interaction contract. These captures are inspected samples, not pixel regression coverage or a full accessibility audit.

The implementation stays in theme components, tokens, theme exports, the requested route exclusion test and documentation. No loader, view-model, schema, content or production dependency changes. The shared layout is unchanged; theme CSS suppresses its generic navigation only when the composed v2 shell is present, preserving the shared 404 fallback.

Independent review of the final PR remains with the integration owner. No merge was performed.
