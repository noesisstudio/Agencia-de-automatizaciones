"""Límite de intentos en memoria para frenar fuerza bruta en el login.

Single-instance (Railway/Docker): un dict en memoria es suficiente. Si algún día
se escala a varias réplicas, habría que mover esto a Redis.
"""

from __future__ import annotations

import threading
import time

from fastapi import HTTPException, Request, status

_attempts: dict[str, list[float]] = {}
_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    # Detrás de un proxy (Railway/Caddy) la IP real viene en X-Forwarded-For.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_login_rate_limit(
    request: Request,
    max_attempts: int = 10,
    window_seconds: int = 300,
) -> None:
    """Lanza 429 si se superan max_attempts en la ventana. Por IP."""
    key = _client_ip(request)
    now = time.time()
    with _lock:
        hits = [t for t in _attempts.get(key, []) if now - t < window_seconds]
        hits.append(now)
        _attempts[key] = hits
        # Poda oportunista para que el dict no crezca sin límite.
        if len(_attempts) > 5000:
            for k in [k for k, v in _attempts.items() if all(now - t >= window_seconds for t in v)]:
                _attempts.pop(k, None)
        if len(hits) > max_attempts:
            retry = int(window_seconds - (now - hits[0]))
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Demasiados intentos. Espera {max(retry, 1)} segundos e inténtalo de nuevo.",
                headers={"Retry-After": str(max(retry, 1))},
            )
