# Applying a visual direction

A theme owns page markup and tokens. The loader validates and projects content before any theme sees it; do not implement audience filtering in a theme. `src/lib/view-models.mjs` constructs the page models described in `src/lib/view-models.d.ts`. `src/layouts/Layout.astro` provides the shared document, navigation and selected token import; interaction scripts are shared in `src/components/Interactions.astro`.

To add a theme:

1. Copy `src/themes/neutral/` to `src/themes/my-theme/`. Keep `index.mjs` exporting `pages` with the same page-type keys. Each corresponding Astro component receives `{vm}`. Edit those components and `tokens.css` freely, including section ordering and hierarchy.
2. Add `myTheme: './my-theme'` to `src/themes/config.mjs`. No other registration is necessary. Unknown names fail the build. The build resolves only the selected directory.
3. Run `STOREFRONT_SELLER_THEME=myTheme STOREFRONT_ORG_THEME=neutral pnpm --filter @boxbrain/storefront test` from the repository root. Select editions independently by setting `STOREFRONT_SELLER_THEME` and `STOREFRONT_ORG_THEME` before a build; each defaults to `neutral`. `alternate` is a proof theme, not a chosen design.

The route maps index, home, offerings, offering, plays, play, library, collateral and redirect to their namesake component; 404 uses the shared layout. All models include `slots`: `doorway` holds the visible situation records on home and is empty on other pages; `howToSell` holds the approved seller guide on an offering and is empty elsewhere; `evidence` holds featured visible collateral on home, related visible collateral on offering, and is empty on other pages. Themes may omit an empty slot. Use these fields rather than discovering private content independently.

For a selected direction:

- Reorder the page components to express the chosen journey, retaining visible content and working links.
- Define typography, color, spacing, responsive layout and focus states in the theme tokens and components.
- Keep one h1 and nested headings; preserve accessible labels, search and filter hooks, empty states and navigation.
- Build both editions with their intended selections; run tests, the leak scan and smoke checks. Check keyboard use and narrow/wide rendering on a browser-capable host.
- Confirm that only the chosen theme ships in each edition and that seller-only content remains absent from org-wide output.

The automated third-theme test follows these copy/register/build steps in a temporary scratch copy and removes it afterwards.
