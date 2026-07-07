# Workflow: CLI Fallback & Command Reference

**The Skill Seekers MCP server is frequently NOT connected.** The SKILL.md advertises
40 MCP tools, but in practice the server may be absent from the session. Always check,
and fall back to the installed `skill-seekers` CLI — every MCP tool has a CLI equivalent.

## Detect which path is available

```bash
# MCP path: is the skill_seekers server connected this session?
claude mcp list 2>/dev/null | grep -i 'skill[-_ ]seekers'

# CLI path (preferred fallback — almost always present):
which skill-seekers && skill-seekers --version
python3 -c "import skill_seekers, sys; print(skill_seekers.__file__)"
```

If the MCP server is connected, use the MCP tools (they wrap the same engine).
Otherwise drive the CLI. Do **not** assume MCP — verify.

## MCP tool → CLI command map

| MCP tool | CLI command |
|----------|-------------|
| `generate_config` | `skill-seekers create <URL> --dry-run` (auto-detects + emits config) |
| `scan` (stack detect) | `skill-seekers scan <url-or-dir>` |
| `estimate_pages` | `skill-seekers estimate --config <file>` (or `estimate <file>`) |
| `scrape_docs` | `skill-seekers create <URL> --config <file> --scrape-only` |
| `scrape_github` | `skill-seekers create <owner/repo>` |
| `scrape_pdf` | `skill-seekers create ./file.pdf` |
| `scrape_video` | `skill-seekers create <video-url>` |
| `scrape_codebase` | `skill-seekers create <dir> --directory <dir>` |
| `enhance_skill` | `skill-seekers enhance <output_dir>` |
| `package_skill` | `skill-seekers package <output_dir> --target claude` |
| `upload_skill` | `skill-seekers upload <skill.zip>` |
| `install_skill` | `skill-seekers install ...` (fetch→scrape→enhance→package→upload) |
| (quality score) | `skill-seekers quality <output_dir>` |
| (env health) | `skill-seekers doctor` |
| (refresh start_urls) | `skill-seekers sync-config --config <file> --apply` |
| `split_config` | `skill-seekers ... ` (see `skill-seekers --help`) |

Low-level module entrypoints exist when a subcommand is missing
(e.g. `python3 -m skill_seekers.cli.doc_scraper --config <file>` for a bare scrape).

## Canonical CLI subcommands

```
create scan doctor config enhance enhance-status package upload estimate
install install-agent extract-test-examples resume quality workflows
sync-config stream update multilang
```

Run `skill-seekers <subcommand> --help` for flags. Notable ones used in practice:

- `create` — main entry; auto-detects source type. Useful flags:
  `--name`, `--config FILE`, `--output DIR`, `--scrape-only`, `--skip-scrape`,
  `--resume`, `--fresh`, `--max-pages N`, `--rate-limit S`, `--workers N`,
  `--enhance-level LEVEL`, `--non-interactive`.
- `sync-config` — crawl the live site and diff/update `start_urls`:
  `--config FILE [--apply] [--depth N] [--max-pages N] [--source-index I]`.
  Dry-run by default; `--apply` writes back.
- `estimate` — page-count estimate before a big scrape.
- `enhance` — auto-detects API mode (`ANTHROPIC_API_KEY` → claude, etc.) or falls
  back to a LOCAL coding-agent. `--dry-run` to preview.
- `package` — `--target claude` for Claude Code; `--skip-quality-check` to bypass gate.
- `quality` — scores SKILL.md, writes `quality_report.json` (total/completeness/
  accuracy/coverage/health + letter grade).

## Config formats

Two shapes exist; both are valid input to the engine:

- **Unified** (preferred): top-level `sources: [ { type, base_url, start_urls?,
  selectors, url_patterns: {include, exclude}, categories?, rate_limit, max_pages } ]`.
  Omit `start_urls` to rely on llms.txt / crawl auto-discovery.
- **Flat** (legacy): the same keys at the top level (no `sources` array).

Always set `url_patterns.exclude` to drop other languages and any sub-tree that owns
its own skill (e.g. `/docs/en/agent-sdk/`). Project configs live in the Skill_Seekers
repo under `configs/<name>.json`.

## Python environment

Installed as a console script via pyenv (no venv activation needed in practice):

```bash
skill-seekers <cmd>                    # preferred
python3 -m skill_seekers.cli.<module>  # low-level module entry
```

If missing: `python3 -m pip install skill-seekers` (add `--break-system-packages`
only for a managed system Python).
