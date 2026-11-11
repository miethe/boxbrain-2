# M0 validation receipt

Date: 2026-11-10. Design package only; no site or production validator is implemented.

## Reproduce the fixture audit

From repository root:

```sh
python3 docs/project_plans/revival/storefront-m0/checks/audit-fixture.py
git diff --check
```

The audit uses only Python's standard library. It checks this fixture's frontmatter field sets, required headings, review dates, identity uniqueness, relation types, curated coverage, stage shape, guide/asset containment, artifact inventory, documentation links, audience counts and PNG headers. It is a fixture consistency check, not the full future build validator specified in CONTENT-MODEL.md. It does not render, publish, scan a generated site for leaks or prove host authorization.

Observed audit output:

```text
PASS: 12 catalog objects (1 Practice, 3 Offerings, 2 Plays, 6 Collateral); 3 seller guides; 5 complete local assets; 1 external link.
PASS: frontmatter fields, headings, review dates, IDs, relation types, curation coverage, stages, guide/asset paths and Markdown links.
PASS: object projection = seller 12 / org-wide 8; local assets = seller 5 / org-wide 3; all five collateral kinds represented.
PASS: 6 PNG headers verified at 1600x1000. Raster inspection is recorded separately in OPTIONS.md.
```

`git diff --check` completed with exit 0. Both status-block diffs were reviewed against their original files; continuing security/harvest guidance and remaining project instructions are retained. No application, API, contract, database, dependency or runtime configuration files changed. No frontend/backend build or application suite was run because this node creates design documents, fictional content and raster mockups only. Commit hooks, if invoked by the commit broker, remain a separate observed result; this receipt makes no unobserved hook or CI claim.

## Visual check

All six final PNGs were opened locally with the image viewer. [OPTIONS.md](OPTIONS.md) records page-specific readability and content discrepancies, the native generation origin and proportional canvas normalization. Generated text is sufficiently readable to judge the directions; detailed accessibility and responsive behavior require the later browser leg. No browser was launched in this sandbox.

## Scope and pending work

[PLAN.md](PLAN.md) defines build legs after direction selection. The five local collateral artifacts are complete short Markdown sources (including two decks); no PPTX/PDF binary or rendering capability is implied. The external reading-guide item intentionally points at a reserved example domain and is labeled as a link fixture. The review labels identify a fictional curator, not real human approval of business content.

The small [fixture audit](checks/audit-fixture.py) and this receipt are supporting verification additions inside the requested design directory. No new work nodes were created. Inbox checks returned no added messages. Publication is owned by the clone wrapper after the design commit; the PR handoff is `.leg/pr-body.md` and `.leg/pr-title.txt`. No merge is requested.
