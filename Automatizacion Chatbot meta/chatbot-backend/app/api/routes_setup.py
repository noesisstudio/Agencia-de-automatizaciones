"""Estado de instalación para el panel de configuración."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Query

from app.core.config import settings
from app.services import knowledge_store

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/status")
async def estado_instalacion(
    tenant_id: str = Query(default=""),
) -> dict[str, Any]:
    tid = (tenant_id or settings.chatbot_tenant_default or "default").strip()
    try:
        knowledge_store.ensure_tenant(tid)
    except ValueError:
        tid = "default"

    texto = knowledge_store.load_knowledge_text(tid)
    meta: dict[str, Any] = {}
    mp = knowledge_store.meta_path(tid)
    if mp.is_file():
        try:
            meta = json.loads(mp.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    ia_ok = bool((settings.anthropic_api_key or "").strip())
    phone_cliente = str(meta.get("meta_phone_number_id", "")).strip()
    meta_ok = bool((settings.meta_access_token or "").strip()) and bool(
        phone_cliente or (settings.meta_phone_number_id or "").strip()
    )
    verify_ok = bool((settings.meta_verify_token or "").strip())
    conocimiento_ok = len(texto.strip()) > 80
    publicado_ok = bool(meta.get("publicado_at"))

    pasos = [
        {
            "id": "api",
            "titulo": "API en marcha",
            "ok": True,
            "detalle": "Si ves este panel, la API responde.",
        },
        {
            "id": "anthropic",
            "titulo": "Clave de IA (ANTHROPIC_API_KEY)",
            "ok": ia_ok,
            "detalle": "Obligatoria para que el bot responda con sentido.",
        },
        {
            "id": "conocimiento",
            "titulo": "Documentos del chatbot",
            "ok": conocimiento_ok,
            "detalle": f"{len(texto)} caracteres en knowledge.md"
            + (" — suficiente" if conocimiento_ok else " — sube más información"),
        },
        {
            "id": "publicado",
            "titulo": "Chatbot publicado",
            "ok": publicado_ok,
            "detalle": meta.get("publicado_at") or "Pulsa Publicar en Documentos del chatbot",
        },
        {
            "id": "meta",
            "titulo": "WhatsApp del cliente",
            "ok": meta_ok,
            "detalle": phone_cliente
            or "Asigna Phone number ID en ficha del cliente o en .env",
        },
        {
            "id": "webhook",
            "titulo": "Webhook configurado en Meta",
            "ok": None,
            "detalle": "Debes completarlo en developers.facebook.com (ver página WhatsApp)",
        },
    ]

    listo_chat = ia_ok and conocimiento_ok
    listo_whatsapp = listo_chat and meta_ok and verify_ok

    return {
        "tenant_id": tid,
        "nombre": meta.get("nombre", tid),
        "publicado_at": meta.get("publicado_at"),
        "caracteres_conocimiento": len(texto),
        "listo_para_probar_chat": listo_chat,
        "listo_para_whatsapp": listo_whatsapp,
        "pasos": pasos,
        "env": {
            "anthropic_configurada": ia_ok,
            "meta_configurada": meta_ok,
            "verify_token_definido": verify_ok,
            "tenant_default": settings.chatbot_tenant_default,
        },
        "urls": {
            "webhook_path": "/whatsapp/webhook",
            "send_test": "/whatsapp/send-test",
            "health_whatsapp": "/whatsapp/health",
            "probar_chat": f"/bot/tenants/{tid}/chat",
            "diagnostico": f"/bot/tenants/{tid}/diagnostico",
        },
    }
