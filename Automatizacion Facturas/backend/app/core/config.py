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
    anthropic_model: str = "claude-sonnet-4-6"
    mi_nif_empresa: str = ""
    mi_nombre_empresa: str = ""
    google_service_account_json: str = ""
    google_spreadsheet_id: str = ""
    google_sheet_name: str = "Facturas"

    database_url: str = f"sqlite:///{_DATA_DIR / 'facturai.db'}"
    secret_key: str = ""  # OBLIGATORIO en .env — ver .env.example
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24

    @field_validator("secret_key", mode="before")
    @classmethod
    def require_secret_key(cls, v: object) -> object:
        if not v or str(v).strip() in ("", "cambia_esto", "your-secret-key"):
            import secrets
            import warnings
            warnings.warn(
                "SECRET_KEY no configurada en .env. "
                "Generando una temporal — los tokens no sobrevivirán reinicios. "
                "Añade SECRET_KEY al .env con: python3 -c \"import secrets; print(secrets.token_hex(32))\"",
                stacklevel=2,
            )
            return secrets.token_hex(32)
        return v

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""

    pdf_storage_path: str = str(_STORAGE_DIR / "invoices")
    upload_max_size_mb: int = 15

    cors_origins: str = "http://127.0.0.1:8010,http://localhost:8010"

    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    admin_username: str = "admin"
    admin_password: str = ""  # OBLIGATORIO en .env
    admin_email: str = "admin@noesis.local"

    @field_validator("admin_password", mode="before")
    @classmethod
    def require_admin_password(cls, v: object) -> object:
        if not v or str(v).strip() == "":
            raise ValueError(
                "ADMIN_PASSWORD no puede estar vacío. "
                "Añádelo al .env: ADMIN_PASSWORD=tu_contraseña_segura"
            )
        return v

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
        key = (self.anthropic_api_key or "").strip()
        placeholders = {
            "sk-ant-...",
            "your-anthropic-api-key-here",
            "your_anthropic_api_key_here",
        }
        return bool(key and key.lower() not in placeholders)

    def google_sheets_configured(self) -> bool:
        p = self.resolved_service_account_path()
        return p is not None and p.is_file() and bool((self.google_spreadsheet_id or "").strip())

    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.email_from)

    def supabase_configured(self) -> bool:
        # Basta con la URL: con claves asimétricas la verificación usa el JWKS
        # del proyecto. El JWT secret solo es necesario para tokens HS256 (legacy).
        return bool((self.supabase_url or "").strip())

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
