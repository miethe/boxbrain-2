# Shared brief for screen-wave implementers (Waves 2–5)

You are bringing one screen of the BoxBrain v2 web app (`apps/web`, Next.js 15 App Router +
Tailwind + CSS-variable design system) to design-spec parity.

## Inputs (read in this order)

1. Your screen's section in `docs/project_plans/uplift/audit-digest.md` — the authoritative gap
   list. Close every HIGH and MEDIUM gap; close LOW gaps when cheap. If a gap requires backend
   data that does not exist (marked `API[no]`), build the UI with an honest empty/preview state —
   never fabricate data that looks real.
2. The design JSX for your screen under
   `docs/project_plans/init/boxbrain-v2-project-handoff/project/src_v2/` and mock-up PNGs under
   `.../project/uploads/` (Read them as images). Design JSX is truth; mocks fill gaps.
3. The shared design system: `apps/web/app/globals.css` (component classes ported from the design
   stylesheet — badges with dots, chips, tags, stat cards, meters, score pills, match bars, trays,
   ve-* explorer classes, tabs, list rows, etc.) and the component kit `apps/web/components/ui.tsx`.
   USE this vocabulary; do not invent parallel styles.
4. The API client `apps/web/lib/api.ts` (grep for what you need) and the live API at
   `http://localhost:8300` (memory mode, seeded) — curl endpoints to confirm actual payload shapes
   before wiring. The web dev server runs at `http://localhost:3300`. Do not start/stop servers.

## Hard rules

- Do NOT edit shared files: `apps/web/app/globals.css`, `apps/web/components/ui.tsx`,
  `apps/web/components/shell.tsx`, `apps/web/lib/api.ts`. New screen-specific components go in
  `apps/web/components/<your-screen>/` or `apps/web/features/<your-screen>/`. If you genuinely
  need a shared-layer change, note it in your final summary instead of making it.
  (Exception: if your screen's audit gaps explicitly name one of your screen's OWN legacy
  components like `reviews-hub.tsx` or `ingestion-workspace.tsx`, you own those.)
- Keep existing `data-testid` attributes working; add new ones for major new regions.
- Domain rules (CLAUDE.md) are non-negotiable: ContentUnit atomic; version/variant/similarity/
  composition are distinct; similarity never implies family membership; AI outputs are candidates
  until human action; status chips for approval/freshness/canonical/restricted/link-source;
  loading/empty/error/restricted states on every async region; storyboard is sections+slots.
- Accessibility: aria-labels on icon buttons, keyboard operability, focus-visible states.
- Real API data only (or honest empty/preview states). Preserve any existing write-action wiring
  (comments, notes, governance actions) — do not regress it.
- Verification before you finish: `pnpm --filter @boxbrain/web lint && pnpm --filter @boxbrain/web
  typecheck && pnpm --filter @boxbrain/web test` all green, then load your screen on :3300 and
  confirm it renders without console errors.
- Do NOT run `git commit`; leave changes in the working tree.
- End with: files changed, gaps closed vs deferred (with reasons), verification results.
