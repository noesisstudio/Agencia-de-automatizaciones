"""Lógica compartida de facturas (persistencia, numeración, historial)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.core.security import encrypt_nif, encrypt_text
from app.models import (
    Client,
    ClientFolder,
    CompanySettings,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    InvoiceStatusHistory,
)
from app.schemas import InvoiceLineSchema, InvoiceResponse
from app.services.tax_calculator import calculate_invoice_totals, calculate_line_totals

# Carpetas que recibe cada empresa nueva al darse de alta.
DEFAULT_FOLDERS = ["General", "Stripe", "PayPal", "Software contable"]


def ensure_default_folders(db: Session, owner_id: int) -> None:
    """Crea las carpetas por defecto para una empresa si aún no las tiene."""
    for name in DEFAULT_FOLDERS:
        exists = (
            db.query(ClientFolder)
            .filter(ClientFolder.owner_id == owner_id, ClientFolder.name == name)
            .first()
        )
        if not exists:
            db.add(ClientFolder(name=name, owner_id=owner_id))
    db.commit()


def get_or_create_company_settings(db: Session, owner_id: int) -> CompanySettings:
    row = db.query(CompanySettings).filter(CompanySettings.owner_id == owner_id).first()
    if not row:
        row = CompanySettings(owner_id=owner_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def next_invoice_number(db: Session, owner_id: int) -> str:
    cs = get_or_create_company_settings(db, owner_id)
    number = f"{cs.invoice_prefix}-{cs.next_invoice_number:05d}"
    cs.next_invoice_number += 1
    db.commit()
    return number


def _parse_amount(value: Any) -> float:
    if value is None:
        return 0.0
    s = str(value).strip().replace(",", ".")
    if not s:
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def ensure_client_from_extracted(
    db: Session,
    extracted: dict[str, Any],
    *,
    folder_id: int | None,
    user_id: int | None,
    owner_id: int,
) -> int | None:
    """Busca o crea cliente a partir de los datos extraídos por IA (dentro de la empresa)."""
    ctx = extracted.get("empresa_contexto") or {}
    rol = ctx.get("rol_detectado")
    if rol == "emitida_por_mi_empresa":
        name = str(extracted.get("cliente") or "").strip()
        nif = extracted.get("nif_cliente")
    elif rol == "recibida_somos_cliente":
        name = str(extracted.get("emisor") or "").strip()
        nif = extracted.get("nif_emisor")
    else:
        name = str(extracted.get("cliente") or extracted.get("emisor") or "").strip()
        nif = extracted.get("nif_cliente") or extracted.get("nif_emisor")
    if not name:
        return None
    client = (
        db.query(Client)
        .filter(Client.owner_id == owner_id, Client.name.ilike(name))
        .first()
    )
    if client:
        if folder_id and not client.folder_id:
            client.folder_id = folder_id
        return client.id
    client = Client(
        name=name,
        encrypted_nif=encrypt_nif(str(nif) if nif else None),
        folder_id=folder_id,
        created_by=user_id,
        owner_id=owner_id,
    )
    db.add(client)
    db.flush()
    return client.id


def apply_lines_to_invoice(
    invoice: Invoice,
    lines: list[InvoiceLineSchema],
    irpf_rate: float,
) -> None:
    invoice.lines.clear()
    line_dicts: list[dict[str, Any]] = []
    for spec in lines:
        totals = calculate_line_totals(spec.quantity, spec.unit_price, spec.iva_rate)
        line_dicts.append(
            {
                "quantity": spec.quantity,
                "unit_price": spec.unit_price,
                "iva_rate": spec.iva_rate,
            }
        )
        invoice.lines.append(
            InvoiceLine(
                description=spec.description,
                quantity=spec.quantity,
                unit_price=spec.unit_price,
                iva_rate=spec.iva_rate,
                line_total=totals["line_total"],
            )
        )
    totals = calculate_invoice_totals(line_dicts, irpf_rate)
    invoice.base_amount = totals["base_amount"]
    invoice.iva_amount = totals["iva_amount"]
    invoice.irpf_amount = totals["irpf_amount"]
    invoice.total_amount = totals["total_amount"]


def record_status_change(
    db: Session,
    invoice: Invoice,
    new_status: InvoiceStatus,
    user_id: int | None,
    note: str | None = None,
) -> None:
    old = invoice.status.value if invoice.status else None
    invoice.status = new_status
    db.add(
        InvoiceStatusHistory(
            invoice_id=invoice.id,
            old_status=old,
            new_status=new_status.value,
            changed_by=user_id,
            note=note,
        )
    )


def invoice_to_response(invoice: Invoice) -> InvoiceResponse:
    client_name = invoice.client.name if invoice.client else None
    folder_name = invoice.folder.name if invoice.folder else None
    irpf_rate = 0.0
    if invoice.base_amount and invoice.irpf_amount:
        irpf_rate = round(float(invoice.irpf_amount) / float(invoice.base_amount) * 100, 2)
    return InvoiceResponse(
        id=invoice.id,
        number=invoice.number,
        client_id=invoice.client_id,
        client_name=client_name,
        folder_id=invoice.folder_id,
        folder_name=folder_name,
        status=invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status),
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        base_amount=invoice.base_amount,
        iva_amount=invoice.iva_amount,
        irpf_amount=invoice.irpf_amount,
        irpf_rate=irpf_rate,
        total_amount=invoice.total_amount,
        notes=invoice.notes,
        payment_terms=invoice.payment_terms,
        pdf_path=invoice.pdf_path,
        source_filename=invoice.source_filename,
        lines=invoice.lines,
        status_history=invoice.status_history,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
    )


def invoice_from_extracted(
    db: Session,
    extracted: dict[str, Any],
    *,
    folder_id: int | None,
    client_id: int | None,
    user_id: int | None,
    owner_id: int,
    filename: str,
) -> Invoice:
    if not client_id:
        client_id = ensure_client_from_extracted(
            db, extracted, folder_id=folder_id, user_id=user_id, owner_id=owner_id
        )

    raw_num = str(extracted.get("numero") or "").strip()
    number = raw_num if raw_num else next_invoice_number(db, owner_id)
    existing = (
        db.query(Invoice)
        .filter(Invoice.owner_id == owner_id, Invoice.number == number)
        .first()
    )
    if existing:
        number = next_invoice_number(db, owner_id)

    invoice = Invoice(
        number=number,
        client_id=client_id,
        folder_id=folder_id,
        status=InvoiceStatus.borrador,
        issue_date=str(extracted.get("fecha") or "") or None,
        base_amount=_parse_amount(extracted.get("base_imponible")),
        iva_amount=_parse_amount(extracted.get("cuota_iva")),
        total_amount=_parse_amount(extracted.get("total")),
        notes=str(extracted.get("concepto") or "") or None,
        source_filename=filename,
        # Se cifra: contiene datos personales (NIF, nombres) y no se vuelve a leer
        # en operación normal. Protección en reposo (RGPD art. 32).
        extracted_json=encrypt_text(json.dumps(extracted, ensure_ascii=False)),
        created_by=user_id,
        owner_id=owner_id,
    )
    db.add(invoice)
    db.flush()

    raw_lines = extracted.get("lineas") or []
    if raw_lines:
        specs = []
        iva_default = _parse_amount(extracted.get("porcentaje_iva")) or 21.0
        for ln in raw_lines:
            specs.append(
                InvoiceLineSchema(
                    description=str(ln.get("descripcion") or "Línea"),
                    quantity=float(ln.get("cantidad") or 1),
                    unit_price=_parse_amount(ln.get("precio_unitario")),
                    iva_rate=iva_default,
                )
            )
        apply_lines_to_invoice(invoice, specs, 0.0)
    elif invoice.total_amount > 0 or invoice.base_amount > 0:
        apply_lines_to_invoice(
            invoice,
            [
                InvoiceLineSchema(
                    description=str(extracted.get("concepto") or "Importe factura"),
                    quantity=1,
                    unit_price=invoice.base_amount or invoice.total_amount,
                    iva_rate=_parse_amount(extracted.get("porcentaje_iva")) or 21.0,
                )
            ],
            0.0,
        )
    record_status_change(db, invoice, InvoiceStatus.borrador, user_id, "Importación IA")

    db.commit()
    db.refresh(invoice)
    return invoice
