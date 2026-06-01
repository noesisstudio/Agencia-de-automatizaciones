"""Cliente Anthropic y mensajes de error para el módulo de email comercial."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings


@dataclass
class CheckResult:
    codigo: str
    ok: bool
    titulo: str
    detalle: str
    solucion: str


def check_anthropic() -> CheckResult:
    if not settings.anthropic_configured():
        return CheckResult(
            codigo="anthropic_key",
            ok=False,
            titulo="Clave de IA no configurada",
            detalle="Falta ANTHROPIC_API_KEY real en backend/.env",
            solucion="Copia .env.example a .env, añade la clave y reinicia el servidor.",
        )
    return CheckResult(
        codigo="anthropic_key",
        ok=True,
        titulo="Clave de IA",
        detalle="ANTHROPIC_API_KEY configurada.",
        solucion="",
    )


def parsear_error_anthropic(status: int, body: dict[str, Any]) -> CheckResult:
    err = body.get("error") if isinstance(body.get("error"), dict) else {}
    msg = str(err.get("message") or body)
    if status == 401:
        return CheckResult(
            codigo="anthropic_auth",
            ok=False,
            titulo="Clave de IA inválida",
            detalle=msg,
            solucion="Revisa ANTHROPIC_API_KEY en .env",
        )
    return CheckResult(
        codigo="anthropic_http",
        ok=False,
        titulo=f"Error Anthropic ({status})",
        detalle=msg,
        solucion="Revisa el modelo en ANTHROPIC_MODEL o los logs.",
    )


def parsear_error_red(exc: Exception) -> CheckResult:
    return CheckResult(
        codigo="red",
        ok=False,
        titulo="Error de conexión",
        detalle=str(exc),
        solucion="Comprueba conexión a internet y firewall.",
    )


async def completar_json(system: str, user: str, *, max_tokens: int = 1800) -> tuple[str | None, CheckResult | None]:
    check = check_anthropic()
    if not check.ok:
        return None, check

    payload = {
        "model": settings.anthropic_model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload,
            )
        if not response.is_success:
            body: dict = {}
            try:
                body = response.json()
            except Exception:
                pass
            return None, parsear_error_anthropic(response.status_code, body)
        data = response.json()
    except httpx.HTTPError as exc:
        return None, parsear_error_red(exc)

    parts: list[str] = []
    for block in data.get("content", []):
        if isinstance(block, dict) and block.get("type") == "text":
            t = block.get("text")
            if isinstance(t, str) and t.strip():
                parts.append(t.strip())
    if not parts:
        return None, CheckResult(
            codigo="anthropic_vacio",
            ok=False,
            titulo="Respuesta vacía",
            detalle="Anthropic no devolvió texto.",
            solucion="Revisa ANTHROPIC_MODEL en .env.",
        )
    return "\n".join(parts), None
