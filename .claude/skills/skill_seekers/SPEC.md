---
schema_version: 2
doc_type: skill_spec
skill_name: skill_seekers
skill_version: 2.0.0
status: stable
created: 2026-06-01
updated: 2026-06-01
owner: nick
source_docs:
  - /Users/miethe/dev/homelab/development/Skill_Seekers/README.md
  - /Users/miethe/dev/homelab/development/Skill_Seekers/configs/claude-code.json
related_skills: [skill-builder, skill-creator, claude-code]
affects_commands: [/skill_seekers]
aligned_app_version: "3.7.0"
---

<!-- Convention reference: .claude/specs/artifact-structures/skill-spec-convention.md -->

# skill_seekers — Skill Specification

> **Reading this file**: This is the versioned capability contract for the
> `skill_seekers` skill. For invocation-time routing, see `SKILL.md` in this directory.

---

## 1. Purpose & Scope

**Mission**: Agents use this skill to convert a knowledge source (documentation site,
GitHub repo, PDF, video, or local codebase) into a high-quality, progressively-disclosed
Claude Code skill, using the Skill Seekers MCP server when connected and the
`skill-seekers` CLI as a fallback.

**In scope**:
- Detecting the source type from user input and selecting the right tool/command
- Preferring `llms.txt` / `llms-full.txt` over HTML scraping when a docs site publishes them
- Enumerating a site's full page set from its sitemap and tuning config `start_urls` / excludes
- Estimating scope, scraping, enhancing, packaging, and installing skills
- Reorganizing scraped content into topic-based `references/` with a curated SKILL.md router
- Verifying scrape output before trusting it (page count, junk detection, quality score)
- Exporting skills to vector databases

**Out of scope**:
- Authoring a brand-new skill *from scratch* without a knowledge source → use `skill-creator` / `skill-builder`
- Editing the upstream Skill Seekers tool itself (lives in the `Skill_Seekers` repo, separate from this skill)
- Operating Claude Code as an end product → use the `claude-code` skill

---

## 2. Capability Coverage

| Intent | Workflow / Section | Canonical Doc |
|--------|--------------------|---------------|
| "Is the MCP server connected, or do I use the CLI?" | `workflows/cli-reference.md` § Detect | `Skill_Seekers/README.md` |
| "Build a skill from a docs site" | `SKILL.md` § Recommended Workflow + `workflows/llms-first-strategy.md` | `Skill_Seekers/README.md` |
| "The docs site has llms.txt — what's the best source?" | `workflows/llms-first-strategy.md` | — |
| "Capture ALL pages of a docs site" | `workflows/llms-first-strategy.md` §2 (sitemap) | `Skill_Seekers/configs/claude-code.json` |
| "Refresh a config's start_urls" | `workflows/cli-reference.md` (`sync-config`) | `Skill_Seekers/README.md` |
| "Estimate page count before scraping" | `workflows/cli-reference.md` (`estimate`) | `Skill_Seekers/README.md` |
| "Build a skill from a GitHub repo / PDF / video / codebase" | `SKILL.md` § Source Type Detection | `Skill_Seekers/README.md` |
| "Did the scrape actually work?" | `workflows/verify-and-package.md` §1 | — |
| "Score / package / install the skill" | `workflows/verify-and-package.md` §2–4 | `Skill_Seekers/README.md` |
| "Make the skill use progressive disclosure" | `workflows/llms-first-strategy.md` §4 | `.claude/specs/artifact-structures/skill-spec-convention.md` |
| "Export a skill to a vector DB" | `SKILL.md` § MCP Tool Catalog (`export_to_*`) | `Skill_Seekers/README.md` |

---

## 3. Invariants & Constraints

1. **Verify tooling availability first.** Never assume the Skill Seekers MCP server is
   connected; detect it and fall back to the `skill-seekers` CLI. Both wrap the same engine.
2. **Prefer published `llms.txt` / `llms-full.txt` over HTML scraping** when the docs site
   serves them (HTTP 200). They are the authoritative clean-markdown source and avoid the
   HTML scraper's failure modes on JS-rendered / marketing-wrapped sites.
3. **Never trust scrape output blind.** Before enhancing/packaging/installing, verify
   `summary.json → total_pages` is plausible and that references contain no marketing/HTML
   contamination (`DOCTYPE html`, `website-files.com`, `intellimize`, `anti-flicker`).
4. **Ship progressive disclosure, not monolithic dumps.** Reorganize scraped content into
   topic-based `references/*.md` with a small SKILL.md router; do not install the
   auto-package's `llms-full.md` / `other.md` monolith.
5. **No content is silently dropped.** When mapping pages to reference files, every page
   maps to exactly one file, with a catch-all for unmapped slugs; log any unmapped slug.
6. **Exclude overlapping sub-domains** that already own a dedicated skill (e.g. `agent-sdk`)
   via `url_patterns.exclude`, and keep them out of the generated `llms.txt`.
7. **Keep skill metadata current and consistent.** Bump `version` / `pages` / `source` /
   `updated`, and ensure the SKILL.md `name:` matches the skill directory name.

---

## 4. Enhancement Backlog

- **[BL-1] Reusable build script**: Ship a parameterized `scripts/build_from_llms.py`
  (split llms-full.txt → topic references → SKILL.md router) instead of re-authoring it
  per run.
  _Status_: candidate
  _Rationale_: The per-page split + category-map reorg is currently hand-rolled each time;
  a script would make it deterministic and faster.

- **[BL-2] llms.txt probe helper**: A tiny `scripts/probe-llms.sh` that checks
  `llms.txt`/`llms-full.txt`/sitemap and prints the kept-page count.
  _Status_: candidate
  _Rationale_: Speeds up step 2 of every docs-site run.

- **[BL-3] Auto-detect dedicated-skill overlaps**: Given a target docs site, detect
  sub-trees that already map to existing local skills and suggest excludes.
  _Status_: deferred
  _Rationale_: Needs a registry of skill→source mappings; low frequency.

- **[BL-4] Upstream HTML-scraper bug report**: File the Webflow/JS-shell mis-capture
  against the `Skill_Seekers` repo so `create <url>` degrades to llms.txt automatically.
  _Status_: planned
  _Rationale_: Fixing upstream removes the manual fallback for most modern doc sites.

---

## 5. Changelog

### v2.0.0 — 2026-06-01
- Rewrote SKILL.md from an MCP-only tool list into a router that encodes real-run learnings
- Added `workflows/llms-first-strategy.md`, `workflows/cli-reference.md`, `workflows/verify-and-package.md`
- Added MCP↔CLI fallback as a first-class invariant (MCP server is often not connected)
- Added llms.txt-first sourcing, scrape-output verification, and progressive-disclosure
  reorg as invariants
- Fixed SKILL.md `name` from `skill-builder` → `skill_seekers` to match the directory
- Authored this SPEC.md, README.md, and CHANGELOG.md per the skill-spec convention
- Capability coverage matrix: 11 intents across 3 workflows + SKILL.md
- Status: stable

---

## 6. Integration Points

| Agent / Command | Invocation Pattern | Notes |
|-----------------|--------------------|-------|
| `/skill_seekers` | Loads this skill | Primary entry point for building skills from sources |
| Operator (direct) | `Skill("skill_seekers")` | Ad-hoc "build a skill from <source>" requests |
| `skill-creator` / `skill-builder` | Sibling skills | Use those for from-scratch authoring; this skill is source-driven |

**Co-loaded with**: none required. Pairs naturally with the `claude-code` skill when the
source being scraped is the Claude Code docs.

**External dependency**: the `skill-seekers` CLI / MCP server, backed by the
`Skill_Seekers` repo at `/Users/miethe/dev/homelab/development/Skill_Seekers/`.

---

## 7. Success Signals

- The agent checks MCP availability and uses the CLI fallback without the user prompting it.
- For docs sites with `llms.txt`, the agent sources from `llms-full.txt` rather than fighting
  the HTML scraper.
- "Capture all pages" produces a page count matching the sitemap (minus intended excludes).
- Installed skills use a small SKILL.md router + topic `references/` (no 2–4 MB monolithic dumps).
- Scrape failures are caught by the verification step (page count / junk grep) before packaging.
- Generated skills pass `skill-seekers quality` at grade ≥ B with accuracy ≥ 90.
