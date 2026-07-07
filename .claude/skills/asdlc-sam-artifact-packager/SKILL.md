---
name: asdlc-sam-artifact-packager
description: >-
  Use when packaging SkillMeat artifacts (skills, agents, commands, context entities,
  bundles, deployment sets, or project-starter templates) for deployment or distribution —
  creating a bundle (`skillmeat bundle create`/`add-member`), building and publishing a
  `.skillmeat-pack` round-trip (`bundle build-pack`/`publish-pack`/`export`/`import`),
  assembling a deployment set (`deployment-set create`/`add-member`/`deploy`), registering a
  project-starter scaffold template (`template create`), deploying a single artifact
  (`skillmeat add`, `skillmeat deploy`), or taking a safety snapshot before a risky change
  (`skillmeat snapshot`/`rollback`). Covers local-collection vs enterprise-edition packaging
  differences and post-deploy verification. Do NOT use for generating BOM/attestation
  provenance — use `asdlc-skillbom-builder` first. Do NOT use for pre-packaging quality
  review — use `asdlc-skill-review-board` first.
version: 0.1
app_version: "2026-07-03"
updated: 2026-07-03
spec: ./SPEC.md
---

# asdlc-sam-artifact-packager

## Purpose

Package artifacts — individually, as a bundle, as a deployment set, or as a reusable
project-starter template — into SkillMeat's real packaging/deployment surfaces, and deploy
them to a target project with pre-flight (snapshot) and post-flight (verify) safety. This
skill governs SkillMeat's enterprise governance capability ("SkillMeat (enterprise)" — never
call it "SAM" as a standalone product name; SAM is the governance capability inside
SkillMeat, not a separate product). It wraps `skillmeat bundle *`,
`skillmeat deployment-set *`, `skillmeat template *`, `skillmeat deploy`/`add`/`undeploy`,
and `skillmeat snapshot`/`rollback` exactly as implemented in
`skillmeat/cli/commands/{bundle,deployment_set,template,deploy_cmd,artifacts_lifecycle_cmd}.py`.

## When to use

- Adding a new artifact to the local collection and deploying it to a project.
- Assembling multiple artifacts into a named `bundle` entity, then exporting/publishing it
  as a portable `.skillmeat-pack`.
- Building a pack directly from a source directory (project-starter style) and publishing
  it into the DB with `--register-template`.
- Grouping artifacts into a `deployment-set` for one-shot batch deploy to a project.
- Registering or updating a Backstage-style scaffold template for a bundle.
- Taking a collection snapshot before a risky bulk operation, or rolling back after one.

## When not to use

- Generating the BOM/attestation provenance for an artifact — use
  `asdlc-skillbom-builder`; run it before or alongside packaging so the shipped package can
  reference real evidence.
- Reviewing a skill for factual/doctrine/usability/security/portability issues — use
  `asdlc-skill-review-board` first; this skill assumes the artifact already passed review.
- Inventing bundle manifest formats not backed by the CLI — the pack/bundle format is
  defined by `PackBuilder` and `bundle-manifest.toml`, not a hand-authored YAML schema.

## Related sibling skills

- `asdlc-skillbom-builder` (11) — produces the provenance this skill should reference in its
  packaging report (BOM path, attestation ID); run it first when provenance is required.
- `asdlc-skill-review-board` (3) — gates artifact quality before packaging.
- `skillmeat-cli` — `workflows/bundle-workflow.md`, `workflows/management-workflow.md`, and
  `workflows/deployment-workflow.md` cover the same commands in more narrative depth; some
  `bundle-workflow.md` examples show a `bundle create -r ... --all --type ...` flag set that
  does not exist on the live `bundle create` command (see Known traps).

## Source of truth

- `skillmeat/cli/commands/bundle.py` — `bundle create|add-member|remove-member|list|show|
  update|version|publish|export|import|build-pack|publish-pack|deploy` (verified against
  code).
- `skillmeat/cli/commands/deployment_set.py` — `deployment-set
  create|add-member|deploy|update|delete|list|show`.
- `skillmeat/cli/commands/template.py` — `template list|create|configure|preview|show|
  delete`.
- `skillmeat/cli/commands/deploy_cmd.py` — top-level `deploy` / `undeploy` /
  `deploy-to-repo` (single-artifact operations).
- `skillmeat/cli/commands/artifacts_lifecycle_cmd.py` — `add skill|command|agent|
  orchestration`, `snapshot` / `snapshot list`, `rollback`.
- `scripts/bundle/SPEC.md`, `scripts/bundle/README.md` — the Instance Starter Bundle
  (project-starter) build script and manifest (note: its integration-points table shows
  `template create --kind project-starter --source ...`, which is stale — see Known traps).
- `.claude/skills/skillmeat-cli/workflows/{bundle,deployment,management}-workflow.md` —
  companion agent workflows.

## Procedure

1. Confirm the artifact already exists in the local collection, or add it:
   `skillmeat add skill|command|agent|orchestration <spec>`.
2. Decide the packaging shape using the decision gate table below: single artifact, bundle,
   deployment set, or project-starter template.
3. **Single artifact** → `skillmeat deploy <name> [--type ...] --project <path>`. Confirm
   with `skillmeat show <name>` afterward.
4. **Bundle** → `skillmeat bundle create <name> [--description ...] [--version ...]
   [--tags ...] [--license ...]` creates an *empty* bundle entity; populate it with
   `skillmeat bundle add-member <bundle> <artifact_id>` per member. Inspect with
   `bundle show`/`bundle list`. Export a portable file with `bundle export <name> [--output
   PATH]`; import a colleague's/upstream pack with `bundle import <path> [--dry-run]
   [--conflict-strategy skip|merge|fork|interactive]`.
5. **Build-from-directory (project-starter style)** → `bundle build-pack <source_dir>
   [--output PATH] [--bundle-name ...] [--bundle-version ...] [--targets ...] [--import]`
   builds a `.skillmeat-pack` from a directory tree (e.g. `dist/starter-bundle/`); then
   `bundle publish-pack <pack> [--name ...] [--version ...] [--register-template]
   [--conflict skip|reuse|overwrite]` ingests it into the DB (artifact content + bundle
   entity + members) and, with `--register-template`, registers a `project_starter`
   scaffold template in the same step.
6. **Deployment set** → `deployment-set create "<name>" [--description ...] [--icon ...]
   [--color ...] [--tags ...]`, then `deployment-set add-member <name_or_id> [--artifact
   UUID | --group ID | --nested-set ID | --workflow ID] [--position N]`, then
   `deployment-set deploy <name_or_id> --project <path> [--dry-run]`.
7. **Scaffold template for a bundle that already exists** → `template create --bundle
   <bundle_id>`; `template configure --bundle <id> [--var NAME:TYPE]... [--skeleton
   GIT-URL] [--platform ...]`; verify with `template list --kind project-starter` /
   `template show <id>`.
8. Before any bulk/risky operation (`--conflict-strategy merge` import, deployment-set
   batch deploy, `bom restore`), take a safety snapshot: `skillmeat snapshot [-m "..."]
   [-c COLLECTION]`. Roll back with `skillmeat rollback <snapshot_id> [-y]` if the
   operation regresses state.
9. After any deploy, verify with a read-only command: `skillmeat list`, `skillmeat show
   <name>`, or `deployment-set show <name_or_id>`. Check local vs enterprise edition first —
   `deployment-set deploy` silently branches its backend path on `is_enterprise_mode()`.
10. Reference the BOM/attestation evidence from `asdlc-skillbom-builder` in the packaging
    report; report `status: candidate` — never `approved` without external promotion
    evidence.

## Decision gates

| Gate | Expected observation | If not observed |
|---|---|---|
| Packaging shape | One artifact → single deploy; several related artifacts shipped together → bundle; several artifacts deployed as one repeatable batch to many projects → deployment-set; a whole project skeleton → build-pack + publish-pack --register-template | Don't default to bundle for a single artifact — `skillmeat deploy` alone is simpler and correct. |
| Bundle already exists vs building fresh | `bundle show <name>` succeeds | If it doesn't exist yet, `bundle create` first (empty), then `add-member`; do not expect `bundle create` to accept artifact-selection flags (`-r`, `--all`, `--type`) — those don't exist on the live command. |
| Local vs enterprise edition | Check project config / `is_enterprise_mode()` before `deployment-set deploy` or `bundle import` | Enterprise mode routes `deployment-set deploy` through a different code path (`_deploy_enterprise_set`); local mode POSTs to `/api/v1/deployment-sets/{id}/deploy`. Confirm which one actually ran before reporting success. |
| Snapshot before risk | A snapshot was taken (`skillmeat snapshot`) immediately before any `--conflict-strategy merge` import, deployment-set batch deploy, or `bom restore` | If skipped, state explicitly that rollback is not available for this operation. |
| Post-deploy verification | `skillmeat list` / `skillmeat show <name>` / `deployment-set show <name_or_id>` confirms the artifact/version landed | Do not report "deployed" from the deploy command's own exit code alone — confirm with a read-only follow-up command. |

## Commands

```
skillmeat add skill|command|agent|orchestration <spec> [--collection ID] [--name NAME] [--force] [--yes] [--instance NAME]...
skillmeat deploy NAME... [--project PATH] [--type skill|command|agent|orchestration] [--overwrite] [--profile ID] [--profiles ID,ID] [--all-profiles] [--members/--no-members] [--dry-run]
skillmeat undeploy NAME [--project PATH] [--type skill|command|agent] [--force]
skillmeat bundle create NAME [--description TEXT] [--version VER] [--tags TAG]... [--license TEXT]
skillmeat bundle add-member BUNDLE_NAME MEMBER_REF
skillmeat bundle remove-member BUNDLE_NAME ARTIFACT_ID
skillmeat bundle list [--status STATUS] [--json]
skillmeat bundle show BUNDLE_NAME
skillmeat bundle version BUNDLE_NAME SEMVER
skillmeat bundle publish BUNDLE_NAME
skillmeat bundle export BUNDLE_NAME [--output PATH]
skillmeat bundle import PATH [--dry-run] [--conflict-strategy skip|merge|fork|interactive]
skillmeat bundle build-pack SOURCE_DIR [--output PATH] [--bundle-name NAME] [--bundle-version VER] [--targets LIST] [--import/--no-import]
skillmeat bundle publish-pack PACK [--name NAME] [--version SEMVER] [--register-template] [--conflict skip|reuse|overwrite]
skillmeat bundle deploy BUNDLE_NAME_OR_UUID [--project PATH] [--dry-run]
skillmeat deployment-set create NAME [--description TEXT] [--icon ICON] [--color COLOR] [--tags TAG]... [--json]
skillmeat deployment-set add-member NAME_OR_ID [--artifact UUID | --group ID | --nested-set ID | --workflow ID] [--position N] [--json]
skillmeat deployment-set deploy NAME_OR_ID --project PATH [--dry-run] [--json]
skillmeat deployment-set list|show|update|delete ...
skillmeat template list [--kind backstage|project-starter]
skillmeat template create --bundle ID
skillmeat template configure --bundle ID [--var NAME:TYPE]... [--skeleton GIT-URL] [--platform PLATFORM]
skillmeat template show TEMPLATE_ID [--json]
skillmeat template delete TEMPLATE_ID [--yes]
skillmeat snapshot [-m MESSAGE] [-c COLLECTION]
skillmeat snapshot list [-c COLLECTION] [-n LIMIT]
skillmeat rollback SNAPSHOT_ID [-c COLLECTION] [-y]
skillmeat list
skillmeat show NAME
```

All verified directly against
`skillmeat/cli/commands/{bundle,deployment_set,template,deploy_cmd,artifacts_lifecycle_cmd}.py`.
`skillmeat list`/`skillmeat show NAME` are the standard post-deploy verification reads.

## Evidence required

- Single-artifact deploy: `skillmeat show <name>` output confirming deployed version/path.
- Bundle: `bundle show <name>` member list + version; the exported `.skillmeat-pack` path
  and its sha256 if distributed.
- Deployment set: `deployment-set show <name_or_id>` member list; the per-artifact results
  table from `deployment-set deploy` (succeeded/failed/skipped counts).
- Project-starter template: `template show <id>` confirming `bundle_id`, `enabled`, and
  `skeleton_ref`.
- A snapshot ID (`skillmeat snapshot list`) taken immediately before any bulk/import/deploy
  operation that could regress state.
- Cross-reference to the BOM/attestation record from `asdlc-skillbom-builder` (path/id),
  when provenance was produced for the same artifact.

## Known traps

- **`bundle create` does not accept `-r`/`--all`/`--type`/`-a` artifact-selection flags.**
  The sibling `skillmeat-cli` skill's `workflows/bundle-workflow.md` shows those in its
  examples; the live command (`cli/commands/bundle.py::create_cmd`) only accepts
  `NAME [--description] [--version] [--tags] [--license]` and creates an *empty* bundle
  entity. Populate it with `bundle add-member` afterward.
- **`template create` only takes `--bundle ID`.** `scripts/bundle/SPEC.md`'s own
  integration-points table shows `skillmeat template create --kind project-starter --source
  dist/starter-bundle/`, which does not match the live `cli/commands/template.py::create_cmd`
  signature. To register a project-starter template from a built pack directory, the real
  path is `bundle build-pack <source_dir>` → `bundle publish-pack <pack>
  --register-template` (creates the bundle *and* the scaffold template together);
  `template create --bundle <id>` is only for a bundle that already exists.
- **`skillmeat deploy` (top-level) and `deployment-set deploy` are different commands with
  different flag sets** — don't cross-apply `--profile`/`--apply-recipe`/`--apply-overlay`
  (single-artifact `deploy` only) onto `deployment-set deploy` (which only has
  `--project`/`--dry-run`/`--json`).
- **The `pull`/`status` group in `skillmeat/cli/commands/deploy.py` lives under the
  `enterprise` namespace, not top-level `deploy`.** It is registered as
  `skillmeat enterprise deploy pull|status` (`skillmeat/cli/enterprise_commands.py`
  rehomes it: `enterprise_cli.add_command(_federation_deploy_cli, name="deploy")`), so
  top-level `skillmeat deploy pull` is **not** a real invocable command. The live top-level
  `skillmeat deploy` is the single-artifact command in `deploy_cmd.py`.
- **Local vs enterprise changes behavior silently.** `deployment-set deploy` branches on
  `is_enterprise_mode()` internally — same CLI invocation, different backend path and
  different result shape (`_deploy_enterprise_set` vs a direct
  `POST /api/v1/deployment-sets/{id}/deploy`). Don't assume the local-mode response fields
  (`set_name`, `total`, `succeeded`, `failed`, `skipped`, `results`) are guaranteed
  identical to the enterprise path without checking the actual output.
- **Bundle-pack signing is a separate system from BOM signing** — see
  `asdlc-skillbom-builder`'s Known traps; use the `skillmeat sign` command family
  (name/email key registry, `cli/commands/sign.py`), not `bom sign`, when the goal is a
  distributable signed `.skillmeat-pack` for a general audience (though `bom sign` will
  mechanically sign the pack file's bytes too, since it accepts any file). Note `bundle
  create` has **no** `--sign` flag.
- **`bundle build-pack --import` uses a different, more gated API path than `bundle
  publish-pack`.** `build-pack --import` POSTs to `/api/v1/bundles/import`; `publish-pack`
  calls the ungated `/api/v1/bundles/import-pack` endpoint and ingests *all* manifest member
  types. Prefer `publish-pack` when the goal is to materialize real files via `bundle
  deploy`/`scaffold` afterward.

## Output format

```
- packaging_shape: single | bundle | deployment_set | project_starter_template
- artifact_or_bundle_id: <id/name>
- source_commands_run: [<verbatim commands>]
- verification: <output of the post-deploy show/list command>
- snapshot_id: <id or "not taken">
- provenance_ref: <BOM path / attestation id from asdlc-skillbom-builder, or "none yet">
- status: candidate   # never "approved" without external promotion evidence
```

## Provenance and maintenance

- Reverify volatile facts:
  - `skillmeat bundle --help`
  - `skillmeat deployment-set --help`
  - `skillmeat template --help`
  - `skillmeat deploy --help`
  - `grep -n "@.*\.command\|@.*\.group" skillmeat/cli/commands/{bundle,deployment_set,template,deploy_cmd}.py`
- Last reviewed: 2026-07-03
- SAM registration: candidate
- SkillBOM fields: artifact_id, version, digest, source_context, policy_tags, evidence_hash
  — supplied by `asdlc-skillbom-builder`, referenced here, never regenerated by this skill.
