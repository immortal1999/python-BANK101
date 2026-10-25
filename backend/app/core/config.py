from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / .env file."""

    # General
    PROJECT_NAME: str = "BANK101"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite:///./bank101.db"

    # Redis (presence, caching, rate limits). Empty = Redis features off (e.g. local dev).
    REDIS_URL: str = ""

    # Security / auth
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Support chat (Gemini). The key lives in the `banking-app` Secrets Manager secret
    # under the name SUPPORT_CHAT_KEY; fetch-secrets.sh writes it into .env. Empty = chat off.
    SUPPORT_CHAT_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read once per process)."""
    return Settings()


settings = get_settings()
