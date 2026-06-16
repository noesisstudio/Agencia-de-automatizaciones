"""Comprueba por qué el chatbot no responde y qué hacer para arreglarlo."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from app.core.config import settings
from app.services import knowledge_store


@dataclass
class CheckResult:
    codigo: str
    ok: bool
    titulo: str
    detalle: str
    solucion: str
    critico: bool = True


def _check_anthropic() -> CheckResult:
    key = (settings.anthropic_api_key or "").strip()
    if not key:
        return CheckResult(
            codigo="anthropic_key",
            ok=False,
            titulo="Clave de IA no configurada",
            detalle="Falta ANTHROPIC_API_KEY en el .env del backend.",
            solucion="Añade ANTHROPIC_API_KEY en chatbot-backend/.env y reinicia uvicorn.",
        )
    return CheckResult(
        codigo="anthropic_key",
        ok=True,
        titulo="Clave de IA",
        detalle="ANTHROPIC_API_KEY configurada.",
        solucion="",
        critico=False,
    )


def _check_tenant_existe(tenant_id: str) -> CheckResult:
    tid = knowledge_store.slug_id(tenant_id)
    ok = knowledge_store.tenant_exists(tid)
    return CheckResult(
        codigo="tenant_existe",
        ok=ok,
        titulo="Cliente registrado",
        detalle=f"ID «{tid}»" if ok else f"No existe «{tid}»",
        solucion="Panel → Clientes → crea o selecciona el cliente correcto.",
        critico=not ok,
    )


def _check_conocimiento(tenant_id: str) -> CheckResult:
    knowledge_store.ensure_compiled(tenant_id)
    texto = knowledge_store.load_knowledge_text(tenant_id)
    n = len(texto.strip())
    ok = n > 80
    return CheckResult(
        codigo="conocimiento",
        ok=ok,
        titulo="Documentos del chatbot",
        detalle=f"{n} caracteres en knowledge.md",
        solucion="Panel → Documentos → texto base o PDF → Guardar y Publicar.",
        critico=not ok,
    )


def _check_publicado(tenant_id: str) -> CheckResult:
    meta = knowledge_store.cargar_meta(tenant_id)
    pub = meta.get("publicado_at")
    ok = bool(pub)
    return CheckResult(
        codigo="publicado",
        ok=ok,
        titulo="Chatbot publicado",
        detalle=pub or "Aún no publicado",
        solucion="Panel → Documentos → Publicar chatbot.",
        critico=not ok,
    )


def _check_whatsapp(tenant_id: str) -> CheckResult:
    meta = knowledge_store.cargar_meta(tenant_id)
    phone = str(meta.get("meta_phone_number_id", "")).strip()
    token = (settings.meta_access_token or "").strip()
    ok = bool(token and phone)
    detalle = phone or "Sin Phone number ID en la ficha del cliente"
    if not token:
        detalle = "Falta META_ACCESS_TOKEN en .env"
    return CheckResult(
        codigo="whatsapp",
        ok=ok,
        titulo="WhatsApp del cliente",
        detalle=detalle,
        solucion="Panel → WhatsApp → guarda el Phone number ID de Meta.",
        critico=not ok,
    )


def primer_bloqueo_critico(tenant_id: str) -> CheckResult | None:
    for fn in (
        _check_anthropic,
        lambda: _check_tenant_existe(tenant_id),
        lambda: _check_conocimiento(tenant_id),
    ):
        c = fn()
        if not c.ok and c.critico:
            return c
    return None


def mensaje_para_usuario(check: CheckResult) -> str:
    return (
        f"⚠️ {check.titulo}\n\n{check.detalle}\n\nQué hacer: {check.solucion}"
        if check.solucion
        else f"⚠️ {check.titulo}\n\n{check.detalle}"
    )


def mensaje_whatsapp_fallo(codigo: str) -> str:
    mensajes = {
        "anthropic_key": "El chatbot no puede responder: falta la clave de IA en el servidor.",
        "conocimiento": "Aún no hay documentos suficientes para este cliente.",
        "publicado": "El chatbot de este cliente no está publicado.",
        "tenant_inexistente": "Este chatbot aún no está configurado.",
        "tenant_existe": "Cliente no encontrado en el servidor.",
        "error_interno": "Error interno. Revisa los logs del backend.",
    }
    return mensajes.get(codigo, "No puedo responder ahora. Contacta con la empresa.")


def parsear_error_anthropic(status: int, body: dict) -> CheckResult:
    err = body.get("error") if isinstance(body, dict) else {}
    msg = ""
    if isinstance(err, dict):
        msg = str(err.get("message") or err.get("type") or body)
    return CheckResult(
        codigo="anthropic_api",
        ok=False,
        titulo="Error de la API de Anthropic",
        detalle=f"HTTP {status}: {msg[:200]}",
        solucion="Revisa ANTHROPIC_API_KEY, créditos y ANTHROPIC_MODEL en .env.",
    )


def parsear_error_red(exc: Exception) -> CheckResult:
    return CheckResult(
        codigo="red_ia",
        ok=False,
        titulo="Sin conexión con Anthropic",
        detalle=str(exc)[:200],
        solucion="Comprueba internet y que api.anthropic.com sea accesible.",
    )


def diagnosticar_tenant(tenant_id: str, *, incluir_whatsapp: bool = False) -> dict[str, Any]:
    tid = (tenant_id or "default").strip() or "default"
    try:
        knowledge_store.ensure_tenant(tid)
    except ValueError as e:
        return {
            "tenant_id": tid,
            "listo": False,
            "listo_con_avisos": False,
            "mensaje_resumen": str(e),
            "accion_recomendada": "Usa un ID de cliente válido (letras, números, guiones).",
            "checks": [],
            "bloqueos": [{"codigo": "tenant_invalido", "titulo": "ID inválido", "detalle": str(e)}],
            "avisos": [],
        }

    checks = [
        _check_anthropic(),
        _check_tenant_existe(tid),
        _check_conocimiento(tid),
        _check_publicado(tid),
    ]
    if incluir_whatsapp:
        checks.append(_check_whatsapp(tid))

    bloqueos = [asdict(c) for c in checks if not c.ok and c.critico]
    avisos = [asdict(c) for c in checks if not c.ok and not c.critico]
    listo = len(bloqueos) == 0
    acciones = [c.solucion for c in checks if not c.ok and c.solucion]

    return {
        "tenant_id": tid,
        "listo": listo,
        "listo_con_avisos": listo and not avisos,
        "mensaje_resumen": "Todo listo para chatear." if listo else f"{len(bloqueos)} bloqueo(s) detectado(s).",
        "accion_recomendada": acciones[0] if acciones else "",
        "checks": [asdict(c) for c in checks],
        "bloqueos": bloqueos,
        "avisos": avisos,
    }
