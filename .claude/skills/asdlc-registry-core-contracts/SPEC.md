---
schema_version: 2
doc_type: skill_spec
skill_name: asdlc-registry-core-contracts
skill_version: "0.1.0"
status: draft
created: "2026-07-03"
updated: "2026-07-03"
owner: nick
source_docs:
  - skillmeat/core/interfaces/README.md
  - skillmeat/cache/CLAUDE.md
  - docs/dev/architecture/compatibility-registry.md
  - docs/dev/architecture/migration-safety-enterprise-spec.md
  - CONTRIBUTING.md
  - pytest.ini
related_skills:
  - skillmeat-cli
  - asdlc-skillbom-builder
  - asdlc-sam-artifact-packager
  - asdlc-model-downgrade-hardening
affects_commands: []
# aligned_app_version intentionally omitted — this skill was authored against
# an unlabeled worktree checkout (.claude/worktrees/asdlc-skills), not a
# tagged release; treat as unverified against any specific SkillMeat version.
---

<!-- Convention reference: .claude/specs/artifact-structures/skill-spec-convention.md -->

# asdlc-registry-core-contracts — Skill Specification

> **Reading this file**: This is the versioned capability contract for the
> `asdlc-registry-core-contracts` skill. For invocation-time routing, see
> `SKILL.md` in this same directory.

---

## 1. Purpose & Scope

**Mission**: Give an agent about to modify SkillMeat's artifact-identity,
versioning, manifest, search, or content-resolution kernel (the handoff
spec's "Registry Core," which has no literal module in this codebase) a
verified map of the actual boundaries, their consumers, the local/enterprise
DB-routing split, and the pinning tests — so the change preserves backward
compatibility instead of silently breaking a consumer or the enterprise
schema.

**In scope**:
- Mapping the doctrine-level "Registry Core" concept onto real modules under
  `skillmeat/core/`, `skillmeat/cache/`, `skillmeat/storage/`, `skillmeat/sources/`
- The repository-interface (hexagonal) pattern: ABC in
  `skillmeat/core/interfaces/repositories.py` + local/enterprise implementers
  + DI wiring in `skillmeat/api/dependencies.py`
- The `RepositoryFactory` / `SKILLMEAT_EDITION` local-vs-enterprise DB routing
  split, and the documented failure mode when a service bypasses it
- The Alembic multi-head (main branch + `ent_*` branch) migration strategy
  and its documented root-cause incident
- The schema-drift guard (`SchemaDriftError`) as a detection layer
- The compatibility-registry.md deprecation/removal decision pattern
  (Option B: structural-snapshot + one-release window)
- Pointers to the actual pinning test suites and verified run commands

**Out of scope**:
- Agent-facing CLI command syntax for end users → `skillmeat-cli`
- SkillBOM manifest generation/signing → `asdlc-skillbom-builder`
- Bundle/deployment-set packaging → `asdlc-sam-artifact-packager`
- Detailed local/enterprise repository *unit-testing* technique (mock
  patterns, comparator-cache gotcha) → read `skillmeat/cache/tests/CLAUDE.md`
  directly; this skill only points to it, does not restate it
- Any prescriptive claim that "Registry Core" is a real package name in this
  codebase — it is not (see §3 invariant 1)

---

## 2. Capability Coverage

| Intent | Workflow / Section | Canonical Doc |
|--------|--------------------|---------------|
| "What counts as Registry Core in this codebase?" | `SKILL.md § Purpose` + `references/kernel-boundary-map.md` | `skillmeat/core/interfaces/README.md` |
| "I'm about to change a repository interface — what do I need to check?" | `SKILL.md § Procedure` steps 2–3 + Decision Gates row 1 | `skillmeat/core/interfaces/README.md § Adding a New Repository Interface` |
| "Is this a breaking or additive kernel change?" | `SKILL.md § Decision gates` | `docs/dev/architecture/compatibility-registry.md` |
| "I need to touch a DB model / write a migration" | `SKILL.md § Procedure` step 5 + `references/alembic-multi-head-and-db-split.md` | `docs/dev/architecture/migration-safety-enterprise-spec.md` |
| "Why does this service query the wrong database?" | `references/alembic-multi-head-and-db-split.md § The DB-path-split gotcha` | `tests/enterprise/MEMORY_AUDIT_FINDINGS.md` |
| "How do I run the tests that pin this contract?" | `SKILL.md § Commands` | `CONTRIBUTING.md § Dev tools`, `pytest.ini` |
| "I need to remove/rename a public CLI or API surface" | `SKILL.md § Procedure` step 7 + Decision Gates row 5 | `docs/dev/architecture/compatibility-registry.md` |
| "What does 'dependency resolution' mean in this codebase?" [narrow] | `references/kernel-boundary-map.md § 4` | — (no canonical doc; two candidate subsystems named, inference only) |

> No intent in this table lacks a canonical doc except the dependency-
> resolution row, which is explicitly inference-only (§4 of the boundary map)
> — a backlog entry (§4 below) tracks resolving this ambiguity.

---

## 3. Invariants & Constraints

1. **"Registry Core" is a doctrine label, not a module name**: this skill
   must never assert that `skillmeat/core/registry/` or similar exists.
   Agents must be told explicitly that the mapping in
   `references/kernel-boundary-map.md` is this skill's own aggregation, not
   a repo-declared boundary, except where a source is cited as EVIDENCED.
   _Source_: handoff spec §4.4 vs. `rg -n "Registry Core" skillmeat/` (no hits).

2. **Never edit only one side of a local/enterprise repository pair**:
   any change to `skillmeat/core/repositories/local_<name>.py` must be
   accompanied by the corresponding change (or an explicit documented reason
   it's not needed) in the enterprise implementation, and vice versa.
   _Source_: `skillmeat/cache/CLAUDE.md § Enterprise Repository Architecture`.

3. **Never bypass `RepositoryFactory`/edition routing for new DB access**:
   new services must resolve their repository/session through
   `RepositoryFactory` (`skillmeat/cache/repository_factory.py`) or a
   `*RepoDep` in `skillmeat/api/dependencies.py`, not via a bare
   `SomeService(db_path=None)` constructor.
   _Source_: `tests/enterprise/MEMORY_AUDIT_FINDINGS.md` (documented real
   failure of this exact pattern).

4. **Always use the plural `"heads"` Alembic selector, never singular
   `"head"`**, when the migration graph may have ≥2 heads (main + `ent_*`
   branches).
   _Source_: `skillmeat/cache/manager.py` docstring + `command.upgrade(cfg,
   "heads")` call site.

5. **Never suppress `SchemaDriftError`**: it is a deliberate fail-loud guard;
   catching and ignoring it defeats its purpose.
   _Source_: `skillmeat/cache/repository.py` (`SchemaDriftError`) +
   `tests/test_cache_drift_guard.py`.

6. **Never delete a public CLI/API surface without a compatibility-registry
   entry and evidence** (structural snapshot diff + deprecation window).
   _Source_: `docs/dev/architecture/compatibility-registry.md § Governance Note`.

7. **No duplication of SKILL.md routing content**: this SPEC.md documents the
   capability contract; cross-reference `SKILL.md` sections by name only.
   _Source_: `.claude/specs/artifact-structures/skill-spec-convention.md § 2.3`.

---

## 4. Enhancement Backlog

- **[BL-1] Resolve the "dependency resolution" ambiguity**: determine
  whether the handoff spec's "dependency resolution" boundary should be
  formalized as its own module (currently split across `core/sharing/` and
  `core/bom/`) or left as-is with this skill's disambiguation note.
  _Status_: candidate
  _Rationale_: No repo-internal evidence forces either answer; needs a
  maintainer decision, not an agent inference.

- **[BL-2] Confirm current Alembic head count on a cadence**: the single-head
  state verified 2026-07-03 is a point-in-time fact, not a standing
  guarantee. Consider a periodic (e.g., pre-release) `alembic heads` check
  wired into CI so a silent multi-head split is caught before it reaches
  the pattern described in `migration-safety-enterprise-spec.md`.
  _Status_: candidate
  _Rationale_: The spec describing the root-cause incident is itself
  `status: in-progress` as of its last update (2026-04-08); its own
  remediation plan may already cover this — verify before building anything.

- **[BL-3] Add pinning tests for interfaces without one yet**: this skill's
  kernel-boundary map lists ABCs in `skillmeat/core/interfaces/` beyond
  `IProjectGraphAdapter` (the only one confirmed to have a dedicated
  ABC-conformance test at authoring time: `test_local_project_graph_adapter.py`).
  Audit whether `IArtifactRepository`, `ICollectionRepository`, etc. have
  equivalent direct-ABC-conformance tests, or only indirect coverage via
  API/CLI integration tests.
  _Status_: candidate
  _Rationale_: Not verified this session — would require reading every test
  file under `tests/cache/`, `tests/repositories/`, and `skillmeat/core/repositories/tests/`
  exhaustively, which was out of scope for initial authoring.

---

## 5. Changelog

### v0.1.0 — 2026-07-03
- Initial SPEC.md authored (draft) as part of the AOS Skill Harvest campaign,
  P0 skill #13 (`asdlc-registry-core-contracts`)
- Capability coverage matrix: 8 intents across 1 SKILL.md + 2 reference files
- Grounded entirely in live discovery of this worktree
  (`.claude/worktrees/asdlc-skills`) — no external "Registry Core refactor
  report" was available or used, per the task's explicit caveat
- Verified commands: `pytest tests/test_cache_drift_guard.py -q` (5 passed),
  `alembic ... heads`, `alembic ... branches` (all executed 2026-07-03)

---

## 6. Integration Points

| Agent / Command | Invocation Pattern | Notes |
|-----------------|--------------------|-------|
| Any agent editing `skillmeat/core/` or `skillmeat/cache/` | `Skill("asdlc-registry-core-contracts")` | Load before writing the diff, not after |
| `data-layer-expert` | `Skill("asdlc-registry-core-contracts")` | Relevant when the change is primarily a migration or repository-interface change |
| `asdlc-skill-review-board` | reads this SKILL.md's Decision Gates during factual/doctrine review | Used to check whether an authored skill correctly cites this skill for kernel-touching work |

**Co-loaded with**: `skillmeat-cli` when the same task also needs CLI-surface
routing guidance (e.g., a kernel change that also adds a new CLI command).

**No `/dev:*` command bindings.**

---

## 7. Success Signals

- An agent reviewing a diff to `skillmeat/core/interfaces/repositories.py`
  correctly identifies all local + enterprise implementers before approving.
- No new service is introduced with a hardcoded `db_path=None` bypassing
  `RepositoryFactory` (the exact pattern this skill documents as a known,
  previously-real bug).
- Migrations added while this skill is loaded always re-check
  `alembic ... heads`/`branches` rather than assuming a linear history.
- Agents correctly distinguish "Registry Core" as doctrine language from the
  actual module names, and do not invent a `skillmeat/core/registry/` path.
- No public CLI/API surface is deleted without a
  `compatibility-registry.md` entry.
