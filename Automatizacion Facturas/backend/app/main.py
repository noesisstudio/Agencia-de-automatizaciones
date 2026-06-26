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
from app.models import User, UserRole

logger = logging.getLogger(__name__)


def _migrate_db() -> None:
    """Add columns that may not exist in older databases (idempotent)."""
    from sqlalchemy import inspect, text
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        tables = set(inspector.get_table_names())

        def has_col(table: str, col: str) -> bool:
            return table in tables and col in {c["name"] for c in inspector.get_columns(table)}

        # users.supabase_id
        if "users" in tables and not has_col("users", "supabase_id"):
            db.execute(text("ALTER TABLE users ADD COLUMN supabase_id VARCHAR(255)"))
            db.commit()
            logger.info("Migración: columna supabase_id añadida a users")

        # owner_id en todas las tablas multi-empresa
        owner_tables = [
            "clients",
            "products",
            "client_folders",
            "invoices",
            "company_settings",
            "integration_settings",
        ]
        added_any = False
        for table in owner_tables:
            if table in tables and not has_col(table, "owner_id"):
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN owner_id INTEGER"))
                added_any = True
        if added_any:
            db.commit()
            logger.info("Migración: columnas owner_id añadidas")

        # PostgreSQL: elimina restricciones únicas globales heredadas del esquema
        # single-tenant. La unicidad ahora es POR empresa (owner_id + number/name).
        if db.bind.dialect.name == "postgresql":
            for stmt in (
                "ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_number_key",
                "ALTER TABLE client_folders DROP CONSTRAINT IF EXISTS client_folders_name_key",
            ):
                try:
                    db.execute(text(stmt))
                    db.commit()
                except Exception:  # noqa: BLE001
                    db.rollback()

        # Backfill: asigna los datos existentes al admin (evita datos huérfanos).
        admin = db.query(User).filter(User.username == settings.admin_username).first()
        if admin:
            # invoices/clients: usa created_by si existe, si no el admin.
            db.execute(
                text("UPDATE invoices SET owner_id = COALESCE(created_by, :aid) WHERE owner_id IS NULL"),
                {"aid": admin.id},
            )
            db.execute(
                text("UPDATE clients SET owner_id = COALESCE(created_by, :aid) WHERE owner_id IS NULL"),
                {"aid": admin.id},
            )
            for table in ("products", "client_folders", "company_settings", "integration_settings"):
                if table in tables:
                    db.execute(
                        text(f"UPDATE {table} SET owner_id = :aid WHERE owner_id IS NULL"),
                        {"aid": admin.id},
                    )
            db.commit()
    finally:
        db.close()


def _seed_admin() -> None:
    from app.services.invoice_service import ensure_default_folders
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == settings.admin_username).first()
        if not admin:
            admin = User(
                username=settings.admin_username,
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                role=UserRole.admin,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        ensure_default_folders(db, admin.id)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.ensure_dirs()
    init_db()
    _migrate_db()
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
async def security_and_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".js", ".css", ".html")):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
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
        # Solo el motor (postgresql/sqlite), NUNCA la URL completa: contiene credenciales.
        "database": (settings.database_url.split("://", 1)[0] or "desconocida"),
        "smtp_configured": settings.smtp_configured(),
        "supabase_sso": settings.supabase_configured(),
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
