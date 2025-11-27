from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def require_env(key: str) -> str:
    value = os.getenv(key)
    if value is None or value == "":
        raise RuntimeError(f"{key} is not set. Add it to your .env file.")
    return value


def build_database_uri() -> str:
    # Allow DATABASE_URL for backwards compatibility, but prefer discrete vars.
    if url := os.getenv("DATABASE_URL"):
        return url

    user = require_env("DB_USER")
    password = require_env("DB_PASSWORD")
    host = require_env("DB_HOST")
    port = require_env("DB_PORT")
    name = require_env("DB_NAME")

    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{name}"


class Config:
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = build_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = require_env("REDIS_URL")
    FREECURRENCY_API_URL = require_env("FREECURRENCY_API_URL")
    FREECURRENCY_API_KEY = require_env("FREECURRENCY_API_KEY")
    RATE_CACHE_TTL = int(require_env("RATE_CACHE_TTL"))
    SESSION_TTL_SECONDS = int(require_env("SESSION_TTL_SECONDS"))
    DEFAULT_BASE = require_env("DEFAULT_BASE")
    DEFAULT_SYMBOLS = [
        symbol.strip().upper() for symbol in require_env("DEFAULT_SYMBOLS").split(",")
    ]


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    RATE_CACHE_TTL = 0


class ProductionConfig(Config):
    pass


def get_config(config_name: str | None) -> type[Config]:
    mapping = {
        "development": DevelopmentConfig,
        "testing": TestingConfig,
        "production": ProductionConfig,
    }
    if config_name:
        return mapping.get(config_name.lower(), Config)
    return Config

