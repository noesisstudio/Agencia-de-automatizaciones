from __future__ import annotations

import logging
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.core.config import settings
from app.core.rate_limit import check_login_rate_limit
from app.core.supabase import verify_supabase_token
from app.database import get_db
from app.models import (
    Client,
    ClientFolder,
    CompanySettings,
    IntegrationSettings,
    Invoice,
    Product,
    User,
    UserRole,
)
from app.schemas import PasswordChange, Token, UserCreate, UserResponse
from app.services.invoice_service import ensure_default_folders

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    check_login_rate_limit(request)
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")
    token = create_access_token(user.username, user.id, user.role.value)
    return Token(access_token=token)


@router.post("/register", response_model=UserResponse)
def register(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> User:
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "El usuario ya existe")
    role = UserRole.admin if body.role == "admin" else UserRole.user
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_default_folders(db, user.id)
    return user


class SupabaseTokenRequest(BaseModel):
    access_token: str


@router.post("/supabase", response_model=Token)
def supabase_sso(
    request: Request,
    body: SupabaseTokenRequest,
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    """Exchange a Supabase JWT for a FacturAI JWT (SSO from the Noesis portal)."""
    check_login_rate_limit(request)
    if not settings.supabase_configured():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "SSO con Supabase no configurado")

    try:
        payload = verify_supabase_token(body.access_token)
    except JWTError as e:
        logger.warning("Supabase JWT inválido: %s", e)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de Supabase inválido") from e

    sub = payload.get("sub")
    email = payload.get("email")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sin identificador de usuario")

    user = db.query(User).filter(User.supabase_id == sub).first()
    if not user and email:
        user = db.query(User).filter(User.email == email, User.supabase_id.is_(None)).first()
        if user:
            user.supabase_id = sub
            db.commit()

    if not user:
        username = email.split("@")[0] if email else f"sso_{sub[:8]}"
        base = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base}_{counter}"
            counter += 1

        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(secrets.token_hex(32)),
            supabase_id=sub,
            role=UserRole.user,
            is_active=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        ensure_default_folders(db, user.id)
        logger.info("Nuevo usuario SSO creado (pendiente activación): %s", username)

    if not user.is_active:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Tu cuenta está pendiente de activación. Contacta con Noesis para activar el acceso a FacturAI.",
        )

    token = create_access_token(user.username, user.id, user.role.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user


@router.get("/clients")
def list_clients(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    """List all users — both manually created and SSO (admin only).

    Nunca expone contraseñas. `is_sso` indica si el usuario entra por el portal
    Noesis (Supabase) o con usuario/contraseña gestionado aquí.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role.value,
            "is_active": u.is_active,
            "is_sso": u.supabase_id is not None,
            "is_self": u.id == admin.id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/clients", response_model=UserResponse)
def create_client(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> User:
    """Create a user with username/password (admin only).

    El usuario queda activo de inmediato y puede entrar con su usuario y
    contraseña (sin pasar por el portal Noesis).
    """
    username = body.username.strip()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(400, "El usuario ya existe")
    role = UserRole.admin if body.role == "admin" else UserRole.user
    user = User(
        username=username,
        email=(body.email or "").strip() or None,
        hashed_password=hash_password(body.password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_default_folders(db, user.id)
    logger.info("Usuario creado por admin: %s (rol=%s)", user.username, role.value)
    return user


@router.put("/clients/{user_id}/toggle")
def toggle_client_access(
    user_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Activate or deactivate a user's access (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.id == admin.id:
        raise HTTPException(400, "No puedes desactivar tu propia cuenta")
    if user.role == UserRole.admin:
        raise HTTPException(400, "No se puede desactivar a un administrador")
    user.is_active = not user.is_active
    db.commit()
    action = "activado" if user.is_active else "desactivado"
    logger.info("Acceso %s para %s (id=%d)", action, user.email or user.username, user.id)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "is_active": user.is_active,
        "message": f"Acceso {action}",
    }


class AdminPasswordReset(BaseModel):
    new_password: str


@router.put("/clients/{user_id}/password")
def admin_reset_password(
    user_id: int,
    body: AdminPasswordReset,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Reset a user's password (admin only). Solo para usuarios con contraseña local."""
    if len(body.new_password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.supabase_id is not None:
        raise HTTPException(
            400, "Este usuario entra con el portal Noesis (SSO); su contraseña se gestiona allí"
        )
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    logger.info("Contraseña restablecida por admin para %s (id=%d)", user.username, user.id)
    return {"message": "Contraseña actualizada"}


@router.delete("/clients/{user_id}")
def delete_client(
    user_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Delete a user and their orphan data (admin only) — derecho de supresión RGPD.

    Si el usuario tiene facturas, se bloquea el borrado (la ley fiscal obliga a
    conservarlas): en ese caso desactiva su acceso o exporta y borra sus datos primero.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.id == admin.id:
        raise HTTPException(400, "No puedes eliminar tu propia cuenta")
    if user.role == UserRole.admin:
        raise HTTPException(400, "No se puede eliminar a un administrador")

    invoice_count = db.query(Invoice).filter(Invoice.owner_id == user.id).count()
    if invoice_count > 0:
        raise HTTPException(
            400,
            f"Este usuario tiene {invoice_count} factura(s) que la ley obliga a conservar. "
            "Desactiva su acceso en lugar de eliminarlo.",
        )

    # Borrar datos propios (sin facturas, así que no quedan referencias colgantes).
    for model in (Client, Product, ClientFolder, CompanySettings, IntegrationSettings):
        db.query(model).filter(model.owner_id == user.id).delete(synchronize_session=False)
    username = user.username
    db.delete(user)
    db.commit()
    logger.info("Usuario eliminado por admin: %s (id=%d)", username, user_id)
    return {"message": f"Usuario {username} eliminado"}


@router.put("/change-password")
def change_password(
    body: PasswordChange,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(400, "Contraseña actual incorrecta")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Contraseña actualizada"}
