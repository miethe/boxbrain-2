---
name: html-capsules
description: |
  Transform Markdown, YAML, and JSON artifacts into self-contained, interactive HTML pages
  (capsules). Capsules render planning docs, agent run logs, and skill cards with safe-HTML
  enforcement and vanilla JS interactivity. Use to render, validate, export, or capture agentic
  work as portable HTML artifacts for review and cross-project deployment.
version: 0.1.0
updated: 2026-05-15
spec: ./SPEC.md
---

# HTML Capsules Skill

Render Markdown, YAML, and JSON artifacts as self-contained, interactive HTML capsules with safe-HTML enforcement and vanilla JS interactivity.

For the full capability contract, invariants, and enhancement backlog see `./SPEC.md`.

---

## Quick Start: Core Subcommands

All commands assume `meaty-capsule` is installed (via `pip install -e .` in skill dir or SkillMeat bundle).

```bash
# Render: manifest + source → HTML
meaty-capsule render --type planning-capsule --source plan.md --manifest plan.yaml --out ./capsules/

# Capture: agent run → Run Card capsule
meaty-capsule capture-run --tool claude-code --intent init_html_capsules --task phase_1 --template run-card

# Emit: planning artifact → Planning Capsule
meaty-capsule emit-planning --plan implementation-plan.md --out .claude/capsules/

# Validate: manifest + HTML → diagnostics (exit 0 if valid)
meaty-capsule validate --manifest plan.yaml
```

---

## When to Use This Skill

| Trigger | Example | Workflow |
|---------|---------|----------|
| Agent run completed (phase done) | Dev-execution phase finish → capture as Run Card | `capture-run` subcommand |
| Planning artifact created (PRD, plan) | Planning skill emits Planning Capsule | `emit-planning` subcommand |
| Manual one-off capsule render | Designer wants HTML view of skill inventory | `render` subcommand |
| Pre-commit validation | Verify manifest + template before checkin | `validate` subcommand |
| Cross-project export | Export capsule + bundle to SkillMeat/CCDash | `export-writeback` subcommand |

---

## Capability Matrix

| Intent | Workflow / File | Canonical Doc |
|--------|-----------------|---------------|
| Render HTML from manifest + source | `lib/capsule_renderer.py` + `render` CLI | `SPEC.md` §12 CLI Quick Reference |
| Capture agent run as Run Card | `lib/emitter.py` + `capture-run` CLI | `docs/emission-triggers.md` §Phase Completion |
| Emit Planning Capsule from PRD | `lib/emitter.py` + `emit-planning` CLI | `docs/emission-triggers.md` §Planning Artifact |
| Validate manifest + HTML | `cli/validate.py` | `SPEC.md` §12 CLI Reference |
| Export writeback bundle | `cli/export_writeback.py` | `SPEC.md` §12 CLI Reference |
| Understand safe-HTML policy | `lib/safe_html.py` | `SPEC.md` §3 Invariants & Constraints |
| Configure emission triggers | N/A (manual opt-in v1) | `docs/emission-triggers.md` §Permitted Triggers |

---

## Task Workflows

### 1. Render a Capsule from Manifest

Use when you have a manifest (YAML) + source file (Markdown/JSON) and want to generate the HTML.

```bash
meaty-capsule render \
  --type planning-capsule \
  --source .claude/plans/my-prd/prd.md \
  --manifest .claude/plans/my-prd/manifest.yaml \
  --out ./.claude/capsules/
```

**Manifest must include**:
- `schema_version: 0.1`
- `capsule_type: planning-capsule` (or other type: `run-card`, `skill-card`, `decision-card`, etc.)
- `title`, `description`, `created_at` (ISO 8601)
- `source_path`, `source_type` (markdown, json, yaml)

See `schemas/capsule-manifest.schema.json` for full schema.

### 2. Validate Before Commit

Run validation to catch manifest errors early, without rendering.

```bash
meaty-capsule validate --manifest .claude/plans/my-prd/manifest.yaml
# Exit 0 = valid; non-zero = errors to stderr
```

Optional: validate rendered HTML too.

```bash
meaty-capsule validate --manifest manifest.yaml --html output.html
```

### 3. Capture a Run for Review

When a phase or task completes, capture the agent session as an HTML Run Card.

```bash
meaty-capsule capture-run \
  --tool claude-code \
  --intent init_html_capsules \
  --task phase_1 \
  --template run-card
```

Outputs: `.claude/capsules/run-card-{timestamp}.html` + `.capsule.yaml` manifest.

---

## Command Cheatsheet

### render
```bash
meaty-capsule render --type <type> --source <path> --manifest <path> --out <dir>

# Types: planning-capsule, run-card, skill-card, decision-card, research-capsule, gtm-brief
# Examples:
meaty-capsule render --type run-card --source session.json --manifest session.yaml --out ./capsules/
meaty-capsule render --type skill-card --source skill.md --manifest skill.yaml --out ./
```

### capture-run
```bash
meaty-capsule capture-run --tool <agent> --intent <id> --task <id> --template <type>

# Example:
meaty-capsule capture-run --tool claude-code --intent feat_xyz --task phase_2 --template run-card
```

### emit-planning
```bash
meaty-capsule emit-planning --plan <path> [--out <dir>]

# Examples:
meaty-capsule emit-planning --plan implementation-plan.md
meaty-capsule emit-planning --plan prd.yaml --out .claude/capsules/
```

### validate
```bash
meaty-capsule validate --manifest <path> [--html <path>]

# Exit 0 = pass; non-zero = fail with diagnostics to stderr
meaty-capsule validate --manifest plan.yaml --html output.html
```

### export-writeback
```bash
meaty-capsule export-writeback <capsule-or-dir> --target <target> [--out <file>]

# Targets: meatywiki, ccdash, skillmeat, intenttree, control_plane
meaty-capsule export-writeback .claude/capsules/planning/ --target skillmeat --out writeback.json
```

---

## Known Failure Modes & Recovery

| Failure | Root Cause | Recovery |
|---------|-----------|----------|
| "schema_version mismatch" error | Manifest uses v0.2; renderer only knows v0.1 | Update skill or downgrade manifest to `schema_version: 0.1` |
| "unknown capsule_type" | Template file missing or misspelled type | Check `templates/` dir; confirm `capsule_type` in manifest matches a `.html.j2` file |
| Rendered capsule has external URL (http/https) | Safe-HTML sanitizer bypassed or template bug | Audit template for hardcoded `src=` attributes; re-run `validate` |
| Writeback bundle is invalid JSON | Emitter crashed mid-write or manifest incomplete | Check `.claude/capsules/errors.log`; re-run `validate` on source manifest |
| `SKILLMEAT_CAPSULES_ENABLED` flag not honored | Flag not exported to subprocess or not checked before emission | Confirm flag in environment; check `emitter.py` for guard logic |
| Timestamp/datetime renders as "NaN" | Manifest datetime not ISO 8601 format | Use `created_at: 2026-05-15T14:30:00Z` format (strict parsing) |
| Cross-project render fails with "template not found" | Paths in script are absolute to original project | Use `Path(__file__).parent` to make paths relative; test with `cd` into scratch dir |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SKILLMEAT_CAPSULES_ENABLED` | unset | Gate all automatic capsule emission. Set to `1` to enable; unset = no auto-emit. |
| `CAPSULES_DRY_RUN` | unset | Dry-run mode: log output plan without writing files. Set to `1` to activate. |
| `SKILLMEAT_CAPSULES_DIR` | `.claude/capsules/` | Override default capsule output directory. Rarely used; for testing. |

---

## Integration Points

| Agent / Command | Invocation | Notes |
|-----------------|-----------|-------|
| `dev-execution` skill | Loads `html-capsules` on phase completion; calls `capture-run` CLI | Phase 4 integration; gated by `SKILLMEAT_CAPSULES_ENABLED=1` |
| `planning` skill | Emits Planning Capsule on PRD/plan creation | Phase 4 integration; gated by flag |
| `/capsule:emit` slash command | Manual trigger for one-off capsule generation | Phase 3; always available |
| Local CLI (manual): `meaty-capsule` | Standalone script invocation outside agent context | For human use and CI/CD pipelines |

---

## For More Detail

See `./SPEC.md` for:
- Full capability contract and integration points
- 6 invariants covering safe HTML, schema versioning, emissions gating, vanilla JS constraints
- Enhancement backlog (8 items: portal, framework support, retention, indexing, etc.)
- Directory structure and file organization
- Deferred design stubs (DEFERRED-001 through DEFERRED-008)
