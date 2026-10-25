"""Who's online: a Redis sorted set of user_id -> last request time (unix seconds).

Best-effort only. Without Redis (or if it's down) marking is skipped and the count
is None, so presence can never fail a request.
"""
import time

import redis

from app.core.redis import get_redis

KEY = "presence:last_seen"
ONLINE_WINDOW_SECONDS = 300  # "online" = made a request in the last 5 minutes


def mark_seen(user_id: int) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        client.zadd(KEY, {str(user_id): time.time()})
    except redis.RedisError:
        pass


def online_count(window: int = ONLINE_WINDOW_SECONDS) -> int | None:
    client = get_redis()
    if client is None:
        return None
    cutoff = time.time() - window
    try:
        client.zremrangebyscore(KEY, "-inf", cutoff)  # prune stale entries so the set stays small
        return client.zcard(KEY)
    except redis.RedisError:
        return None
