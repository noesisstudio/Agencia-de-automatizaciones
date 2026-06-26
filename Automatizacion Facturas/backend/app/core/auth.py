"""JWT, contraseñas y dependencias de autenticación."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(username: str, user_id: int, role: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expiration_minutes)
    payload = {
        "sub": username,
        "uid": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    """Autentica por nombre de usuario o, si parece un email, también por email.

    Así un usuario creado por el admin (con email) puede entrar tanto con su
    usuario como con su correo. Los clientes del portal Noesis (SSO) tienen una
    contraseña local aleatoria, por lo que este camino no les afecta: siguen
    entrando por Supabase.
    """
    ident = (identifier or "").strip()
    user = db.query(User).filter(User.username == ident, User.is_active.is_(True)).first()
    if not user and "@" in ident:
        user = (
            db.query(User)
            .filter(func.lower(User.email) == ident.lower(), User.is_active.is_(True))
            .first()
        )
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado")
    try:
        payload = decode_token(token)
        username: str | None = payload.get("sub")
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido") from e
    if not username:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado")
    return user


async def get_current_user_optional(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        username: str | None = payload.get("sub")
    except JWTError:
        return None
    if not username:
        return None
    return db.query(User).filter(User.username == username, User.is_active.is_(True)).first()


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Se requiere rol admin")
    return user
