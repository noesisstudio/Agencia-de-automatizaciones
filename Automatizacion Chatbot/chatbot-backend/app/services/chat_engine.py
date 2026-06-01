"""Motor conversacional: Claude + knowledge.md del tenant."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.prompts import CHATBOT_SYSTEM_PROMPT
from app.services import chat_diagnostics, chat_history, knowledge_store

logger = logging.getLogger(__name__)

_NO_ENTIENDO = (
    "no entiendo",
    "no te entiendo",
    "no lo entiendo",
    "explica mejor",
    "explicame mejor",
    "más sencillo",
    "mas sencillo",
    "otra vez",
    "no me queda claro",
    "puedes repetir",
)


@dataclass
class ChatResult:
    respuesta: str
    ok: bool = True
    codigo_error: str | None = None
    solucion: str | None = None
    reformulado: bool = False


def wants_rephrase(text: str) -> bool:
    t = re.sub(r"\s+", " ", (text or "").strip().lower())
    return any(f in t for f in _NO_ENTIENDO)


async def _call_claude(system: str, user: str) -> ChatResult:
    if not settings.anthropic_api_key:
        check = chat_diagnostics._check_anthropic()
        return ChatResult(
            respuesta=chat_diagnostics.mensaje_para_usuario(check),
            ok=False,
            codigo_error=check.codigo,
            solucion=check.solucion,
        )

    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 700,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
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
            check = chat_diagnostics.parsear_error_anthropic(response.status_code, body)
            logger.error(
                "Anthropic error %s model=%s: %s",
                response.status_code,
                settings.anthropic_model,
                check.detalle,
            )
            return ChatResult(
                respuesta=chat_diagnostics.mensaje_para_usuario(check),
                ok=False,
                codigo_error=check.codigo,
                solucion=check.solucion,
            )
        data = response.json()
    except httpx.HTTPError as exc:
        check = chat_diagnostics.parsear_error_red(exc)
        logger.exception("Anthropic HTTP error")
        return ChatResult(
            respuesta=chat_diagnostics.mensaje_para_usuario(check),
            ok=False,
            codigo_error=check.codigo,
            solucion=check.solucion,
        )

    parts: list[str] = []
    for block in data.get("content", []):
        if isinstance(block, dict) and block.get("type") == "text":
            t = block.get("text")
            if isinstance(t, str) and t.strip():
                parts.append(t.strip())
    if not parts:
        return ChatResult(
            respuesta=(
                "⚠️ Sin respuesta de la IA\n\n"
                "Anthropic respondió vacío. Revisa el modelo en ANTHROPIC_MODEL (.env)."
            ),
            ok=False,
            codigo_error="anthropic_vacio",
            solucion="Prueba otro modelo o revisa logs/uvicorn.log.",
        )
    return ChatResult(respuesta="\n".join(parts), ok=True)


async def reply(
    tenant_id: str,
    session_id: str,
    message: str,
    *,
    reformular: bool = False,
    canal: str = "web",
) -> ChatResult:
    tid = knowledge_store.slug_id((tenant_id or "").strip() or "default")
    reformulado = reformular

    if not knowledge_store.tenant_exists(tid):
        logger.warning("Chat: cliente inexistente tenant=%s", tid)
        msg = (
            f"⚠️ Cliente no encontrado\n\nNo existe «{tid}». "
            "Créalo en el panel (Clientes) y guarda documentos."
            if canal != "whatsapp"
            else "Este chatbot aún no está configurado. Contacta con la empresa."
        )
        return ChatResult(
            respuesta=msg,
            ok=False,
            codigo_error="tenant_inexistente",
            solucion="Panel → Clientes → crea el cliente y guarda documentos.",
            reformulado=reformulado,
        )

    bloqueo = chat_diagnostics.primer_bloqueo_critico(tid)
    if bloqueo:
        logger.warning("Chat bloqueado tenant=%s codigo=%s", tid, bloqueo.codigo)
        msg = (
            chat_diagnostics.mensaje_whatsapp_fallo(bloqueo.codigo)
            if canal == "whatsapp"
            else chat_diagnostics.mensaje_para_usuario(bloqueo)
        )
        return ChatResult(
            respuesta=msg,
            ok=False,
            codigo_error=bloqueo.codigo,
            solucion=bloqueo.solucion,
            reformulado=reformulado,
        )

    knowledge_store.ensure_compiled(tid)
    conocimiento = knowledge_store.load_knowledge_text(tid)
    meta = knowledge_store.cargar_meta(tid)
    nombre = str(meta.get("nombre") or tid)

    logger.info(
        "Chat tenant=%s canal=%s conocimiento_chars=%s publicado=%s",
        tid,
        canal,
        len(conocimiento),
        bool(meta.get("publicado_at")),
    )

    system = CHATBOT_SYSTEM_PROMPT.format(empresa=nombre, conocimiento=conocimiento)

    if reformular:
        prev = chat_history.last(tid, session_id)
        if not prev:
            return ChatResult(
                respuesta="No tengo una respuesta anterior. Hazme una pregunta sobre la empresa.",
                ok=True,
                reformulado=True,
            )
        pregunta_prev, respuesta_prev = prev
        user = (
            f"El usuario no entendió tu respuesta.\n"
            f"Pregunta original: {pregunta_prev}\n"
            f"Tu respuesta: {respuesta_prev}\n\n"
            f"Explícalo de otra forma, más simple, con un ejemplo si ayuda.\n"
            f"Mensaje ahora: {message}"
        )
    else:
        user = message.strip()

    try:
        result = await _call_claude(system, user)
    except Exception:
        logger.exception("chat_engine tenant=%s", tid)
        return ChatResult(
            respuesta=(
                chat_diagnostics.mensaje_whatsapp_fallo("error_interno")
                if canal == "whatsapp"
                else (
                    "⚠️ Error interno del chatbot\n\n"
                    "Ha fallado el procesamiento en el servidor.\n\n"
                    f"Qué hacer: revisa logs/uvicorn.log o GET /bot/tenants/{tid}/diagnostico"
                )
            ),
            ok=False,
            codigo_error="error_interno",
            solucion="Consulta el diagnóstico en el panel (Probar chat) o los logs del backend.",
            reformulado=reformulado,
        )

    result.reformulado = reformulado
    if result.ok:
        chat_history.save(tid, session_id, message, result.respuesta)
    else:
        logger.error(
            "Chat falló tenant=%s codigo=%s canal=%s",
            tid,
            result.codigo_error,
            canal,
        )
    return result
