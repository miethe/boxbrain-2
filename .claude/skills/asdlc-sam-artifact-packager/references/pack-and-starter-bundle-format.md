# Pack Format and Starter-Bundle Detail — Reference

Loaded on demand from `asdlc-sam-artifact-packager/SKILL.md`. Field-level detail only;
routing, gates, and traps live in `SKILL.md`.

## 1. `.skillmeat-pack` file structure

Per `.claude/skills/skillmeat-cli/workflows/bundle-workflow.md § "Bundle Format Reference"`
(narrative doc; verify against `PackBuilder` in code if precise byte-level fidelity matters):

```
bundle.skillmeat-pack (ZIP)
├── manifest.toml          # bundle metadata (name, version, author, description, tags, artifacts[])
├── artifacts/
│   ├── <artifact-name>/
│   │   ├── SKILL.md (or equivalent primary file)
│   │   ├── metadata.toml
│   │   └── ...
│   └── ...
└── checksums.sha256       # per-file integrity hashes
```

`bundle export <name>` (existing bundle entity → file) and `bundle build-pack <source_dir>`
(loose directory tree → file) both produce this shape via `PackBuilder`; `bundle import
<path>` and `bundle publish-pack <path>` both consume it.

## 2. `build-pack` vs `publish-pack` vs `export`/`import` — when each applies

| Command | Direction | Source | Result | Notes |
|---|---|---|---|---|
| `bundle export NAME [--output PATH]` | collection → file | An existing bundle *entity* already in the DB | `.skillmeat-pack` file | Use when the bundle record already exists; distinct from `build-pack`. |
| `bundle build-pack SOURCE_DIR [...] [--import]` | directory → file (→ optionally DB) | A loose directory tree (e.g. `dist/starter-bundle/`) with a `bundle-manifest.toml` | `.skillmeat-pack` file; with `--import`, also POSTs to `/api/v1/bundles/import` | Use for project-starter-style builds from a filesystem tree that has no bundle entity yet. |
| `bundle publish-pack PACK [--register-template] [--conflict ...]` | file → DB | A built `.skillmeat-pack` | Bundle entity + artifact content + members ingested via the ungated `/api/v1/bundles/import-pack` endpoint | Prefer this over `build-pack --import` when the goal is to materialize real files afterward (`bundle deploy`/`scaffold`); `--register-template` also creates the `project_starter` scaffold template row in the same call. |
| `bundle import PATH [--dry-run] [--conflict-strategy ...]` | file → collection | A `.skillmeat-pack` from any source (colleague, marketplace, upstream) | Installs artifacts into the local collection with conflict resolution | Different code path from `publish-pack`; used for general bundle sharing, not specifically the project-starter registration flow. |

## 3. Instance Starter Bundle three-tier system (project-starter reference implementation)

Full detail: `scripts/bundle/SPEC.md` (status: stable, `aligned_app_version: 0.50.1` at last
check — reverify before relying on exact file/size counts).

```
scripts/starter-bundle-manifest.yaml
├── bundle_metadata          # name, version, description, bundle_kind
├── parameterized_templates  # CLAUDE.md and intents/intent.md ({{VAR}} token substitution)
├── core/                    # always deployed
├── recommended/             # deployed by default
└── excluded/                # never packaged (product-specific / ephemeral)
```

Build via `python scripts/build-starter-bundle.py [--project-name ...]
[--project-description ...] [--author ...] [--architecture-description ...] [--date ...]
[--dry-run]` → writes `dist/starter-bundle/` with `bundle-manifest.toml` generated last
(after all files are written, so `file_count`/`total_size_bytes` are accurate at that
point).

Key invariants from `scripts/bundle/SPEC.md § 6` worth carrying into a packaging report:
- Security pre-flight (`.env`, `*.token`, `credentials`, `secret`, `settings.local.*`
  patterns) runs before any files are written and cannot be bypassed by a CLI flag.
- The `excluded:` tier is never packaged regardless of any tier argument.
- Output directory is cleared (`shutil.rmtree`) on every build — there is no incremental
  build mode (tracked as its own backlog item there, BL-4).

To register the built bundle as a live project-starter template, use the verified CLI path
from `SKILL.md § Procedure` step 5 (`build-pack` → `publish-pack --register-template`), not
`scripts/bundle/SPEC.md`'s own stale `template create --kind project-starter --source ...`
example (see `SKILL.md § Known traps`).

## 4. Enterprise vs local edition — where behavior actually forks

Confirmed via code (not assumed):

- `deployment_set.py::deploy_deployment_set` checks
  `skillmeat.core.enterprise_config.is_enterprise_mode()` and calls
  `_deploy_enterprise_set(...)` (enterprise) vs a direct
  `POST /api/v1/deployment-sets/{id}/deploy` (local).
- `artifacts_lifecycle_cmd.py` has a `_maybe_warn_enterprise_fs_only(...)` helper —
  filesystem-only add flows warn differently under enterprise mode; check the actual
  warning text at add-time rather than assuming silence means local mode.
- `bundle.py` imports both `is_enterprise_mode` and `should_use_enterprise_path` from
  `skillmeat.core.enterprise_config` — several bundle subcommands consult this before
  choosing an API base/path; if a bundle operation behaves unexpectedly, check which mode
  was active first before assuming a CLI bug.

## 5. Snapshot / rollback mechanics

`skillmeat snapshot` (no subcommand) is itself the "create" action — it is a Click group
with `invoke_without_command=True`, so `skillmeat snapshot` alone (no `create` keyword)
creates a snapshot via `VersionManager.create_snapshot(collection_name, message)`.
`skillmeat snapshot list [-c COLLECTION] [-n LIMIT]` lists prior snapshots (id, created
timestamp, message, artifact count). `skillmeat rollback SNAPSHOT_ID [-c COLLECTION] [-y]`
restores the collection from a snapshot and warns that it *replaces* the current
collection — always snapshot immediately before a risky operation rather than relying on
an older snapshot as the rollback point.
