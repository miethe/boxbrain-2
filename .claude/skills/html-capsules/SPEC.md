---
schema_version: 2
doc_type: skill_spec
skill_name: html-capsules
skill_version: 0.1.0
status: draft
created: 2026-05-15
updated: 2026-05-15
owner: nick
source_docs:
  - .claude/skills/html-capsules/SKILL.md
  - .claude/skills/html-capsules/docs/emission-triggers.md
  - .claude/plans/html_capsules_agentic_os_bundle/HTML_Capsules_and_Agentic_Run_Cards_Spec.md
related_skills:
  - dev-execution
  - planning
  - artifact-tracking
affects_commands:
  - /capsule:emit
  - /capsule:render
  - /capsule:validate
---

# html-capsules Skill SPEC

## 1. Purpose & Scope

The `html-capsules` skill transforms canonical Markdown, YAML, and JSON artifacts into self-contained, interactive HTML pages (capsules) that make agentic work visible, reviewable, and portable.

Capsules are the rendered artifact layer for Agentic OS work — they turn planning boards, agent run logs, and skill documentation into navigable, visual pages while keeping canonical sources (Markdown, JSON, git history) as the persistent record.

**In-scope capabilities:**
- Template-based HTML rendering from manifest + source content
- Safe-HTML policy enforcement (no external scripts, CSP headers, sanitization)
- Six capsule types: Run Card, Planning Capsule, SkillCard, Decision Card, Research Capsule, GTM Brief
- CLI interface for local generation, validation, and writeback export
- Workflow integration hooks for phase completion and planning events
- Cross-project portability via SkillMeat bundle deployment

**Explicitly out-of-scope (v1):**
- Backend storage or portal route (local static files only)
- Direct/authenticated writeback application (human copy-paste only; see DEFERRED-002)
- Multi-user realtime collaboration (DEFERRED-003)
- Framework-backed rendering — vanilla JS only (DEFERRED-004; see caveat in Decisions Block)
- Non-HTML outputs (PDF, slides, etc.)
- Per-capsule retention policies (DEFERRED-008)

---

## 2. Capability Coverage

This table maps agent intents to the workflow/file that handles them and the canonical doc for authoritative detail.

| Intent | Workflow / Section | Canonical Doc |
|--------|-------------------|---------------|
| Render HTML from a manifest + source | `lib/capsule_renderer.py` → `render` CLI command | `.claude/skills/html-capsules/SKILL.md` §"CLI Reference — render" |
| Capture an agent run as a Run Card | `lib/emitter.py` + `cli/capture_run.py` → `capture-run` command | `.claude/skills/html-capsules/docs/emission-triggers.md` §"Phase Completion Trigger" |
| Emit a Planning Capsule from PRD/plan | `lib/emitter.py` + `cli/emit_planning.py` → `emit-planning` command | `.claude/skills/html-capsules/docs/emission-triggers.md` §"Planning Artifact Trigger" |
| Validate a manifest and rendered HTML | `cli/validate.py` → `validate` command | `.claude/skills/html-capsules/SKILL.md` §"CLI Reference — validate" |
| Export writeback bundle to MeatyWiki/CCDash/SkillMeat/IntentTree | `cli/export_writeback.py` → `export-writeback` command | `.claude/skills/html-capsules/SKILL.md` §"CLI Reference — export-writeback" |
| Understand safe-HTML policy and CSP rules | `lib/safe_html.py` + docstrings | `.claude/plans/html_capsules_agentic_os_bundle/HTML_Capsules_and_Agentic_Run_Cards_Spec.md` §18 |
| Learn when capsules are automatically emitted | (none — manual opt-in v1) | `.claude/skills/html-capsules/docs/emission-triggers.md` §"Permitted Triggers" & §"Forbidden Triggers" |
| Build a custom template extending the base | `templates/_base.html.j2` + template examples | `.claude/skills/html-capsules/SKILL.md` §"Extending Templates" |

---

## 3. Invariants & Constraints

1. **No external resource loads.** Every capsule is self-contained. No `<script src="...">`, `<link href="http://...">`, or remote image fetches. All CSS and JS are inlined or use `data:` URIs. Enforced by `lib/safe_html.py` sanitizer.

2. **Vanilla JavaScript only, ≤10KB per capsule.** No framework dependencies (no React, Vue, Svelte, etc. in v1). Inlined code for tabs, accordions, copy buttons, localStorage persistence. Future framework adoption allowed per-template post-portal, with explicit rationale recorded in template SPEC.md (per Decisions Block §1, OQ-4 caveat).

3. **Manifest schema is versioned.** Current version: `schema_version: 0.1`. Breaking changes (required field additions/removals, new capsule_type enums) require version bump to `0.2` and migration logic in renderer. Additive optional fields do NOT bump version.

4. **Capsules follow their source artifact's git lifecycle.** No separate retention or archival policy. `.gitignore` may exclude ephemeral local capsules (`*.capsule.local.html`). Canonical source paths are recorded in manifest.

5. **Emission is gated by environment flag.** `SKILLMEAT_CAPSULES_ENABLED=1` controls all automatic generation. Default is off in propagated bundles; on in SkillMeat itself for dogfooding. Dry-run mode (`CAPSULES_DRY_RUN=1`) available always.

6. **Writeback is human-approved only (v1).** Capsules export `writeback.bundle.json` and copy-paste snippets. No agent auto-apply. Direct writeback (DEFERRED-002) becomes possible post-portal with audit trail and per-target permissions.

---

## 4. Enhancement Backlog

- **[BL-1] Framework-backed templates (SvelteKit, Astro, Next.js)** — Vanilla JS suffices for MVP. Allow opt-in per-template in v2+ if a specific capsule type's UX cannot reasonably be built in vanilla JS (interactive timelines, rich diff viewers, evidence graphs) OR post-portal era allows hosted runtime.
  _Status_: deferred (DEFERRED-004)
  _Rationale_: Self-containment is non-negotiable for cross-project portability in v1. Constraint relaxes post-portal or per-template with explicit rationale.

- **[BL-2] MeatyWiki Portal integration** — Portal route for capsule gallery, authenticated rendering, metadata indexing.
  _Status_: deferred (DEFERRED-001)
  _Rationale_: Requires portal backend and auth layer. v1 is local-only. Portal becomes natural next capability once storage/permissions exist.

- **[BL-3] Authenticated writeback application** — Direct API endpoints (`POST /writebacks/apply`) with audit trail. CCDash hook or native SkillMeat writeback endpoint.
  _Status_: deferred (DEFERRED-002, DEFERRED-007)
  _Rationale_: Blocked on portal/backend existence (DEFERRED-001). Post-portal, becomes first-class capability compressing candidate→review→promote round-trip.

- **[BL-4] Per-capsule retention & governance** — Lifecycle policies, multi-tenant storage, archival rules.
  _Status_: deferred (DEFERRED-008)
  _Rationale_: Personal-use-only in v1. Multi-tenant governance is post-portal scope.

- **[BL-5] Capsule index and linking** — Central registry of all capsules; capsule-to-capsule cross-references; related capsule discovery.
  _Status_: candidate
  _Rationale_: May emerge from 2-week trial usage. Assess after Phase 5 dogfooding completes.

- **[BL-6] PDF/slide export from capsules** — Non-HTML output formats.
  _Status_: will-not-fix
  _Rationale_: Out of scope for v1. Markdown/HTML remain primary formats.

---

## 5. Changelog

### v0.1.0 — 2026-05-15
- Initial SPEC.md authored (Phase 5 task P5-T02)
- Capability coverage matrix: 7 intents across 6 workflows (render, capture-run, emit-planning, validate, export-writeback, safe-HTML, emission triggers)
- 6 invariants covering schema versioning, safe HTML, emissions gating, git lifecycle, vanilla JS, and writeback approval
- 6 backlog items: frameworks (deferred), portal (deferred), writeback auth (deferred), retention (deferred), indexing (candidate), PDF (will-not-fix)
- Status: draft pending Phase 4 completion and Phase 5 smoke test validation

---

## 6. Integration Points

| Agent / Command | Invocation | Notes |
|-----------------|-----------|-------|
| `dev-execution` skill | Loads `html-capsules` on phase completion; calls `emit-run-card` CLI | Phase 4 integration; gated by `SKILLMEAT_CAPSULES_ENABLED=1` |
| `planning` skill | Emits Planning Capsule on PRD/Implementation Plan creation | Phase 4 integration; gated by `SKILLMEAT_CAPSULES_ENABLED=1` |
| `/capsule:emit` slash command | Manual trigger for one-off capsule generation | Phase 3; always available (no flag needed) |
| `/capsule:render` slash command | Low-level render from manifest + source | Phase 3; always available |
| `/capsule:validate` slash command | Dry-run validation without file output | Phase 3; always available |
| Local CLI (manual): `meaty-capsule` | Standalone script invocation outside agent context | Phase 3; for human use and CI/CD pipelines |

**Skill dependencies:**
- `jinja2`, `pyyaml`, `markdown`, `bleach` (Python stdlib for v0.1; future versions may add more rendering backends)
- No hard dependency on other SkillMeat skills at runtime; Phase 4 integration is loose coupling via subprocess calls

---

## 7. Success Signals

1. **Capsule renders from manifest without external URL leakage.** Validate: `grep -rn "http\|https" *.html` returns zero matches for remote URLs (data: URIs and local paths OK).

2. **Safe-HTML policy enforced by default.** Every capsule includes a CSP header from `lib/safe_html.py`; no agent can bypass without explicit re-implementation.

3. **Cross-project portability verified.** Phase 5 smoke test: install into fresh project directory, emit one Planning Capsule end-to-end, verify it renders and validates.

4. **CLI surface is discoverable and self-documenting.** `meaty-capsule --help` and `meaty-capsule <subcommand> --help` cover all flags; examples are copy-paste ready.

5. **Workflow integration does not break existing agent flows.** Karen audit (Phase 4, task P4-T08) confirms no capsule emitted on micro-actions (Bash calls, tool uses); only on explicit triggers listed in `emission-triggers.md`.

6. **Writeback bundles are valid JSON and agent-ingestable.** Export-writeback produces schema-compliant bundles with all five targets (meatywiki, ccdash, skillmeat, intenttree, control_plane) present; bundles can be applied by human copy-paste or (post-portal) by API.

7. **Templates are reusable without framework coupling.** Vanilla JS for tabs/accordions/copy is <5KB; each template's manifest-specific data binding is clean; base template degrades gracefully on missing fields.

---

## 8. Files & Directory Structure

```
.claude/skills/html-capsules/
├── SKILL.md                          # Quick reference and cheatsheet (routing doc)
├── SPEC.md                           # This file (capability contract)
├── pyproject.toml                    # Package metadata + entry points
├── requirements-capsules.txt         # Python dependencies (jinja2, pyyaml, markdown, bleach)
│
├── lib/
│   ├── __init__.py
│   ├── capsule_renderer.py           # Core CapsuleRenderer class
│   ├── safe_html.py                  # CSP header + sanitizer helpers + allowed-tags policy
│   ├── emitter.py                    # CapsuleEmitter service for workflow integration
│   ├── capsule_index.py              # .claude/capsules/index.yaml discovery + append logic
│   └── planning_hook.py              # Workflow hook for planning artifact triggers
│
├── cli/
│   ├── __init__.py
│   ├── __main__.py                   # Entry point; orchestrates subcommands
│   ├── render.py                     # meaty-capsule render subcommand
│   ├── capture_run.py                # meaty-capsule capture-run subcommand
│   ├── emit_planning.py              # meaty-capsule emit-planning subcommand
│   ├── validate.py                   # meaty-capsule validate subcommand
│   └── export_writeback.py           # meaty-capsule export-writeback subcommand
│
├── templates/
│   ├── _base.html.j2                 # Base layout (header, manifest sidebar, writeback panel)
│   ├── run-card.html.j2              # Agentic Run Card template
│   ├── planning-capsule.html.j2      # Planning Capsule (editable board + OQ triage)
│   ├── skill-card.html.j2            # SkillCard (SkillBOM view)
│   ├── decision-card.html.j2         # Decision Card (ADR-style)
│   ├── research-capsule.html.j2      # Research Capsule (source synthesis)
│   └── gtm-brief.html.j2             # GTM Brief (exec narrative)
│
├── schemas/
│   ├── capsule-manifest.schema.json  # Manifest schema v0.1
│   └── writeback-bundle.schema.json  # Writeback bundle schema v0.1
│
├── docs/
│   ├── emission-triggers.md          # Spec of permitted/forbidden emission triggers + env flags
│   └── deferred-design-stubs.md      # Design problem statements for DEFERRED-001 through DEFERRED-008
│
├── tests/
│   ├── __init__.py
│   ├── test_capsule_renderer.py      # Unit tests for renderer + schema validation
│   ├── test_safe_html.py             # Safe-HTML policy enforcement
│   ├── test_cli_render.py            # CLI subcommand tests
│   ├── test_cli_validate.py
│   ├── test_workflow_integration.py  # Phase-completion + planning trigger tests
│   ├── test_cross_project_smoke.sh   # Phase 5 smoke test script
│   └── fixtures/
│       ├── run-card.yaml             # Fixture manifests (1 per capsule type)
│       ├── planning-capsule.yaml
│       ├── skill-card.yaml
│       ├── decision-card.yaml
│       ├── research-capsule.yaml
│       └── gtm-brief.yaml
│
└── scripts/
    └── capsule.py                    # Thin wrapper for standalone CLI invocation

# Cross-project deployment targets:
.claude/commands/
├── capsule-emit.cmd.yaml
├── capsule-render.cmd.yaml
└── capsule-validate.cmd.yaml
```

---

## 9. Known Failure Modes & Troubleshooting

| Failure Mode | Root Cause | Recovery |
|--------------|-----------|----------|
| "schema_version mismatch" error | Manifest uses future schema version (e.g., `0.2`) but renderer only knows `0.1` | Upgrade skill or downgrade manifest to `0.1` |
| "unknown capsule_type" | Template file missing or misspelled type in manifest | Check `templates/` dir; confirm manifest `capsule_type` matches a `.html.j2` file |
| Capsule renders but contains external URL in `<script>` | Safe-HTML sanitizer was bypassed or template has bug | Audit template for hardcoded `src=` attributes; run `grep -n 'src\|href' template.html.j2` |
| Writeback bundle invalid JSON | Emitter crashed mid-write or manifest missing required field | Check `.claude/capsules/errors.log`; re-run `validate` on source manifest |
| `SKILLMEAT_CAPSULES_ENABLED` flag not respected | Flag not exported to subprocess or not checked before emission | Confirm flag is in environment when calling CLI; check `emitter.py` for guard logic |
| Capsule renders but timestamp/datetime fields show "NaN" | Manifest datetime not ISO 8601 format | Use `created_at: 2026-05-15T14:30:00Z` format; YAML/JSON date parsing is strict |
| Cross-project capsule render fails with "template not found" | Paths in script are absolute to original project | Use `Path(__file__).parent` to make paths relative to script location; test with `cd` into scratch dir |

---

## 10. Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SKILLMEAT_CAPSULES_ENABLED` | unset | Gate all automatic capsule emission (Phase 4 integration). Set to `1` to enable; unset means no auto-emit. |
| `CAPSULES_DRY_RUN` | unset | Enable dry-run mode: log what would be emitted without writing files. Set to `1` to activate. |
| `SKILLMEAT_CAPSULES_DIR` | `.claude/capsules/` | Override default capsule output directory. Rarely used; for testing. |

---

## 11. Schema Locations

- **Manifest schema**: `.claude/skills/html-capsules/schemas/capsule-manifest.schema.json` (v0.1)
- **Writeback bundle schema**: `.claude/skills/html-capsules/schemas/writeback-bundle.schema.json` (v0.1)
- **Manifest example**: `.claude/plans/html_capsules_agentic_os_bundle/html_capsules_capsule_manifest.yaml`
- **Writeback bundle example**: Emitted by `export-writeback` CLI command

---

## 12. CLI Quick Reference

All commands assume `meaty-capsule` is installed (either via `pip install -e .` in skill dir or via SkillMeat bundle).

**`meaty-capsule render`**
```bash
meaty-capsule render --type <type> --source <md-path> --manifest <yaml-path> --out <output-dir>
# Example:
meaty-capsule render --type planning-capsule --source plan.md --manifest plan.yaml --out ./capsules/
```

**`meaty-capsule capture-run`**
```bash
meaty-capsule capture-run --tool <agent> --intent <intent-id> --task <task-id> --template <type>
# Example:
meaty-capsule capture-run --tool claude-code --intent init_html_capsules --task phase_1 --template run-card
```

**`meaty-capsule emit-planning`**
```bash
meaty-capsule emit-planning --plan <path-to-prd-or-plan-yaml> [--out <dir>]
# Example:
meaty-capsule emit-planning --plan implementation-plan.md --out .claude/capsules/
```

**`meaty-capsule validate`**
```bash
meaty-capsule validate --manifest <yaml-path> [--html <path>]
# Exits 0 if valid, non-zero if invalid; prints diagnostics to stderr.
```

**`meaty-capsule export-writeback`**
```bash
meaty-capsule export-writeback <capsule-index.html-or-dir> --target <target> [--out <file>]
# Targets: meatywiki, ccdash, skillmeat, intenttree, control_plane
# Example:
meaty-capsule export-writeback .claude/capsules/planning-capsule-2026-05-15/ --target skillmeat --out writeback.json
```

---

## 13. Deferred Items with Caveats

See `.claude/skills/html-capsules/docs/deferred-design-stubs.md` for design problem statements for:

- **DEFERRED-001**: MeatyWiki Portal route (blocks DEFERRED-002, DEFERRED-004, DEFERRED-007)
- **DEFERRED-002**: Authenticated writeback API + direct application (caveat from Decisions Block, OQ-3)
- **DEFERRED-003**: Multi-user realtime collaboration
- **DEFERRED-004**: UI runtime / framework adoption per-template (caveat from Decisions Block, OQ-4)
- **DEFERRED-005**: CCDash execution event schema extension
- **DEFERRED-006**: IntentTree node update automation
- **DEFERRED-007**: Automated writeback applier (caveat from Decisions Block, OQ-3)
- **DEFERRED-008**: Per-capsule retention policy enforcement

Each stub includes the blocking dependency and the OQ caveat (where applicable) so future planning sessions can promote items to tracked initiatives.

---

**Next Action:** Phase 5 task P5-T02 complete. Proceed to P5-T03 (author SKILL.md), then P5-T04 (cross-project smoke test), then final validator gate (P5-T07).
