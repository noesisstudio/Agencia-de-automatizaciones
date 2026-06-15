from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth_routes import router as auth_router
from app.api.client_routes import router as client_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.export_routes import router as export_router
from app.api.folder_routes import router as folder_router
from app.api.invoice_routes import legacy_router, router as invoice_router
from app.api.product_routes import router as product_router
from app.core.auth import hash_password
from app.core.config import settings
from app.database import SessionLocal, init_db
from app.models import ClientFolder, User, UserRole

logger = logging.getLogger(__name__)


def _seed_admin() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == settings.admin_username).first():
            db.add(
                User(
                    username=settings.admin_username,
                    email=settings.admin_email,
                    hashed_password=hash_password(settings.admin_password),
                    role=UserRole.admin,
                )
            )
        defaults = ["General", "Stripe", "PayPal", "Software contable"]
        for name in defaults:
            if not db.query(ClientFolder).filter(ClientFolder.name == name).first():
                db.add(ClientFolder(name=name))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.ensure_dirs()
    init_db()
    _seed_admin()
    logger.info("FacturAI DB lista en %s", settings.database_url)
    yield


app = FastAPI(
    title="Noesis FacturAI API",
    version="2.0.0",
    description="Facturación profesional: DB, auth, clientes, facturas, PDF y email.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(client_router)
app.include_router(product_router)
app.include_router(folder_router)
app.include_router(dashboard_router)
app.include_router(invoice_router)
app.include_router(legacy_router)
app.include_router(export_router)


@app.middleware("http")
async def no_cache_static(request: Request, call_next):
    """Evita que el navegador sirva módulos JS/CSS antiguos de la caché.

    Sin esto, un .js cacheado y desactualizado puede romper los `import` de la SPA
    y dejar la página en blanco. Forzamos revalidación en cada carga del front.
    """
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".js", ".css", ".html")):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error: %s", exc)
    # No exponer el mensaje interno al cliente — puede contener rutas, claves o datos sensibles
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor. Consulta los logs."})


@app.get("/health")
async def health() -> dict[str, object]:
    ac = settings.anthropic_configured()
    gs = settings.google_sheets_configured()
    return {
        "status": "ok",
        "version": "2.0.0",
        "anthropic_configured": ac,
        "google_sheets_configured": gs,
        "database": settings.database_url.split("///")[-1],
        "smtp_configured": settings.smtp_configured(),
    }


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/pagina.html", status_code=307)


# Servir solo los ficheros del frontend — nunca el directorio backend/
# parent = app/, parent.parent = backend/, parent.parent.parent = Automatizacion Facturas/
# Montamos Automatizacion Facturas/ pero bloqueamos backend/ con la ruta de exclusión
# La forma más segura: montar solo las subcarpetas conocidas del frontend.
_UI_ROOT = Path(__file__).resolve().parent.parent.parent
_FRONTEND_DIRS = ["css", "js"]

for _dir in _FRONTEND_DIRS:
    _path = _UI_ROOT / _dir
    if _path.is_dir():
        app.mount(f"/{_dir}", StaticFiles(directory=str(_path)), name=f"static_{_dir}")

# HTML principal — solo pagina.html, no exponer el directorio backend/
@app.get("/pagina.html")
async def serve_pagina():
    from fastapi.responses import FileResponse
    return FileResponse(str(_UI_ROOT / "pagina.html"))
