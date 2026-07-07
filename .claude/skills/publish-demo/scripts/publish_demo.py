#!/usr/bin/env python3
"""Publish hand-recorded demos into the MkDocs site.

Subcommands:
  inbox              List demos pending in docs/user/assets/demos/_inbox/
  publish [--slug S | --all]
                     Convert/move assets, draft pages, regenerate nav + index
  reindex            Regenerate .pages and index.md from existing pages

See .claude/skills/publish-demo/SKILL.md for full conventions.
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[4]
INBOX = REPO / "docs/user/assets/demos/_inbox"
ASSETS = REPO / "docs/user/assets/demos"
PAGES_DIR = REPO / "docs/user/demos"
PAGES_NAV = PAGES_DIR / ".pages"
PAGES_INDEX = PAGES_DIR / "index.md"

MEDIA_EXTS = {".mov", ".mp4", ".gif"}
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


@dataclass
class Pending:
    slug: str
    media: Path
    md: Path | None
    sidecar: Path | None

    @property
    def needs_conversion(self) -> bool:
        return self.media.suffix.lower() == ".mov"


def discover_inbox() -> list[Pending]:
    if not INBOX.exists():
        return []
    by_slug: dict[str, dict[str, Path]] = {}
    for p in sorted(INBOX.iterdir()):
        if p.name.startswith(".") or p.is_dir():
            continue
        slug = p.stem
        bucket = by_slug.setdefault(slug, {})
        ext = p.suffix.lower()
        if ext in MEDIA_EXTS:
            bucket["media"] = p
        elif ext == ".md":
            bucket["md"] = p
        elif ext in {".yaml", ".yml"}:
            bucket["sidecar"] = p

    pending: list[Pending] = []
    for slug, files in by_slug.items():
        media = files.get("media")
        if not media:
            continue
        if not SLUG_RE.match(slug):
            print(f"warn: skipping {slug!r}: invalid slug (use a-z0-9-)", file=sys.stderr)
            continue
        pending.append(Pending(slug=slug, media=media, md=files.get("md"), sidecar=files.get("sidecar")))
    return pending


def cmd_inbox(_args: argparse.Namespace) -> int:
    pending = discover_inbox()
    if not pending:
        print(f"(empty) {INBOX}")
        return 0
    print(f"{len(pending)} pending demo(s) in {INBOX}:")
    for p in pending:
        bits = [p.media.name]
        if p.md:
            bits.append("+md")
        if p.sidecar:
            bits.append("+sidecar")
        if p.needs_conversion:
            bits.append("(will convert .mov → .mp4)")
        print(f"  - {p.slug}: {' '.join(bits)}")
    return 0


def convert_mov_to_mp4(src: Path, dst: Path) -> None:
    """Convert .mov to web-friendly .mp4. Strips audio."""
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-crf", "23",
        "-preset", "slow",
        "-an",
        str(dst),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def asset_relpath(slug: str, ext: str) -> str:
    return f"../assets/demos/{slug}{ext}"


def embed_snippet(slug: str, ext: str, alt: str) -> str:
    rel = asset_relpath(slug, ext)
    if ext == ".gif":
        return f"![{alt}]({rel}){{ loading=lazy }}"
    # mp4
    return (
        f'<video controls loop muted playsinline width="100%">\n'
        f'  <source src="{rel}" type="video/mp4">\n'
        f"  Your browser does not support embedded video. "
        f"<a href=\"{rel}\">Download the recording</a>.\n"
        f"</video>"
    )


def draft_page(slug: str, ext: str, sidecar: dict | None) -> str:
    sidecar = sidecar or {}
    title = sidecar.get("title") or slug.replace("-", " ").title()
    description = sidecar.get("description") or f"Walkthrough: {title}"
    subcategory = sidecar.get("subcategory") or ("web" if "(Web)" in title else "cli")
    duration = sidecar.get("duration") or "~1 minute"
    audience = sidecar.get("audience") or "All users"
    tags = sidecar.get("tags") or ["demos", subcategory]
    today = date.today().isoformat()

    fm_lines = [
        "---",
        f"title: {title}",
        f"description: {description}",
        "domain: demos",
        "category: demos",
        f"subcategory: {subcategory}",
        f'created: "{today}"',
        f'last_updated: "{today}"',
        f"tags: [{', '.join(tags)}]",
        "---",
        "",
        f"# {title}",
        "",
        description.rstrip("."),
        ".",
        "",
        '!!! info "About This Demo"',
        f"    **Duration**: {duration}",
        f"    **Audience**: {audience}",
        "",
        embed_snippet(slug, ext, alt=title),
        "",
    ]

    if sidecar.get("body"):
        fm_lines.append("---")
        fm_lines.append("")
        fm_lines.append(sidecar["body"].rstrip())
        fm_lines.append("")
    elif sidecar.get("talking_points"):
        fm_lines.append("---")
        fm_lines.append("")
        fm_lines.append("## What You'll See")
        fm_lines.append("")
        for tp in sidecar["talking_points"]:
            fm_lines.append(f"- {tp}")
        fm_lines.append("")

    return "\n".join(fm_lines)


def parse_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    block = text[3:end].strip()
    try:
        return yaml.safe_load(block) or {}
    except yaml.YAMLError:
        return {}


def collect_published_pages() -> list[tuple[Path, dict]]:
    pages = []
    for p in sorted(PAGES_DIR.glob("*.md")):
        if p.name == "index.md":
            continue
        fm = parse_frontmatter(p)
        if not fm:
            continue
        pages.append((p, fm))
    return pages


def regenerate_nav() -> None:
    pages = collect_published_pages()

    def sort_key(item):
        path, fm = item
        sub = fm.get("subcategory", "zzz")
        # web first, then cli, then others
        order = {"web": 0, "cli": 1}.get(sub, 9)
        return (order, fm.get("title", path.stem).lower())

    pages.sort(key=sort_key)

    lines = ["nav:", "  - index.md"]
    for path, fm in pages:
        title = fm.get("title", path.stem)
        lines.append(f"  - {title}: {path.name}")
    PAGES_NAV.write_text("\n".join(lines) + "\n", encoding="utf-8")


SECTION_HEADERS = {
    "web": "## Web UI Demos",
    "cli": "## CLI Demos",
    "other": "## Other Demos",
}

# Stop markers — anything after these in index.md is preserved as-is.
INDEX_TAIL_MARKERS = ("## Tips for Watching Demos", "---\n\n## Tips")


def render_card(path: Path, fm: dict) -> list[str]:
    title = fm.get("title", path.stem)
    desc = (fm.get("description", "") or "").rstrip(".") + "."
    duration = fm.get("duration")
    audience = fm.get("audience")
    fmt = fm.get("format")
    lines = [f"### {title}", "", desc, ""]
    bullets = []
    if duration:
        bullets.append(f"- **Duration**: {duration}")
    if audience:
        bullets.append(f"- **Audience**: {audience}")
    if fmt:
        bullets.append(f"- **Format**: {fmt}")
    if bullets:
        lines.extend(bullets)
        lines.append("")
    lines.append(f"[View {title} →]({path.name})")
    lines.append("")
    return lines


def insert_index_cards(new_slugs: set[str]) -> int:
    """Additively insert cards for new slugs into index.md, preserving everything else.

    Returns count of cards inserted.
    """
    if not new_slugs:
        return 0
    if not PAGES_INDEX.exists():
        return 0

    text = PAGES_INDEX.read_text(encoding="utf-8")
    pages = collect_published_pages()
    by_slug = {p.stem: (p, fm) for p, fm in pages}

    inserted = 0
    for slug in sorted(new_slugs):
        if slug not in by_slug:
            continue
        path, fm = by_slug[slug]
        link_target = f"]({path.name})"
        if link_target in text:
            continue  # already present

        sub = fm.get("subcategory", "other")
        section = SECTION_HEADERS.get(sub, SECTION_HEADERS["other"])
        card = "\n".join(render_card(path, fm))

        if section in text:
            # Insert at end of that section: find next "## " heading after section header
            sec_idx = text.index(section)
            after_header = text.find("\n", sec_idx) + 1
            next_section = re.search(r"\n## ", text[after_header:])
            tail_marker = next((m for m in INDEX_TAIL_MARKERS if m in text), None)
            insert_at = len(text)
            if next_section:
                insert_at = after_header + next_section.start() + 1
            if tail_marker and text.find(tail_marker) < insert_at:
                insert_at = text.find(tail_marker)
            text = text[:insert_at].rstrip() + "\n\n" + card + "\n" + text[insert_at:]
        else:
            # Section doesn't exist yet — insert before the tail marker, or append
            tail_marker = next((m for m in INDEX_TAIL_MARKERS if m in text), None)
            block = f"{section}\n\n{card}\n"
            if tail_marker:
                idx = text.find(tail_marker)
                text = text[:idx].rstrip() + "\n\n" + block + "\n" + text[idx:]
            else:
                text = text.rstrip() + "\n\n" + block + "\n"
        inserted += 1

    if inserted:
        # Refresh last_updated in frontmatter
        text = re.sub(
            r'(last_updated:\s*)"[^"]*"',
            f'\\1"{date.today().isoformat()}"',
            text,
            count=1,
        )
        PAGES_INDEX.write_text(text, encoding="utf-8")
    return inserted


def publish_one(p: Pending) -> tuple[str, str]:
    """Returns (final_ext, action_summary)."""
    actions = []
    src_ext = p.media.suffix.lower()
    if p.needs_conversion:
        target = ASSETS / f"{p.slug}.mp4"
        convert_mov_to_mp4(p.media, target)
        actions.append(f"converted {p.media.name} → {target.name}")
        p.media.unlink()
        final_ext = ".mp4"
    else:
        target = ASSETS / f"{p.slug}{src_ext}"
        shutil.move(str(p.media), str(target))
        actions.append(f"moved {p.media.name} → assets/demos/{target.name}")
        final_ext = src_ext

    page_target = PAGES_DIR / f"{p.slug}.md"
    if p.md:
        shutil.move(str(p.md), str(page_target))
        actions.append(f"moved {p.md.name} → demos/{page_target.name}")
    elif not page_target.exists():
        sidecar_data = None
        if p.sidecar:
            sidecar_data = yaml.safe_load(p.sidecar.read_text(encoding="utf-8")) or {}
        body = draft_page(p.slug, final_ext, sidecar_data)
        page_target.write_text(body, encoding="utf-8")
        if p.sidecar:
            p.sidecar.unlink()
            actions.append(f"drafted demos/{page_target.name} from sidecar")
        else:
            actions.append(f"drafted demos/{page_target.name} (stub — fill in body)")
    else:
        actions.append(f"page demos/{page_target.name} already exists; left untouched")
        if p.sidecar:
            actions.append(f"sidecar {p.sidecar.name} ignored (page exists); leave or delete manually")

    return final_ext, "; ".join(actions)


def cmd_publish(args: argparse.Namespace) -> int:
    pending = discover_inbox()
    if args.slug:
        pending = [p for p in pending if p.slug == args.slug]
        if not pending:
            print(f"no inbox entry for slug {args.slug!r}", file=sys.stderr)
            return 1
    elif not args.all:
        print("specify --slug <slug> or --all", file=sys.stderr)
        return 2

    if not pending:
        print("nothing to publish")
        return 0

    ASSETS.mkdir(parents=True, exist_ok=True)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)

    new_slugs: set[str] = set()
    for p in pending:
        try:
            _ext, summary = publish_one(p)
            print(f"published {p.slug}: {summary}")
            new_slugs.add(p.slug)
        except subprocess.CalledProcessError as exc:
            print(f"ffmpeg failed for {p.slug}: {exc.stderr.decode(errors='replace')}", file=sys.stderr)
            return 3

    regenerate_nav()
    inserted = insert_index_cards(new_slugs)
    print(f"regenerated {PAGES_NAV.relative_to(REPO)}; inserted {inserted} card(s) into {PAGES_INDEX.relative_to(REPO)}")
    print("next: run `mkdocs build --strict` to validate")
    return 0


def cmd_reindex(_args: argparse.Namespace) -> int:
    regenerate_nav()
    # additive index update: insert any pages not already linked from index.md
    text = PAGES_INDEX.read_text(encoding="utf-8") if PAGES_INDEX.exists() else ""
    candidates = {p.stem for p, _ in collect_published_pages() if f"]({p.name})" not in text}
    inserted = insert_index_cards(candidates)
    print(f"regenerated {PAGES_NAV.relative_to(REPO)}; inserted {inserted} missing card(s) into {PAGES_INDEX.relative_to(REPO)}")
    print("next: run `mkdocs build --strict` to validate")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("inbox", help="list pending demos in inbox").set_defaults(func=cmd_inbox)

    pub = sub.add_parser("publish", help="publish demos from inbox")
    g = pub.add_mutually_exclusive_group()
    g.add_argument("--slug", help="publish a single slug")
    g.add_argument("--all", action="store_true", help="publish all inbox entries")
    pub.set_defaults(func=cmd_publish)

    sub.add_parser("reindex", help="regenerate .pages and index.md from existing pages").set_defaults(func=cmd_reindex)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
