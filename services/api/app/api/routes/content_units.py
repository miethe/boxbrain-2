from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(prefix="/content-units", tags=["content-units"])


@router.get("/families", response_model=dict[str, list[s.ContentUnitFamilyCard] | None])
def list_families(
    approval_state: s.ApprovalState | None = Query(default=None, alias="approvalState"),
    freshness_state: s.FreshnessState | None = Query(default=None, alias="freshnessState"),
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, list[s.ContentUnitFamilyCard] | None]:
    return {
        "items": use_cases.list_content_unit_families(
            actor,
            approval_state=approval_state,
            freshness_state=freshness_state,
        ),
        "nextCursor": None,
    }


@router.get("/families/{family_id}", response_model=s.ContentUnitFamilyDetail)
def get_family(
    family_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.ContentUnitFamilyDetail:
    return use_cases.get_content_unit_family(family_id, actor)


@router.get("/families/{family_id}/variants", response_model=dict[str, list[s.ContentUnitVariant]])
def list_variants(
    family_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, list[s.ContentUnitVariant]]:
    return {"items": use_cases.list_content_unit_variants(family_id, actor)}


@router.get("/variants/{variant_id}/versions", response_model=dict[str, list[s.ContentUnitVersion]])
def list_versions(
    variant_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, list[s.ContentUnitVersion]]:
    return {"items": use_cases.list_content_unit_versions(variant_id, actor)}


@router.get("/versions/{version_id}", response_model=s.ContentUnitVersionDetail)
def get_version(
    version_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.ContentUnitVersionDetail:
    return use_cases.get_content_unit_version(version_id, actor)


@router.post("/variants/{variant_id}/canonical", response_model=s.ContentUnitVariant)
def set_canonical(
    variant_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.ContentUnitVariant:
    return use_cases.set_content_unit_canonical(
        variant_id,
        actor,
        reason=request.reason if request else None,
    )


@router.patch("/versions/{version_id}/approval", response_model=s.ContentUnitVersion)
def update_approval(
    version_id: UUID,
    request: s.UpdateApprovalRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.ContentUnitVersion:
    return use_cases.update_content_unit_approval(
        version_id,
        request.approvalState,
        actor,
        notes=request.notes,
    )


@router.patch("/versions/{version_id}/freshness", response_model=s.ContentUnitVersion)
def update_freshness(
    version_id: UUID,
    request: s.UpdateFreshnessRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.ContentUnitVersion:
    return use_cases.update_content_unit_freshness(
        version_id,
        request.freshnessState,
        actor,
        notes=request.notes,
    )


@router.get("/{version_id}/similar", response_model=list[s.SearchResultItem])
def similar(
    version_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> list[s.SearchResultItem]:
    return use_cases.similar_content_units(version_id, actor)


@router.get("/{version_id}/where-used", response_model=list[s.ContentUnitUsageReference])
def where_used(
    version_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> list[s.ContentUnitUsageReference]:
    return use_cases.where_used(version_id, actor)
