"""Shared Redis client.

Redis only holds disposable data, so callers must treat it as optional: get_redis()
returns None when REDIS_URL is unset, and callers should catch redis.RedisError and
carry on rather than failing the request.
"""
from functools import lru_cache

import redis

from app.core.config import settings


@lru_cache
def get_redis() -> redis.Redis | None:
    """Return a process-wide Redis client (it pools connections), or None if not configured."""
    if not settings.REDIS_URL:
        return None
    return redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=1,  # fail fast: a slow Redis must not stall requests
        socket_timeout=1,
    )


def redis_status() -> str:
    """'ok', 'down' or 'disabled', for the health endpoint."""
    client = get_redis()
    if client is None:
        return "disabled"
    try:
        client.ping()
        return "ok"
    except redis.RedisError:
        return "down"
