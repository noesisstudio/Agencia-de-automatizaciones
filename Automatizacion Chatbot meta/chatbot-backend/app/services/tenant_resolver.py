"""Resuelve qué cliente (tenant) atiende un mensaje de WhatsApp."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import settings
from app.services import knowledge_store

logger = logging.getLogger(__name__)


def tenant_por_phone_number_id(phone_number_id: str) -> str | None:
    """Busca cliente con ese META_PHONE_NUMBER_ID guardado en meta.json."""
    pid = (phone_number_id or "").strip()
    if not pid:
        return None
    for t in knowledge_store.list_tenants():
        meta_path = knowledge_store.meta_path(t["tenant_id"])
        if not meta_path.is_file():
            continue
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if str(meta.get("meta_phone_number_id", "")).strip() == pid:
            return t["tenant_id"]
    return None


def extraer_phone_number_id_meta(payload: dict[str, Any]) -> str | None:
    """Phone number ID del payload entrante de Meta."""
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            meta = value.get("metadata") or {}
            pid = meta.get("phone_number_id")
            if pid:
                return str(pid)
    return None


def _default_tenant_valido() -> str | None:
    default = knowledge_store.slug_id(settings.chatbot_tenant_default or "")
    if default and knowledge_store.tenant_exists(default):
        return default
    return None


def resolver_tenant_whatsapp(payload: dict[str, Any]) -> str:
    """
    1) Por phone_number_id del mensaje → cliente configurado en panel.
    2) Si coincide con META_PHONE_NUMBER_ID global → CHATBOT_TENANT_DEFAULT (si existe).
    3) Si no, primer cliente publicado.
    4) Si no, primer cliente en disco.
    """
    pid = extraer_phone_number_id_meta(payload)

    if pid:
        tid = tenant_por_phone_number_id(pid)
        if tid:
            logger.info("WhatsApp tenant=%s (phone_number_id=%s)", tid, pid)
            return tid

        global_pid = (settings.meta_phone_number_id or "").strip()
        if global_pid and pid == global_pid:
            default = _default_tenant_valido()
            if default:
                logger.info(
                    "WhatsApp tenant=%s (phone global .env, pid=%s)", default, pid
                )
                return default
            published = [
                t["tenant_id"]
                for t in knowledge_store.list_tenants()
                if t.get("publicado_at")
            ]
            if len(published) == 1:
                logger.info(
                    "WhatsApp tenant=%s (único publicado, pid global)", published[0]
                )
                return published[0]

    default = _default_tenant_valido()
    if default:
        logger.info("WhatsApp tenant=%s (CHATBOT_TENANT_DEFAULT)", default)
        return default

    for t in knowledge_store.list_tenants():
        if t.get("publicado_at"):
            logger.info("WhatsApp tenant=%s (primer publicado)", t["tenant_id"])
            return t["tenant_id"]

    tenants = knowledge_store.list_tenants()
    if tenants:
        logger.info("WhatsApp tenant=%s (único en disco)", tenants[0]["tenant_id"])
        return tenants[0]["tenant_id"]

    logger.warning("WhatsApp sin clientes; usando «default»")
    return "default"
