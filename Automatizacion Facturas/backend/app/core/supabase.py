"""Verificación de JWT de Supabase para el SSO desde el portal Noesis.

Soporta los dos modos de firma de Supabase:
  - HS256 con el "JWT Secret" compartido (proyectos legacy).
  - Asimétrico ES256/RS256 vía JWKS (proyectos nuevos con claves `sb_publishable_`).

Así el SSO funciona sin importar cómo esté configurado el proyecto de Supabase.
"""

from __future__ import annotations

import logging
import time

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Caché simple del JWKS para no pedirlo en cada login.
_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL_SECONDS = 600  # 10 minutos


def _jwks_url() -> str:
    base = settings.supabase_url.rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json"


def _get_jwks(force: bool = False) -> dict | None:
    """Obtiene (y cachea) el JWKS del proyecto de Supabase."""
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if not force and _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    try:
        resp = httpx.get(_jwks_url(), timeout=5.0)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
        return _jwks_cache
    except Exception as e:  # noqa: BLE001
        logger.warning("No se pudo obtener el JWKS de Supabase: %s", e)
        return None


def verify_supabase_token(token: str) -> dict:
    """Valida un access_token de Supabase y devuelve su payload.

    Lanza JWTError si el token no es válido por ninguno de los métodos soportados.
    """
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise JWTError(f"Cabecera de token ilegible: {e}") from e

    alg = header.get("alg", "")

    # Camino 1: HS256 con el secreto compartido (legacy).
    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise JWTError("Token HS256 pero SUPABASE_JWT_SECRET no está configurado")
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )

    # Camino 2: asimétrico (ES256/RS256) vía JWKS.
    if alg in ("ES256", "RS256"):
        jwks = _get_jwks()
        if not jwks:
            raise JWTError("No se pudo obtener el JWKS de Supabase para verificar el token")
        kid = header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # La clave pudo rotar: refresca el JWKS una vez.
            jwks = _get_jwks(force=True)
            key = next((k for k in (jwks or {}).get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise JWTError("No se encontró la clave pública (kid) en el JWKS de Supabase")
        return jwt.decode(
            token,
            key,
            algorithms=[alg],
            options={"verify_aud": False},
        )

    raise JWTError(f"Algoritmo de firma no soportado: {alg or 'desconocido'}")
