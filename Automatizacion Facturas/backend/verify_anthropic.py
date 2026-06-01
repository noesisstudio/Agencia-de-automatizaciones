"""
Prueba mínima contra la API de Anthropic (sin factura).
Uso: desde la carpeta backend, con .venv activado:  python verify_anthropic.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Permite ejecutar desde backend/ aunque el cwd sea otro
_BACKEND = Path(__file__).resolve().parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


async def main() -> int:
    from app.core.config import settings

    if not settings.anthropic_configured():
        print("ERROR: No hay ANTHROPIC_API_KEY válida en backend/.env")
        return 1

    import httpx

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": settings.anthropic_api_key.strip(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 32,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": "Responde únicamente la palabra OK en mayúsculas."}],
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(url, headers=headers, json=payload)
    except httpx.RequestError as e:
        print("ERROR: No se pudo conectar a api.anthropic.com:", e)
        return 1

    if not r.is_success:
        print("ERROR: Anthropic devolvió", r.status_code)
        try:
            print(r.json())
        except Exception:
            print(r.text[:800])
        return 1

    body = r.json()
    parts: list[str] = []
    for block in body.get("content", []) or []:
        if isinstance(block, dict) and block.get("type") == "text":
            t = block.get("text")
            if isinstance(t, str):
                parts.append(t)
    preview = ("".join(parts).strip() or "(sin texto)").replace("\n", " ")[:120]
    print("OK: Anthropic responde correctamente.")
    print("    Modelo:", settings.anthropic_model)
    print("    Extracto:", preview)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
