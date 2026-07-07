---
name: asdlc-skillbom-builder
description: >-
  Use when an agent needs to produce SkillBOM provenance for skills, agents, commands, or
  other SkillMeat artifacts — generating a BOM snapshot (`skillmeat bom generate`), signing or
  verifying it with Ed25519 (`skillmeat bom sign|verify|keygen`), wiring git hooks that link
  commits to BOM state (`skillmeat bom hook install`), inspecting materialization sidecars for
  parameterized deploys (`skillmeat bom materializations`), or recording an owner-scoped
  attestation (`skillmeat attest create|list|show`). Covers exactly what fields a SkillBOM
  entry carries, how BOM ties into git history, and the honest gaps in promotion/approval
  status and policy enforcement. Do NOT use this skill for packaging artifacts into
  bundles/deployment-sets/templates — use `asdlc-sam-artifact-packager` instead. Do NOT use
  for pre-packaging quality review — use `asdlc-skill-review-board` first.
version: 0.1
app_version: "2026-07-03"
updated: 2026-07-03
spec: ./SPEC.md
---

# asdlc-skillbom-builder

## Purpose

Produce and verify SkillMeat's real provenance evidence — the project-level SkillBOM
snapshot, the per-deploy materialization sidecar, and attestation records — for skills,
agents, commands, and other artifacts flowing through the AOS skill-harvest / ASDLC
pipeline. This skill wraps `skillmeat bom *` and `skillmeat attest *` exactly as implemented
in `skillmeat/core/bom/` and `skillmeat/cli/commands/{bom,attest}.py`. It does not invent a
new provenance format, a promotion enum, or a signing system that doesn't exist in the CLI.

## When to use

- Generating a point-in-time BOM of everything deployed in a project
  (`.skillmeat/context.lock`).
- Signing or verifying a BOM snapshot (or any file) with the project's Ed25519 key.
- Wiring git so commits record BOM state and BOM snapshots link back to commits.
- Restoring `.claude/` state from a prior BOM-linked commit.
- Checking what materialization sidecars (auto-emitted per-deploy SkillBOM v0 records)
  already exist for a parameterized artifact — before generating something redundant.
- Recording a manual attestation (owner/roles/scopes/visibility) for an artifact.

## When not to use

- Packaging an artifact/bundle/deployment-set/template for distribution — use
  `asdlc-sam-artifact-packager`. This skill only produces the evidence that packaging
  should reference, it does not deploy or bundle anything.
- Pre-packaging quality review (factual/doctrine/usability/security/portability) — use
  `asdlc-skill-review-board`; run it before generating provenance so the BOM reflects a
  reviewed artifact.
- Claiming an artifact is "approved" — no such status exists in the data model (see
  Known traps). Route any promotion decision to the human/gate process the campaign defines.

## Related sibling skills

- `asdlc-sam-artifact-packager` (12) — consumes the BOM path / attestation ID this skill
  produces when assembling a shippable package; reference the evidence, don't regenerate it.
- `asdlc-skill-review-board` (3) — gates a skill's quality before it is BOM'd/attested.
- `skillmeat-cli` (this repo's general CLI router) — its
  `workflows/supply-chain-workflow.md` covers the same commands in narrative form, but a few
  of its examples use flags that do not exist on the live CLI (see Known traps); this skill's
  Commands section is the one verified directly against code.

## Source of truth

- `skillmeat/core/bom/generator.py` — `BomGenerator`, the 13 per-type adapters, the BOM entry
  schema (`name`, `type`, `source`, `version`, `content_hash`, `metadata`).
- `skillmeat/core/bom/signing.py` — Ed25519 sign/verify (`sign_bom`, `sign_file`,
  `verify_file`, `KeyNotFoundError`, `SigningError`, `VerificationError`).
- `skillmeat/core/bom/git_integration.py` — `SkillBOM-Ref:` commit-message footer, hook
  install/uninstall, `restore_from_commit`.
- `skillmeat/core/bom/materialization.py` — `MaterializationBomEmitter`, the SkillBOM v0
  per-deploy sidecar schema.
- `skillmeat/core/bom/policy.py` — `AttestationPolicyEnforcer` (local no-op vs enterprise
  real enforcement).
- `skillmeat/core/bom/scope.py` — `OwnershipResolver`, `AttestationScopeResolver` (RBAC
  visibility rules for attestation records).
- `skillmeat/cli/commands/bom.py`, `skillmeat/cli/commands/attest.py` — the actual CLI
  surface (verified line-by-line against code, not against generated docs).
- `docs/project_plans/design-specs/skillbom-trustmanifest-bridge.md` — the deferred
  SkillBOM ↔ ARD `trustManifest` provenance bridge (idea status, not implemented).
- `.claude/skills/skillmeat-cli/workflows/supply-chain-workflow.md` — companion agent
  workflow (has stale `attest create` example flags; see Known traps).
- `references/bom-record-schemas.md` (this skill) — full BOM/sidecar/attestation field
  tables, split out for progressive disclosure.

## Procedure

1. Decide scope using the decision gate table below: whole-project BOM snapshot, a single
   deploy event's provenance, or a manual attestation.
2. **Project snapshot** — run `skillmeat bom generate` (add `--auto-sign` to sign in the same
   step). Record the output path and the printed `sha256`.
3. If distributing or committing the snapshot separately, sign it:
   `skillmeat bom sign <path>` (offers to generate a key interactively on first use).
4. To make git carry BOM state automatically, run `skillmeat bom hook install --project
   <path>` once per repo. Confirm the `dvcs_bom_trailer_injection` feature flag is enabled
   server-side — otherwise the `prepare-commit-msg` hook installs but silently no-ops
   (fail-open by design; check `skillmeat/api/config.py::APISettings.dvcs_bom_trailer_injection`).
5. **Parameterized-artifact deploy event** — its SkillBOM v0 sidecar is already written by
   the deploy/render pipeline. Inspect it with `skillmeat bom materializations` rather than
   running `bom generate` again.
6. **Manual attestation** — to assert an ownership/visibility/role claim on an artifact (not
   a content snapshot), run `skillmeat attest create --artifact-id <type:name> ...`. Add
   `--sign` to Ed25519-sign the attestation payload (see Known traps: the signature is
   printed, not persisted).
7. Verify before trusting: `skillmeat bom verify <path>` (exit 0 = valid) and
   `skillmeat attest show <id>` to re-read exactly what was recorded.
8. Report status as `candidate` with the BOM path / attestation ID as evidence. Never report
   `approved` from this skill's output alone (see Known traps).

## Decision gates

| Gate | Expected observation | If not observed |
|---|---|---|
| Snapshot vs event | Caller needs whole-project provenance vs one deploy event | Whole-project → `bom generate`. Single parameterized deploy → read the auto-emitted materialization sidecar instead of generating a new BOM. |
| Signing key present | `~/.skillmeat/keys/skillbom_ed25519` exists | `bom sign` / `bom keygen` will offer to create one interactively; non-interactive/CI callers should pre-run `skillmeat bom keygen --dir <path>`. |
| Local vs enterprise edition | Project is running against local SQLite vs enterprise Postgres | In local/SQLite mode `AttestationPolicyEnforcer` (`core/bom/policy.py`) is fully permissive (`is_valid=True` unconditionally) — never report a "compliant" result as real enforcement unless the enterprise path is confirmed active. |
| Adapter coverage | Artifact type is one of: skill, command, agent, mcp_server, hook, workflow, composite, project_config, spec_file, rule_file, context_file, memory_item, deployment_set | Unregistered types are silently skipped with a logged warning, not an error — a BOM with fewer entries than expected usually means an unsupported type, not a failure. |
| Commit-linkage active | `dvcs_bom_trailer_injection` feature flag is enabled | If disabled, the `prepare-commit-msg` hook is installed but inert; `bom restore --commit <sha>` will fail to find a `SkillBOM-Ref:` footer in that commit's message. |

## Commands

```
skillmeat bom generate [--project PATH] [--output FILE] [--auto-sign] [--format json|summary]
skillmeat bom keygen [--dir PATH]
skillmeat bom sign [FILE] [--key PATH] [--output PATH]
skillmeat bom verify [FILE] [--signature PATH] [--key PATH]
skillmeat bom restore --commit SHA [--dry-run] [--force]
skillmeat bom hook install [--project PATH]
skillmeat bom hook uninstall [--project PATH]
skillmeat bom materializations [--artifact NAME] [--project DIR] [--limit N] [--format table|json]
skillmeat attest create --artifact-id TYPE:NAME [--owner-scope user|team|enterprise] [--roles R1,R2] [--scopes S1,S2] [--visibility private|team|public] [--notes TEXT] [--sign] [--format table|json]
skillmeat attest list [--artifact-id ID] [--owner-scope user|team|enterprise] [--limit N] [--format table|json]
skillmeat attest show ATTESTATION_ID [--format table|json]
```

All verified directly against `skillmeat/cli/commands/bom.py` and
`skillmeat/cli/commands/attest.py` — not against generated/narrative docs (see Known traps
for where the docs disagree). `FILE` in `bom sign` / `bom verify` defaults to
`.skillmeat/context.lock`; `ATTESTATION_ID` is the integer primary key printed by
`attest create`/`attest list`.

## Evidence required

- BOM snapshot path plus the printed `sha256` (from `bom generate --format json`, key
  `sha256`).
- Signature file path when signed (`<FILE>.sig`), or an explicit note that no key was
  available and the snapshot is unsigned.
- Attestation record `id` (from `attest create` output) plus `artifact_id`, `owner_type`,
  `owner_id`, `visibility`.
- For parameterized-artifact deploys, the materialization sidecar path:
  `.skillmeat/skillbom/materializations/<plan_id>.json`.
- Commit SHA when a `SkillBOM-Ref:` footer is present (only meaningful if hooks were
  installed and the feature flag was enabled at commit time).

## Known traps

- **`attest create` has no `--artifact-version`, `--environment`, or `--deployed-by`
  flags.** The sibling `skillmeat-cli` skill's own `workflows/supply-chain-workflow.md`
  shows those flags in its examples — that doc is stale versus the live
  `cli/commands/attest.py`. Real flags: `--artifact-id`, `--owner-scope`, `--roles`,
  `--scopes`, `--visibility`, `--notes`, `--sign`, `--format`.
- **`--notes` is not persisted.** `attest create --notes TEXT` echoes the note back in the
  command's own JSON/table output for that single invocation, but `notes` is never passed
  into the `AttestationRecord` constructor — it is not written to the database and will not
  reappear on a later `attest show`/`attest list`. Capture notes elsewhere if they must
  persist.
- **`--sign` output is not persisted either.** The Ed25519 signature is computed and printed
  (or included in the JSON response) at creation time, but it is never stored on the
  `AttestationRecord` row. A later `attest show <id>` cannot return the signature — capture
  it out-of-band (e.g. in the packaging report) if it needs to survive.
- **`bom sign` / `bom verify` default target is `.skillmeat/context.lock`, not a
  `.skillmeat-pack` bundle.** They will mechanically sign any file passed as `FILE`, but
  bundle-pack signing for distribution is a separate command family
  (`skillmeat sign generate-key|list-keys|export-key|import-key|verify|revoke`, keyed by
  name/email — `cli/commands/sign.py`). Note `bundle create` has **no** `--sign` flag;
  `candidate:` where (if anywhere) pack signing hooks into the `bundle` command family is
  unverified. Don't conflate the two signing systems when a caller asks to "sign the bundle."
- **No promotion/approval enum exists in the data model.** `AttestationRecord` has
  `visibility` (private/team/public) and `owner_type` (user/team/enterprise) — neither is an
  approval gate. "Draft → candidate → approved" is a **convention layered on top** (this
  campaign's SPEC.md `status` field plus the `SAM registration: candidate` label below), not
  something the CLI or DB enforces. Never claim an artifact is "approved" from BOM/attestation
  output alone.
- **Attestation policy enforcement is a no-op in local (SQLite) edition.** `core/bom/policy.py`
  returns permissive `PolicyValidationResult`/`ComplianceReport` objects unconditionally
  unless `AttestationPolicyEnforcer(is_enterprise=True)`. Do not report compliance as
  independently verified unless running against the enterprise (Postgres) edition.
- **The SkillBOM ↔ ARD trustManifest bridge does not exist yet.**
  `docs/project_plans/design-specs/skillbom-trustmanifest-bridge.md` is `status: draft`,
  `maturity: idea`, explicitly blocked on an unshipped producer slice (DEF-01). Treat any
  "atlas skillbom context-pack item" language from other sources as aspirational, not a
  working integration.
- **Two BOM schema shapes coexist — don't cross-apply their fields.** The project snapshot
  (`bom generate`) uses `schema_version: "1.0.0"` with a top-level `artifacts: [...]` list of
  `{name, type, source, version, content_hash, metadata}`. The materialization sidecar uses
  `schema_version: "0"` with a different shape (`artifact{id,name,type,hash,version}`,
  `materialization{...}`, `parameter_bindings`, `target_files`). See
  `references/bom-record-schemas.md`.
- **The handoff-bundle's `skillbom.template.yaml` / SkillBOM YAML template does not exist in
  this codebase.** There is no flat `skillbom_version: 0.1` YAML document type in
  `skillmeat/core/bom/`; the real SkillBOM is the JSON snapshot plus attestation DB rows plus
  the materialization sidecar. Do not fabricate the handoff bundle's hypothetical YAML shape.

## Output format

Report, per artifact/run:

```
- artifact_id: <type:name>
- bom_path: <path or "n/a">
- sha256: <hex or "n/a">
- signed: yes|no (+ signature path, noting signatures are not DB-persisted for attestations)
- attestation_id: <int or "none created">
- status: candidate   # never "approved" without external promotion evidence
- next_action: <e.g. "hand to asdlc-sam-artifact-packager">
```

## Provenance and maintenance

- Reverify volatile facts:
  - `skillmeat bom --help`
  - `skillmeat attest --help`
  - `grep -n "def .*_cmd" skillmeat/cli/commands/bom.py skillmeat/cli/commands/attest.py`
- Last reviewed: 2026-07-03
- SAM registration: candidate
- SkillBOM fields: artifact_id, version, digest (content_hash / sha256), source_context,
  policy_tags, evidence_hash — mapped onto the real BOM entry shape in
  `references/bom-record-schemas.md`, not a separate invented format.
