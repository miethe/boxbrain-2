from __future__ import annotations

from fastapi import Header, Request

from app.application.use_cases import BoxBrainUseCases
from app.domain.models import Actor


VALID_ROLES = {"viewer", "contributor", "curator", "reviewer", "admin"}


def get_use_cases(request: Request) -> BoxBrainUseCases:
    return request.app.state.use_cases


def get_actor(
    x_boxbrain_user: str = Header(default="viewer"),
    x_boxbrain_role: str = Header(default="viewer"),
    x_boxbrain_user_id: str = Header(default="seed-viewer"),
) -> Actor:
    role = (x_boxbrain_role if x_boxbrain_role != "viewer" else x_boxbrain_user).lower()
    if role not in VALID_ROLES:
        role = "viewer"
    user_id = x_boxbrain_user_id if x_boxbrain_user_id != "seed-viewer" else x_boxbrain_user
    return Actor(user_id=user_id, role=role)
