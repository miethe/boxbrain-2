# BOM / Attestation Record Schemas — Reference

Loaded on demand from `asdlc-skillbom-builder/SKILL.md`. Field-level detail only; routing
and traps live in `SKILL.md`.

## 1. Project BOM snapshot (`skillmeat bom generate`)

Source: `skillmeat/core/bom/generator.py::BomGenerator.generate()`.

```json
{
  "schema_version": "1.0.0",
  "generated_at": "2026-07-03T12:00:00+00:00",
  "project_path": "/path/to/project",
  "artifact_count": 3,
  "artifacts": [ /* sorted by (type, name) */ ],
  "metadata": { "generator": "skillmeat-bom", "elapsed_ms": 12.3 }
}
```

Every entry in `artifacts` has at minimum:

```json
{
  "name": "my-skill",
  "type": "skill",
  "source": "anthropics/skills/pdf",
  "version": "1.2.0",
  "content_hash": "sha256-hex-or-empty-string",
  "metadata": {
    "author": "jane@example.com",
    "description": "...",
    "tags": ["dev", "python"],
    "created_at": "2026-06-01T00:00:00+00:00",
    "updated_at": "2026-06-20T00:00:00+00:00"
  }
}
```

### Adapter → artifact type table

| Adapter | `type` value | Extra fields on the entry |
|---|---|---|
| `SkillAdapter` | `skill` | — |
| `CommandAdapter` | `command` | — |
| `AgentAdapter` | `agent` | — |
| `McpAdapter` | `mcp_server` | — |
| `HookAdapter` | `hook` | — |
| `WorkflowAdapter` | `workflow` | — |
| `CompositeAdapter` | `composite` | `members: [{uuid, name, type, source, version, relationship_type, pinned_version_hash}]` (recurses up to depth 4) |
| `ConfigAdapter` | `project_config` | `metadata.mime_type` |
| `SpecAdapter` | `spec_file` | `metadata.mime_type` |
| `RuleAdapter` | `rule_file` | `metadata.mime_type` |
| `ContextFileAdapter` | `context_file` | `metadata.mime_type` |
| `MemoryItemAdapter` | `memory_item` | `metadata.{memory_type, confidence, status, anchors}` |
| `DeploymentSetAdapter` | `deployment_set` | `members: [{id, ref_type, ref_id, position}]` |

Artifact types with no adapter registered are skipped with a logged warning — they never
raise, and no adapter can currently be added at the CLI layer (register_adapter is a
programmatic-only extension point).

Content-hash strategy (all adapters, in order of preference): filesystem Merkle-tree hash
(`skillmeat.core.hashing.compute_artifact_hash`) → cached `Artifact.content_hash` DB column →
SHA-256 of the `Artifact.content` DB column → empty string with a warning.

## 2. Materialization sidecar (SkillBOM v0, auto-emitted per parameterized deploy)

Source: `skillmeat/core/bom/materialization.py::MaterializationBomEmitter`.

Written to `.skillmeat/skillbom/materializations/<plan_id>.json` automatically whenever a
parameterized artifact is applied (`deploy --apply` / `render`) — this is a **different**
shape from the project-snapshot BOM above; do not merge the two mentally.

```json
{
  "schema_version": "0",
  "id": "<plan_id>",
  "artifact": {
    "id": "skill:my-skill",
    "name": "my-skill",
    "type": "skill",
    "hash": "sha256-hex-or-empty",
    "version": null
  },
  "materialization": {
    "binding_set_id": "...",
    "target_profile": "claude_code",
    "applied_at": "2026-07-03T12:00:00+00:00",
    "created_at": "2026-07-03T11:59:00+00:00"
  },
  "parameter_bindings": {
    "some_param": { "value": "resolved-value", "source": "cli", "redacted": false },
    "api_key": { "value": "<REDACTED>", "source": "env", "redacted": true }
  },
  "target_files": [
    { "action": "write", "content_hash": "sha256-hex", "path": ".claude/skills/my-skill/SKILL.md" }
  ],
  "feature_flags": { "some_flag": true }
}
```

**Security invariant**: any parameter named in `binding_set.redactions`, or typed
`SECRET_REF` in the artifact's `ParameterSchema`, is replaced with the literal string
`"<REDACTED>"` — secret values never appear in plaintext in this file. `emit()` is
fire-and-forget: I/O failures are logged and swallowed so a materialization apply is never
blocked by BOM-writing failure; a missing sidecar file is not necessarily an error, but is
worth flagging if evidence was expected.

List/browse these with `skillmeat bom materializations` — it reads this directory directly,
sorted newest-first by file mtime, with optional `--artifact` substring filtering.

## 3. Attestation record (`skillmeat attest create|list|show`)

Source: `skillmeat.cache.models.AttestationRecord`, populated by
`skillmeat/cli/commands/attest.py`.

Fields actually persisted to the DB (visible via `record.to_dict()` / `attest show --format
json`):

| Field | Type | Notes |
|---|---|---|
| `id` | int | Auto-increment primary key; the value passed to `attest show ID`. |
| `artifact_id` | str | `type:name` format, e.g. `skill:my-skill`. |
| `owner_type` | str | One of `user`, `team`, `enterprise`. Defaults to `user` if `--owner-scope` omitted. |
| `owner_id` | str | Resolved from `ConfigManager().get("owner-id")`, falling back to the local OS username. |
| `roles` | list[str] \| null | From `--roles` (comma-split), else `null`. |
| `scopes` | list[str] \| null | From `--scopes` (comma-split), else `null`. |
| `visibility` | str | One of `private` (default), `team`, `public`. |
| `created_at` / `updated_at` | timestamp | Server-assigned. |

Fields that are **NOT** persisted despite appearing in the CLI's own output for that single
invocation: `notes` (`--notes`) and `signature` (`--sign`). Both are added to the response
dict/console output ad hoc at creation time only — see `SKILL.md` Known traps.

### RBAC visibility rules (`AttestationScopeResolver.can_view`, `core/bom/scope.py`)

Role hierarchy (most → least privileged): `system_admin` > `enterprise_admin` >
`team_admin` > `team_member` > (implicit) `viewer`. Checked in this order, first match wins:

1. `system_admin` sees every record.
2. `visibility == "public"` records are visible to any authenticated viewer.
3. `enterprise_admin` sees all `owner_type == "enterprise"` records.
4. `team_admin` sees all records for their own team (`owner_type == "team"` and matching
   `owner_id`).
5. `team_member` sees non-`private` records for their own team.
6. Default: a viewer sees their own non-team records where `owner_id` matches.

`AttestationScopeResolver.build_query_filters` produces the equivalent DB-level filter dict
for the same precedence, used by repository-layer list queries.

## 4. Attestation policy enforcement (`core/bom/policy.py`)

`AttestationPolicyEnforcer(is_enterprise=False)` (the default / local SQLite edition):
`validate_required_artifacts`, `validate_required_scopes`, and
`extract_compliance_metadata` all return unconditionally passing results
(`is_valid=True`, `compliant=True`, coverage ratios `1.0`) without touching an
`AttestationPolicy` row. Only `is_enterprise=True` performs the real required-artifact /
required-scope coverage checks described in the class docstring. Do not report policy
compliance as meaningfully verified unless the enterprise path is confirmed active.

## 5. Git ↔ BOM linkage

- `prepare-commit-msg` hook appends `SkillBOM-Ref: <sha256-of-context.lock>` to the commit
  message, gated by the `dvcs_bom_trailer_injection` feature flag (`APISettings`); fails
  open (never blocks a commit) and is idempotent (skips if the footer is already present).
- `post-commit` hook extracts that footer and calls `link_bom_to_commit(content_hash,
  commit_sha)`, which writes to both the DB (`BomSnapshot.commit_sha`, when a matching
  snapshot row exists) and a JSON fallback file
  `.skillmeat/bom-commit-links.json` (always attempted, for cross-tool visibility).
- `skillmeat bom restore --commit SHA` reads the commit message, extracts the
  `SkillBOM-Ref:` hash, locates the snapshot (DB first, then JSON, then an optional GitHub
  upstream fetch), and rehydrates `.claude/` from any BOM entries that carry embedded
  `content` — entries that only reference an external path without embedded content are
  reported `unresolved`, never silently substituted.
