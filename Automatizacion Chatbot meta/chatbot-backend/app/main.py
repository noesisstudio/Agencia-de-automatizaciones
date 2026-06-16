from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from starlette.responses import PlainTextResponse, RedirectResponse

from app.api.routes_bot import router as bot_router
from app.api.routes_setup import router as setup_router
from app.api.routes_web import router as web_router
from app.api.routes_presupuesto import router as presupuesto_router
from app.api.routes_presupuesto import verify_webhook_handler as presupuesto_verify_webhook
from app.api.routes_whatsapp import router as whatsapp_router
from app.api.routes_whatsapp import verify_webhook_handler

_PANEL_DIR = Path(__file__).resolve().parents[2] / "panel"
_DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"

app = FastAPI(
    title="Openix Chatbot API",
    version="1.0.0",
    description="Chatbot informativo multi-cliente (panel + WhatsApp) y presupuesto WhatsApp dedicado.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.openix.es",
        "https://openix.es",
        "https://noesis.es",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(web_router, prefix="/web", tags=["web"])
app.include_router(bot_router, prefix="/bot", tags=["bot"])
app.include_router(setup_router, prefix="/bot", tags=["setup"])
app.include_router(whatsapp_router, prefix="/whatsapp", tags=["whatsapp"])
app.include_router(presupuesto_router, prefix="/presupuesto", tags=["presupuesto"])

if _PANEL_DIR.is_dir():
    app.mount("/panel", StaticFiles(directory=str(_PANEL_DIR), html=True), name="panel")

if _DOCS_DIR.is_dir():
    app.mount("/docs", StaticFiles(directory=str(_DOCS_DIR)), name="docs")


@app.get("/webhook", include_in_schema=False)
async def verify_webhook_alias(request: Request) -> PlainTextResponse:
    return await verify_webhook_handler(request)


@app.get("/presupuesto-webhook", include_in_schema=False)
async def presupuesto_webhook_alias(request: Request) -> PlainTextResponse:
    """Alias corto para Meta: callback URL /presupuesto-webhook (GET verificación)."""
    return await presupuesto_verify_webhook(request)


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    if _PANEL_DIR.is_dir():
        return RedirectResponse(url="/panel/clientes.html", status_code=302)
    return RedirectResponse(url="/health", status_code=302)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {
        "status": "ok",
        "panel": "/panel/clientes.html" if _PANEL_DIR.is_dir() else None,
    }
