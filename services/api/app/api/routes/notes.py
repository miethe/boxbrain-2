from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[s.Note])
def list_notes(
    target_type: str | None = Query(default=None, alias="targetType"),
    target_id: UUID | None = Query(default=None, alias="targetId"),
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> list[s.Note]:
    return use_cases.list_notes(target_type, target_id)


@router.post("", response_model=s.Note, status_code=status.HTTP_201_CREATED)
def create_note(
    request: s.CreateNoteRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.Note:
    return use_cases.create_note(request, actor)

