from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    app_env: str = "development"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    empresa_default: str = "openix"
    api_key: str = ""  # Clave para proteger los endpoints — define API_KEY en .env

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("anthropic_api_key", mode="before")
    @classmethod
    def strip_api_key(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    def anthropic_configured(self) -> bool:
        key = (self.anthropic_api_key or "").strip()
        placeholders = {
            "sk-ant-...",
            "your-anthropic-api-key-here",
            "your_anthropic_api_key_here",
        }
        return bool(key and key.lower() not in placeholders)


settings = Settings()
