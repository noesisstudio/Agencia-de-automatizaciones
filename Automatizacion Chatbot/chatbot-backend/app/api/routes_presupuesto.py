"""
API de presupuesto personalizado por WhatsApp.

Misma integración Meta que /whatsapp (webhook, firma, envío), pero solo el motor
de menú numerado + LISTO + IVA — sin chat con IA ni knowledge.md.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.responses import PlainTextResponse

from app.core.config import settings
from app.services import knowledge_store, presupuesto_store
from app.services.motor_presupuesto import bloques_a_texto
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


class SimularBody(BaseModel):
    wa_id: str = Field(..., description="Teléfono simulado (ej. 34600000000)")
    texto: str = Field(..., description="Mensaje del cliente")
    tenant_id: str = ""


class SendTestMessageBody(BaseModel):
    to: str
    message: str
    phone_number_id: str = ""
    tenant_id: str = ""


class CatalogoBody(BaseModel):
    empresa: str = "Tu empresa"
    moneda: str = "EUR"
    iva_porcentaje: float = 21
    mensaje_bienvenida_extra: str = ""
    servicios: list[dict[str, Any]] = Field(default_factory=list)


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


@router.get("/health")
async def presupuesto_health(tenant_id: str = "") -> dict[str, Any]:
    tid = (tenant_id or settings.chatbot_tenant_default or "default").strip()
    diag = presupuesto_store.diagnostico_presupuesto(tid)
    return {
        "status": "ok" if diag["listo"] else "degraded",
        "modulo": "presupuesto_whatsapp",
        "tenant": tid,
        "meta_configurado": bool(
            settings.meta_access_token and settings.meta_phone_number_id
        ),
        "diagnostico": diag,
        "webhook_url": "/presupuesto/webhook",
    }


@router.post("/simular")
async def simular_presupuesto(body: SimularBody) -> dict[str, Any]:
    tid = (body.tenant_id or settings.chatbot_tenant_default or "default").strip()
    try:
        motor = presupuesto_store.get_motor(tid)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    bloques = motor.procesar_mensaje(body.wa_id.strip(), body.texto)
    return {
        "tenant_id": tid,
        "wa_id": body.wa_id,
        "texto_entrada": body.texto,
        "bloques": bloques,
        "respuesta": bloques_a_texto(bloques),
    }


@router.get("/tenants/{tenant_id}/catalogo")
async def obtener_catalogo(tenant_id: str) -> dict[str, Any]:
    try:
        cat = presupuesto_store.leer_catalogo(tenant_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {
        "tenant_id": knowledge_store.slug_id(tenant_id),
        "ruta": str(presupuesto_store.catalogo_path(tenant_id)),
        "catalogo": cat,
    }


@router.put("/tenants/{tenant_id}/catalogo")
async def actualizar_catalogo(tenant_id: str, body: CatalogoBody) -> dict[str, Any]:
    data = body.model_dump()
    if not data.get("servicios"):
        raise HTTPException(status_code=400, detail="servicios no puede estar vacío")
    path = presupuesto_store.guardar_catalogo(tenant_id, data)
    return {
        "status": "ok",
        "tenant_id": knowledge_store.slug_id(tenant_id),
        "ruta": str(path),
        "servicios": len(data["servicios"]),
    }


@router.get("/tenants/{tenant_id}/diagnostico")
async def diagnostico_tenant(tenant_id: str) -> dict[str, Any]:
    return presupuesto_store.diagnostico_presupuesto(tenant_id)


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
        "modulo": "presupuesto_whatsapp",
        "meta_response": result,
    }
    if not result.get("sent"):
        out["motivo"] = result.get("reason") or "Envío rechazado por Meta"
        out["solucion"] = (
            "Revisa META_ACCESS_TOKEN, Phone number ID del cliente y lista de prueba Meta."
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
                    "Presupuesto webhook: firma rechazada (%s). development → se procesa.",
                    motivo,
                )
            else:
                logger.error("Presupuesto webhook bloqueado: %s", motivo)
                raise HTTPException(
                    status_code=403,
                    detail=f"Firma inválida ({motivo}).",
                )
        return await _procesar_meta_presupuesto(body)

    raise HTTPException(
        status_code=400,
        detail="Solo payloads de Meta. Prueba: POST /presupuesto/simular o /presupuesto/send-test",
    )


async def _procesar_meta_presupuesto(payload: dict[str, Any]) -> dict[str, Any]:
    pares = _extraer_texto_meta(payload)
    if not pares:
        return {"status": "ignored", "modulo": "presupuesto_whatsapp"}

    tenant = resolver_tenant_whatsapp(payload)
    phone_id = extraer_phone_number_id_meta(payload)
    respuestas: list[dict[str, Any]] = []

    try:
        motor = presupuesto_store.get_motor(tenant)
    except FileNotFoundError as e:
        logger.error("Presupuesto sin catálogo tenant=%s: %s", tenant, e)
        for wa_id, _ in pares:
            meta_resp = await send_whatsapp_message(
                wa_id,
                "⚠️ Presupuesto no disponible: falta configurar el catálogo de servicios.",
                phone_number_id=phone_id,
            )
            respuestas.append({**meta_resp, "error": "sin_catalogo"})
        return {
            "status": "error",
            "modulo": "presupuesto_whatsapp",
            "tenant_id": tenant,
            "meta_responses": respuestas,
        }

    for wa_id, texto in pares:
        try:
            bloques = motor.procesar_mensaje(wa_id, texto)
            mensajes = [b.strip() for b in bloques if (b or "").strip()]
            if not mensajes:
                mensajes = ["Escribe un número del catálogo o AYUDA."]
        except Exception:
            logger.exception("motor_presupuesto wa_id=%s tenant=%s", wa_id, tenant)
            mensajes = [
                "Ha ocurrido un error al calcular el presupuesto. Escribe REINICIAR o contacta con la empresa."
            ]

        envios: list[dict[str, Any]] = []
        for msg in mensajes:
            meta_resp = await send_whatsapp_message(
                wa_id,
                msg,
                phone_number_id=phone_id,
            )
            envios.append(meta_resp)
        respuestas.append({"wa_id": wa_id, "envios": envios, "bloques": len(mensajes)})

    return {
        "status": "processed",
        "modulo": "presupuesto_whatsapp",
        "tenant_id": tenant,
        "meta_responses": respuestas,
    }
