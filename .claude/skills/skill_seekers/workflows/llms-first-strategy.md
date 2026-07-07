# Workflow: llms.txt-First Documentation Strategy

**The single most important lesson from real-world runs.** When a docs site publishes
`llms.txt` / `llms-full.txt`, treat those as the authoritative content source and
**skip the HTML scraper entirely**. The HTML scraper is unreliable on JS-rendered or
marketing-wrapped sites (Webflow, Mintlify shells, anti-flicker SPAs): it frequently
captures the marketing landing page or a single garbage page instead of the docs.

> Real failure (claude-code docs, 2026-06): the HTML scraper returned
> `summary.json → total_pages: 1` with `<!DOCTYPE html>` Webflow marketing markup,
> while `llms-full.txt` held 62,790 lines of clean per-page markdown for 144 pages.

---

## 1. Probe for llms files first

```bash
BASE="https://code.claude.com/docs"   # the docs root, not a single page
for f in llms.txt llms-full.txt llms-small.txt; do
  printf "%-16s -> " "$f"; curl -s -o /dev/null -w "%{http_code}\n" "$BASE/$f"
done
```

- `llms.txt` — titled index of every page (`- [Title](url.md): description`). Use it to
  build the SKILL.md router and understand site structure.
- `llms-full.txt` — full clean markdown of **every** page, each delimited by:
  ```
  # Page Title
  Source: https://site/docs/en/<slug>

  <markdown body…>
  ```
- `llms-small.txt` — condensed variant (often 404; that's fine).

If `llms-full.txt` exists (HTTP 200), prefer it. Skill Seekers itself detects llms.txt
(`llms_txt_detected: true` in summary.json) but its parser can still mis-handle the
content — so verify, and fall back to direct use of the raw file when in doubt.

## 2. Enumerate the authoritative page list from the sitemap

The sitemap is the ground truth for "capture ALL pages" requests.

```bash
curl -s "$BASE/sitemap.xml" \
  | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g' \
  | grep '/docs/en/' \            # keep one language
  | grep -v '/docs/en/agent-sdk/' \  # drop sub-domains that own a separate skill
  | sort > pages.txt
wc -l pages.txt
```

Filter out: other languages (`/docs/fr/`, `/docs/de/`, …), `changelog` if huge/ephemeral,
and any sub-tree that already has its own dedicated skill (e.g. `agent-sdk`).

## 3. Split llms-full.txt into per-page sections

Pages are delimited by an H1 immediately followed by a `Source:` line. Split on that
two-line lookahead (body H2/H3 headers must NOT trigger a split):

```python
import re
lines = open("llms-full.txt").read().splitlines()
pages, cur, i = {}, None, 0
while i < len(lines):
    m  = re.match(r"^# (.+)$", lines[i])
    sm = re.match(r"^Source: (https://\S+/docs/en/\S+)$", lines[i+1] if i+1 < len(lines) else "")
    if m and sm:
        slug = sm.group(1).split("/docs/en/")[-1]
        cur = pages.setdefault(slug, {"title": m.group(1), "url": sm.group(1), "body": []})
        i += 2
        if i < len(lines) and not lines[i].strip(): i += 1   # eat one blank line
        continue
    if cur is not None: cur["body"].append(lines[i])
    i += 1
```

Drop `slug.startswith("agent-sdk/")` (or whatever sub-tree owns its own skill).

## 4. Reorganize into progressive-disclosure references

The Skill Seekers auto-package emits **monolithic** dumps (`llms-full.md`, `other.md`,
2–4 MB each). That defeats progressive disclosure. Instead, group pages into
topic-based `references/<topic>.md` files and write a curated SKILL.md router.

- Define an ordered `category -> [slug]` mapping; **each slug maps to exactly one file**.
- Add a catch-all `additional-topics.md` so a forgotten slug is never silently dropped
  (log unmapped slugs as a warning).
- Each reference file = a concatenation of its pages' markdown; **preserve each page's
  `Source:` URL** so the agent can cite it.
- SKILL.md becomes a small router: a `topic -> reference file -> load when…` table, NOT
  the content itself.

Aim for ~12–18 reference files. Big files are acceptable (loaded on demand); the win is
that SKILL.md stays tiny and only the needed slice loads per question.

## 5. Bump skill metadata

- `skill.json` / SKILL.md frontmatter: set `version`, `source`, `pages`, `updated`.
- Regenerate `llms.txt` filtered to the kept pages (strip excluded sub-tree links).
- Exclude overlapping sub-domains in the Skill Seekers `config` too
  (`url_patterns.exclude += ["/docs/en/agent-sdk/"]`) so future scrapes stay focused.

---

## When the HTML scraper IS the right tool

Use the normal `skill-seekers create <url>` HTML path when:
- The site has **no** `llms.txt` / `llms-full.txt`, AND
- It is server-rendered (the page HTML contains the article text, not a JS shell).

Even then, run the §Verify checklist (`workflows/verify-and-package.md`) before trusting
the output.
