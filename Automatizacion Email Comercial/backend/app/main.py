from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

from app.api.routes_draft import router as draft_router
from app.api.routes_empresas import router as empresas_router
from app.core.config import settings

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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(empresas_router)
app.include_router(draft_router)

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
