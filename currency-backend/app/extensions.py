from __future__ import annotations

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from redis import Redis

db = SQLAlchemy()
redis_client: Redis | None = None


def init_redis(app: Flask) -> None:
    global redis_client
    redis_client = Redis.from_url(app.config["REDIS_URL"], decode_responses=True)

