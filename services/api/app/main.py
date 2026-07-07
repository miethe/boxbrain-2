from __future__ import annotations

import logging
import os
import sys
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    admin,
    assets,
    comments,
    content_blocks,
    content_units,
    health,
    ingestion,
    notes,
    reviews,
    search,
    storyboards,
    work_products,
)
from app.application.use_cases import BoxBrainUseCases
from app.application.slide_renderer import SlideRenderer
from app.domain.errors import ConflictError, DomainError, NotFoundError, PermissionDeniedError
from app.infrastructure.in_memory_repository import InMemoryBoxBrainRepository
from app.infrastructure.queue import IngestionQueue
from app.infrastructure.storage import ObjectStorage


logger = logging.getLogger("boxbrain.api")

# Env vars a process manager sets to run more than one worker. The SQLAlchemy
# repository is a per-process in-memory read cache with no cross-process
# invalidation (see docs/deployment/containerized-quick-start.md), so database
# mode must run a single worker until read paths move to direct SQL.
_WORKER_COUNT_ENV_VARS = (
    "WEB_CONCURRENCY",
    "UVICORN_WORKERS",
    "GUNICORN_WORKERS",
    "BOXBRAIN_API_WORKERS",
)


def _worker_count_from_argv() -> int | None:
    """Worker count from a `uvicorn --workers N` / `gunicorn -w N` CLI flag, if present.
    The CLI flag is authoritative: uvicorn only falls back to WEB_CONCURRENCY when
    `--workers` is not passed, so a CLI value overrides the env vars below.
    """
    argv = sys.argv
    for index, arg in enumerate(argv):
        if arg in {"--workers", "-w"}:
            candidate = argv[index + 1] if index + 1 < len(argv) else ""
            if candidate.isdigit():
                return int(candidate)
        elif arg.startswith("--workers="):
            candidate = arg.split("=", 1)[1]
            if candidate.isdigit():
                return int(candidate)
    return None


def _detected_worker_count() -> int:
    from_argv = _worker_count_from_argv()
    if from_argv is not None and from_argv > 0:
        return from_argv
    for var in _WORKER_COUNT_ENV_VARS:
        raw = (os.getenv(var) or "").strip()
        if raw.isdigit():
            count = int(raw)
            if count > 0:
                return count
    return 1


def _warn_if_unsafe_worker_config() -> None:
    from app.config import get_settings

    settings = get_settings()
    workers = _detected_worker_count()
    if settings.repository_mode == "database" and workers > 1:
        logger.warning(
            "BoxBrain API started with %d workers in database mode. The repository is a "
            "per-process in-memory cache with no cross-process invalidation, so multiple "
            "workers will serve divergent/stale reads. Pin the API to a single worker until "
            "direct-SQL read paths land (see docs/deployment/containerized-quick-start.md).",
            workers,
        )


def create_app(
    repository: InMemoryBoxBrainRepository | None = None,
    object_storage: ObjectStorage | None = None,
    ingestion_queue: IngestionQueue | None = None,
    slide_renderer: SlideRenderer | None = None,
) -> FastAPI:
    app = FastAPI(
        title="BoxBrain v2 API",
        version="0.1.0",
        description="Seeded FastAPI backend scaffold for the BoxBrain v2 MVP.",
    )
    if repository is None:
        from app.dependencies import repository as default_repository

        repo: Any = default_repository
    else:
        repo = repository
    if object_storage is None:
        from app.dependencies import object_storage as default_object_storage

        resolved_object_storage = default_object_storage
    else:
        resolved_object_storage = object_storage
    if ingestion_queue is None:
        from app.dependencies import ingestion_queue as default_ingestion_queue

        resolved_ingestion_queue = default_ingestion_queue
    else:
        resolved_ingestion_queue = ingestion_queue
    if slide_renderer is None:
        from app.dependencies import slide_renderer as default_slide_renderer

        resolved_slide_renderer = default_slide_renderer
    else:
        resolved_slide_renderer = slide_renderer
    app.state.repository = repo
    app.state.object_storage = resolved_object_storage
    app.state.ingestion_queue = resolved_ingestion_queue
    app.state.slide_renderer = resolved_slide_renderer
    app.state.use_cases = BoxBrainUseCases(
        repo,
        object_storage=resolved_object_storage,
        ingestion_queue=resolved_ingestion_queue,
        slide_renderer=resolved_slide_renderer,
    )

    register_middleware(app)
    register_exception_handlers(app)
    register_routes(app)
    _warn_if_unsafe_worker_config()
    return app


_LOCALHOST_CORS_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"


def register_middleware(app: FastAPI) -> None:
    from app.config import get_settings

    settings = get_settings()
    if settings.cors_origins:
        # Explicit list provided via BOXBRAIN_CORS_ORIGINS — use exact-match mode.
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        # Default: localhost/127.0.0.1 for any port (safe for local dev).
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=_LOCALHOST_CORS_REGEX,
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )


def register_routes(app: FastAPI) -> None:
    for router in (
        health.router,
        assets.router,
        ingestion.router,
        search.router,
        content_units.router,
        work_products.router,
        content_blocks.router,
        storyboards.router,
        reviews.router,
        comments.router,
        notes.router,
        admin.router,
    ):
        app.include_router(router, prefix="/api")


def register_exception_handlers(app: FastAPI) -> None:
    def handler(status_code: int, code: str) -> Callable[[Request, Exception], Awaitable[JSONResponse]]:
        async def _handle(_: Request, exc: DomainError) -> JSONResponse:
            return JSONResponse(
                status_code=status_code,
                content={"error": {"code": code, "message": str(exc), "details": {}}},
            )

        async def _handle_exception(request: Request, exc: Exception) -> JSONResponse:
            return await _handle(request, exc if isinstance(exc, DomainError) else DomainError(str(exc)))

        return _handle_exception

    app.add_exception_handler(NotFoundError, handler(status.HTTP_404_NOT_FOUND, "not_found"))
    app.add_exception_handler(
        PermissionDeniedError,
        handler(status.HTTP_403_FORBIDDEN, "permission_denied"),
    )
    app.add_exception_handler(ConflictError, handler(status.HTTP_409_CONFLICT, "conflict"))


app = create_app()
