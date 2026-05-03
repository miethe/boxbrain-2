from fastapi import APIRouter, Depends

from app.api.dependencies import get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.schemas import api as s

router = APIRouter(tags=["health"])


@router.get("/health", response_model=s.HealthResponse)
def health(use_cases: BoxBrainUseCases = Depends(get_use_cases)) -> s.HealthResponse:
    return use_cases.health()

