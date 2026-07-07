---
schema_version: 2
doc_type: skill_spec
skill_name: asdlc-sam-artifact-packager
skill_version: 0.1.0
status: draft
created: 2026-07-03
updated: 2026-07-03
owner: nick
source_docs:
  - skillmeat/cli/commands/bundle.py
  - skillmeat/cli/commands/deployment_set.py
  - skillmeat/cli/commands/template.py
  - skillmeat/cli/commands/deploy_cmd.py
  - skillmeat/cli/commands/artifacts_lifecycle_cmd.py
  - scripts/bundle/SPEC.md
related_skills:
  - asdlc-skillbom-builder
  - asdlc-skill-review-board
  - skillmeat-cli
affects_commands: []
aligned_app_version: "0.58.0"
---

<!-- Convention reference: .claude/specs/artifact-structures/skill-spec-convention.md -->

# asdlc-sam-artifact-packager — Skill Specification

> **Reading this file**: This is the versioned capability contract for the
> `asdlc-sam-artifact-packager` skill. For invocation-time routing, see `SKILL.md` in this
> same directory.

---

## 1. Purpose & Scope

**Mission**: Give agents in the AOS skill-harvest / ASDLC campaign a single, code-verified
place to package and deploy SkillMeat artifacts — single artifact, bundle, deployment set,
or project-starter template — using the real CLI surface, with pre-flight snapshot and
post-flight verification discipline built in.

**In scope**:
- Adding an artifact to the local collection and deploying it to a project
  (`add`, `deploy`, `undeploy`).
- Bundle lifecycle: create (empty entity), add/remove members, list, show, version,
  publish, export, import (`bundle *`).
- Building a pack from a loose directory and publishing it into the DB, optionally
  registering a project-starter scaffold template in the same step
  (`bundle build-pack`, `bundle publish-pack --register-template`).
- Deployment-set lifecycle: create, add-member, deploy, update, delete
  (`deployment-set *`).
- Scaffold template lifecycle for an existing bundle (`template create|configure|show|
  delete|list`).
- Collection safety: snapshot before risk, rollback after regression
  (`snapshot`, `rollback`).
- Documenting where local vs enterprise edition silently forks behavior.

**Out of scope**:
- Generating BOM/attestation provenance — use `asdlc-skillbom-builder`.
- Pre-packaging quality review — use `asdlc-skill-review-board`.
- Internal `PackBuilder`/`BundleResolver` implementation detail beyond what an agent needs
  to invoke the CLI correctly — deeper code ownership belongs to
  `asdlc-registry-core-contracts` (#13) if that boundary needs documenting.

---

## 2. Capability Coverage

| Intent | Workflow / Section | Canonical Doc |
|--------|--------------------|---------------|
| Add and deploy a single artifact | `SKILL.md § Procedure` step 1, 3 | `skillmeat/cli/commands/artifacts_lifecycle_cmd.py::add_group`, `skillmeat/cli/commands/deploy_cmd.py::deploy_cmd` |
| Create a bundle and populate it with members | `SKILL.md § Procedure` step 4 | `skillmeat/cli/commands/bundle.py::create_cmd,add_member_cmd` |
| Export/import a `.skillmeat-pack` for an existing bundle | `SKILL.md § Procedure` step 4 | `skillmeat/cli/commands/bundle.py::export_cmd,import_bundle` |
| Build a pack from a directory and register it as a project-starter template | `SKILL.md § Procedure` step 5 | `skillmeat/cli/commands/bundle.py::build_pack_cmd,publish_pack_cmd`; `references/pack-and-starter-bundle-format.md §2-3` |
| Assemble and deploy a deployment set | `SKILL.md § Procedure` step 6 | `skillmeat/cli/commands/deployment_set.py` |
| Register/update a scaffold template for an existing bundle | `SKILL.md § Procedure` step 7 | `skillmeat/cli/commands/template.py` |
| Take a safety snapshot / roll back | `SKILL.md § Procedure` step 8 | `skillmeat/cli/commands/artifacts_lifecycle_cmd.py::snapshot_group,rollback_cmd`; `references/pack-and-starter-bundle-format.md §5` |
| Verify a deploy landed | `SKILL.md § Procedure` step 9 | `skillmeat list`/`skillmeat show` (see `skillmeat-cli` skill's `management-workflow.md`) |
| Understand local vs enterprise packaging differences | `references/pack-and-starter-bundle-format.md §4` | — |
| Understand `.skillmeat-pack` file structure | `references/pack-and-starter-bundle-format.md §1` | `.claude/skills/skillmeat-cli/workflows/bundle-workflow.md § "Bundle Format Reference"` |

> No single canonical user doc covers `build-pack`/`publish-pack --register-template` as
> the verified project-starter registration path — `scripts/bundle/SPEC.md`'s own
> integration table is stale on this point (see `SKILL.md § Known traps`). Until that doc is
> corrected, this skill's `references/` file is the closest verified source (Enhancement
> Backlog BL-1).

---

## 3. Invariants & Constraints

1. **Never invoke `bundle create` with `-r`/`--all`/`--type`/`-a` flags.** They do not
   exist on the live command; it only accepts `NAME [--description] [--version] [--tags]
   [--license]` and always creates an empty entity.
   _Source_: `skillmeat/cli/commands/bundle.py::create_cmd` signature.

2. **Never invoke `template create` with `--kind`/`--source` flags.** It only accepts
   `--bundle ID`. Registering a project-starter template from a directory requires
   `build-pack` → `publish-pack --register-template`.
   _Source_: `skillmeat/cli/commands/template.py::create_cmd` signature vs
   `scripts/bundle/SPEC.md`'s stale example.

3. **Never reference top-level `skillmeat deploy pull`/`skillmeat deploy status` as real
   commands.** That command group (`skillmeat/cli/commands/deploy.py::deploy_cli`) is
   registered under the **enterprise** namespace as `skillmeat enterprise deploy
   pull|status`, not under top-level `deploy`.
   _Source_: `skillmeat/cli/enterprise_commands.py` ("Surface: skillmeat enterprise deploy
   pull / skillmeat enterprise deploy status";
   `enterprise_cli.add_command(_federation_deploy_cli, name="deploy")`) — verified
   2026-07-03.

4. **Always verify a deploy with a read-only follow-up command** (`skillmeat list` /
   `skillmeat show <name>` / `deployment-set show <name_or_id>`) before reporting success —
   never rely on the deploy command's own exit code alone.
   _Source_: campaign rule — smaller-model executable, no implicit judgment (decision
   record: `agentic_meta_dev` repo, `.claude/worknotes/aos-skill-harvest/PLAN.md` shared
   rule 6 — historical provenance, not required at runtime).

5. **Always check local vs enterprise edition before describing `deployment-set deploy` or
   `bundle import` behavior**, since the backend path and response shape differ.
   _Source_: `skillmeat/cli/commands/deployment_set.py::deploy_deployment_set` branching on
   `is_enterprise_mode()`.

6. **Never claim an artifact is "approved" from this skill's output alone.** Packaging
   produces a `candidate` artifact until external promotion evidence exists.
   _Source_: campaign rule — everything from the AOS skill harvest stays `candidate` until
   independent review + promotion evidence exists (decision record: `agentic_meta_dev`
   repo, `.claude/worknotes/aos-skill-harvest/PLAN.md` shared rule 7 — historical
   provenance, not required at runtime).

---

## 4. Enhancement Backlog

- **[BL-1] Fix `scripts/bundle/SPEC.md`'s integration-points table**: it documents
  `skillmeat template create --kind project-starter --source dist/starter-bundle/`, which
  does not match the live CLI.
  _Status_: candidate
  _Rationale_: Out of this skill's write fence (owned by `scripts/bundle/SPEC.md`'s
  maintainer); flagged here so the next maintenance pass on that spec corrects it.

- **[BL-2] Fix `.claude/skills/skillmeat-cli/workflows/bundle-workflow.md`'s `bundle
  create` examples**: they show `-r`/`--all`/`--type`/`-a` flags that don't exist on the
  live command.
  _Status_: candidate
  _Rationale_: Out of this skill's write fence (owned by the `skillmeat-cli` skill).

- **[BL-3] Document `.skillmeat-pack` byte-level format precisely from `PackBuilder`
  source** rather than the narrative description in `bundle-workflow.md`.
  _Status_: deferred
  _Rationale_: Would require reading `skillmeat/core/services/pack_builder.py` (or
  equivalent) in full; deferred until a packaging bug specifically requires byte-level
  fidelity.

- **[BL-4] Document the `skillmeat enterprise deploy pull|status` surface in user-facing
  docs.** The `deploy.py::deploy_cli` group is live under the enterprise namespace but its
  file location (`commands/deploy.py`) invites agents to assume a top-level `skillmeat
  deploy pull` exists.
  _Status_: candidate
  _Rationale_: The location/registration mismatch is a documentation trap; out of this
  skill's write fence.

---

## 5. Changelog

### v0.1.0 — 2026-07-03
- Initial SPEC.md drafted as part of the AOS Skill Harvest campaign (skill #12).
- Capability coverage matrix: 10 intents, all mapped to code.
- Status: draft.

---

## 6. Integration Points

| Agent / Command | Invocation Pattern | Notes |
|-----------------|--------------------|-------|
| `asdlc-skillbom-builder` | Produces evidence this skill references in its packaging report | Run before or alongside packaging when provenance is required. |
| `asdlc-skill-review-board` | Runs before this skill | Gates artifact quality prior to packaging. |
| Any AOS skill-harvest author/reviewer agent | `Skill("asdlc-sam-artifact-packager")` | Direct invocation when packaging/deployment is the immediate task. |

**Co-loaded with**: `skillmeat-cli` when an agent also needs broader CLI routing beyond
packaging (discovery, memory, auth).

**No `/dev:*` command bindings.**

---

## 7. Success Signals

- Agents never emit `bundle create` with `-r`/`--all`/`--type`/`-a`, or `template create`
  with `--kind`/`--source`.
- Agents never reference `skillmeat deploy pull`/`skillmeat deploy status` as top-level
  commands (the group is live only as `skillmeat enterprise deploy pull|status`).
- Every reported "deployed" or "packaged" result is accompanied by a read-only verification
  command's actual output, not just an exit code.
- Agents state which edition (local/enterprise) was active before describing
  `deployment-set deploy` or `bundle import` behavior.
- No packaging report claims `approved` status without citing external promotion evidence.
- Agents cite `skillmeat/cli/commands/*.py` or this skill's `references/` file rather than
  the handoff bundle's hypothetical SAM manifest YAML shapes.
