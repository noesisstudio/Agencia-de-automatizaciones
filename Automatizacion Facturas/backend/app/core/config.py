from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"
_DATA_DIR = _BACKEND_DIR / "data"
_STORAGE_DIR = _BACKEND_DIR / "storage"
_CREDENTIALS_DIR = _BACKEND_DIR / "credentials"


class Settings(BaseSettings):
    app_env: str = "development"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    mi_nif_empresa: str = ""
    mi_nombre_empresa: str = ""
    google_service_account_json: str = ""
    google_spreadsheet_id: str = ""
    google_sheet_name: str = "Facturas"

    database_url: str = f"sqlite:///{_DATA_DIR / 'facturai.db'}"
    secret_key: str = "change-me-in-production-use-openssl-rand"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""

    pdf_storage_path: str = str(_STORAGE_DIR / "invoices")
    upload_max_size_mb: int = 15

    cors_origins: str = "http://127.0.0.1:8010,http://localhost:8010,http://127.0.0.1:8080,http://localhost:8080"

    admin_username: str = "admin"
    admin_password: str = "admin123"
    admin_email: str = "admin@noesis.local"

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

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def anthropic_configured(self) -> bool:
        return bool((self.anthropic_api_key or "").strip())

    def google_sheets_configured(self) -> bool:
        p = self.resolved_service_account_path()
        return p is not None and p.is_file() and bool((self.google_spreadsheet_id or "").strip())

    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.email_from)

    def resolved_service_account_path(self) -> Path | None:
        raw = (self.google_service_account_json or "").strip()
        if raw:
            p = Path(raw).expanduser()
            if p.is_absolute():
                return p.resolve() if p.is_file() else None
            cand = (_BACKEND_DIR / raw).resolve()
            if cand.is_file():
                return cand
            if p.is_file():
                return p.resolve()
            return None
        # Sin variable definida: autodetectar un JSON en backend/credentials/.
        return self._autodetect_credentials()

    @staticmethod
    def _autodetect_credentials() -> Path | None:
        if not _CREDENTIALS_DIR.is_dir():
            return None
        candidates = sorted(
            p for p in _CREDENTIALS_DIR.glob("*.json") if p.is_file()
        )
        return candidates[0].resolve() if candidates else None

    def ensure_dirs(self) -> None:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
        Path(self.pdf_storage_path).mkdir(parents=True, exist_ok=True)


settings = Settings()
