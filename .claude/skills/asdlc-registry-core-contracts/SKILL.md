---
name: asdlc-registry-core-contracts
description: >-
  Use when changing artifact identity, versioning, manifests, search/matching,
  content resolution, repository interfaces, or the local/enterprise DB split
  in the SkillMeat codebase (skillmeat/core/, skillmeat/cache/, skillmeat/storage/,
  skillmeat/sources/) — i.e. the informal "Registry Core" kernel this AOS has not
  yet named as a literal module. Trigger keywords: registry core, artifact
  identity, repository interface, IArtifactRepository, ICollectionRepository,
  RepositoryFactory, cache.db, SKILLMEAT_EDITION, alembic multi-head, schema
  drift, cli_snapshot.json, deprecation window, backward compatibility, breaking
  change to core. Do NOT use for CLI-surface/agent-facing command routing (use
  `skillmeat-cli`), for BOM/attestation authoring (use `asdlc-skillbom-builder`),
  or for bundle/deployment-set packaging (use `asdlc-sam-artifact-packager`).
version: 0.1
app_version: "2026-07-03"
updated: 2026-07-03
spec: ./SPEC.md
---

# asdlc-registry-core-contracts

## Purpose

Guard-rail skill loaded before changing SkillMeat's artifact-identity /
versioning / manifest / search / content-resolution kernel. The handoff spec
(§4.4) names this kernel "Registry Core" and says it should stay small,
stable, and testable while higher-order modules (API, CLI, web, enterprise,
marketplace) plug in around it. **`Registry Core` is not a literal module or
package in this codebase** — grep for it returns nothing. This skill maps the
doctrine onto the actual module boundaries so an agent can find the real
contract, its real consumers, and the real pinning tests before editing.

## When to use

- Before editing anything under `skillmeat/core/interfaces/`, `skillmeat/core/repositories/`,
  `skillmeat/core/artifact.py`, `skillmeat/core/version*.py`, `skillmeat/core/search.py`,
  `skillmeat/core/matching.py`, `skillmeat/core/path_resolver.py`, `skillmeat/storage/manifest.py`,
  `skillmeat/cache/models.py`, `skillmeat/cache/repository_factory.py`, or anything under
  `skillmeat/cache/migrations/`.
- Before changing an abstract repository interface (`IArtifactRepository`,
  `ICollectionRepository`, etc. in `skillmeat/core/interfaces/repositories.py`)
  or adding a new one.
- Before touching `db_path` / session-resolution logic that decides whether a
  code path talks to local SQLite `cache.db` or enterprise PostgreSQL.
- Before removing or renaming a public CLI/API surface backed by the kernel.

## When not to use

- Agent-facing CLI command routing / syntax lookup for end users → use
  `skillmeat-cli` (`.claude/skills/skillmeat-cli/`).
- Producing SkillBOM manifests/attestation → use `asdlc-skillbom-builder`.
- Packaging bundles/deployment-sets for SAM/SkillMeat distribution → use
  `asdlc-sam-artifact-packager`.
- Pure UI/web work with no core contract touched → not in scope here.
- General onboarding to the cache layer's local-vs-enterprise repository
  *testing* patterns → read `skillmeat/cache/tests/CLAUDE.md` directly
  (referenced below, not duplicated here).

## Related sibling skills

- `skillmeat-cli` — the CLI-surface router; use it for command syntax, never
  for core-module editing decisions.
- `asdlc-skillbom-builder` — wraps `skillmeat/core/bom/` for provenance output;
  this skill only tells you when a BOM-adjacent contract (e.g. version/digest
  identity) is being touched.
- `asdlc-sam-artifact-packager` — wraps bundle/deployment-set CLI; this skill
  covers the manifest/version contracts those commands depend on.
- `asdlc-model-downgrade-hardening` — use after this skill's procedure to
  rewrite the resulting diff/plan for a smaller execution model.

## Source of truth

- `skillmeat/core/interfaces/README.md` — the only place in the repo that
  names the pattern explicitly: "hexagonal-architecture contracts between the
  application core and its infrastructure adapters."
- `skillmeat/cache/CLAUDE.md` — local (SQLAlchemy 1.x, SQLite) vs enterprise
  (SQLAlchemy 2.x, PostgreSQL) repository divergence is **intentional**.
- `docs/dev/architecture/compatibility-registry.md` — the live deprecation/removal
  decision log (Option B: structural-snapshot + one-release deprecation window).
- `docs/dev/architecture/migration-safety-enterprise-spec.md` — root-cause writeup
  of the local/enterprise schema divergence and the alembic multi-head strategy.
- `CONTRIBUTING.md` §"Project structure" and §"Dev tools" — canonical test
  invocation; `pytest.ini` for markers; `Makefile` for `test-python`/`test-integration`.

## Procedure

1. **Classify the touch point.** Match the file(s) you're about to change
   against the kernel map in `references/kernel-boundary-map.md`. If it's not
   in that map, this skill likely does not apply — reconsider the sibling
   skills above.
2. **Read the interface contract, not just the implementation.** If the
   change touches a repository method, open `skillmeat/core/interfaces/repositories.py`
   (the ABC) before touching `skillmeat/core/repositories/local_*.py` or the
   `skillmeat/cache/enterprise_repositories/` package (e.g. `artifacts.py`). The ABC
   signature is the contract; local and enterprise implementations both promise to satisfy it.
3. **Find every consumer before editing.** Grep for the interface name /
   function name across `skillmeat/api/routers/`, `skillmeat/api/dependencies.py`
   (DI wiring), `skillmeat/cli/commands/`, and `skillmeat/web/` (TS callers of
   the API). A kernel change with unfound consumers is the single biggest
   source of the DB-path-split class of bug documented in Known Traps.
4. **Decide additive vs breaking** using the Decision Gates table below.
5. **If touching a DB-backed model or migration**, read
   `references/alembic-multi-head-and-db-split.md` in full before writing a
   migration. Confirm current head state first: `python -m alembic -c
   skillmeat/cache/migrations/alembic.ini heads` (verified 2026-07-03: prints
   a single head in this checkout — historically has diverged to 2+ heads
   requiring a merge migration; see reference file).
6. **Run the pinning tests** for the layer you touched (see Commands). Do not
   rely on green CI alone if you changed an interface signature — pinning
   tests for new interfaces may not exist yet (see Known Traps, gap items).
7. **If removing/renaming a public surface** (CLI command, API route, DTO
   field), add or update an entry in `docs/dev/architecture/compatibility-registry.md`
   following its documented Option B pattern (deprecate one release cycle,
   then remove) — do not delete silently.
8. **State your evidence** in the PR/summary: which interface(s) touched,
   which consumers were checked, which tests were run and passed, and whether
   a migration/compat-registry update was required.

## Decision gates

| Gate | Expected observation | If not observed |
|---|---|---|
| Interface signature change | New parameter has a default, or a new method is additive to the ABC (existing implementers still satisfy it via a default/mixin) | Treat as breaking: enumerate every implementer of the ABC (`skillmeat/core/repositories/local_*.py` + enterprise counterpart) and update all of them in the same change; bump per whatever versioning convention the touched package uses (check for `__version__`/CHANGELOG.md entries near the file) |
| DB-backed model/column change | A new column is nullable or has a server-side default; existing rows remain valid | Write an Alembic migration under `skillmeat/cache/migrations/versions/`, confirm `python -m alembic -c skillmeat/cache/migrations/alembic.ini heads` still shows the expected single (or intentional multi-) head, and add/adjust a pinning test under `tests/cache/migrations/` (see existing `test_20260702_0001_add_bundle_marketplace_flags.py` for the pattern) |
| Local vs enterprise repo touched | Change was applied to **both** `skillmeat/core/repositories/local_<x>.py` and its enterprise sibling in the `skillmeat/cache/enterprise_repositories/` package (or a documented reason exists for why only one needs it) | Stop — do not "fix" one side to match the other's style (SQLAlchemy 1.x vs 2.x, `db_path` vs injected `Session`) per `skillmeat/cache/CLAUDE.md`; instead implement the same *behavior* idiomatically in each style |
| A route/service resolves a repository or session | The resolution goes through `RepositoryFactory` (`skillmeat/cache/repository_factory.py`) or the equivalent `*RepoDep` in `skillmeat/api/dependencies.py`, honoring `SKILLMEAT_EDITION` | Do not hardcode `db_path=None` or construct a service directly — this is the exact pattern documented as broken in `tests/enterprise/MEMORY_AUDIT_FINDINGS.md` (memory/context services bypass edition routing entirely) |
| Removing/renaming a public CLI/API surface | An entry exists (or is added) in `docs/dev/architecture/compatibility-registry.md` with `removal_status` and cited evidence | Do not delete; open/extend a compatibility-registry entry first and honor the one-release deprecation window (Option B) |
| Schema drift risk | `tests/test_cache_drift_guard.py` passes (verified 2026-07-03: 5 passed in ~4s) after your change | If it fails, the ORM model and the actual DB columns have diverged — do not suppress `SchemaDriftError`; fix the migration instead |

## Commands

Verified (executed in this session, 2026-07-03, against this worktree):

```bash
# Full suite (also documented in CONTRIBUTING.md § Testing and pytest.ini testpaths)
pytest -v
# equivalent Makefile target (adds coverage)
make test-python

# Targeted schema-drift guard (verified: 5 passed in 4.04s)
pytest tests/test_cache_drift_guard.py -q

# Static Alembic head check — read-only, no DB connection required
# (verified: prints "20260702_0001_add_bundle_marketplace_flags (head)" in this checkout)
python -m alembic -c skillmeat/cache/migrations/alembic.ini heads

# Branch/merge-point graph (verified: shows ent_* branch points and mergepoints,
# e.g. "ent_010_version_scopes_and_history_tenant (branchpoint) (mergepoint)")
python -m alembic -c skillmeat/cache/migrations/alembic.ini branches
```

Documented but not executed by this session (candidate — re-verify before relying on them):

```bash
# candidate: integration marker subset (per pytest.ini / Makefile test-integration)
pytest -v -m integration

# candidate: regression marker — pytest.ini describes it as "Regression tests
# guarding existing behavior across expansions", directly relevant to contract work
pytest -v -m regression

# candidate: enterprise PostgreSQL schema tests — pytest.ini marks these as
# "requires DATABASE_URL"; skip without a live Postgres instance
pytest -v -m enterprise

# candidate: per-layer pinning suites referenced in this skill's kernel map
pytest tests/cache/ -v
pytest tests/dvcs_contracts/ -v
pytest tests/migration/ -v
pytest skillmeat/core/repositories/tests/ -v
```

## Evidence required

Before claiming a Registry Core change is safe, an agent must be able to cite:

1. The exact file(s)/interface(s) touched (path + symbol name).
2. The consumer grep performed (command + result count) across API/CLI/web.
3. The test command(s) run and their pass/fail result (paste the tail of
   pytest output, not a paraphrase).
4. Whether a migration was needed, and if so, the head-check output before
   and after (`alembic ... heads`).
5. Whether a `compatibility-registry.md` entry was added/updated, or an
   explicit statement that none was needed (additive-only change).

## Known traps

- **DB-path / edition-routing split (evidenced)**: `db_path=None` resolves to
  `~/.skillmeat/cache/cache.db` inside `BaseRepository.__init__`
  (`skillmeat/cache/repositories/base.py`; note `tests/enterprise/MEMORY_AUDIT_FINDINGS.md`
  cites the historical flat-file path `skillmeat/cache/repositories.py`, since refactored
  into the `repositories/` package).
  Several service factories (`memory_items.py:_get_service()`,
  `context_packing.py:_get_service()` at the time of that audit) construct
  services with a hardcoded `db_path=None`/no session, **bypassing**
  `RepositoryFactory`'s `SKILLMEAT_EDITION` routing entirely — meaning the
  same logical CLI/API operation can silently target local SQLite even when
  the deployment is configured for enterprise PostgreSQL. Always trace a new
  service's DB access back to `RepositoryFactory` or a `*RepoDep`, not to a
  local convenience constructor.
- **Alembic multi-head strategy (evidenced)**: migrations live on two logical
  branches in one `versions/` directory — the main/local branch and the
  `ent_*`-prefixed enterprise branch (101 `ent_*` files at last count).
  `CacheManager` and the runbooks always use the plural `"heads"` selector
  (`command.upgrade(cfg, "heads")`, `command.stamp(alembic_cfg, "heads")`,
  `alembic upgrade heads`) — never the singular `"head"`. A migration that
  creates an unintended second head on the same branch, or a squash-merge
  that silently creates a multi-head split, has broken enterprise startup at
  least once before (`docs/dev/architecture/migration-safety-enterprise-spec.md`
  §Root Cause Analysis: `ent_001_enterprise_schema.py` recreates
  `artifact_versions` with a different PK type — `String` locally vs `UUID`
  enterprise — and a different parent table, `artifacts` vs
  `enterprise_artifacts`). Always run the branches/heads check (Commands
  section) after adding a migration.
- **Schema drift is a hard guard, not a warning**: `SchemaDriftError`
  (`skillmeat/cache/repository.py`) is deliberately raised loud rather than
  silently continuing when actual DB columns diverge from the ORM model —
  do not catch and suppress it; fix the migration.
- **Local vs enterprise repository style divergence is intentional**
  (`skillmeat/cache/CLAUDE.md`): local repos use SQLAlchemy 1.x
  `session.query()` + `db_path`; enterprise repos use SQLAlchemy 2.x
  `select()` + injected `Session`, with `UUID` PKs instead of `str`. Do not
  "fix" one to match the other's style.
- **Public-surface deletion requires evidence, not intuition**
  (`docs/dev/architecture/compatibility-registry.md`): the repo has a working
  precedent (`cli_snapshot.json` / `route_snapshot.json` structural diffs +
  one-release deprecation window) for retiring CLI aliases/legacy routes.
  Reuse that pattern rather than inventing a new one.
- **No dedicated "dependency resolution" module found** — INFERENCE: the
  handoff spec's phrase "dependency resolution" maps loosely onto bundle/BOM
  dependency handling in `skillmeat/core/sharing/` (`bundle.py`, `builder.py`,
  `manifest.py`) and `skillmeat/core/bom/` (`generator.py`), not a standalone
  resolver. If asked to "preserve dependency-resolution contracts," confirm
  with the requester which of these two subsystems they mean before editing.
- **No event outbox pattern found** — grep for `outbox` across `skillmeat/`
  returns zero matches at time of writing; do not assume one exists when
  reasoning about eventual-consistency guarantees between the filesystem
  collection and `cache.db`.

## Output format

When this skill is invoked to review or gate a change, respond with:

1. **Touch-point classification** — which kernel area(s) from
   `references/kernel-boundary-map.md` are affected.
2. **Consumer list** — files/modules found to depend on the touched
   interface(s), with the grep command used.
3. **Gate results** — a copy of the Decision Gates table rows that applied,
   each marked observed/not-observed with the evidence.
4. **Test results** — command + pass/fail summary (verbatim tail, not
   paraphrased).
5. **Compatibility action** — none needed (additive) / compatibility-registry
   entry added or updated (breaking, with link) / blocked pending more
   evidence.

## Provenance and maintenance

- Reverify volatile facts:
  - `python -m alembic -c skillmeat/cache/migrations/alembic.ini heads`
  - `python -m alembic -c skillmeat/cache/migrations/alembic.ini branches`
  - `pytest tests/test_cache_drift_guard.py -q`
  - `rg -c "^ent_" <(ls skillmeat/cache/migrations/versions)` (approximate
    enterprise-branch migration count; was 101 at authoring time)
- Last reviewed: 2026-07-03
- SAM registration: candidate
- SkillBOM fields:
  - artifact_id: candidate — no `com.boxboat.*`-style ID scheme exists in this
    AOS; a real ID would come from whatever `skillmeat attest`/`skillmeat bom`
    assigns on registration (see `asdlc-skillbom-builder`)
  - version: 0.1
  - digest: candidate — compute at packaging time (`asdlc-sam-artifact-packager`)
  - source_context: this codebase's `skillmeat/core/`, `skillmeat/cache/`,
    `skillmeat/storage/`, `skillmeat/sources/`, and the docs cited above
  - policy_tags: [registry-core, backward-compat, schema-migration]
  - evidence_hash: candidate — computed at packaging/attestation time
