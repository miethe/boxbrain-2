from __future__ import annotations

import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings, get_settings


@dataclass(frozen=True, slots=True)
class RenderedSlideAsset:
    source_order_index: int
    render_content: bytes
    render_content_type: str
    render_extension: str
    thumbnail_content: bytes
    thumbnail_content_type: str
    thumbnail_extension: str
    renderer_version: str


class SlideRenderError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class SlideRenderer:
    renderer_name = "unknown"

    def render_pptx(
        self,
        *,
        content: bytes,
        filename: str,
        slide_count: int,
    ) -> list[RenderedSlideAsset]:
        raise NotImplementedError


class FakeSlideRenderer(SlideRenderer):
    renderer_name = "fake-svg-renderer"

    def render_pptx(
        self,
        *,
        content: bytes,
        filename: str,
        slide_count: int,
    ) -> list[RenderedSlideAsset]:
        return [_fake_asset(index) for index in range(1, slide_count + 1)]


class LibreOfficeSlideRenderer(SlideRenderer):
    renderer_name = "libreoffice"

    def __init__(self, binary: str | None = None, timeout_seconds: int = 120) -> None:
        self.binary = binary or shutil.which("soffice") or shutil.which("libreoffice")
        self.timeout_seconds = timeout_seconds

    def render_pptx(
        self,
        *,
        content: bytes,
        filename: str,
        slide_count: int,
    ) -> list[RenderedSlideAsset]:
        if not self.binary:
            raise SlideRenderError(
                "renderer_unavailable",
                "LibreOffice renderer is not installed or not on PATH. Install LibreOffice "
                "so the 'soffice' command is available, then retry the ingestion job.",
            )

        with tempfile.TemporaryDirectory(prefix="boxbrain-render-") as tmp:
            tmp_path = Path(tmp)
            source_path = tmp_path / _safe_filename(filename)
            source_path.write_bytes(content)
            command = [
                self.binary,
                "--headless",
                "--convert-to",
                "png",
                "--outdir",
                str(tmp_path),
                str(source_path),
            ]
            try:
                subprocess.run(
                    command,
                    check=True,
                    capture_output=True,
                    timeout=self.timeout_seconds,
                )
            except subprocess.TimeoutExpired as exc:
                raise SlideRenderError(
                    "renderer_timeout",
                    f"LibreOffice rendering timed out after {self.timeout_seconds} seconds.",
                ) from exc
            except subprocess.CalledProcessError as exc:
                stderr = exc.stderr.decode("utf-8", errors="replace").strip()
                raise SlideRenderError(
                    "renderer_failed",
                    f"LibreOffice rendering failed. {stderr or 'No renderer stderr was returned.'}",
                ) from exc

            pngs = sorted(tmp_path.glob("*.png"))
            if len(pngs) < slide_count:
                raise SlideRenderError(
                    "renderer_missing_outputs",
                    f"LibreOffice produced {len(pngs)} PNG render(s) for {slide_count} slide(s).",
                )
            version = _libreoffice_version(self.binary)
            assets: list[RenderedSlideAsset] = []
            for index, path in enumerate(pngs[:slide_count], start=1):
                image = path.read_bytes()
                assets.append(
                    RenderedSlideAsset(
                        source_order_index=index,
                        render_content=image,
                        render_content_type="image/png",
                        render_extension=".png",
                        thumbnail_content=image,
                        thumbnail_content_type="image/png",
                        thumbnail_extension=".png",
                        renderer_version=version,
                    )
                )
            return assets


def build_slide_renderer(settings: Settings | None = None) -> SlideRenderer:
    resolved = settings or get_settings()
    if resolved.renderer_mode == "fake":
        return FakeSlideRenderer()
    return LibreOfficeSlideRenderer()


def _fake_asset(index: int) -> RenderedSlideAsset:
    payload = (
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1280\" height=\"720\" "
        "viewBox=\"0 0 1280 720\">"
        "<rect width=\"1280\" height=\"720\" fill=\"#f8fafc\"/>"
        "<rect x=\"72\" y=\"72\" width=\"1136\" height=\"576\" rx=\"18\" fill=\"#dbeafe\"/>"
        f"<text x=\"120\" y=\"180\" font-family=\"Arial\" font-size=\"64\" fill=\"#0f172a\">Slide {index}</text>"
        "</svg>"
    ).encode("utf-8")
    return RenderedSlideAsset(
        source_order_index=index,
        render_content=payload,
        render_content_type="image/svg+xml",
        render_extension=".svg",
        thumbnail_content=payload,
        thumbnail_content_type="image/svg+xml",
        thumbnail_extension=".svg",
        renderer_version="fake-svg-renderer-v1",
    )


def _safe_filename(filename: str) -> str:
    name = Path(filename).name or "upload.pptx"
    return name if name.casefold().endswith(".pptx") else f"{name}.pptx"


def _libreoffice_version(binary: str) -> str:
    try:
        result = subprocess.run(
            [binary, "--version"],
            check=True,
            capture_output=True,
            timeout=10,
        )
    except Exception:
        return "libreoffice"
    return result.stdout.decode("utf-8", errors="replace").strip() or "libreoffice"
