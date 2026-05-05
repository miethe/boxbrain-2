from fastapi import APIRouter, Depends

from app.api.dependencies import get_actor, get_use_cases
from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor
from app.schemas import api as s

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health", response_model=s.AdminHealth)
def admin_health(
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> s.AdminHealth:
    return use_cases.admin_health(actor)


@router.get("/audit-events", response_model=list[s.AuditEvent])
def audit_events(
    use_cases: BoxBrainUseCases = Depends(get_use_cases),
    actor: Actor = Depends(get_actor),
) -> list[s.AuditEvent]:
    return use_cases.audit_events(actor)
