# BoxBrain v2 AI-Agent Development Playbook

**Prepared on:** 2026-05-02  
**Purpose:** Practical guide for building BoxBrain v2 with Claude Code, Codex, GitHub Copilot, and related agentic tools.  

---

## 1. Core principle

Treat AI coding agents as configurable teammates, not one-off prompt boxes. BoxBrain v2 has a complex domain model, so implementation quality will depend on durable context, clear task boundaries, acceptance criteria, tests, and review loops.

The safest high-velocity pattern is:

```text
Explore -> Plan -> Implement -> Test -> Review -> Commit -> Update instructions
```

For small edits, skip formal planning. For multi-file changes, data-model work, API changes, ingestion logic, Storyboard logic, or search/ranking changes, require exploration and a written plan before code changes.

---

## 2. Recommended agent stack

| Agent/tool | Best use in BoxBrain v2 |
|---|---|
| Claude Code | Primary local coding agent for repo exploration, implementation, refactoring, tests, multi-file tasks. |
| Codex CLI / Codex app | Parallel implementation tasks, repo-wide reasoning, PR/task execution, code review, test generation. |
| GitHub Copilot inline/chat | Fast autocomplete, small local edits, test snippets, quick explanations. |
| Gemini/Jules/other research models | External research, alternative implementation approaches, planning packs, design critique. |
| Vercel/v0/Claude Design outputs | UI inspiration and component inventory, not production source of truth. |

---

## 3. Repository instruction files

### 3.1 Use both AGENTS.md and CLAUDE.md

- `AGENTS.md` supports Codex and other agents that load project instructions.
- `CLAUDE.md` supports Claude Code’s project context.
- Keep them short, operational, and version-controlled.
- Do not paste the full PRD into either file.
- Include a compressed docs index pointing to detailed docs.
- Include commands, architectural invariants, testing requirements, and do-not-break rules.

### 3.2 What belongs in persistent agent instructions

Include:

- project purpose in one paragraph;
- core domain invariants;
- folder map;
- build/test/lint commands;
- migration rules;
- API contract rules;
- permission/audit/provenance requirements;
- Definition of Done;
- links/paths to deeper docs.

Exclude:

- long tutorials;
- changing backlog details;
- full API docs;
- full PRD text;
- obvious coding advice;
- large design descriptions;
- anything likely to become stale every sprint.

### 3.3 Suggested root docs index

```md
[BoxBrain Docs Index]
|root: ./docs
|product:{01_BoxBrain_v2_Final_PRD.md,04_Product_Research_and_Design_Patterns.md}
|implementation:{02_Initial_Implementation_Plan.md,03_Architecture_Data_API_Guide.md,07_Risks_Decisions_Open_Questions.md}
|contracts:{implementation_assets/openapi.boxbrain.v2.yaml,implementation_assets/initial_db_schema.sql}
|agent:{05_AI_Agent_Development_Playbook.md,agent_setup_templates/prompts/initial_agent_task_cards.md}
|IMPORTANT: Prefer repo docs and contracts over model memory. Read only the relevant doc before changing code.
```

---

## 4. Agent-safe software architecture

AI agents perform better when architecture is explicit and verifiable.

### 4.1 Make contracts visible

- Maintain OpenAPI spec.
- Generate TypeScript client types from API when practical.
- Maintain SQL migrations and typed ORM models.
- Keep Pydantic schemas close to routes.
- Maintain API fixtures.
- Add Storybook/Ladle states for UI components.

### 4.2 Keep domain invariants in tests

Examples:

- A ContentUnit cannot contain multiple source slides.
- Variant cannot be treated as Similarity.
- Version must belong to one variant.
- Governance actions create audit events.
- AI suggestions do not set canonical without review.
- Unauthorized content is not returned by search.
- Storyboard snapshots preserve slot order and selected object IDs.

### 4.3 Use small explicit command endpoints

Agents can easily create accidental state bugs when mutation semantics are vague. Prefer command endpoints for high-consequence actions:

- `mark-variant`
- `mark-similar`
- `merge-versions`
- `set-canonical`
- `approve`
- `deprecate`
- `snapshot`

Each command should validate permissions, execute a transaction, and write audit events.

---

## 5. Agent workflow patterns

### 5.1 Writer/reviewer pattern

Use separate agent sessions or worktrees:

1. Writer implements feature.
2. Reviewer starts from fresh context and reviews diff.
3. Writer fixes review feedback.
4. Human reviews final diff.

Best for:

- schema changes;
- ingestion pipeline;
- permissions;
- search ranking;
- Storyboard state.

### 5.2 Test-first or test-partner pattern

Use one agent to write failing tests from acceptance criteria, then another agent to implement.

Best for:

- domain invariants;
- API contracts;
- review actions;
- search ranking heuristics;
- Storyboard snapshot behavior.

### 5.3 Parallel worktree pattern

Run independent work in separate git worktrees:

- Worktree A: frontend Library.
- Worktree B: backend ingestion APIs.
- Worktree C: search/ranking.
- Worktree D: tests/fixtures/docs.

Merge only after contract review.

### 5.4 Spike-to-contract pattern

For risky areas like PPTX rendering:

1. Agent researches and builds a small spike.
2. Human evaluates output quality.
3. Convert successful approach into clear service contract.
4. Delete spike code or isolate it.
5. Build production version.

### 5.5 Docs-before-code for domain-heavy features

Before data model or governance changes, ask the agent to update a short architecture note or ADR first. This prevents hidden drift in the model.

---

## 6. Task prompt template

Use this for agent tasks:

```md
## Task
[One-sentence outcome]

## Context
Read these first:
- [specific file]
- [specific API/schema/component]

## Constraints
- Do not change [files/behavior].
- Preserve domain invariants: [list].
- Use existing patterns from [file/component].

## Acceptance criteria
- [criterion 1]
- [criterion 2]
- [criterion 3]

## Verification
Run:
- [command]
- [test]

## Deliverable
- Working code plus summary of changed files, tests run, and any follow-up risks.
```

---

## 7. Initial agent task sequence

### Task 1 — Repo setup

Ask agent to scaffold frontend/backend only after confirming folder layout and commands. Keep generated code minimal.

### Task 2 — Core schema and migrations

Ask for schema migration plus tests for family/variant/version invariants.

### Task 3 — Upload/job API

Ask for upload endpoint, stored object record, ingestion job record, and job status endpoint.

### Task 4 — Ingestion renderer spike

Ask for a spike that renders sample PPTX/PDF to thumbnails and extracts text. Evaluate output before integrating.

### Task 5 — WorkProduct and ContentUnit detail APIs

Ask for API endpoints and basic UI views using seeded data first.

### Task 6 — Library cards

Ask for family-first cards, expansion, filters, loading/empty/error states.

### Task 7 — Search MVP

Ask for full-text search first, then embeddings, then hybrid scoring.

### Task 8 — Review queue

Ask for duplicate/variant candidate queue with compare panel.

### Task 9 — Storyboard core

Ask for sections/slots/snapshots, starting from deterministic seeded content.

---

## 8. Suggested custom skills

Use skills for repeated workflows, not broad always-on context.

### 8.1 Slide ingest skill

Trigger when working on upload, rendering, extraction, or ingestion jobs.

Includes:

- stage sequence;
- idempotency requirements;
- artifact storage rules;
- failure/retry rules;
- fixture expectations.

### 8.2 Hybrid search skill

Trigger when working on search ranking, embeddings, query parsing, or evals.

Includes:

- scoring components;
- ranking profiles;
- eval set rules;
- permission filtering reminders.

### 8.3 Frontend UI skill

Trigger when building cards, detail pages, Storyboard, or Reviews Hub.

Includes:

- component patterns;
- accessibility checks;
- status-chip rules;
- loading/error/empty state requirements;
- visual regression/screenshot expectations.

---

## 9. Verification commands to establish early

Exact commands will depend on repo implementation, but establish a stable set early:

```bash
# frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e

# backend
ruff check .
pytest
mypy app
alembic upgrade head

# contracts
pnpm openapi:check
pnpm types:generate

# all
pnpm verify
```

Agents should be told which subset to run based on the task. Avoid running the entire suite for every small change if it is slow; use targeted tests plus full verification before merge.

---

## 10. AI-agent quality gates

### For every agent-generated PR

- Human reviews diff.
- Agent summary includes changed files and tests run.
- No unexplained dependency additions.
- No secrets or environment values committed.
- API/schema changes documented.
- Migrations are reversible where practical.
- Permissions/audit/provenance considered.
- UI change includes at least screenshot or Storybook state for complex surfaces.

### Red flags

- Agent changes broad architecture without explicit task scope.
- Agent flattens family/variant/version model.
- Agent creates generic polymorphic shortcuts that hide relationship semantics.
- Agent bypasses audit events for governance actions.
- Agent stores AI output without model/pipeline trace.
- Agent adds dependencies for simple functionality.
- Agent silently changes seed data to make tests pass.

---

## 11. Suggested multi-agent sprint model

### Sprint planning

- Human selects 5–8 well-scoped stories.
- Product owner writes acceptance criteria.
- Lead agent reviews story for missing contracts.
- Human resolves ambiguities.

### Implementation

- Assign agents to independent stories/worktrees.
- Keep backend and frontend contract work synchronized through OpenAPI.
- Use reviewer agents for high-risk diffs.

### End of sprint

- Run product demo.
- Run search evals.
- Update docs/AGENTS/CLAUDE when repeated agent mistakes occur.
- Add gotchas to `docs/engineering/gotchas.md`, not bloated root instructions.

---

## 12. How to use the Claude Design HTML reference

Give coding agents the design reference in controlled chunks:

- component screenshot or clipped section;
- intended interaction behavior;
- existing design token notes;
- acceptance criteria.

Do not ask agents to “convert this HTML into the app” wholesale. Instead ask:

- “Implement the Library family card matching this visual hierarchy using our component system.”
- “Implement the Storyboard slot card interaction, preserving these states.”
- “Create a Storybook story for approved, stale, draft, and restricted variants.”

---

## 13. Recommended agent prompts for high-risk work

### Data-model review prompt

```md
Review the current schema and migrations against BoxBrain's domain invariants.
Focus on family/variant/version separation, similarity vs variant separation, composition order, provenance, audit, and permissions.
Do not write code. Return risks, missing constraints, and recommended tests.
```

### Ingestion review prompt

```md
Review the ingestion pipeline for idempotency and retry safety.
Assume jobs can fail after rendering but before unit creation, or after unit creation but before embeddings.
Find duplicate-record risks and propose fixes.
```

### Storyboard review prompt

```md
Review Storyboard section/slot/snapshot logic.
Verify snapshot immutability, slot ordering, selected object references, comment anchoring, and rollback behavior.
Create failing tests for any discovered edge cases.
```

### Search review prompt

```md
Review hybrid search implementation.
Check permission filtering, family/variant/version grouping, score explainability, ranking-profile configuration, and zero-result behavior.
Propose an eval query set if missing.
```

---

## 14. Governance for agent-created code

- Require PR review for all agent-generated changes.
- Label agent-generated PRs or commits if useful.
- Keep tasks small enough to review.
- Prefer one conceptual change per PR.
- Use branch names tied to backlog IDs.
- Keep domain decisions in ADRs.
- Never accept “tests not run” without a reason.
- Re-run critical tests locally before merge.

---

## 15. Agent instruction evolution

When an agent repeatedly makes the same mistake:

1. Add or improve a test if the mistake is testable.
2. Add a short gotcha note if test is not enough.
3. Update AGENTS.md/CLAUDE.md only if the rule applies broadly.
4. Create a skill only if the workflow is repeated but not always relevant.
5. Remove stale instructions regularly.

