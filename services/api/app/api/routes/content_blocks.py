from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(prefix="/content-blocks", tags=["content-blocks"])


@router.get("", response_model=dict[str, list[s.ContentBlockVersionDetail] | None])
def list_content_blocks(
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> dict[str, list[s.ContentBlockVersionDetail] | None]:
    return {"items": use_cases.list_content_blocks(), "nextCursor": None}


@router.post("", response_model=s.ContentBlockVersionDetail, status_code=status.HTTP_201_CREATED)
def create_content_block(
    request: s.CreateContentBlockRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.ContentBlockVersionDetail:
    return use_cases.create_content_block(request, actor)


@router.get("/{block_id}", response_model=s.ContentBlockVersionDetail)
def get_content_block(
    block_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> s.ContentBlockVersionDetail:
    return use_cases.get_content_block(block_id)

