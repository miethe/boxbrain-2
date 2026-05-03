from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(prefix="/work-products", tags=["work-products"])


@router.get("/families", response_model=dict[str, list[s.WorkProductFamilyCard] | None])
def list_families(
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, list[s.WorkProductFamilyCard] | None]:
    return {"items": use_cases.list_work_product_families(actor), "nextCursor": None}


@router.get("/versions/{version_id}", response_model=s.WorkProductVersionDetail)
def get_version(
    version_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.WorkProductVersionDetail:
    return use_cases.get_work_product_version(version_id, actor)

