"""Borradores de email comercial (sin envío automático)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import draft_engine

router = APIRouter(tags=["borrador"])


class DraftBody(BaseModel):
    lead_name: str = Field(..., min_length=1, max_length=120)
    lead_company: str = Field("", max_length=200)
    sales_rep_name: str = Field(..., min_length=1, max_length=120)
    incoming_email_body: str = Field(..., min_length=10)
    email_subject: str = Field("", max_length=300)


class DraftResponse(BaseModel):
    ok: bool
    analysis: dict[str, Any] | None = None
    email_draft: dict[str, str] | None = None
    knowledge_context_chars: int = 0
    codigo_error: str | None = None
    solucion: str | None = None
    disclaimer: str = (
        "BORRADOR — Revisar y enviar manualmente. No se ha enviado ningún correo al cliente."
    )


@router.post("/empresas/{empresa_id}/draft", response_model=DraftResponse)
async def crear_borrador(empresa_id: str, body: DraftBody) -> DraftResponse:
    """
    Genera borrador JSON para el comercial (Make, CRM, Gmail).

    Variables equivalentes al webhook: lead_name, lead_company, sales_rep_name,
    incoming_email_body, email_subject.
    """
    result = await draft_engine.generate_draft(
        empresa_id,
        lead_name=body.lead_name,
        lead_company=body.lead_company,
        sales_rep_name=body.sales_rep_name,
        incoming_email_body=body.incoming_email_body,
        email_subject=body.email_subject,
    )
    if not result.ok and result.codigo_error == "empresa_inexistente":
        raise HTTPException(status_code=404, detail=result.solucion)

    return DraftResponse(
        ok=result.ok,
        analysis=result.analysis,
        email_draft=result.email_draft,
        knowledge_context_chars=result.knowledge_context_chars,
        codigo_error=result.codigo_error,
        solucion=result.solucion,
    )
