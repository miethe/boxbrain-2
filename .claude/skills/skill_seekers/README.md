# Skill Seekers Skill

Build AI-ready Claude Code skills from any knowledge source — documentation sites,
GitHub repos, PDFs, videos, or local codebases — using the **Skill Seekers** engine
(MCP server when connected, `skill-seekers` CLI as fallback).

**Version**: 2.0 · **Spec**: [`SPEC.md`](./SPEC.md) · **Changelog**: [`CHANGELOG.md`](./CHANGELOG.md)

## What this skill is for

Source-driven skill creation: point it at a knowledge source and get a packaged,
progressively-disclosed skill (`SKILL.md` router + topic `references/`). For authoring a
skill *from scratch* without a source, use `skill-creator` / `skill-builder` instead.

## Quick start

```bash
# 1. Which path is available this session?
claude mcp list 2>/dev/null | grep -i 'skill[-_ ]seekers'   # MCP connected?
which skill-seekers                                          # CLI fallback (preferred otherwise)

# 2. Prefer published llms.txt for docs sites (skip the flaky HTML scraper)
curl -s -o /dev/null -w "%{http_code}\n" "https://<docs-root>/llms-full.txt"

# 3. Or run the CLI end-to-end
skill-seekers create "https://<docs-site>/" --name <name>
skill-seekers quality   output/<name>
skill-seekers package   output/<name> --target claude
```

## Key learnings baked into this skill

These come from real runs (notably rebuilding the `claude-code` skill, 2026-06):

1. **The MCP server is often not connected.** Detect it; fall back to the CLI. Every MCP
   tool has a CLI equivalent — see [`workflows/cli-reference.md`](./workflows/cli-reference.md).
2. **The HTML scraper is unreliable on JS / marketing-wrapped sites** (Webflow, SPA
   shells). It can capture the marketing landing page or a single garbage page. When the
   site publishes `llms.txt` / `llms-full.txt`, use those — they are the authoritative
   clean-markdown source. See [`workflows/llms-first-strategy.md`](./workflows/llms-first-strategy.md).
3. **Never trust scrape output blind.** Verify `summary.json → total_pages` and grep for
   HTML/marketing contamination before packaging. See
   [`workflows/verify-and-package.md`](./workflows/verify-and-package.md).
4. **Auto-package ≠ progressive disclosure.** It emits 2–4 MB monolithic dumps. Reorganize
   into topic-based `references/` with a small SKILL.md router.
5. **Exclude overlapping sub-domains** (e.g. `agent-sdk`) that already own a dedicated skill.

## File layout

```
skill_seekers/
├── SKILL.md                         # Invocation-time router (load first)
├── SPEC.md                          # Versioned capability contract + invariants
├── README.md                        # This file (human overview)
├── CHANGELOG.md                     # Skill version history
└── workflows/
    ├── llms-first-strategy.md       # llms.txt sourcing, sitemap, per-page split, reorg
    ├── cli-reference.md             # MCP↔CLI map, command reference, config formats
    └── verify-and-package.md        # Output verification, quality, packaging, install
```

## Related

- **Upstream tool**: `Skill_Seekers` repo (`/Users/miethe/dev/homelab/development/Skill_Seekers/`)
- **From-scratch authoring**: `skill-creator`, `skill-builder` skills
- **Operating Claude Code**: `claude-code` skill
- **Convention**: `.claude/specs/artifact-structures/skill-spec-convention.md`
