# Alembic multi-head strategy and the local/enterprise DB split

All facts below are EVIDENCED (file/doc citations given); commands were
executed against this worktree on 2026-07-03 unless marked candidate.

## The dual-database architecture

SkillMeat runs two storage backends from one codebase (evidenced,
`docs/dev/architecture/migration-safety-enterprise-spec.md` §Problem Statement):

- **Local/single-tenant**: SQLite, file at `~/.skillmeat/cache/cache.db` by
  default (`skillmeat/cache/manager.py` `CacheManager.__init__`:
  `self.db_path = str(Path.home() / ".skillmeat" / "cache" / "cache.db")`
  when `db_path=None`).
- **Enterprise/multi-tenant**: PostgreSQL, accessed via injected SQLAlchemy 2.x
  `Session` objects (the `skillmeat/cache/enterprise_repositories/` package).

Routing between them at the API layer is `RepositoryFactory`
(`skillmeat/cache/repository_factory.py`), keyed on the `SKILLMEAT_EDITION`
env var / `APISettings.edition`.

## The DB-path-split gotcha (evidenced incident)

`tests/enterprise/MEMORY_AUDIT_FINDINGS.md` (audit dated 2026-03-30) documents
a concrete, real occurrence of the class of bug this skill's Decision Gates
table guards against:

- `skillmeat/api/routers/memory_items.py` (`_get_service()`, at time of audit
  lines 68–74) constructed `MemoryService(db_path=None)` unconditionally —
  never consulting `APISettings.edition` or going through `RepositoryFactory`.
- `db_path=None` resolves to the local SQLite `cache.db`
  (`skillmeat/cache/repositories.py` `BaseRepository.__init__`, ~lines 300–301
  at time of audit).
- Net effect: in an enterprise deployment (PostgreSQL is the system of
  record), memory/context operations silently read/write the **local SQLite
  file instead**, producing "works locally, empty/broken in enterprise" bugs
  with no error raised — because the wrong DB is queried successfully, just
  for the wrong data.
- Root causes named in the audit: (1) no edition routing wired for these
  particular services, and (2) `_verify_project_exists()` queried the local
  `projects` table (string PK) instead of `enterprise_projects` (UUID PK).

**Generalization for this skill**: any time you add a new service/router that
needs DB access, verify it obtains its repository/session via
`RepositoryFactory` / a `*RepoDep` in `skillmeat/api/dependencies.py` — never
via a bare `SomeService(db_path=None)` or a bare `get_session()` call with no
edition check. This is exactly gate 4 in SKILL.md's Decision Gates table.

## Multi-head Alembic strategy

`docs/dev/architecture/migration-safety-enterprise-spec.md` (status:
in-progress at authoring time) documents the strategy directly:

> "Alembic migrations use a multi-head strategy where local-mode migrations
> run on the main branch and enterprise-specific migrations run on the
> `ent_*` branch. Both branches execute via `alembic upgrade heads` on
> enterprise PostgreSQL."

Evidenced in code: `skillmeat/cache/manager.py` explicitly uses the **plural**
`"heads"` selector everywhere (`command.upgrade(cfg, "heads")`,
`command.stamp(alembic_cfg, "heads")`) and the module docstring for the
stamping helper states: "Uses the plural `heads` selector so multi-head
migration graphs ... is the only correct selector when ≥2 heads exist."

Verified counts/commands in this worktree (2026-07-03):

```bash
$ ls skillmeat/cache/migrations/versions | grep -c '^ent_'
101

$ python -m alembic -c skillmeat/cache/migrations/alembic.ini heads
20260702_0001_add_bundle_marketplace_flags (head)
# Only one head in THIS checkout at this point in time — do not assume this
# is always true. The multi-head condition is a live risk, not a permanent
# state; re-run this before every migration-touching change.

$ python -m alembic -c skillmeat/cache/migrations/alembic.ini branches
# (excerpt) confirms branch points and merge points, e.g.:
# ent_010_version_scopes_and_history_tenant (branchpoint) (mergepoint)
#                                           -> ent_011_enterprise_marketplace_source_columns
#                                           -> 20260328_0001_merge_heads (mergepoint)
#                                           -> ent_012_enterprise_project_templates (branchpoint)
```

Both `heads` and `branches` are static graph reads — they do not require a
live database connection and are safe to run at any time.

## The documented root-cause incident (why this matters)

`migration-safety-enterprise-spec.md` §Root Cause Analysis describes a real
March 2026 outage class: `ent_001_enterprise_schema.py` drops and recreates
`artifact_versions` with a schema that diverges from the local/main-branch
version:

| Property | Local (SQLite) | Enterprise (PostgreSQL) |
|---|---|---|
| Primary key type | `String` | `UUID` |
| `artifact_id` FK target | `artifacts.id` (String) | `enterprise_artifacts.id` (UUID) |
| `change_origin` column | present | absent |
| Parent table | `artifacts` | `enterprise_artifacts` |

Because local-mode (main-branch) migrations also execute against enterprise
PostgreSQL (both branches run via `alembic upgrade heads`), a main-branch
migration written and tested only against SQLite can silently assume columns
or FK targets that do not exist on the enterprise schema. Four DVCS-related
migrations broke enterprise startup this way between 2026-03-30 and
2026-03-31 before ad-hoc guards were added.

**Generalization for this skill**: when a migration touches a table that has
an enterprise-specific schema divergence (check `models.py` vs
`models_enterprise.py` for the same logical table name), test it against
both SQLite and PostgreSQL before merging, or explicitly scope the migration
to one branch only (main vs `ent_*`) per existing convention.

## Schema drift guard (defense layer, not the fix)

`skillmeat/cache/manager.py` `_stamp_untracked_db_if_needed()` raises
`SchemaDriftError` (`skillmeat/cache/repository.py`) rather than silently
stamping a database whose live columns no longer match the ORM model
definition. This is a **detection** guard, not a prevention mechanism — it
fails loud after the fact rather than preventing a bad migration from being
written. Pinned by `tests/test_cache_drift_guard.py` (5 tests; verified
passing 2026-07-03: "5 passed in 4.04s"), covering: stale DB missing a
column → raises; stale DB does not silently stamp; fresh DB stamps at head
with no raise; fresh DB raises nothing; empty DB (no tables) is a no-op.

## Candidate follow-up (not verified this session)

- Whether the currently-single head in this checkout is expected to diverge
  again soon — check `git log --oneline skillmeat/cache/migrations/versions`
  for recent branch activity before assuming a clean linear history persists.
- Whether `docs/ops/runbooks/migration-job-runbook.md`'s advisory-lock-based
  one-off migration job (`pg_try_advisory_lock(hashtext('skillmeat.migration.lock')::bigint)`)
  is still the current production migration-apply mechanism — this reference
  file only confirms the doc exists, not that it reflects current prod config.
