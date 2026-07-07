# Workflow: Verify Scrape Output & Package

**Never trust scrape output blind.** The scraper can report success while having
captured garbage. Run this checklist before enhancing, packaging, or installing.

## 1. Verify the scrape actually captured docs

```bash
DATA=output/<name>_data        # per-run scrape data
OUT=output/<name>              # packaged skill

# (a) How many pages? 1 (or a tiny number) almost always means failure.
python3 -c "import json; d=json.load(open('$DATA/summary.json')); print('total_pages:', d.get('total_pages')); print('llms_txt_detected:', d.get('llms_txt_detected'))"

# (b) Marketing / HTML contamination check — should be 0 contaminated files.
grep -rl 'DOCTYPE html\|website-files\.com\|intellimize\|anti-flicker' "$OUT"/references/*.md 2>/dev/null

# (c) Eyeball a sample reference for real prose (not a JS shell / nav dump).
sed -n '1,30p' "$OUT"/references/*.md 2>/dev/null | head -40
```

Red flags that mean **fall back to llms-full.txt** (see `workflows/llms-first-strategy.md`):
- `total_pages` is 1 or far below the sitemap count.
- Reference files contain `<!DOCTYPE html>`, Webflow/`website-files.com`, or analytics
  script tags as *body* content (a code-fenced HTML example is fine — check context).
- Auto-package references are just `llms-full.md` / `other.md` monolithic dumps.

## 2. Score quality

```bash
skill-seekers quality "$OUT"      # writes $OUT/quality_report.json
```

Read `quality_report.json → overall_score`: `total_score`, `completeness`, `accuracy`,
`health`, and letter `grade`. Aim for grade ≥ B and accuracy ≥ 90. Low `coverage` is
often an index/cross-link metric, not a content gap — judge it against the sample.

## 3. Package for Claude Code

```bash
skill-seekers package "$OUT" --target claude
```

But for a high-quality, progressive-disclosure skill, prefer the manual reorg in
`workflows/llms-first-strategy.md` §4 over the auto-package's monolithic output.

## 4. Install into a project

Replace the existing skill's `references/` wholesale (don't leave stale topic files):

```bash
SKILL=.claude/skills/<name>
cp -R "$SKILL" "$BACKUP"                 # back up (or rely on git)
git rm -q "$SKILL"/references/*.md       # remove stale references
mkdir -p "$SKILL/references"
cp "$OUT"/SKILL.md "$OUT"/skill.json "$OUT"/llms.txt "$SKILL/"
cp "$OUT"/references/*.md "$SKILL/references/"
```

## 5. Final cross-checks

```bash
# Page count embedded vs expected
grep -rh '^Source: \|^`https' "$SKILL"/references/*.md | wc -l
# Skill self-consistency: name in frontmatter matches the directory
grep -m1 '^name:' "$SKILL/SKILL.md"
```

- `skill.json` / SKILL.md frontmatter `version`, `pages`, `updated`, `source` are current.
- SKILL.md `name:` matches the directory name.
- Old reference filenames are gone (removed, not just overwritten).
- Excluded sub-trees (e.g. agent-sdk) are absent from `llms.txt` and references.
