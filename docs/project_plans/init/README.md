# BoxBrain v2 Final Product & Implementation Pack

**Prepared for:** Nick Miethe  
**Prepared on:** 2026-05-02  
**Product:** BoxBrain v2  
**Package status:** Final planning pack for initial implementation  

This package converts the canonical BoxBrain v2 specification into a build-ready PRD, implementation plan, architecture guidance, backlog, and AI-agent development kit. It intentionally does **not** include the attached original design/spec file.

## File map

| File | Purpose |
|---|---|
| `01_BoxBrain_v2_Final_PRD.md` | Final PRD: product definition, scope, personas, requirements, MVP, metrics, and product guardrails. |
| `02_Initial_Implementation_Plan.md` | Build plan: phases, sprint sequence, team shape, deliverables, acceptance gates, and first 30/60/90-day plan. |
| `03_Architecture_Data_API_Guide.md` | System architecture, ingestion/search pipelines, data model guidance, API boundaries, and NFRs. |
| `04_Product_Research_and_Design_Patterns.md` | Research synthesis from adjacent apps and recommended UX/design patterns. |
| `05_AI_Agent_Development_Playbook.md` | Practical Claude Code/Codex/GitHub Copilot workflow for building BoxBrain v2 with AI agents. |
| `06_Roadmap_Backlog.csv` | Initial backlog with epics, priorities, phases, dependencies, and acceptance criteria. |
| `07_Risks_Decisions_Open_Questions.md` | Decision log, known risks, mitigations, and open questions. |
| `08_Source_Research_Registry.md` | Source notes and reference URLs used for research. |
| `implementation_assets/initial_db_schema.sql` | Starter PostgreSQL schema for core entities and graph relationships. |
| `implementation_assets/openapi.boxbrain.v2.yaml` | Starter OpenAPI contract for the MVP API surface. |
| `implementation_assets/docker-compose.local.yml` | Local dev services: PostgreSQL + pgvector, Redis, MinIO, and optional OpenSearch. |
| `implementation_assets/.env.example` | Local environment variable template. |
| `implementation_assets/seed_data_plan.md` | Seed/demo-data plan for early development and UI testing. |
| `agent_setup_templates/AGENTS.md` | Codex/GitHub Copilot agent instructions template for the future repo. |
| `agent_setup_templates/CLAUDE.md` | Claude Code instructions template for the future repo. |
| `agent_setup_templates/prompts/initial_agent_task_cards.md` | Ready-to-use task prompts for AI coding agents. |
| `agent_setup_templates/skills/*/SKILL.md` | Example repo-scoped agent skills for repeated workflows. |

## Recommended use

1. Start with `01_BoxBrain_v2_Final_PRD.md` and confirm scope boundaries.
2. Use `02_Initial_Implementation_Plan.md` to sequence the first engineering milestones.
3. Copy `agent_setup_templates/AGENTS.md` and `agent_setup_templates/CLAUDE.md` into the root of the implementation repository, then prune or update as the repo becomes real.
4. Use `implementation_assets/initial_db_schema.sql` and `openapi.boxbrain.v2.yaml` as starter contracts, not as immutable production definitions.
5. Drive agentic development from `06_Roadmap_Backlog.csv` and the task-card prompts.

## Key packaging note

The existing Claude Design single-HTML UI should be treated as a **visual and interaction reference**, not production code. The implementation plan assumes a full reimplementation using typed components, a design-token layer, accessible UI primitives, and API-backed state.
