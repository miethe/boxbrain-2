from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass
from xml.etree import ElementTree


_TEXT_TAG = "{http://schemas.openxmlformats.org/drawingml/2006/main}t"
_SLIDE_RE = re.compile(r"ppt/slides/slide(\d+)\.xml$")


@dataclass(frozen=True, slots=True)
class ExtractedSlide:
    source_order_index: int
    extracted_text: str
    speaker_notes: str | None


def extract_pptx_slides(content: bytes) -> list[ExtractedSlide]:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        slide_names = sorted(
            (name for name in archive.namelist() if _SLIDE_RE.match(name)),
            key=_slide_index,
        )
        slides: list[ExtractedSlide] = []
        for slide_name in slide_names:
            index = _slide_index(slide_name)
            slide_text = _xml_text(archive.read(slide_name))
            notes_name = f"ppt/notesSlides/notesSlide{index}.xml"
            notes_text = _xml_text(archive.read(notes_name)) if notes_name in archive.namelist() else None
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


def _xml_text(payload: bytes) -> str:
    try:
        root = ElementTree.fromstring(payload)
    except ElementTree.ParseError:
        return ""
    values = [node.text or "" for node in root.iter() if node.tag == _TEXT_TAG and node.text]
    return " ".join(value.strip() for value in values if value.strip())
