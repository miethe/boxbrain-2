---
schema_version: 2
doc_type: skill_spec
skill_name: asdlc-skillbom-builder
skill_version: 0.1.0
status: draft
created: 2026-07-03
updated: 2026-07-03
owner: nick
source_docs:
  - skillmeat/core/bom/generator.py
  - skillmeat/core/bom/signing.py
  - skillmeat/core/bom/git_integration.py
  - skillmeat/core/bom/materialization.py
  - skillmeat/core/bom/policy.py
  - skillmeat/core/bom/scope.py
  - skillmeat/cli/commands/bom.py
  - skillmeat/cli/commands/attest.py
  - docs/project_plans/design-specs/skillbom-trustmanifest-bridge.md
related_skills:
  - asdlc-sam-artifact-packager
  - asdlc-skill-review-board
  - skillmeat-cli
affects_commands: []
aligned_app_version: "0.58.0"
---

<!-- Convention reference: .claude/specs/artifact-structures/skill-spec-convention.md -->

# asdlc-skillbom-builder — Skill Specification

> **Reading this file**: This is the versioned capability contract for the
> `asdlc-skillbom-builder` skill. For invocation-time routing, see `SKILL.md` in this same
> directory.

---

## 1. Purpose & Scope

**Mission**: Give agents in the AOS skill-harvest / ASDLC campaign a single, code-verified
place to produce and verify SkillMeat's real provenance evidence (BOM snapshots,
materialization sidecars, attestation records) for any artifact — without inventing a new
provenance format or an approval workflow the platform does not implement.

**In scope**:
- Generating and signing a project-level BOM snapshot (`bom generate`, `bom sign`, `bom
  keygen`, `bom verify`).
- Reading the auto-emitted SkillBOM v0 materialization sidecar for parameterized deploys
  (`bom materializations`).
- Wiring and using the git ↔ BOM linkage (`bom hook install|uninstall`, `bom restore`).
- Creating, listing, and showing manual attestation records (`attest create|list|show`),
  including their RBAC visibility rules and the (permissive, local-only) policy enforcement
  layer.
- Documenting the honest gaps: no promotion/approval enum, no local policy enforcement, no
  shipped SkillBOM↔ARD trustManifest bridge, `--notes`/`--sign` non-persistence on
  attestations.

**Out of scope**:
- Packaging/bundling/deploying artifacts — use `asdlc-sam-artifact-packager`.
- Pre-packaging quality review (factual/doctrine/usability/security/portability gates) —
  use `asdlc-skill-review-board`.
- Bundle-pack (`.skillmeat-pack`) signing via the separate `skillmeat sign` command family —
  documented here only as a trap to avoid confusing with `bom sign`; full coverage belongs
  to `asdlc-sam-artifact-packager`.
- Enterprise-only administration of `AttestationPolicy` rows (creating/editing policies) —
  not covered by the CLI surface this skill wraps; flagged in the Enhancement Backlog.

---

## 2. Capability Coverage

| Intent | Workflow / Section | Canonical Doc |
|--------|--------------------|---------------|
| Generate a project-level BOM snapshot | `SKILL.md § Procedure` step 2 | `skillmeat/cli/commands/bom.py::generate_cmd` |
| Sign / verify a BOM snapshot or arbitrary file | `SKILL.md § Procedure` step 3, 7 | `skillmeat/cli/commands/bom.py::sign_cmd,verify_cmd` |
| Generate/list/export/import/revoke Ed25519 keys for BOM signing | `SKILL.md § Procedure` step 3 | `skillmeat/cli/commands/bom.py::keygen_cmd` |
| Install/uninstall git hooks that link commits to BOM state | `SKILL.md § Procedure` step 4 | `skillmeat/core/bom/git_integration.py` |
| Restore `.claude/` from a BOM-linked commit | `SKILL.md § Procedure` (referenced) | `skillmeat/cli/commands/bom.py::restore_cmd` |
| List/inspect auto-emitted per-deploy SkillBOM v0 sidecars | `SKILL.md § Procedure` step 5 | `skillmeat/cli/commands/bom.py::materializations_cmd` |
| Understand the two coexisting BOM schema shapes | `references/bom-record-schemas.md §1-2` | — |
| Create a manual attestation (owner/roles/scopes/visibility) | `SKILL.md § Procedure` step 6 | `skillmeat/cli/commands/attest.py::create_cmd` |
| List / show attestation records | `SKILL.md § Procedure` step 7 | `skillmeat/cli/commands/attest.py::list_cmd,show_cmd` |
| Understand attestation RBAC visibility rules | `references/bom-record-schemas.md §3` | `skillmeat/core/bom/scope.py` |
| Understand local-vs-enterprise policy enforcement | `references/bom-record-schemas.md §4` | `skillmeat/core/bom/policy.py` |
| Understand the git↔BOM linkage mechanics | `references/bom-record-schemas.md §5` | `skillmeat/core/bom/git_integration.py` |
| SkillBOM ↔ ARD trustManifest bridge (status check) | `SKILL.md § Known traps` | `docs/project_plans/design-specs/skillbom-trustmanifest-bridge.md` |

> No canonical doc exists yet for the two coexisting BOM schema shapes or the RBAC/policy
> internals in the project's user-facing docs (`docs/user/guides/cli/commands.md` does not
> mention `bom`/`attest` at all) — this skill's `references/` file is the closest thing to a
> canonical reference until a user-facing doc is written (see Enhancement Backlog BL-2).

---

## 3. Invariants & Constraints

1. **Never claim an artifact is "approved" from BOM/attestation output alone.** No
   promotion/approval enum exists in `AttestationRecord` or the BOM schema; `visibility` and
   `owner_type` are not approval gates.
   _Source_: `skillmeat/cache/models.py::AttestationRecord` (fields verified via
   `cli/commands/attest.py`); campaign rule: everything from the AOS skill harvest stays
   `candidate` until independent review + promotion evidence exists (decision record:
   `agentic_meta_dev` repo, `.claude/worknotes/aos-skill-harvest/PLAN.md` shared rule 7 —
   historical provenance, not required at runtime).

2. **Never report attestation policy compliance as enforced unless the enterprise
   (Postgres) edition is confirmed active.** `AttestationPolicyEnforcer` is fully permissive
   under local/SQLite operation.
   _Source_: `skillmeat/core/bom/policy.py`.

3. **Never state that `--notes` or `--sign` output on `attest create` will reappear on a
   later `attest show`/`attest list`.** Neither field is persisted to the `AttestationRecord`
   row.
   _Source_: `skillmeat/cli/commands/attest.py::create_cmd`.

4. **Never invoke `attest create` with `--artifact-version`, `--environment`, or
   `--deployed-by`.** These flags do not exist on the live command, despite appearing in
   `.claude/skills/skillmeat-cli/workflows/supply-chain-workflow.md`'s examples.
   _Source_: `skillmeat/cli/commands/attest.py::create_cmd` signature.

5. **Never use `bom sign`/`bom verify` as the sole signing mechanism for a `.skillmeat-pack`
   bundle intended for external distribution without noting the separate `skillmeat sign`
   command family exists for that purpose.**
   _Source_: `skillmeat/cli/commands/sign.py` vs `skillmeat/cli/commands/bom.py`.

6. **Never present the SkillBOM ↔ ARD trustManifest bridge as implemented.** It is
   `status: draft`, `maturity: idea`, blocked on an unshipped producer slice.
   _Source_: `docs/project_plans/design-specs/skillbom-trustmanifest-bridge.md` frontmatter.

---

## 4. Enhancement Backlog

- **[BL-1] User-facing SkillBOM/attestation doc**: `docs/user/guides/cli/commands.md` has no
  `## SkillBOM` or `## Attestation` section; `bom`/`attest` are undocumented for end users.
  _Status_: candidate
  _Rationale_: Would let this skill point to a canonical doc instead of code + this skill's
  own reference file; currently the reference file in this skill is the only structured
  source.

- **[BL-2] Fix `.claude/skills/skillmeat-cli/workflows/supply-chain-workflow.md`**: its
  `attest create` examples use nonexistent flags (`--artifact-version`, `--environment`,
  `--deployed-by`).
  _Status_: candidate
  _Rationale_: Out of this skill's write fence (owned by the `skillmeat-cli` skill); flagged
  here so the next `skillmeat-cli` maintenance pass picks it up.

- **[BL-3] Persist `--notes` and `--sign` on `AttestationRecord`**: currently both are
  computed/echoed at creation time only and lost thereafter.
  _Status_: candidate
  _Rationale_: Would require a schema migration + CLI change outside this skill's write
  fence; documented as a known trap in the meantime.

- **[BL-4] SkillBOM ↔ ARD trustManifest bridge**: full bidirectional field mapping is
  deferred pending the producer slice (DEF-01).
  _Status_: deferred
  _Rationale_: Tracked in `docs/project_plans/design-specs/skillbom-trustmanifest-bridge.md`;
  this skill only needs to avoid overclaiming its status.

---

## 5. Changelog

### v0.1.0 — 2026-07-03
- Initial SPEC.md drafted as part of the AOS Skill Harvest campaign (skill #11).
- Capability coverage matrix: 13 intents, all mapped to code (no canonical user doc exists
  yet for `bom`/`attest` — see BL-1).
- Status: draft.

---

## 6. Integration Points

| Agent / Command | Invocation Pattern | Notes |
|-----------------|--------------------|-------|
| `asdlc-sam-artifact-packager` | Reads this skill's output format (BOM path / attestation ID) | Consumes provenance when assembling a package; does not invoke `bom`/`attest` itself. |
| `asdlc-skill-review-board` | Runs before this skill | Gates artifact quality prior to provenance generation. |
| Any AOS skill-harvest author/reviewer agent | `Skill("asdlc-skillbom-builder")` | Direct invocation when provenance is the immediate task. |

**Co-loaded with**: `skillmeat-cli` when an agent also needs broader CLI routing beyond
BOM/attestation (discovery, deployment, bundles).

**No `/dev:*` command bindings.**

---

## 7. Success Signals

- Agents never emit an `attest create` invocation with `--artifact-version`,
  `--environment`, or `--deployed-by`.
- Agents never report an artifact as "approved" based solely on this skill's output.
- Agents distinguish the project-snapshot BOM (`schema_version: "1.0.0"`) from the
  materialization sidecar (`schema_version: "0"`) and never merge their field names.
- Agents check local-vs-enterprise edition before reporting attestation policy compliance
  as enforced.
- Agents cite `skillmeat/core/bom/*.py` or `skillmeat/cli/commands/{bom,attest}.py` (or this
  skill's `references/bom-record-schemas.md`) rather than inventing SkillBOM YAML shapes
  from the handoff bundle.
