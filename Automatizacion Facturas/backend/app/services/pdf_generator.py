"""Generación de PDF profesional (WeasyPrint → ReportLab → HTML)."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CompanySettings, Invoice
from app.services.invoice_service import get_or_create_company_settings

_TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _resolve_company(db: Session | None) -> tuple[str, str, str | None]:
    name = settings.mi_nombre_empresa or "Tu empresa"
    nif = settings.mi_nif_empresa or ""
    address: str | None = None
    if db is not None:
        cs = db.query(CompanySettings).first()
        if not cs:
            cs = get_or_create_company_settings(db)
        if cs.name:
            name = cs.name
        if cs.nif:
            nif = cs.nif
        address = cs.address
    return name, nif, address


def _invoice_context(invoice: Invoice, db: Session | None = None) -> dict:
    cs_name, cs_nif, cs_address = _resolve_company(db)
    return {
        "invoice": invoice,
        "lines": invoice.lines,
        "client": invoice.client,
        "company_name": cs_name,
        "company_nif": cs_nif,
        "company_address": cs_address,
        "is_draft": invoice.status.value == "borrador",
    }


def render_invoice_html(invoice: Invoice, db: Session | None = None) -> str:
    tpl = _env.get_template("factura.html")
    return tpl.render(**_invoice_context(invoice, db))


def _write_reportlab_pdf(invoice: Invoice, ctx: dict, out: Path) -> None:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    doc = SimpleDocTemplate(
        str(out),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=20,
        spaceAfter=6,
    )
    muted = ParagraphStyle("Muted", parent=styles["Normal"], fontSize=9, textColor=colors.grey)
    normal = styles["Normal"]

    story: list = []
    if ctx["is_draft"]:
        story.append(Paragraph("<b>BORRADOR — no válido como factura</b>", muted))
        story.append(Spacer(1, 6))

    story.append(Paragraph(f"Factura {invoice.number}", title_style))
    company_line = f"{ctx['company_name']}"
    if ctx["company_nif"]:
        company_line += f" · NIF {ctx['company_nif']}"
    story.append(Paragraph(f"{company_line} · Noesis", muted))
    story.append(Spacer(1, 12))

    client = invoice.client
    client_name = client.name if client else "—"
    left = (
        f"<b>Emisor</b><br/>{ctx['company_name']}<br/>"
        f"NIF: {ctx['company_nif'] or '—'}"
    )
    if ctx.get("company_address"):
        left += f"<br/>{ctx['company_address']}"
    right = f"<b>Cliente</b><br/>{client_name}"
    info = Table(
        [[Paragraph(left, normal), Paragraph(right, normal)]],
        colWidths=[doc.width / 2 - 4, doc.width / 2 - 4],
    )
    info.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(info)
    story.append(Spacer(1, 10))

    meta = Table(
        [
            ["Fecha", invoice.issue_date or "—"],
            ["Estado", invoice.status.value],
            ["Vencimiento", invoice.due_date or "—"],
        ],
        colWidths=[doc.width / 3 - 4] * 3,
    )
    meta.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(meta)
    story.append(Spacer(1, 14))

    lines = invoice.lines or []
    if lines:
        table_data = [["Descripción", "Cant.", "P. unit.", "IVA %", "Total"]]
        for ln in lines:
            table_data.append(
                [
                    ln.description,
                    f"{ln.quantity:g}",
                    f"{ln.unit_price:.2f} €",
                    f"{ln.iva_rate:g}%",
                    f"{ln.line_total:.2f} €",
                ]
            )
        col_w = [doc.width * 0.42, doc.width * 0.1, doc.width * 0.16, doc.width * 0.12, doc.width * 0.2]
        t = Table(table_data, colWidths=col_w, repeatRows=1)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(t)

    story.append(Spacer(1, 12))
    totals = [
        ["Base imponible", f"{invoice.base_amount:.2f} €"],
        ["IVA", f"{invoice.iva_amount:.2f} €"],
    ]
    if invoice.irpf_amount:
        totals.append(["Retención IRPF", f"-{invoice.irpf_amount:.2f} €"])
    totals.append(["Total", f"{invoice.total_amount:.2f} €"])
    tot = Table(totals, colWidths=[doc.width * 0.35, doc.width * 0.25], hAlign="RIGHT")
    tot.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (1, -1), (-1, -1), colors.HexColor("#6366F1")),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.lightgrey),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(tot)

    if invoice.notes:
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"<b>Notas</b><br/>{invoice.notes}", normal))

    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            "Documento generado por Noesis. Revisa importes antes de contabilizar.",
            muted,
        )
    )
    doc.build(story)


def generate_invoice_pdf(
    invoice: Invoice,
    client_folder: str = "General",
    db: Session | None = None,
) -> Path:
    settings.ensure_dirs()
    folder = Path(settings.pdf_storage_path) / client_folder.replace("/", "_")
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{invoice.number}.pdf"
    ctx = _invoice_context(invoice, db)
    html = render_invoice_html(invoice, db)

    try:
        from weasyprint import HTML  # type: ignore[import]

        HTML(string=html, base_url=str(_TEMPLATES)).write_pdf(str(out))
        return out
    except Exception:
        pass

    try:
        _write_reportlab_pdf(invoice, ctx, out)
        return out
    except Exception:
        pass

    out = out.with_suffix(".html")
    out.write_text(html, encoding="utf-8")
    return out
