---
name: skill_seekers
description: |
  Automatically detect source types and build AI skills using Skill Seekers.
  Use when the user wants to create or rebuild skills from documentation sites,
  GitHub repos, PDFs, videos, codebases, or other knowledge sources, or to export
  skills to vector databases. Works via the Skill Seekers MCP server when connected,
  and via the `skill-seekers` CLI as a fallback when it is not.
version: 2.0
updated: 2026-06-01
spec: ./SPEC.md
---

# Skill Seekers — Skill Builder

Skill Seekers converts knowledge sources (docs sites, repos, PDFs, videos, codebases)
into AI-ready skills. It exposes ~40 MCP tools **and** a `skill-seekers` CLI that wraps
the same engine.

> **Tooling reality (read first):** The Skill Seekers MCP server is frequently NOT
> connected in a given session. **Always check**, and fall back to the CLI. See
> `workflows/cli-reference.md` for the MCP→CLI map and detection commands.
>
> ```bash
> claude mcp list 2>/dev/null | grep -i 'skill[-_ ]seekers'   # MCP connected?
> which skill-seekers                                          # CLI fallback
> ```

## When to Use This Skill

- Create an AI skill from a docs site, GitHub repo, PDF, video, or local codebase
- Rebuild / refresh an existing skill against its source documentation
- Convert documentation into LLM-optimized, progressively-disclosed references
- Export a skill to a vector DB (Weaviate, Chroma, FAISS, Qdrant)

## Source Type Detection

| Input pattern | Source | MCP tool | CLI |
|---------------|--------|----------|-----|
| `https://…` (docs) | Documentation | `scrape_docs` | `skill-seekers create <url>` |
| `owner/repo`, `github.com/…` | GitHub | `scrape_github` | `skill-seekers create <owner/repo>` |
| `*.pdf` | PDF | `scrape_pdf` | `skill-seekers create ./f.pdf` |
| YouTube/Vimeo/video file | Video | `scrape_video` | `skill-seekers create <video>` |
| Local directory | Codebase | `scrape_codebase` | `skill-seekers create <dir>` |
| `*.ipynb/.html/.yaml/.adoc/.pptx/.rss/.1-.8` | Various | `scrape_generic` | `skill-seekers create <file>` |

## Recommended Workflow

1. **Check tooling** — MCP connected? else use the CLI (`workflows/cli-reference.md`).
2. **Prefer llms.txt** — if the docs site publishes `llms.txt` / `llms-full.txt`, use
   them as the authoritative source and **skip HTML scraping**. This is the highest-
   leverage decision. See `workflows/llms-first-strategy.md`.
3. **Enumerate pages** from the sitemap for "capture all pages" requests; update the
   config's `start_urls` / `url_patterns.exclude` (drop other languages and sub-trees
   that own their own skill, e.g. `agent-sdk`). `skill-seekers sync-config --apply`
   refreshes `start_urls` from the live site.
4. **Estimate** scope (`estimate_pages` / `skill-seekers estimate`).
5. **Scrape / fetch** the source.
6. **Verify output** before trusting it — `summary.json total_pages`, junk grep,
   `quality`. See `workflows/verify-and-package.md`.
7. **Reorganize for progressive disclosure** — split per page, group into topic
   `references/*.md`, write a curated SKILL.md router. Do NOT ship the monolithic
   `llms-full.md` / `other.md` dumps.
8. **Enhance** (optional, `enhance_skill`), **package** (`--target claude`), **install**.

## Critical Lessons (encoded from real runs)

- **HTML scraper is unreliable on JS/marketing-wrapped sites** (Webflow, SPA shells).
  It may capture the marketing landing page or a single garbage page. Prefer
  `llms-full.txt`; always verify `summary.json` and sample content.
- **Auto-package = poor progressive disclosure.** It emits 2–4 MB monolithic dumps.
  Always reorganize into topic-based references with a small SKILL.md router.
- **MCP ≠ guaranteed.** Detect, then use the CLI fallback.
- **Exclude overlapping sub-domains** that already have a dedicated skill.
- **Bump skill metadata** (`version`, `pages`, `source`, `updated`) and keep SKILL.md
  `name` matching the directory.

## Reference Map

| Need | Load |
|------|------|
| llms.txt-first strategy, sitemap, per-page split, progressive-disclosure reorg | `workflows/llms-first-strategy.md` |
| MCP↔CLI map, full CLI command reference, config formats | `workflows/cli-reference.md` |
| Verify scrape output, quality scoring, packaging, install | `workflows/verify-and-package.md` |
| Versioned capability contract, invariants, backlog | `SPEC.md` |
| Human overview & quick start | `README.md` |

## MCP Tool Catalog (when the server is connected)

- **Config**: `generate_config`, `list_configs`, `validate_config`
- **Scrape**: `scrape_docs`, `scrape_github`, `scrape_pdf`, `scrape_video`,
  `scrape_codebase`, `scrape_generic`
- **Post-process**: `enhance_skill`, `package_skill`, `upload_skill`, `install_skill`
- **Advanced**: `detect_patterns`, `extract_test_examples`, `build_how_to_guides`,
  `split_config`, `export_to_weaviate|chroma|faiss|qdrant`

Each has a CLI equivalent — see `workflows/cli-reference.md`.
