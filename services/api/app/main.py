from __future__ import annotations

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
    return app


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
