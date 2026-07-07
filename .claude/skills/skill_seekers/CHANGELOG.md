---
schema_version: 2
doc_type: changelog
title: "skill_seekers Skill — Release History"
status: stable
created: 2026-06-01
updated: 2026-06-01
owner: nick
---

# skill_seekers Skill — Changelog

All notable changes to the skill_seekers skill are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [2.0.0] — 2026-06-01

### Added

- **SPEC.md** — versioned capability contract per
  `.claude/specs/artifact-structures/skill-spec-convention.md` (frontmatter with
  `skill_version`, 7 required sections, invariants, backlog, integration points,
  success signals). Status promoted directly to `stable`.
- **README.md** — human-facing overview, quick start, and the key learnings.
- **CHANGELOG.md** — this file.
- **`workflows/llms-first-strategy.md`** — llms.txt / llms-full.txt-first sourcing,
  sitemap enumeration, per-page split, and progressive-disclosure reorganization.
- **`workflows/cli-reference.md`** — MCP↔CLI tool map, full `skill-seekers` command
  reference, and config-format guidance (MCP server is frequently not connected).
- **`workflows/verify-and-package.md`** — scrape-output verification checklist,
  quality scoring, packaging, and install steps.

### Changed

- **SKILL.md** rewritten from a flat MCP-tool list into a concise router that encodes
  real-run learnings and points to the new workflow docs (progressive disclosure).
- SKILL.md frontmatter gains `version: 2.0`, `updated`, and `spec: ./SPEC.md`.

### Fixed

- SKILL.md `name` corrected from `skill-builder` → `skill_seekers` to match the skill
  directory and how the skill is registered/invoked.

### Learnings encoded (from rebuilding the `claude-code` skill, 2026-06)

- MCP server availability must be detected; the `skill-seekers` CLI is the fallback.
- Prefer published `llms.txt` / `llms-full.txt` over the HTML scraper, which fails on
  JS-rendered / marketing-wrapped sites (captured Webflow marketing markup with
  `total_pages: 1` instead of the docs).
- Always verify scrape output (`summary.json`, junk grep, `quality`) before packaging.
- Reorganize into topic-based references; never ship the monolithic `llms-full.md` dump.
- Exclude sub-domains that already own a dedicated skill (e.g. `agent-sdk`).
