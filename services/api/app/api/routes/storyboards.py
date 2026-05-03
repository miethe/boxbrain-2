from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(tags=["storyboards"])


@router.get("/storyboards", response_model=dict[str, list[s.Storyboard] | None])
def list_storyboards(
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> dict[str, list[s.Storyboard] | None]:
    return {"items": use_cases.list_storyboards(), "nextCursor": None}


@router.post("/storyboards", response_model=s.Storyboard, status_code=status.HTTP_201_CREATED)
def create_storyboard(
    request: s.CreateStoryboardRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.Storyboard:
    return use_cases.create_storyboard(request, actor)


@router.get("/storyboards/{storyboard_id}", response_model=s.StoryboardDetail)
def get_storyboard(
    storyboard_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> s.StoryboardDetail:
    return use_cases.get_storyboard(storyboard_id)


@router.get("/storyboards/{storyboard_id}/snapshots", response_model=list[s.StoryboardSnapshot])
def list_snapshots(
    storyboard_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> list[s.StoryboardSnapshot]:
    return use_cases.list_storyboard_snapshots(storyboard_id)


@router.post("/storyboards/{storyboard_id}/snapshots", response_model=s.StoryboardSnapshot)
def create_snapshot(
    storyboard_id: UUID,
    request: s.CreateStoryboardSnapshotRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.StoryboardSnapshot:
    return use_cases.create_storyboard_snapshot(
        storyboard_id,
        request or s.CreateStoryboardSnapshotRequest(),
        actor,
    )


@router.get("/storyboard-snapshots/{snapshot_id}", response_model=s.StoryboardSnapshot)
def get_snapshot(
    snapshot_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> s.StoryboardSnapshot:
    return use_cases.get_storyboard_snapshot(snapshot_id)


@router.post("/storyboards/{storyboard_id}/sections", response_model=s.StoryboardSection, status_code=status.HTTP_201_CREATED)
def create_section(
    storyboard_id: UUID,
    request: s.CreateStoryboardSectionRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.StoryboardSection:
    return use_cases.create_storyboard_section(storyboard_id, request, actor)


@router.patch("/storyboard-sections/{section_id}", response_model=s.StoryboardSection)
def update_section(
    section_id: UUID,
    request: s.CreateStoryboardSectionRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.StoryboardSection:
    return use_cases.update_storyboard_section(section_id, request, actor)


@router.post("/storyboard-sections/{section_id}/slots", response_model=s.StoryboardSlot, status_code=status.HTTP_201_CREATED)
def create_slot(
    section_id: UUID,
    request: s.CreateStoryboardSlotRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.StoryboardSlot:
    return use_cases.create_storyboard_slot(section_id, request, actor)


@router.patch("/storyboard-slots/{slot_id}", response_model=s.StoryboardSlot)
def update_slot(
    slot_id: UUID,
    request: s.UpdateStoryboardSlotRequest,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.StoryboardSlot:
    return use_cases.update_storyboard_slot(slot_id, request, actor)


@router.post("/storyboards/{storyboard_id}/analyze", response_model=s.StoryboardDiagnostics)
def analyze_storyboard(
    storyboard_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> s.StoryboardDiagnostics:
    return use_cases.analyze_storyboard(storyboard_id)
