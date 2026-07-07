# Capsule Emission Triggers

**Version**: 0.1
**Status**: active
**Owner**: Nick Miethe
**Related**: `../lib/emitter.py`, `../../dev-execution/hooks/phase-complete-capsule.sh`

This document is the authoritative contract for when `CapsuleEmitter` is permitted
to emit an HTML Capsule. It is the reference Karen consults during the P4-T08
workflow-bloat audit. Any new trigger added to `emitter.py`, any hook that calls
`CapsuleEmitter.emit()`, and any workflow integration must comply with this spec.
Violations discovered during Karen's audit are blocking — fix before phase completion.

---

## 1. Guard Variables

All capsule emission is gated by two environment variables. Both must be checked
before any file write occurs. `CapsuleEmitter` enforces them automatically; callers
must not bypass them.

| Variable | Purpose | Effect when absent/unset |
|---|---|---|
| `SKILLMEAT_CAPSULES_ENABLED` | Master on/off switch | Emission silently skipped; `emit()` returns `None` |
| `CAPSULES_DRY_RUN` | Dry-run mode | Logs what would be written via stdlib `logging` at INFO level; no files created; `emit()` returns the path that *would* have been written |

Rules:

- **`SKILLMEAT_CAPSULES_ENABLED=1`** is required for any real file write. Any other
  value (including `0`, `false`, empty string) is treated as disabled.
- **`CAPSULES_DRY_RUN=1`** activates dry-run mode. Setting it without
  `SKILLMEAT_CAPSULES_ENABLED=1` has no effect (guard check runs first).
- Both variables are checked at `emit()` call time, not at `CapsuleEmitter` construction
  time, so a process can toggle them between calls.

---

## 2. Capsule Path Layout

Every emitted capsule occupies its own directory. The layout is:

```
.claude/capsules/
  YYYY-MM-DD-{slug}/
    index.html        # required — rendered capsule
    manifest.yaml     # required — capsule manifest (html_capsule: envelope)
    run.md            # optional — freeform narrative / agent run notes
```

Rules:

- `{slug}` is derived from the triggering event's `task` field (preferred) or `intent`
  field, lower-cased, with whitespace and non-alphanumeric characters replaced by `-`,
  truncated to 48 characters.
- `YYYY-MM-DD` is the local date at emission time (not UTC).
- The directory name must be unique. If a collision occurs the emitter appends `-2`,
  `-3`, etc.
- `index.html` and `manifest.yaml` are always written together. A directory with only
  one of the two is considered corrupt.
- `run.md` is written only when the triggering event includes a non-empty `run_notes`
  field.
- The `output_root` defaults to `.claude/capsules/` relative to cwd. It can be
  overridden via `CapsuleEmitter(output_root=...)`.

---

## 3. Allowed Triggers

Capsule emission MUST happen for the following workflow events. These are meaningful
work-unit boundaries where a rendered capsule provides durable, human-reviewable
evidence. Implementing a new integration that calls `emit()` for any other trigger
requires updating this document first and obtaining Karen's sign-off.

### 3.1 `phase-complete`

**Definition**: A dev-execution phase has been marked `completed` in its progress
YAML. Detected by the PostToolUse hook at
`.claude/skills/dev-execution/hooks/phase-complete-capsule.sh` when the
`update-batch.py` or `update-status.py` script transitions a phase to `completed`
state.

**Capsule type**: `run-card`

**Required event fields**:
- `tool`: `"phase-complete"`
- `intent`: phase name (e.g. `"Phase 4 — Workflow Integration"`)
- `task`: phase slug (e.g. `"phase-4-workflow-integration"`)
- `phase_number`: integer
- `progress_file`: relative path to the progress YAML

**Rationale**: Phase completion is an unambiguous, high-value work boundary. A capsule
here provides a human-readable summary of what was built, evidence links, and proposed
writebacks — exactly the intent of the run-card template.

---

### 3.2 `planning-board-create`

**Definition**: An `implementation-planner` subagent has completed and produced a
planning artifact (PRD, implementation plan, or feature contract) as its primary
output. Detected in `.claude/skills/html-capsules/lib/planning_hook.py` after the
subagent writes the plan file.

**Capsule type**: `planning-capsule`

**Required event fields**:
- `tool`: `"planning-board-create"`
- `intent`: plan title
- `task`: plan slug derived from the output filename
- `plan_file`: relative path to the plan artifact
- `plan_type`: one of `prd`, `implementation-plan`, `feature-contract`

**Rationale**: A completed plan is the output of significant reasoning work. The
planning-capsule template captures the decision matrix, open questions, and writeback
recommendations in a form that is easier to review than raw YAML frontmatter.

---

### 3.3 `skill-promotion`

**Definition**: A candidate skill has been promoted to `active` status in the SkillMeat
collection. Detected when `skillmeat memory item` or a promotion workflow transitions
a skill from `candidate` to `active`.

**Capsule type**: `skill-card`

**Required event fields**:
- `tool`: `"skill-promotion"`
- `intent`: skill title
- `task`: skill slug (e.g. `"html-capsule-generator"`)
- `skill_path`: relative path to the skill artifact
- `promoted_from`: previous status (typically `"candidate"`)

**Rationale**: Skill promotion is a durable, intentional quality gate. A skill-card
capsule at promotion time records the skill's purpose, validation evidence, and
lineage for future reuse.

---

## 4. Forbidden Triggers

Capsule emission MUST NOT happen for the following actions. These are micro-actions,
mechanical side-effects, or recoverable intermediate states. Emitting a capsule for
them would create noise that obscures meaningful capsules and degrades the signal-to-
noise ratio of the `.claude/capsules/` directory.

| Forbidden trigger | Reason |
|---|---|
| Every Bash tool call | Mechanical execution; not a meaningful work unit |
| Every Edit or Write tool use | Intermediate state; not a completion boundary |
| Micro-actions (single file edit, single grep, single read) | Too granular; no human-reviewable output |
| Background polling or status checks | Monitoring, not creation |
| Failed or aborted operations | Incomplete; no valid evidence to surface |
| Lint, format, type-check passes | Dev tooling; not an agentic work unit |
| Incremental git adds or intermediate commits | SCM bookkeeping |
| Schema validation runs | Validation is evidence, not a trigger |
| Every sub-task completion within a phase | Only the phase boundary matters, not each TASK-N.M |
| Loop iterations in a batch | Batch completion can trigger; individual iterations cannot |

The governing rule: **a trigger is allowed only if a human reviewer would benefit from
opening the resulting capsule**. When in doubt, do not emit.

---

## 5. Dry-Run Behaviour

When `CAPSULES_DRY_RUN=1` is set (and `SKILLMEAT_CAPSULES_ENABLED=1` is also set):

1. `CapsuleEmitter.emit()` computes the full capsule path and manifest as if it were
   about to write.
2. It logs the following at `INFO` level via stdlib `logging`:
   ```
   [DRY RUN] Would emit capsule: .claude/capsules/YYYY-MM-DD-{slug}/
   [DRY RUN]   template: {template_name}
   [DRY RUN]   capsule_id: {capsule_id}
   [DRY RUN]   files: index.html, manifest.yaml[, run.md]
   ```
3. It returns the path that *would* have been written (a `Path` object) — callers can
   use this for testing without side effects.
4. No directories are created. No files are written.

Dry-run mode is the primary testing and CI verification mechanism. All automated tests
of emission behaviour MUST use dry-run mode or a temp directory `output_root` to avoid
polluting `.claude/capsules/` with test artifacts.

---

## 6. Error Handling Contract

`CapsuleEmitter.emit()` is designed to be non-blocking. It MUST NOT raise exceptions
into the calling workflow. All exceptions are caught internally:

- Rendering failures (Jinja2, schema validation): logged to `.claude/capsules/errors.log`
  and `emit()` returns `None`.
- File write failures (permissions, disk full): logged to `.claude/capsules/errors.log`
  and `emit()` returns `None`.
- Guard variable checks: silent return of `None` (no logging — not an error).

The rationale: capsule emission is an observability side-effect. A failed capsule must
never interrupt an in-progress agent task or cause a phase-completion hook to exit
non-zero.

---

## 7. Karen Audit Checklist

Karen verifies all Phase 4 emission integration against the following checklist during
the P4-T08 workflow-bloat audit. Each item must pass for the phase to be marked complete.

### 7.1 Guard Variable Enforcement

- [ ] `CapsuleEmitter.emit()` returns `None` when `SKILLMEAT_CAPSULES_ENABLED` is unset
      or set to any value other than `1`.
- [ ] `CapsuleEmitter.is_enabled()` returns `False` when the guard is unset.
- [ ] `CapsuleEmitter.dry_run()` returns `True` only when both
      `SKILLMEAT_CAPSULES_ENABLED=1` and `CAPSULES_DRY_RUN=1`.
- [ ] No emission path bypasses the guard check.

### 7.2 Trigger Scope — Allowed Only

- [ ] Capsules are emitted only for `phase-complete`, `planning-board-create`, and
      `skill-promotion` events.
- [ ] No hook or caller invokes `emit()` for Bash tool calls, Edit/Write tool uses,
      or individual sub-task completions.
- [ ] Phase-complete hook fires only when the phase status transitions to `completed`,
      not on each task update.
- [ ] Planning hook fires only after the subagent has written its plan artifact to disk,
      not during incremental plan construction.

### 7.3 Dry-Run Correctness

- [ ] `CAPSULES_DRY_RUN=1` produces log output at INFO level naming the would-be path,
      template, and files.
- [ ] No directories or files are created under the real `output_root` during dry-run.
- [ ] `emit()` returns a `Path` object (not `None`) in dry-run mode.

### 7.4 Path Layout Compliance

- [ ] Every real capsule directory follows `YYYY-MM-DD-{slug}/` naming.
- [ ] Every real capsule directory contains both `index.html` and `manifest.yaml`.
- [ ] `run.md` is present only when the triggering event provided non-empty `run_notes`.
- [ ] No capsule directories are created for forbidden triggers.

### 7.5 Error Isolation

- [ ] A rendering failure (bad manifest, missing template) does not propagate an
      exception to the calling hook or workflow.
- [ ] Errors are recorded in `.claude/capsules/errors.log` with timestamp, event
      summary, and exception detail.
- [ ] `emit()` returns `None` on any error path.

### 7.6 No Workflow Bloat

- [ ] The phase-complete hook adds no more than ~100ms to phase-completion wall time
      when capsules are disabled (guard not set).
- [ ] The planning hook does not block the `implementation-planner` subagent's return
      path — capsule emission is fire-and-continue, not fire-and-wait.
- [ ] The skill-promotion trigger does not add latency to the promotion flow beyond
      the capsule write time.

### 7.7 Index Registration

- [ ] After each successful real emission, the capsule path is appended to
      `.claude/capsules/index.yaml` (implemented in `capsule_index.py`, wired in
      `emitter.py` after write completes).
- [ ] Dry-run mode does NOT update `index.yaml`.
- [ ] Failed emissions do NOT update `index.yaml`.

---

## 8. Implementation Notes

*Added during P4-T06 implementation.*

### 8.1 Dry-Run CLI Flag Design

Dry-run is supported via both environment variable (`CAPSULES_DRY_RUN=1`) and
per-subcommand CLI flag (`--dry-run`).  The flag was added per-subcommand rather
than to the top-level `meaty-capsule` parser for two reasons:

1. **Semantic clarity**: `render --dry-run` and `capture-run --dry-run` have
   slightly different output (byte count + path vs. file list), making subcommand-
   level flags clearer in `--help` output.
2. **Consistency with env var**: Both methods call the same `_is_dry_run(args)`
   helper that checks `args.dry_run OR CAPSULES_DRY_RUN == "1"`, ensuring the
   env-var path (used by `CapsuleEmitter`) and the CLI path are equivalent.

### 8.2 Dry-Run Output Prefix

CLI dry-run output uses `[DRY-RUN]` (with hyphen) as the stdout prefix.
`CapsuleEmitter` logging uses `[DRY RUN]` (with space) as per the original
spec in §5 above.  Both forms are accepted in tests — the hyphen variant is
the CLI convention; the space variant is the logger convention.

### 8.3 CAPSULES_OUTPUT_ROOT Override

Tests pass `output_root=tmp_path` directly to `CapsuleEmitter(output_root=...)`.
The hook script (`phase-complete-capsule.sh`) hardcodes `.claude/capsules/` as
the default output root.  A `CAPSULES_OUTPUT_ROOT` env var override was
considered but not added — the `output_root` constructor argument is sufficient
for hermetic tests, and adding an env var solely for test convenience would
increase the public surface area without a production use case.
