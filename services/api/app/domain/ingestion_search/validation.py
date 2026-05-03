"""PPTX-first upload validation for ingestion jobs."""

from __future__ import annotations

import io
import zipfile
from pathlib import PurePosixPath

from .hashing import hash_bytes
from .models import UploadValidationResult

PPTX_MIME_TYPES = frozenset(
    {
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/octet-stream",
    }
)
PPTX_REQUIRED_MEMBERS = frozenset({"[Content_Types].xml", "ppt/presentation.xml"})
PPTX_SLIDE_PREFIX = "ppt/slides/slide"
DEFAULT_MAX_PPTX_BYTES = 100 * 1024 * 1024


def validate_pptx_upload(
    *,
    filename: str,
    content: bytes | bytearray | memoryview,
    content_type: str | None = None,
    max_size_bytes: int = DEFAULT_MAX_PPTX_BYTES,
) -> UploadValidationResult:
    """Validate a source upload for the MVP PPTX ingestion path."""

    payload = bytes(content)
    warnings: list[str] = []
    normalized_name = filename.strip()
    normalized_content_type = (content_type or "").split(";")[0].strip().lower()

    if not normalized_name:
        return _invalid(filename, len(payload), "missing_filename", "Filename is required.")
    if not normalized_name.casefold().endswith(".pptx"):
        return _invalid(
            normalized_name,
            len(payload),
            "unsupported_file_type",
            "Only .pptx uploads are accepted by the MVP ingestion path.",
        )
    if normalized_content_type and normalized_content_type not in PPTX_MIME_TYPES:
        return _invalid(
            normalized_name,
            len(payload),
            "unsupported_media_type",
            "Content-Type is not a PPTX-compatible media type.",
        )
    if not payload:
        return _invalid(normalized_name, 0, "empty_file", "Uploaded file is empty.")
    if len(payload) > max_size_bytes:
        return _invalid(
            normalized_name,
            len(payload),
            "file_too_large",
            f"Uploaded file exceeds the {max_size_bytes} byte limit.",
        )

    buffer = io.BytesIO(payload)
    if not zipfile.is_zipfile(buffer):
        return _invalid(
            normalized_name,
            len(payload),
            "invalid_pptx_zip",
            "PPTX file is not a valid OpenXML zip archive.",
        )

    buffer.seek(0)
    try:
        with zipfile.ZipFile(buffer) as archive:
            names = set(archive.namelist())
    except zipfile.BadZipFile:
        return _invalid(
            normalized_name,
            len(payload),
            "invalid_pptx_zip",
            "PPTX file is not a readable OpenXML zip archive.",
        )

    unsafe_member = next((name for name in names if _is_unsafe_zip_member(name)), None)
    if unsafe_member is not None:
        return _invalid(
            normalized_name,
            len(payload),
            "unsafe_archive_member",
            f"PPTX archive contains an unsafe member path: {unsafe_member}",
        )

    missing = sorted(PPTX_REQUIRED_MEMBERS.difference(names))
    if missing:
        return _invalid(
            normalized_name,
            len(payload),
            "invalid_pptx_structure",
            f"PPTX archive is missing required members: {', '.join(missing)}.",
        )

    slide_count = sum(
        1
        for name in names
        if name.startswith(PPTX_SLIDE_PREFIX) and name.endswith(".xml")
    )
    if slide_count == 0:
        return _invalid(
            normalized_name,
            len(payload),
            "pptx_no_slides",
            "PPTX archive does not contain slide XML members.",
        )
    if "docProps/core.xml" not in names:
        warnings.append("missing_core_properties")

    return UploadValidationResult(
        valid=True,
        filename=normalized_name,
        normalized_file_type="pptx",
        artifact_type="deck",
        content_hash=hash_bytes(payload),
        file_size_bytes=len(payload),
        slide_count=slide_count,
        warnings=tuple(warnings),
    )


def _invalid(
    filename: str,
    file_size_bytes: int,
    error_code: str,
    error_message: str,
) -> UploadValidationResult:
    return UploadValidationResult(
        valid=False,
        filename=filename,
        file_size_bytes=file_size_bytes,
        error_code=error_code,
        error_message=error_message,
    )


def _is_unsafe_zip_member(name: str) -> bool:
    path = PurePosixPath(name)
    return path.is_absolute() or ".." in path.parts

