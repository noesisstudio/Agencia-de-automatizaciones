from __future__ import annotations

import logging
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
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
from app.database import get_db
from app.models import User, UserRole
from app.schemas import PasswordChange, Token, UserCreate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
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
    return user


class SupabaseTokenRequest(BaseModel):
    access_token: str


@router.post("/supabase", response_model=Token)
def supabase_sso(
    body: SupabaseTokenRequest,
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    """Exchange a Supabase JWT for a FacturAI JWT (SSO from the Noesis portal)."""
    if not settings.supabase_configured():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "SSO con Supabase no configurado")

    try:
        payload = jwt.decode(
            body.access_token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
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
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Nuevo usuario SSO creado: %s (supabase: %s)", username, sub)

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cuenta desactivada")

    token = create_access_token(user.username, user.id, user.role.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user


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
