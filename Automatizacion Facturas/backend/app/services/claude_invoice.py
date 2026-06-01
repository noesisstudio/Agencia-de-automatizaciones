import json
import re
from typing import Any

import httpx

from app.core.config import settings

EXTRACTION_PROMPT = """Analiza esta factura y extrae los datos en JSON. Responde SOLO con JSON válido, sin markdown ni texto adicional.

Estructura exacta:
{
  "numero": "string o null",
  "fecha": "DD/MM/YYYY o null",
  "cliente": "nombre del cliente o empresa receptora de la factura",
  "nif_cliente": "NIF/CIF cliente o null",
  "emisor": "nombre quien emite la factura",
  "nif_emisor": "NIF/CIF emisor o null",
  "base_imponible": "número como string ej 100.00",
  "porcentaje_iva": "número como string ej 21",
  "cuota_iva": "número como string",
  "total": "número como string",
  "concepto": "string o null",
  "lineas": [
    {"descripcion": "string", "cantidad": 1, "precio_unitario": "0.00", "total_linea": "0.00"}
  ],
  "forma_pago": "string o null",
  "confianza": 85
}

Si no ves un campo, usa null. confianza 0-100.
"""


def _parse_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*```$", "", t)
    start = t.find("{")
    end = t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No se encontró JSON en la respuesta")
    return json.loads(t[start : end + 1])


def _detect_empresa_context(data: dict[str, Any]) -> dict[str, Any]:
    """Indica si la factura parece emitida por nuestra empresa o recibida (somos cliente)."""
    mi_nif = (settings.mi_nif_empresa or "").strip().upper().replace(" ", "")
    mi_nom = (settings.mi_nombre_empresa or "").strip().lower()
    nif_em = str(data.get("nif_emisor") or "").upper().replace(" ", "")
    nif_cli = str(data.get("nif_cliente") or "").upper().replace(" ", "")
    emisor = str(data.get("emisor") or "").lower()
    cliente = str(data.get("cliente") or "").lower()

    somos_emisor = False
    if mi_nif and mi_nif == nif_em:
        somos_emisor = True
    if mi_nom and mi_nom in emisor:
        somos_emisor = True

    somos_receptor = False
    if mi_nif and mi_nif == nif_cli:
        somos_receptor = True
    if mi_nom and mi_nom in cliente:
        somos_receptor = True

    if somos_emisor and not somos_receptor:
        rol = "emitida_por_mi_empresa"
    elif somos_receptor and not somos_emisor:
        rol = "recibida_somos_cliente"
    elif somos_emisor and somos_receptor:
        rol = "ambiguo"
    else:
        rol = "sin_coincidencia_nif_nombre"

    return {
        **data,
        "empresa_contexto": {
            "rol_detectado": rol,
            "mi_nif_configurado": bool(mi_nif),
            "mi_nombre_configurado": bool(mi_nom),
        },
    }


async def extract_invoice_from_bytes(
    file_bytes: bytes,
    media_type: str,
    filename: str,
) -> dict[str, Any]:
    if not settings.anthropic_configured():
        raise RuntimeError("Falta ANTHROPIC_API_KEY real en backend/.env. Reinicia uvicorn tras editar.")

    hint = ""
    if settings.mi_nif_empresa or settings.mi_nombre_empresa:
        hint = (
            f"\nContexto: nuestra empresa puede figurar como "
            f"NIF {settings.mi_nif_empresa or '(no NIF)'} "
            f"o nombre similar a «{settings.mi_nombre_empresa or ''}»."
        )

    content: list[dict[str, Any]]
    mt = (media_type or "application/octet-stream").lower()
    b64 = __import__("base64").standard_b64encode(file_bytes).decode("ascii")

    if mt == "application/pdf":
        content = [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": b64,
                },
            },
            {"type": "text", "text": EXTRACTION_PROMPT + hint + f"\nArchivo: {filename}"},
        ]
    elif mt.startswith("image/"):
        content = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": b64},
            },
            {"type": "text", "text": EXTRACTION_PROMPT + hint + f"\nArchivo: {filename}"},
        ]
    else:
        content = [
            {
                "type": "text",
                "text": EXTRACTION_PROMPT
                + hint
                + f"\nNo hay imagen ni PDF binario usable. Nombre archivo: {filename}. "
                "Devuelve JSON con los campos a null salvo confianza baja.",
            }
        ]

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": settings.anthropic_api_key.strip(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": content}],
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, headers=headers, json=payload)

    if not response.is_success:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise RuntimeError(f"Claude API error {response.status_code}: {detail}")

    data = response.json()
    parts: list[str] = []
    for block in data.get("content", []):
        if isinstance(block, dict) and block.get("type") == "text":
            t = block.get("text")
            if isinstance(t, str):
                parts.append(t)
    raw = "\n".join(parts).strip()
    parsed = _parse_json_object(raw)
    return _detect_empresa_context(parsed)
