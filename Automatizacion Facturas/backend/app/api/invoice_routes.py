from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.models import Client, Invoice, InvoiceLine, InvoiceStatus, User
from app.schemas import (
    InvoiceCreate,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceStatusUpdate,
    InvoiceUpdate,
)
from app.services.claude_invoice import extract_invoice_from_bytes
from app.services.email_service import send_invoice_email
from app.services.invoice_service import (
    apply_lines_to_invoice,
    invoice_from_extracted,
    invoice_to_response,
    next_invoice_number,
    record_status_change,
)
from app.services.pdf_generator import generate_invoice_pdf
from app.services.sheets_config import resolve_sheets_config
from app.services.sheets_writer import append_db_invoice, append_invoice
from app.services.template_render import render_invoice_html as render_legacy_html

logger = logging.getLogger(__name__)

router = APIRouter(tags=["invoices"])


def _form_bool(value: str | bool | None, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("true", "1", "yes", "on")


def _guess_media_type(filename: str, content_type: str | None) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct and ct != "application/octet-stream":
        return ct
    fn = filename.lower()
    if fn.endswith(".pdf"):
        return "application/pdf"
    if fn.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if fn.endswith(".png"):
        return "image/png"
    if fn.endswith(".webp"):
        return "image/webp"
    return "application/octet-stream"


# --- Rutas legacy (IA + Sheets) bajo /invoice ---

legacy_router = APIRouter(prefix="/invoice", tags=["invoice-legacy"])


@legacy_router.post("/process")
async def process_invoice(
    file: UploadFile = File(...),
    include_template: str = Form("true"),
    folder_id: str | None = Form(None),
    client_id: str | None = Form(None),
    save_to_db: str = Form("true"),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> dict[str, Any]:
    folder_id_int = int(folder_id) if folder_id and str(folder_id).isdigit() else None
    client_id_int = int(client_id) if client_id and str(client_id).isdigit() else None
    do_save = _form_bool(save_to_db, True)
    with_template = _form_bool(include_template, True)
    if not file.filename:
        raise HTTPException(400, "Falta nombre de archivo")
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Archivo vacío")
    media = _guess_media_type(file.filename, file.content_type)

    try:
        extracted = await extract_invoice_from_bytes(raw, media, file.filename)
    except RuntimeError as e:
        raise HTTPException(503, str(e)) from e
    except Exception as e:
        logger.exception("extract_invoice")
        raise HTTPException(500, f"Error extrayendo factura: {e}") from e

    cfg = resolve_sheets_config(db)
    sheets_result: dict[str, Any]
    try:
        sheets_result = append_invoice(cfg, extracted, file.filename)
    except Exception as e:
        logger.exception("sheets")
        sheets_result = {"ok": False, "skipped": False, "message": str(e)}

    template_html: str | None = None
    if with_template:
        try:
            template_html = render_legacy_html(extracted, file.filename)
        except Exception as e:
            logger.exception("template")
            template_html = None

    saved_invoice: InvoiceResponse | None = None
    if do_save:
        try:
            inv = invoice_from_extracted(
                db,
                extracted,
                folder_id=folder_id_int,
                client_id=client_id_int,
                user_id=user.id if user else None,
                filename=file.filename,
            )
            saved_invoice = invoice_to_response(inv)
            # Vuelca la factura gestionada a la hoja principal (best-effort).
            if cfg.auto_sync and cfg.configured:
                sheets_result = append_db_invoice(cfg, inv)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("save_invoice")
            raise HTTPException(500, f"No se pudo guardar la factura: {e}") from e

    return {
        "filename": file.filename,
        "media_type": media,
        "extracted": extracted,
        "sheets": sheets_result,
        "sheets_configured": cfg.configured,
        "template_html": template_html,
        "invoice": saved_invoice,
    }


@legacy_router.post("/plantilla")
async def plantilla_solo(data: dict[str, Any]) -> dict[str, str]:
    fn = str(data.get("_filename") or "factura")
    inv = {k: v for k, v in data.items() if k != "_filename"}
    html = render_legacy_html(inv, fn)
    return {"html": html}


# --- CRUD facturas bajo /invoices ---

@router.get("/invoices", response_model=InvoiceListResponse)
def list_invoices(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    status: str | None = Query(None),
    client_id: int | None = Query(None),
    folder_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
) -> InvoiceListResponse:
    q = db.query(Invoice).filter(Invoice.is_deleted.is_(False))
    if status:
        try:
            q = q.filter(Invoice.status == InvoiceStatus(status))
        except ValueError as e:
            raise HTTPException(400, f"Estado no válido: {status}") from e
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    if folder_id:
        q = q.filter(Invoice.folder_id == folder_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter((Invoice.number.ilike(term)) | (Invoice.client.has(Client.name.ilike(term))))
    total = q.count()
    rows = q.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return InvoiceListResponse(
        items=[invoice_to_response(i) for i in rows],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/invoices", response_model=InvoiceResponse)
def create_invoice(
    body: InvoiceCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> InvoiceResponse:
    inv = Invoice(
        number=next_invoice_number(db),
        client_id=body.client_id,
        folder_id=body.folder_id,
        status=InvoiceStatus.borrador,
        issue_date=body.issue_date,
        due_date=body.due_date,
        notes=body.notes,
        payment_terms=body.payment_terms,
        created_by=user.id,
    )
    db.add(inv)
    db.flush()
    apply_lines_to_invoice(inv, body.lines, body.irpf_rate)
    record_status_change(db, inv, InvoiceStatus.borrador, user.id, "Creación manual")
    db.commit()
    db.refresh(inv)
    # Reflejo automático en Google Sheets (best-effort: nunca bloquea la creación).
    cfg = resolve_sheets_config(db)
    if cfg.auto_sync and cfg.configured:
        append_db_invoice(cfg, inv)
    return invoice_to_response(inv)


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> InvoiceResponse:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.is_deleted.is_(False)).first()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    return invoice_to_response(inv)


@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    body: InvoiceUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> InvoiceResponse:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.is_deleted.is_(False)).first()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    if inv.status != InvoiceStatus.borrador:
        raise HTTPException(400, "Solo se pueden editar facturas en borrador")
    if body.client_id is not None:
        inv.client_id = body.client_id
    if body.folder_id is not None:
        inv.folder_id = body.folder_id
    if body.issue_date is not None:
        inv.issue_date = body.issue_date
    if body.due_date is not None:
        inv.due_date = body.due_date
    if body.notes is not None:
        inv.notes = body.notes
    if body.payment_terms is not None:
        inv.payment_terms = body.payment_terms
    if body.lines is not None:
        apply_lines_to_invoice(inv, body.lines, body.irpf_rate or 0.0)
    db.commit()
    db.refresh(inv)
    return invoice_to_response(inv)


@router.patch("/invoices/{invoice_id}/status", response_model=InvoiceResponse)
def patch_status(
    invoice_id: int,
    body: InvoiceStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> InvoiceResponse:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    try:
        new_st = InvoiceStatus(body.status)
    except ValueError as e:
        raise HTTPException(400, "Estado no válido") from e
    record_status_change(db, inv, new_st, user.id, body.note)
    db.commit()
    db.refresh(inv)
    return invoice_to_response(inv)


@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    if inv.status != InvoiceStatus.borrador:
        raise HTTPException(400, "Solo borradores pueden eliminarse")
    inv.is_deleted = True
    db.commit()
    return {"message": "Factura eliminada"}


@router.post("/invoices/{invoice_id}/duplicate", response_model=InvoiceResponse)
def duplicate_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> InvoiceResponse:
    src = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not src:
        raise HTTPException(404, "Factura no encontrada")
    dup = Invoice(
        number=next_invoice_number(db),
        client_id=src.client_id,
        folder_id=src.folder_id,
        status=InvoiceStatus.borrador,
        issue_date=src.issue_date,
        due_date=src.due_date,
        notes=src.notes,
        payment_terms=src.payment_terms,
        created_by=user.id,
    )
    db.add(dup)
    db.flush()
    for ln in src.lines:
        dup.lines.append(
            InvoiceLine(
                description=ln.description,
                quantity=ln.quantity,
                unit_price=ln.unit_price,
                iva_rate=ln.iva_rate,
                line_total=ln.line_total,
            )
        )
    dup.base_amount = src.base_amount
    dup.iva_amount = src.iva_amount
    dup.irpf_amount = src.irpf_amount
    dup.total_amount = src.total_amount
    record_status_change(db, dup, InvoiceStatus.borrador, user.id, f"Duplicado de {src.number}")
    db.commit()
    db.refresh(dup)
    return invoice_to_response(dup)


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Factura no encontrada")
    if not inv.client or not inv.client.email:
        raise HTTPException(400, "El cliente no tiene email")
    folder = inv.folder.name if inv.folder else "General"
    pdf = generate_invoice_pdf(inv, folder, db=db)
    inv.pdf_path = str(pdf)
    email_result = await send_invoice_email(inv, pdf, inv.client.email)
    if email_result.get("ok"):
        record_status_change(db, inv, InvoiceStatus.enviada, user.id, "Enviada por email")
        db.commit()
    return {"email": email_result, "pdf": str(pdf)}
