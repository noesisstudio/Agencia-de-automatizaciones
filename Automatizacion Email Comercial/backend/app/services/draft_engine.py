"""Motor de borradores comerciales B2B (human-in-the-loop)."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from app.core.prompts import SALES_EMAIL_SYSTEM_PROMPT
from app.services import anthropic_client, knowledge_store

logger = logging.getLogger(__name__)


@dataclass
class DraftResult:
    ok: bool
    analysis: dict[str, Any] | None = None
    email_draft: dict[str, str] | None = None
    knowledge_context_chars: int = 0
    codigo_error: str | None = None
    solucion: str | None = None


def _extract_json(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def _validate_payload(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]] | None:
    analysis = data.get("analysis")
    draft = data.get("email_draft")
    if not isinstance(analysis, dict) or not isinstance(draft, dict):
        return None
    subject = draft.get("subject_line")
    body = draft.get("body")
    if not isinstance(subject, str) or not isinstance(body, str):
        return None
    if not subject.strip() or not body.strip():
        return None
    questions = analysis.get("key_technical_questions")
    if not isinstance(questions, list):
        questions = []
    return (
        {
            "detected_language": str(analysis.get("detected_language") or "es"),
            "key_technical_questions": [str(q) for q in questions if q],
            "confidence_score": str(analysis.get("confidence_score") or "Medium"),
        },
        {"subject_line": subject.strip(), "body": body.strip()},
    )


def _check_empresa(empresa_id: str) -> anthropic_client.CheckResult | None:
    if not knowledge_store.empresa_exists(empresa_id):
        return anthropic_client.CheckResult(
            codigo="empresa_inexistente",
            ok=False,
            titulo="Empresa no registrada",
            detalle=f"No existe «{empresa_id}»",
            solucion="POST /empresas o crea data/empresas/{id}/meta.json y knowledge.md",
        )
    texto = knowledge_store.load_knowledge_text(empresa_id)
    if len(texto.strip()) < 80:
        return anthropic_client.CheckResult(
            codigo="conocimiento",
            ok=False,
            titulo="Documentación insuficiente",
            detalle=f"Solo {len(texto)} caracteres en knowledge.md",
            solucion="PUT /empresas/{id}/knowledge con FAQs y documentación oficial.",
        )
    return None


async def generate_draft(
    empresa_id: str,
    *,
    lead_name: str,
    lead_company: str,
    sales_rep_name: str,
    incoming_email_body: str,
    email_subject: str = "",
) -> DraftResult:
    eid = knowledge_store.slug_id((empresa_id or "").strip() or "default")
    body = (incoming_email_body or "").strip()
    if not body:
        return DraftResult(
            ok=False,
            codigo_error="email_vacio",
            solucion="Proporciona incoming_email_body con el texto del correo del lead.",
        )

    bloqueo = _check_empresa(eid)
    if bloqueo:
        return DraftResult(
            ok=False,
            codigo_error=bloqueo.codigo,
            solucion=bloqueo.solucion,
        )

    rag_query = f"{body}\n{email_subject}".strip()
    conocimiento = knowledge_store.retrieve_relevant_context(eid, rag_query)
    if not conocimiento.strip():
        conocimiento = knowledge_store.load_knowledge_text(eid)

    meta = knowledge_store.cargar_meta(eid)
    empresa = str(meta.get("nombre") or eid)

    system = SALES_EMAIL_SYSTEM_PROMPT.format(
        conocimiento=conocimiento,
        lead_name=lead_name.strip() or "Cliente",
        lead_company=lead_company.strip() or "—",
        sales_rep_name=sales_rep_name.strip() or "Equipo comercial",
        empresa=empresa,
    )

    user_parts = [f"--- INCOMING EMAIL FROM LEAD ---\n{body}"]
    if email_subject.strip():
        user_parts.insert(0, f"Original subject: {email_subject.strip()}")
    user = "\n\n".join(user_parts)

    logger.info("Draft empresa=%s rag_chars=%s", eid, len(conocimiento))

    raw, err = await anthropic_client.completar_json(system, user)
    if err:
        return DraftResult(ok=False, codigo_error=err.codigo, solucion=err.solucion)

    parsed = _extract_json(raw or "")
    if not parsed:
        return DraftResult(
            ok=False,
            codigo_error="json_invalido",
            solucion="La IA no devolvió JSON válido. Reintenta.",
        )

    validated = _validate_payload(parsed)
    if not validated:
        return DraftResult(
            ok=False,
            codigo_error="json_estructura",
            solucion="Falta analysis o email_draft con subject_line y body.",
        )

    analysis, draft = validated
    return DraftResult(
        ok=True,
        analysis=analysis,
        email_draft=draft,
        knowledge_context_chars=len(conocimiento),
    )
