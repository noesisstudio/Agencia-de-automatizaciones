from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    meta_access_token: str = ""
    meta_phone_number_id: str = ""
    meta_verify_token: str = "CHANGE_ME"
    meta_app_secret: str = ""
    # 1 / true = no comprobar X-Hub-Signature-256 (solo pruebas locales)
    meta_webhook_skip_signature: bool = False
    chatbot_tenant_default: str = "default"
    # Ruta global al catálogo JSON (si el tenant no tiene data/tenants/{id}/catalogo.json)
    presupuesto_catalogo_path: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
