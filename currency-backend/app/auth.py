from __future__ import annotations

import secrets
from typing import Optional

from flask import current_app, request

from .extensions import redis_client

TOKEN_PREFIX = "auth:token:"


def _token_key(token: str) -> str:
    return f"{TOKEN_PREFIX}{token}"


def issue_token(user_id: int) -> str:
    if not redis_client:
        raise RuntimeError("Redis is not configured; cannot issue auth tokens.")
    token = secrets.token_urlsafe(32)
    redis_client.setex(
        _token_key(token),
        current_app.config["SESSION_TTL_SECONDS"],
        str(user_id),
    )
    return token


def revoke_token(token: str) -> None:
    if redis_client:
        redis_client.delete(_token_key(token))


def resolve_token(token: str) -> Optional[int]:
    if not redis_client:
        return None
    user_id = redis_client.get(_token_key(token))
    if user_id is None:
        return None
    try:
        return int(user_id)
    except ValueError:
        return None


def extract_bearer_token() -> Optional[str]:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1].strip()
    # fallback to JSON payload if necessary
    payload = request.get_json(silent=True) or {}
    token = payload.get("token")
    if isinstance(token, str):
        return token
    return None

