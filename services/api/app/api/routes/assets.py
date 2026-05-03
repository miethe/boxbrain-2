from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from app.api.dependencies import get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.errors import NotFoundError

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/{key:path}")
def get_asset(
    key: str,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> Response:
    for stored_object in use_cases.repository.stored_objects.values():
        if stored_object.metadata.get("key") == key:
            content = use_cases.object_storage.get_bytes(key)
            return Response(content=content, media_type=stored_object.mime_type)
    raise NotFoundError("Asset not found.")
