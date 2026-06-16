import hashlib
import hmac
import json
import logging
import secrets
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from starlette.responses import PlainTextResponse

from app.core.config import settings
from app.services import chat_diagnostics, chat_engine, knowledge_store
from app.services.tenant_resolver import (
    extraer_phone_number_id_meta,
    resolver_tenant_whatsapp,
)
from app.services.whatsapp_bot import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter()


def _verificar_firma_meta(raw: bytes, request: Request) -> tuple[bool, str]:
    if settings.meta_webhook_skip_signature:
        return True, "skip_por_env"

    secret = (settings.meta_app_secret or "").strip()
    if not secret:
        return True, "sin_app_secret"

    header = request.headers.get("x-hub-signature-256") or request.headers.get(
        "X-Hub-Signature-256"
    )
    if not header:
        return False, "falta_cabecera_x_hub_signature_256"
    if not header.startswith("sha256="):
        return False, "formato_firma_invalido"

    expected = hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    received = header[7:]
    if hmac.compare_digest(received, expected):
        return True, "ok"
    return False, "firma_no_coincide_con_META_APP_SECRET"


class SendTestMessageBody(BaseModel):
    to: str
    message: str
    phone_number_id: str = ""
    tenant_id: str = ""


def _extraer_texto_meta(payload: dict[str, Any]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if payload.get("object") != "whatsapp_business_account":
        return out
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            for msg in (change.get("value") or {}).get("messages") or []:
                if msg.get("type") != "text":
                    continue
                body = (msg.get("text") or {}).get("body")
                frm = msg.get("from")
                if frm and body:
                    out.append((str(frm), str(body)))
    return out


@router.get("/health")
async def whatsapp_health() -> dict[str, Any]:
    tid = (settings.chatbot_tenant_default or "default").strip()
    diag = chat_diagnostics.diagnosticar_tenant(tid, incluir_whatsapp=True)
    return {
        "status": "ok" if diag["listo"] else "degraded",
        "modulo": "chatbot_whatsapp",
        "tenant_default": settings.chatbot_tenant_default,
        "ia_configurada": bool(settings.anthropic_api_key),
        "meta_configurado": bool(
            settings.meta_access_token and settings.meta_phone_number_id
        ),
        "diagnostico_resumen": diag.get("mensaje_resumen"),
        "bloqueos": [b["codigo"] for b in diag.get("bloqueos") or []],
    }


async def verify_webhook_handler(request: Request) -> PlainTextResponse:
    params = request.query_params
    hub_mode = params.get("hub.mode", "")
    hub_verify_token = params.get("hub.verify_token", "")
    hub_challenge = params.get("hub.challenge", "")

    expected = (settings.meta_verify_token or "").strip()
    if hub_mode != "subscribe":
        raise HTTPException(status_code=403, detail="Invalid hub.mode")
    if not expected or not secrets.compare_digest(hub_verify_token, expected):
        raise HTTPException(status_code=403, detail="Invalid verify token")
    if not hub_challenge:
        raise HTTPException(status_code=400, detail="Missing hub.challenge")

    return PlainTextResponse(content=hub_challenge, media_type="text/plain")


@router.get("/webhook")
async def verify_webhook(request: Request) -> PlainTextResponse:
    return await verify_webhook_handler(request)


@router.post("/send-test")
async def enviar_mensaje_prueba(body: SendTestMessageBody) -> dict[str, Any]:
    phone_id = (body.phone_number_id or "").strip()
    if not phone_id and body.tenant_id.strip():
        try:
            meta = knowledge_store.cargar_meta(body.tenant_id.strip())
            phone_id = str(meta.get("meta_phone_number_id", "")).strip()
        except ValueError:
            phone_id = ""

    result = await send_whatsapp_message(
        body.to,
        body.message,
        phone_number_id=phone_id or None,
    )
    out: dict[str, Any] = {
        "status": "ok" if result.get("sent") else "error",
        "meta_response": result,
    }
    if not result.get("sent"):
        out["motivo"] = result.get("reason") or "Envío rechazado por Meta"
        out["solucion"] = (
            "Revisa META_ACCESS_TOKEN, Phone number ID del cliente y que el número "
            "destino esté en la lista de prueba de Meta."
        )
    return out


@router.post("/webhook")
async def receive_webhook(request: Request) -> dict[str, Any]:
    raw = await request.body()

    try:
        body = json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    if isinstance(body, dict) and body.get("object") == "whatsapp_business_account":
        firma_ok, motivo = _verificar_firma_meta(raw, request)
        if not firma_ok:
            if settings.app_env == "development":
                logger.warning(
                    "Webhook Meta: firma rechazada (%s). APP_ENV=development → se procesa igual.",
                    motivo,
                )
            else:
                logger.error("Webhook Meta bloqueado: %s", motivo)
                raise HTTPException(
                    status_code=403,
                    detail=f"Firma inválida ({motivo}).",
                )
        return await _procesar_meta(body)

    raise HTTPException(
        status_code=400,
        detail="Solo payloads de Meta. Para pruebas usa POST /whatsapp/send-test",
    )


async def _procesar_meta(payload: dict[str, Any]) -> dict[str, Any]:
    pares = _extraer_texto_meta(payload)
    if not pares:
        return {"status": "ignored"}

    tenant = resolver_tenant_whatsapp(payload)
    respuestas: list[dict[str, Any]] = []

    for wa_id, texto in pares:
        chat_error: dict[str, Any] | None = None
        try:
            reformular = chat_engine.wants_rephrase(texto)
            result = await chat_engine.reply(
                tenant, wa_id, texto, reformular=reformular, canal="whatsapp"
            )
            answer = result.respuesta
            if not result.ok:
                chat_error = {
                    "codigo": result.codigo_error,
                    "solucion": result.solucion,
                }
        except Exception:
            logger.exception("chat_engine wa_id=%s tenant=%s", wa_id, tenant)
            answer = chat_diagnostics.mensaje_whatsapp_fallo("error_interno")
            chat_error = {
                "codigo": "error_interno",
                "solucion": "Revisa logs/uvicorn.log",
            }
        meta_resp = await send_whatsapp_message(
            wa_id,
            answer,
            phone_number_id=extraer_phone_number_id_meta(payload),
        )
        entry = {**meta_resp}
        if chat_error:
            entry["chat_error"] = chat_error
        respuestas.append(entry)

    return {
        "status": "processed",
        "tenant_id": tenant,
        "meta_responses": respuestas,
    }
