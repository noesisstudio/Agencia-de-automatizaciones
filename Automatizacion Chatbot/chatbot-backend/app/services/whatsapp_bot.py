"""Cliente Meta WhatsApp Cloud API."""

from __future__ import annotations

from typing import Any, Optional

import httpx

from app.core.config import settings

_GRAPH_API_VERSION = "v20.0"


async def send_whatsapp_message(
    to: str,
    message: str,
    *,
    phone_number_id: str | None = None,
) -> dict[str, Any]:
    token = (settings.meta_access_token or "").strip()
    phone_id = (phone_number_id or settings.meta_phone_number_id or "").strip()
    to_digits = "".join(c for c in (to or "") if c.isdigit())

    if not token:
        return {"sent": False, "reason": "Falta META_ACCESS_TOKEN en .env"}
    if not phone_id:
        return {
            "sent": False,
            "reason": "Falta Phone number ID (ficha del cliente o META_PHONE_NUMBER_ID en .env)",
        }
    if not to_digits:
        return {"sent": False, "reason": "Teléfono destino inválido (solo dígitos, sin +)"}
    if not (message or "").strip():
        return {"sent": False, "reason": "Mensaje vacío"}

    url = f"https://graph.facebook.com/{_GRAPH_API_VERSION}/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to_digits,
        "type": "text",
        "text": {"body": message.strip()},
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=headers, json=payload)

    data: Optional[dict[str, Any]] = None
    try:
        data = response.json()
    except Exception:
        data = None

    reason = ""
    if not response.is_success:
        err = (data or {}).get("error") if isinstance(data, dict) else None
        if isinstance(err, dict):
            reason = str(err.get("message") or err.get("error_user_msg") or err)
        else:
            reason = response.text[:300] if response.text else f"HTTP {response.status_code}"

    return {
        "sent": response.is_success,
        "status_code": response.status_code,
        "body": data,
        "reason": reason if not response.is_success else "",
        "phone_number_id": phone_id,
        "to": to_digits,
    }
