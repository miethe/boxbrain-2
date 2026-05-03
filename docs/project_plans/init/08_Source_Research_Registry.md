# BoxBrain v2 Source Research Registry

**Prepared on:** 2026-05-02  
**Purpose:** Working source registry for external research used in the final PRD and implementation pack. URLs are included for human follow-up.

---

## 1. Core source basis

- User-provided canonical BoxBrain v2 specification, dated 2026-04-23.
- Available stored personal/project context: agentic SDLC patterns, DevSecOps/provenance themes, hybrid cloud automation, AI-agent coding workflow preferences. No additional detailed BoxBrain-specific artifacts were found beyond the current uploaded spec and the user’s description of the recent redesign.

---

## 2. Enterprise content, sales enablement, and governed content references

### Highspot — sales content management and governance

URL: https://www.highspot.com/product/sales-content-management-system/

Observed patterns:

- Centralized governed content platform.
- AI-assisted search and answers.
- Seller personalization and scenario-aware content.
- Content sync from existing repositories.

BoxBrain implications:

- Borrow governed-content and contextual recommendation patterns.
- Differentiate through atomic slide units, family/variant/version, and Storyboard composition.

### Seismic — sales content management and library

URL: https://www.seismic.com/platform/sales-content-management/

Observed patterns:

- Centralized, AI-powered sales content management.
- Version control, governance, brand compliance.
- Role-based permissions, audit trails, approved latest versions.
- Recommendations based on deal stage/persona/product.
- Buyer engagement insights.

BoxBrain implications:

- Trust, permissions, and latest-approved content should be visible and operational.
- Analytics and content-performance metrics can be later roadmap items.

### Showpad — analytics and insights

URL: https://www.showpad.com/use-cases/analytics

Observed patterns:

- Content analytics down to pages/topics.
- Seller/content engagement patterns.
- Insights used to refine content creation and sales guidance.

BoxBrain implications:

- Track reuse, search clicks, add-to-storyboard, and where-used early.
- Later, add artifact/share engagement if publishing/sharing is implemented.

### Guru — governed knowledge layer and verification

URLs:

- https://www.getguru.com/
- https://help.getguru.com/docs/what-is-verifcation

Observed patterns:

- Governed knowledge for enterprise AI.
- Verification status visible and filterable.
- Manual verification for high-stakes content.
- Automated verification for scale, with transparency and override.
- Quality log and expert routing.

BoxBrain implications:

- Approval/freshness/trust should be visible in search, cards, details, and Storyboard slots.
- Review queues and audit logs are foundational, not admin extras.

---

## 3. Presentation, brand, and authoring references

### Pitch — presentation collaboration, templates, analytics

URL: https://pitch.com/

Observed patterns:

- AI presentation platform.
- Templates, custom team templates, brand assets.
- Collaboration on slides.
- Sharing/pitch rooms and analytics.
- Slide statuses and assignees.

BoxBrain implications:

- BoxBrain should complement presentation authoring tools by governing reusable source content and storyboards.
- Avoid attempting full native authoring in MVP.

### Canva Brand Kit — brand assets and guidelines

URL: https://www.canva.com/pro/brand-kit/

Observed patterns:

- Brand fonts, logos, colors, icons, imagery, templates.
- Contextual brand guidelines inside editor.
- Multi-brand management and asset replacement.

BoxBrain implications:

- Brand/trust metadata and guidelines can become part of notes and packaging validation.
- MVP should surface brand-related trust flags, not full editor features.

### Microsoft Copilot in PowerPoint — create presentations from files

URL: https://support.microsoft.com/en-us/office/prepare-your-presentation-with-microsoft-365-copilot-7f06429e-c0c2-4819-8119-b519ad599796

Observed patterns:

- AI can create a draft presentation from a file.
- Users are still expected to review/edit for facts, tone, and completeness.

BoxBrain implications:

- BoxBrain should not position as “AI makes slides” only.
- The stronger value is trusted retrieval, provenance, and governed composition before/after draft generation.

---

## 4. Structured and composable content references

### Contentful content models

URLs:

- https://www.contentful.com/help/content-models/
- https://www.contentful.com/products/platform/structured-content-models/

Observed patterns:

- Content models define structure and organization.
- Linked content types and reference fields enable reuse.
- Structured content supports consistency, reusability, governance, and AI workflows.
- Visual modelers align marketing/design/development around content architecture.

BoxBrain implications:

- Family/variant/version and ContentBlock models are product-level content-modeling decisions.
- Visual model clarity matters for curators and builders, not only developers.

### Sanity headless CMS guide

URL: https://www.sanity.io/headless-cms

Observed patterns:

- Separation of content storage from presentation.
- Structured data models support reuse/remixing across channels.
- APIs support efficient querying/filtering.

BoxBrain implications:

- Separate reusable content identity from deck presentation.
- Preserve source decks but make units/blocks composable across outputs.

---

## 5. AI-agent development references

### Anthropic Claude Code best practices

URL: https://code.claude.com/docs/en/best-practices

Observed patterns:

- Claude Code can read files, run commands, make changes, and work agentically.
- Context window management is critical.
- Explore first, then plan, then code for non-trivial changes.
- Use CLAUDE.md for concise persistent context.
- Use permissions, CLI tools, MCP, hooks, and parallel sessions/worktrees.
- Use verification criteria, tests, linters, and visual checks.

BoxBrain implications:

- Use CLAUDE.md, not giant pasted specs.
- Build with explicit task cards, acceptance criteria, and testing commands.
- Use writer/reviewer and test-first agent workflows.

### OpenAI Codex best practices

URL: https://developers.openai.com/codex/learn/best-practices

Observed patterns:

- Codex works best as a configured teammate.
- Use AGENTS.md for durable guidance.
- Configure environment, MCP, skills, and automations.
- Use tests, lint, type checks, and diff review.
- Choose reasoning level by task complexity.

BoxBrain implications:

- Add AGENTS.md at repo root.
- Keep exact commands and DoD visible.
- Use MCP selectively and avoid tool bloat.

### OpenAI Codex AGENTS.md guide

URL: https://developers.openai.com/codex/guides/agents-md

Observed patterns:

- Codex reads AGENTS.md files before work.
- Global and project-specific instructions can be layered.
- More specific instructions closer to current directory override earlier ones.
- Default project-doc max size exists, so instructions must stay compact.

BoxBrain implications:

- Use root AGENTS.md plus module-local instructions only where truly needed.
- Use a compressed docs index instead of full docs.

### OpenAI Codex skills

URL: https://developers.openai.com/codex/skills

Observed patterns:

- Skills package task-specific instructions, references, and optional scripts.
- Skills use progressive disclosure and are loaded when selected.
- Skills are useful for repeated workflows.

BoxBrain implications:

- Use skills for slide ingestion, hybrid search, and frontend UI state patterns.
- Do not rely on skills for always-required invariants.

### OpenAI Codex subagents

URL: https://developers.openai.com/codex/subagents

Observed patterns:

- Codex can orchestrate subagents when explicitly asked.
- Useful for parallel review dimensions such as security, bugs, quality, maintainability, tests.
- Subagents inherit sandbox policy and use more tokens.

BoxBrain implications:

- Use subagents for PR review and high-risk cross-cutting audits.
- Do not spawn multi-agent swarms for every small task.

### GitHub Copilot best practices and cloud-agent task guidance

URLs:

- https://docs.github.com/en/copilot/get-started/best-practices
- https://docs.github.com/en/copilot/tutorials/cloud-agent/get-the-best-results

Observed patterns:

- Copilot works best with clear prompts, human review, and scoped tasks.
- Cloud agent tasks should have clear descriptions, acceptance criteria, and file guidance.
- Iterative branch work before PR can improve outcomes.
- Custom instructions and MCP can improve context.

BoxBrain implications:

- Backlog tasks should be prompt-ready.
- Use issue/task cards as agent prompts.
- Always review diffs before merge.

### Vercel AGENTS.md and agent-skills findings

URLs:

- https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- https://vercel.com/blog/introducing-react-best-practices
- https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk
- https://ai-sdk.dev/docs/agents/workflows

Observed patterns:

- Persistent AGENTS.md docs index can outperform skill-triggered retrieval in some framework evals.
- Skills can still be useful for action-specific workflows.
- React best practices can be packaged as agent skills.
- Agent workflows should start simple and add complexity through clear steps, tools, feedback loops, and multiple agents only when needed.

BoxBrain implications:

- Put critical domain invariants and docs index in AGENTS.md/CLAUDE.md.
- Use skills for workflows, not core invariants.
- Prefer simple deterministic flows with feedback loops over overly autonomous systems.

---

## 6. Technical platform references

### pgvector

URL: https://github.com/pgvector/pgvector

Observed patterns:

- Supports vector similarity search in Postgres.
- HNSW and IVFFlat indexes have different tradeoffs.

BoxBrain implications:

- Good initial vector search layer.
- Track embedding model/version and tune indexes as corpus grows.

### PostgreSQL full-text search

URLs:

- https://www.postgresql.org/docs/current/textsearch-controls.html
- https://www.postgresql.org/docs/current/datatype-textsearch.html

Observed patterns:

- PostgreSQL supports `tsvector`, `tsquery`, relevance ranking, and text search types.

BoxBrain implications:

- Strong enough for MVP lexical retrieval.
- External search can wait until needs justify it.

### FastAPI background tasks

URL: https://fastapi.tiangolo.com/tutorial/background-tasks/

Observed patterns:

- BackgroundTasks can run after a response is sent and integrate with dependency injection.

BoxBrain implications:

- Useful for simple async work, but ingestion/rendering should likely use a more durable queue/worker model for retries and long-running jobs.

### Next.js App Router/data fetching

URLs:

- https://nextjs.org/docs/app
- https://nextjs.org/docs/app/getting-started/fetching-data

Observed patterns:

- App Router supports server/client components and server-side data fetching.
- Server Components can keep expensive data fetches and logic server-side.

BoxBrain implications:

- Use server components for shell/list/detail data where practical.
- Use client components for interactive Storyboard, filters, drag/drop, comments, and compare panels.

