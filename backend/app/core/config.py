from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Medinex AI API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str | None = None
    secret_key: str = "replace-with-a-long-random-secret"
    access_token_expire_minutes: int = 60
    admin_bootstrap_email: str | None = None
    admin_bootstrap_password: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"
    hospital_timezone: str = "Asia/Kolkata"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.app_env.lower() in {"production", "prod"}:
        if settings.secret_key == "replace-with-a-long-random-secret":
            raise ValueError("SECRET_KEY must be configured outside development.")
    return settings


settings = get_settings()
