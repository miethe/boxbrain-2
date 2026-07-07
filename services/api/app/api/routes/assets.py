from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.errors import NotFoundError, PermissionDeniedError
from app.domain.models import Actor
from app.domain.policies import can_view_restricted

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/{key:path}")
def get_asset(
    key: str,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> Response:
    stored_object = use_cases.repository.stored_object_by_key.get(key)
    if stored_object is None:
        raise NotFoundError("Asset not found.")
    # Enforce same restricted-visibility policy as detail/thumbnail routes: if the asset
    # belongs to a restricted version/family the actor cannot view, return 403.
    if not can_view_restricted(actor):
        asset_uri = stored_object.storage_uri
        if use_cases.is_asset_restricted(asset_uri):
            raise PermissionDeniedError("Asset belongs to a restricted object.")
    content = use_cases.object_storage.get_bytes(key)
    return Response(content=content, media_type=stored_object.mime_type)
