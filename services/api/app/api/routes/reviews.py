from uuid import UUID

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/queues", response_model=list[s.ReviewQueueSummary])
def review_queues(use_cases: BoxBrainUseCases = Depends(get_use_cases)) -> list[s.ReviewQueueSummary]:
    return use_cases.review_queues()


@router.get("/items", response_model=dict[str, list[s.ReviewItem] | None])
def list_review_items(
    queue_type: str | None = Query(default=None, alias="queueType"),
    status: str = "open",
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> dict[str, list[s.ReviewItem] | None]:
    return {"items": use_cases.list_review_items(queue_type, status), "nextCursor": None}


@router.get("/items/{review_item_id}", response_model=s.ReviewItemDetail)
def get_review_item(
    review_item_id: UUID,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
) -> s.ReviewItemDetail:
    return use_cases.get_review_item(review_item_id)


@router.post("/items/{review_item_id}/mark-variant", response_model=None)
def mark_variant(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "mark-variant", request or s.ReviewActionRequest(), actor)


@router.post("/items/{review_item_id}/mark-similar", response_model=None)
def mark_similar(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "mark-similar", request or s.ReviewActionRequest(), actor)


@router.post("/items/{review_item_id}/merge-versions", response_model=None)
def merge_versions(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "merge-versions", request or s.ReviewActionRequest(), actor)


@router.post("/items/{review_item_id}/set-canonical", response_model=None)
def set_canonical(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "set-canonical", request or s.ReviewActionRequest(), actor)


@router.post("/items/{review_item_id}/approve", response_model=None)
def approve(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "approve", request or s.ReviewActionRequest(), actor)


@router.post("/items/{review_item_id}/reject", response_model=None)
def reject(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "reject", request or s.ReviewActionRequest(), actor)


@router.post("/items/{review_item_id}/request-changes", response_model=None)
def request_changes(
    review_item_id: UUID,
    request: s.ReviewActionRequest | None = None,
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> dict[str, Any]:
    return use_cases.review_action(review_item_id, "request-changes", request or s.ReviewActionRequest(), actor)
