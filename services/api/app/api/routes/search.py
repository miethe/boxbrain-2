from fastapi import APIRouter, Depends

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(tags=["search"])


@router.post("/search", response_model=s.SearchResponse)
def search(
    request: s.SearchRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.SearchResponse:
    return use_cases.search(request, actor)


@router.post("/ask", response_model=s.SearchResponse)
def ask(
    request: s.AskRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.SearchResponse:
    return use_cases.ask(request, actor)

