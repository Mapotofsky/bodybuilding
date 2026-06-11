from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    PROJECT_NAME: str = "IronLog"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://ironlog:ironlog123@localhost:5432/ironlog"

    # JWT
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    JWT_ALGORITHM: str = "HS256"

    # File uploads
    UPLOAD_DIR: Path = Path("uploads")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
