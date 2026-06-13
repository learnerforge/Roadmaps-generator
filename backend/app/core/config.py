import os
import pathlib
import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PathForge AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pathforge"

    # Auth
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # AI - Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # AI - OpenAI (fallback)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Rate limiting
    AI_CALLS_PER_DAY_FREE: int = 5
    AI_CALLS_PER_DAY_REGISTERED: int = 20
    AI_CALLS_PER_DAY_PREMIUM: int = 999

    # Social OAuth
    GOOGLE_CLIENT_ID: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=str(pathlib.Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
    )

    def validate_startup(self):
        errors = []
        if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
            errors.append("JWT_SECRET must be at least 32 characters. Set a strong random value in .env")
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL must be set in .env")
        if self.DEBUG and os.environ.get("PRODUCTION"):
            errors.append("DEBUG must be False in production. Set PRODUCTION=1 and DEBUG=false")
        if errors:
            raise ValueError("\n".join(errors))


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    s.validate_startup()
    return s
