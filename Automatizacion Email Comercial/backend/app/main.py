from pathlib import Path

from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

from app.api.routes_draft import router as draft_router
from app.api.routes_empresas import router as empresas_router
from app.core.config import settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(key: str | None = Security(_api_key_header)) -> str:
    configured = (settings.api_key or "").strip()
    if not configured:
        return "no-key-configured"
    if key != configured:
        raise HTTPException(status_code=403, detail="API key inválida")

_PANEL_DIR = Path(__file__).resolve().parents[2] / "panel"

app = FastAPI(
    title="Openix Email Comercial API",
    version="1.0.0",
    description=(
        "Borradores de respuesta comercial B2B con IA (human-in-the-loop). "
        "Módulo independiente del chatbot."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.openix.es",
        "https://openix.es",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

app.include_router(empresas_router, dependencies=[Security(require_api_key)])
app.include_router(draft_router, dependencies=[Security(require_api_key)])

if _PANEL_DIR.is_dir():
    app.mount("/panel", StaticFiles(directory=str(_PANEL_DIR), html=True), name="panel")


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    if _PANEL_DIR.is_dir():
        return RedirectResponse(url="/panel/", status_code=302)
    return RedirectResponse(url="/health", status_code=302)


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "modulo": "email-comercial",
        "anthropic_configured": settings.anthropic_configured(),
        "empresa_default": settings.empresa_default,
        "panel": "/panel/" if _PANEL_DIR.is_dir() else None,
    }
