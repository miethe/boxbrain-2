# Wave 0 — Design Foundation Spec (tokens, UI kit, shell)

Goal: bring the shared design layer of `apps/web` to parity with the Claude Design reference
(`docs/project_plans/init/boxbrain-v2-project-handoff/project/styles_v2.css`, `src_v2/shell.jsx`,
`src_v2/app.jsx`) so subsequent per-screen waves can be built purely from this vocabulary.

## Constraints (hard)

- `pnpm --filter @boxbrain/web lint && pnpm --filter @boxbrain/web typecheck && pnpm --filter @boxbrain/web test` must pass at the end.
- Do NOT break existing Playwright/e2e hooks: keep every `data-testid` currently emitted by
  `components/shell.tsx` (`nav-*`, `operations-nav-*`) present with the same values for existing routes.
- Keep all existing exports of `components/ui.tsx` backward compatible (same names, props may gain
  optional additions only): `Button, Card, PageHeader, Tag, StatusBadge, SlideThumb, ScorePill, Meter, StatCard, EmptyState`.
- Do not remove routes from the sidebar; do not add links to routes that don't exist (no Inbox/Accounts/Reports pages exist — omit them entirely rather than adding dead links).
- Do NOT run `git commit`. Leave changes in the working tree.
- Scope: only `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/components/ui.tsx`,
  `apps/web/components/shell.tsx`, and (if nav data needs reshaping) `apps/web/features/demo/data.tsx|ts`.

## 1. CSS component layer port (`apps/web/app/globals.css`)

Port the component classes from `styles_v2.css` into `globals.css`, merging with / replacing the
existing overlapping definitions (`badge`, `btn*`, `card`, `icon-btn`, `muted`, `score-pill`,
`slide-thumb*`, `tabs/tab`, `tag`). Keep the existing `:root` token block (it already matches the
design tokens) but diff it against `styles_v2.css` `:root` and add any missing variables
(`--line-soft`, `--primary-border`, `--ai-2`, `--info*`, `--radius-sm/lg`, `--shadow-sm/md/lg`,
`--sb-w`, `--topbar-h`, `--font`, `--mono`, etc.).

Classes to port (full visual fidelity, adapted only where noted):

- Badges/chips/tags: `.badge` (+`ok|warn|danger|ai|primary` tones + `.dot`), `.badge-check`, `.chip` (+`.active`), `.tag` (+`.blue`, `.sm`), `.count-inline`, `.badge-dot` (topbar bell notification dot — check design HTML for definition; if absent create an 8px red dot positioned top-right of the icon button).
- Buttons: `.btn` sizes `.btn-sm`, `.btn-xs`, `.btn-split` (+ internal `.sep`), `.btn-ghost`, `.btn-primary` parity, `.icon-btn` (+`.borderless`).
- Cards: `.card`, `.card-head`, `.card-body`, `.card-hoverable`/`.card-hover-show`, `.stat-card` (+`.label/.value/.hint/.spark`, `.spark-svg` with `.line.up/.down` stroke colors), `.section-head`, `.list-row`, `.info-banner`, `.divider`, `.sep-v`.
- Data viz: `.score-pill` (+`.circle`, `good|mid|low`), `.meter` (conic-gradient with `--v` custom property + `kind` variants as in design), `.match-bar` (+`.bar` with `--v`), `.match-score`, `.stars`.
- People: `.avatar` (+ color variants `violet|teal|amber|green`), `.avatar-stack`, `.user-row`.
- Explorer: all `.ve-*` classes verbatim (`ve-rail`, `ve-rail-track`, `ve-arrow`, `ve-concept`,
  `ve-concept-match`, `ve-concept-check`, `ve-pagination-dot`, `ve-variant`).
- Composition/tray: `.tray`, `.tray-tab`, `.tray-body`, `.tray-actions`, `.tray-item`, `.tray-item-thumb`, `.tweaks-panel`, `.tweak-row`, `.tweak-pills`, `.toggle`.
- Search/command: `.palette*` classes (command palette), `.kbd`, `.result-counter`, `.pagination`, `.select-wrap`, `.input`.
- Misc: `.link`, `.mono`, `.muted`, `.dim`, `.tbl` (table styles), `.file-icon` (+`.file-icon-badge`), `.flow-step/.flow-num/.flow-icon`, `.compare-card`, `.help-bubble`, `.up-hint`, `.ai-panel/.ai-btn/.ai-action`, `.page-head-row`, `.tabs/.tab` parity.
- Slide thumbs: upgrade `.slide-thumb` to design parity including variant classes (`light`, `teal`, `purple`; dark default), `.content/.brand/.title/.sub` inner classes — BUT keep the existing inner class names (`slide-content`, `slide-brand`, `slide-title`) working too (define both or alias) since current pages use them.

EXCLUDE: utility classes that Tailwind already provides (`.flex`, `.grid`, `.grid-3/4/5`, `.gap-*`,
`.items-*`, `.justify-*`, `.mt-*`, `.mb-*`, `.right`) — do not port these. Also skip `.sb-*`,
`.topbar` internals, `.breadcrumbs`, `.search` shell classes IF you keep the current Tailwind-utility
approach in `shell.tsx` (preferred); visual parity is what matters.

Reference for any ambiguity: `docs/project_plans/init/boxbrain-v2-project-handoff/project/BoxBrain v2.html` + `styles_v2.css`.

## 2. Typography (`apps/web/app/layout.tsx`)

- Load Instrument Sans and JetBrains Mono via `next/font/google` with css-variable strategy;
  set `--font` and `--mono` so the token layer picks them up; apply the sans font to `<body>`.
- `font-feature-settings: "cv11","ss01","ss03"` on body (already in design CSS body rule — port it).

## 3. UI kit expansion (`apps/web/components/ui.tsx`)

Add typed, accessible components matching design behavior (see `src_v2/shell.jsx` for reference
implementations):

- `Badge({kind, dot, children})` — kinds `ok|warn|danger|ai|primary|neutral`; render `.badge` with `.dot` span when `dot`. Keep `StatusBadge` as-is (or reimplement on top of Badge) for compatibility.
- `BadgeCheck({children})`.
- `Chip({active, onClick, children})`.
- `SplitButton({children, onMenu, size})` — `.btn btn-primary btn-split`.
- `Stat({label, value, hint, spark, up, down})` — stat card with sparkline SVG path (design `Stat`). Keep existing `StatCard` export too.
- `MatchBar({value})`.
- `Stars({n, of})`.
- `Avatar({who, className})` + `AvatarStack({people})` — initials + deterministic color hash per design.
- `SectionHead({children, count, action})` — uppercase 12px section label with optional `.count-inline` and right-aligned action.
- `Kbd({children})`.
- `InfoBanner({tone, children})`.
- `Tabs({tabs, active, onChange})` — `.tabs`/`.tab` markup, keyboard accessible (arrow keys, role=tablist).
- `ListRow({title, sub, right, onClick, href})`.
- `IconButton({label, borderless, children})` — `.icon-btn` with required aria-label.
- Upgrade `ScorePill` to design markup (`.score-pill` with `.circle` number + label, `good|mid|low` from thresholds ≥85 / ≥70) while keeping current props `{value, label}` working.
- Upgrade `Meter` to design `.meter` markup with `--v` var + optional `kind`.
- Upgrade `SlideThumb` with optional `sub` and `big` props per design.

All interactive components: keyboard operable, focus-visible ring (`box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent)` or Tailwind ring), aria labels where icon-only.

## 4. Shell (`apps/web/components/shell.tsx` + nav data)

Sidebar (visual parity with design `shell.jsx` / mock sidebars, keeping current routes):

- Primary nav order: Home, Search (label with right-aligned `⌘K` kbd hint — link to `/ask` for now), Opportunities, Plays, Library, Reviews (keep existing count pill), Admin. Keep any other existing primary items that have live routes (e.g. Ask if it's separate from Search — if Ask exists as its own item, label it "Search" per design and keep href `/ask`).
- Keep the "Operations" group with its current items/testids (Ingestion etc.).
- Keep Favorites group; add a "Spaces" group below it with static demo spaces (`Growth`, `Public Sector`, `Strategic Accounts`, `Product Marketing`) using a folder icon, non-navigating (`role="button"`, no dead hrefs — render as buttons).
- Active item style: solid `var(--primary)` background with white text (design), not the current dark slate; hover states per design. Count pill style: `rgba(255,255,255,0.12)` bg per design `.count` (not blue).
- Preserve workspace switcher and user footer as-is (already match design).

Topbar: add notification `badge-dot` to the bell button; everything else stays (breadcrumbs, search with Cmd K kbd, sparkle AI button, My Selection tray button, help, avatar).

## 5. Verification

Run: `pnpm --filter @boxbrain/web lint`, `typecheck`, `test`. Then `pnpm --filter @boxbrain/web build`
(must succeed). Visually sanity-check that `/` renders by hitting http://localhost:3300 if the dev
server is up (do not start/stop servers).
