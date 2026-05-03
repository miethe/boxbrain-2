from __future__ import annotations

import io
import posixpath
import re
import zipfile
from dataclasses import dataclass
from xml.etree import ElementTree


_REL_TAG = "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
_TEXT_TAG = "{http://schemas.openxmlformats.org/drawingml/2006/main}t"
_SLIDE_RE = re.compile(r"ppt/slides/slide(\d+)\.xml$")
_NOTES_SLIDE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"


@dataclass(frozen=True, slots=True)
class ExtractedSlide:
    source_order_index: int
    extracted_text: str
    speaker_notes: str | None


def extract_pptx_slides(content: bytes) -> list[ExtractedSlide]:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        archive_names = set(archive.namelist())
        slide_names = sorted(
            (name for name in archive_names if _SLIDE_RE.match(name)),
            key=_slide_index,
        )
        slides: list[ExtractedSlide] = []
        for slide_name in slide_names:
            index = _slide_index(slide_name)
            slide_text = _xml_text(archive.read(slide_name))
            notes_name = _notes_slide_name(archive, slide_name, archive_names)
            notes_text = _xml_text(archive.read(notes_name)) if notes_name is not None else None
            slides.append(
                ExtractedSlide(
                    source_order_index=index,
                    extracted_text=slide_text or f"Slide {index}",
                    speaker_notes=notes_text,
                )
            )
        return slides


def _slide_index(name: str) -> int:
    match = _SLIDE_RE.match(name)
    if match is None:
        return 0
    return int(match.group(1))


def _notes_slide_name(
    archive: zipfile.ZipFile,
    slide_name: str,
    archive_names: set[str],
) -> str | None:
    rels_name = _slide_relationships_name(slide_name)
    if rels_name not in archive_names:
        return None
    try:
        root = ElementTree.fromstring(archive.read(rels_name))
    except ElementTree.ParseError:
        return None

    for relationship in root.iter():
        if relationship.tag != _REL_TAG:
            continue
        if relationship.attrib.get("Type") != _NOTES_SLIDE_REL_TYPE:
            continue
        if relationship.attrib.get("TargetMode") == "External":
            continue
        target = relationship.attrib.get("Target")
        if not target:
            continue
        resolved = _resolve_part_target(slide_name, target)
        if resolved in archive_names:
            return resolved
    return None


def _slide_relationships_name(slide_name: str) -> str:
    directory, filename = slide_name.rsplit("/", 1)
    return f"{directory}/_rels/{filename}.rels"


def _resolve_part_target(source_name: str, target: str) -> str:
    normalized_target = target.replace("\\", "/")
    if normalized_target.startswith("/"):
        return posixpath.normpath(normalized_target.lstrip("/"))
    source_directory = posixpath.dirname(source_name)
    return posixpath.normpath(posixpath.join(source_directory, normalized_target))


def _xml_text(payload: bytes) -> str:
    try:
        root = ElementTree.fromstring(payload)
    except ElementTree.ParseError:
        return ""
    values = [node.text or "" for node in root.iter() if node.tag == _TEXT_TAG and node.text]
    return " ".join(value.strip() for value in values if value.strip())
