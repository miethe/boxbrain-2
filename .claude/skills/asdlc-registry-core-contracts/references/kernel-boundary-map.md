# Kernel boundary map — "Registry Core" mapped onto real SkillMeat modules

> **Status of this mapping**: the handoff spec (§4.4) uses "Registry Core" as
> the name for the identity/versioning/manifest/dependency/search/content-
> resolution kernel. That literal name does not exist in this codebase
> (`rg -n "Registry Core" skillmeat/` returns nothing as source code — it only
> appears in this AOS's own planning docs). Everything below is a mapping of
> the doctrine onto real modules, **labeled INFERENCE** where the boundary
> itself is drawn by this skill rather than by an existing repo doc, and
> **labeled EVIDENCED** where a repo doc/comment/README already states the
> boundary.

## 1. Artifact identity — EVIDENCED (partial) + INFERENCE (aggregate boundary)

- `skillmeat/core/artifact.py` — `Artifact` dataclass + `ArtifactType` enum;
  core in-memory/TOML-serialized model.
- `skillmeat/cache/artifact_identity.py` — identity helpers at the cache layer.
- `skillmeat/cache/models.py` — SQLAlchemy ORM `Artifact` model (local, string
  PK) vs `skillmeat/cache/models_enterprise.py` `EnterpriseArtifact` (UUID PK).
- `skillmeat/core/interfaces/repositories.py` `IArtifactRepository` (ABC,
  EVIDENCED — documented in `skillmeat/core/interfaces/README.md`) is the
  stable contract; `skillmeat/core/repositories/local_artifact.py` and
  `skillmeat/cache/enterprise_repositories/artifacts.py` (enterprise sibling,
  inside the `enterprise_repositories/` package) are the two implementers.
- INFERENCE: there is no single "artifact identity" module; identity is
  distributed across a dataclass, an ORM model per edition, and an ABC. Any
  "identity contract" change must touch the ABC + both implementers + both
  ORM models to stay consistent.

## 2. Versioning — EVIDENCED

- `skillmeat/core/version.py` — `RollbackAuditTrail`, snapshot/rollback logic.
- `skillmeat/core/version_graph.py` — implements the version-tracking system
  described in **ADR-004** (see module docstring); builds
  `ArtifactVersion` records for collection artifacts and project deployments.
- `skillmeat/core/version_lineage.py`, `version_merge.py`,
  `version_topology_service.py`, `version_service.py`,
  `version_backfill.py`, `version_graph_service.py`, `ghost_version_detector.py`
  — supporting version-graph services.
- `skillmeat/core/ports/version_writer.py` (ABC) with
  `local_version_writer.py` / `enterprise_version_writer.py` implementers —
  the write-path contract, separate from the read-path repository ABCs.
- `skillmeat/cache/local_version_graph_adapter.py` — cache-layer adapter.
- Universal `/versions` API endpoints exist for all 17 artifact types
  (per `skillmeat-cli` SPEC.md capability row, P5/v0.53.0 — cross-reference,
  not duplicated here).

## 3. Manifests — EVIDENCED

- `skillmeat/storage/manifest.py` — project/collection manifest read-write.
- `skillmeat/core/manifest_extractors.py` — extraction from various manifest
  shapes.
- `skillmeat/core/sharing/manifest.py` — bundle manifest (`.skillmeat-pack`
  format used by `bundle export`/`bundle import`, per `skillmeat-cli`
  capability coverage — cross-reference).

## 4. Dependency resolution — INFERENCE (weak evidence)

No module or class named "dependency resolver" was found
(`rg -in "dependency.resol|DependencyResolver" skillmeat` → no hits at
authoring time). The closest real subsystems:

- `skillmeat/core/sharing/bundle.py` + `builder.py` — bundle composition,
  which is the closest thing to "artifact X depends on artifact Y" at
  packaging time.
- `skillmeat/core/bom/generator.py` and `skillmeat/core/bom/history.py` —
  SkillBOM component graphs (see `asdlc-skillbom-builder` for the full
  wrapper skill).

If a task frames itself as "preserve dependency-resolution contracts," ask
which of these two subsystems is meant before editing — do not assume a
resolver module exists.

## 5. Search / matching — EVIDENCED

- `skillmeat/core/search.py` — metadata + content search across a collection,
  with optional ripgrep acceleration (module docstring).
- `skillmeat/core/matching.py` — scoring/matching logic backing
  `skillmeat match` / `/api/v1/match` (see `skillmeat-cli` SPEC.md BL-3/BL-4
  for the agent-facing gaps — cross-reference, not duplicated here).
- `skillmeat/core/scoring/` — supporting scoring package.
- `skillmeat/cache/similarity_cache.py` — cache-layer similarity/duplicate
  detection support.
- `skillmeat/core/discovery.py` + `discovery_metrics.py` — the shipped
  `skillmeat discover` AI-powered search surface (BL-8 in `skillmeat-cli`
  SPEC.md, shipped v0.35.0).

## 6. Content resolution — EVIDENCED (partial)

- `skillmeat/core/path_resolver.py` — resolves artifact file paths against
  `DEFAULT_PROFILE_ROOTS` (imported by `search.py`).
- `skillmeat/core/content_assembly.py` — assembles artifact content for
  downstream consumption (e.g., deployment, context packing).
- `skillmeat/cache/collection_cache.py` — cache-layer content/listing cache.

## 7. Repository interface layer (the actual "hexagonal core") — EVIDENCED

This is the one boundary the repo documents explicitly, in
`skillmeat/core/interfaces/README.md`:

> "This package defines the hexagonal-architecture contracts between the
> application core and its infrastructure adapters. Nothing here may import
> from other SkillMeat modules except `skillmeat.core.enums` and
> `skillmeat.core.exceptions`."

10 ABCs in `skillmeat/core/interfaces/repositories.py`: `IArtifactRepository`,
`IProjectRepository`, `ICollectionRepository`, `IDeploymentRepository`,
`ITagRepository`, `ISettingsRepository`, `IGroupRepository`,
`IContextEntityRepository`, `IMarketplaceSourceRepository`,
`IProjectTemplateRepository` — plus more ABCs added later in dedicated files
(`skillmeat/core/interfaces/branch_repository.py`,
`project_graph_adapter.py`, `version_graph_adapter.py`,
`acl_resolver.py`, `queue.py`, `target_adapter.py`, `tool_graph.py`, etc. —
run `ls skillmeat/core/interfaces/` to get the current full list; it grows).

Each interface is paired with:
- A local implementation in `skillmeat/core/repositories/local_<name>.py`.
- An enterprise implementation, in the `skillmeat/cache/enterprise_repositories/`
  package (one module per repository, e.g. `artifacts.py`, `collections.py`) or a
  standalone `skillmeat/cache/enterprise_*.py` / `*_repository.py` file for newer
  additions.
- DI wiring in `skillmeat/api/dependencies.py` (`get_<name>_repository` +
  `<Name>RepoDep` type alias).
- A mock in `tests/mocks/repositories.py` for unit tests.

**Procedure for adding a new interface** (from the README, EVIDENCED, quoted
not duplicated at length): define the ABC → add DTO to `dtos.py` if needed →
export from `__init__.py` → implement in `local_<name>.py` → register in
`dependencies.py` → add a mock in `tests/mocks/repositories.py`.

## 8. Local vs enterprise DB routing — EVIDENCED

- `skillmeat/cache/repository_factory.py` — `RepositoryFactory`, routes on
  `SKILLMEAT_EDITION` env var (`"local"` default, `"enterprise"`); exposes
  `get_artifact_repo`/`get_collection_repo` FastAPI dependency providers that
  wire in the per-request session automatically.
- `skillmeat/cache/repositories/base.py` — `BaseRepository`, SQLAlchemy 1.x
  `session.query()`, accepts `db_path`, SQLite-only.
- `skillmeat/cache/enterprise_repositories/base.py` — `EnterpriseRepositoryBase`,
  SQLAlchemy 2.x `select()`, accepts an injected `Session`, PostgreSQL-only,
  UUID PKs.
- This divergence is called out as **intentional** in `skillmeat/cache/CLAUDE.md`
  — do not "fix" it into one style.

## 9. Migrations — EVIDENCED

See `references/alembic-multi-head-and-db-split.md` for the full detail
(multi-head branch strategy, the documented root-cause incident, and the
schema-drift guard). Summary: `skillmeat/cache/migrations/versions/` holds
both the local/main branch and an `ent_*`-prefixed enterprise branch (101
`ent_*` files at authoring time) in one Alembic history; both branches are
applied via `alembic upgrade heads` (plural).

## 10. Test suites that pin these contracts — EVIDENCED

| Area | Test location | Notes |
|---|---|---|
| Repository ABC conformance | `skillmeat/core/repositories/tests/test_local_project_graph_adapter.py` | Explicitly tests all 6 abstract methods of `IProjectGraphAdapter` |
| Enterprise repo pinning | `tests/cache/test_enterprise_*_repository.py` (dozens of files) | One file per enterprise repository; mock-`Session`-based per `skillmeat/cache/tests/CLAUDE.md` |
| Cross-cutting DVCS/version/branch contracts | `tests/dvcs_contracts/` (`test_branch_history_contract.py`, `test_artifact_scope.py`, `test_sync_state_vocabulary.py`, `test_enterprise_merge_origins.py`, `test_mutation_validation.py`, `test_cursor_contract.py`, `test_protected_branch_enterprise_adapter.py`) | Has its own `conftest.py` mirroring `tests/api/conftest.py` so it runs independently |
| Migration pinning | `tests/cache/migrations/test_*.py` (e.g. `test_20260702_0001_add_bundle_marketplace_flags.py`) + `tests/migration/test_alembic_bom.py` + `tests/cache/test_migration_rollback.py` | Per-migration behavioral tests |
| Schema drift guard | `tests/test_cache_drift_guard.py` | Verified 2026-07-03: 5 passed in ~4s |
| Enterprise DI/edition-routing regression | `skillmeat/api/tests/test_enterprise_di_regression.py` | Explicitly guards "no regression in local-mode dependency resolution" (module docstring — note: "dependency resolution" here means FastAPI DI, not artifact dependency graphs; do not conflate with §4 above) |
