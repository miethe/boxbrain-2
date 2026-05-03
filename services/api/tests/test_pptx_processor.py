from __future__ import annotations

import io
import zipfile

from app.application.pptx_processor import extract_pptx_slides


def _text_part(tag: str, text: str) -> str:
    return (
        f"<p:{tag} xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" "
        "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">"
        f"<a:t>{text}</a:t>"
        f"</p:{tag}>"
    )


def test_extracts_speaker_notes_from_slide_relationship_target() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("ppt/presentation.xml", "<presentation />")
        archive.writestr("ppt/slides/slide1.xml", _text_part("sld", "Slide body"))
        archive.writestr(
            "ppt/slides/_rels/slide1.xml.rels",
            (
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                "<Relationship Id=\"rId2\" "
                "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide\" "
                "Target=\"../notesSlides/notesSlide7.xml\" />"
                "</Relationships>"
            ),
        )
        archive.writestr("ppt/notesSlides/notesSlide1.xml", _text_part("notes", "Wrong guessed notes"))
        archive.writestr("ppt/notesSlides/notesSlide7.xml", _text_part("notes", "Related speaker notes"))

    slides = extract_pptx_slides(buffer.getvalue())

    assert len(slides) == 1
    assert slides[0].source_order_index == 1
    assert slides[0].extracted_text == "Slide body"
    assert slides[0].speaker_notes == "Related speaker notes"


def test_extracts_slide_text_without_notes_relationship() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("ppt/presentation.xml", "<presentation />")
        archive.writestr("ppt/slides/slide1.xml", _text_part("sld", "Slide without notes"))

    slides = extract_pptx_slides(buffer.getvalue())

    assert len(slides) == 1
    assert slides[0].extracted_text == "Slide without notes"
    assert slides[0].speaker_notes is None
