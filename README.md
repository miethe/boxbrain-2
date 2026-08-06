# BoxBrain v2 — PAUSED

> ## ⏸️ Paused 2026-08-05 · no named pilot user
>
> **Decision HAR-006: pause + harvest.** Roadmap work is stopped — not because the build is bad (the
> engineering core is real and well-governed) but because **no named pilot user exists**, and a
> pilot-readiness push with nobody to pilot for is effort with no signal attached.
>
> **Reversal condition — exactly one:** a *named* external pilot user. At that point this banner comes
> off and the roadmap resumes. "Someone might be interested" does not qualify; that ambiguity is what
> the pause exists to force.
>
> **What was harvested rather than shelved:** the family / variant / version / composition
> content-governance model — the genuinely novel part of this repo — is filed as spec input for
> **SkillMeat artifact dedup** and **MeatyWiki supersession**, where the same problem (many
> near-identical artifacts, which one supersedes which) is live and has users today.
>
> **Security work was never gated on this pause,** and is done: the `assets.py` restricted-content
> leak (campaign action S1) was fixed in `d1dec83` (2026-07-07) — the route now calls `get_actor` and
> gates on `can_view_restricted` + `is_asset_restricted`. ⚠️ Note the campaign's own report asserted
> a month later that this was *still* unfixed ("still 21 lines, still not calling `get_actor`"); that
> was wrong. Re-verified 2026-08-06.
>
> Decision record: `agentic_meta_dev/docs/portfolio-intelligence/artifacts/08-decision-queue.md`
> § HAR-006.

BoxBrain v2 is a governed enterprise slide and content catalog for decomposing business artifacts into atomic ContentUnits, organizing them by family, variant, and version, and composing reusable Storyboards with provenance, review, and search controls.

## Repository Layout

- `apps/`: frontend applications, including the future Next.js web app.
- `services/`: backend services, including the future FastAPI API and workers.
- `contracts/`: shared API contracts.
- `infra/`: local development infrastructure.
- `docs/project_plans/init/`: product, architecture, implementation, schema, and contract planning assets.

## Local Quickstart

1. Install the workspace package manager if needed:

   ```bash
   corepack enable
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

4. Start local infrastructure and apply migrations:

   ```bash
   make infra-up
   make db-migrate
   ```

5. Run scaffold verification:

   ```bash
   pnpm verify
   ```

Local infrastructure starts PostgreSQL with pgvector, Redis, and MinIO. Database schema creation flows through Alembic. Set `BOXBRAIN_DB_SCHEMA=boxbrain` to keep BoxBrain tables and its Alembic version table in a dedicated PostgreSQL schema, which is the safe option when pointing `DATABASE_URL` at an existing PostgreSQL database.

## Containerized Quickstart

Run the full local app stack through Compose:

```bash
cp .env.example .env
make app-up
```

This builds and starts the web app, API, RQ worker, PostgreSQL/pgvector, Redis, MinIO, MinIO bucket setup, and Alembic migration service. Open `http://localhost:3000` for the app and `http://localhost:8000/api/health` for API health.

See `docs/deployment/containerized-quick-start.md` for ports, rebuilds, logs, teardown, and caveats.

## Useful Commands

```bash
pnpm openapi:check
pnpm types:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
make infra-up
make db-migrate
make app-up
make app-ps
make app-down
make infra-down
make infra-logs
```

## Domain Guardrails

- ContentUnit is atomic.
- Family, Variant, Version, Similarity, and Composition are distinct.
- Similarity edges do not imply shared family identity.
- Storyboard snapshots are immutable once saved.
- AI suggestions must be traceable, reviewable, and governed by audit events.
- Restricted content must not leak through search, thumbnails, snippets, where-used, or similarity output.
