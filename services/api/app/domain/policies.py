from __future__ import annotations

from app.domain.errors import PermissionDeniedError
from app.domain.models import Actor


ROLE_ORDER = {
    "viewer": 0,
    "contributor": 1,
    "curator": 2,
    "reviewer": 3,
    "admin": 4,
}


def can_view_restricted(actor: Actor) -> bool:
    return actor.role in {"curator", "reviewer", "admin"}


def require_role(actor: Actor, minimum_role: str) -> None:
    if ROLE_ORDER.get(actor.role, -1) < ROLE_ORDER[minimum_role]:
        raise PermissionDeniedError(f"Requires {minimum_role} role.")


def require_review_actor(actor: Actor) -> None:
    require_role(actor, "reviewer")


def require_curator_actor(actor: Actor) -> None:
    require_role(actor, "curator")
