"""Envío de facturas por email (SMTP async)."""

from __future__ import annotations

import logging
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib

from app.core.config import settings
from app.models import Invoice

logger = logging.getLogger(__name__)


def _html_body(invoice: Invoice) -> str:
    client = invoice.client.name if invoice.client else "Cliente"
    return f"""
    <html><body style="font-family:sans-serif;color:#0f172a">
      <h2>Factura {invoice.number}</h2>
      <p>Hola {client},</p>
      <p>Adjuntamos la factura <strong>{invoice.number}</strong> por un importe de
      <strong>{invoice.total_amount:.2f} €</strong>.</p>
      <p>Saludos,<br>{settings.mi_nombre_empresa or 'Noesis FacturAI'}</p>
    </body></html>
    """


async def send_invoice_email(invoice: Invoice, pdf_path: Path, to_email: str) -> dict:
    if not settings.smtp_configured():
        return {"ok": False, "message": "SMTP no configurado en .env"}

    msg = MIMEMultipart()
    msg["From"] = settings.email_from
    msg["To"] = to_email
    msg["Subject"] = f"Factura {invoice.number}"
    msg.attach(MIMEText(_html_body(invoice), "html", "utf-8"))

    if pdf_path.is_file():
        with pdf_path.open("rb") as f:
            part = MIMEApplication(f.read(), Name=pdf_path.name)
        part["Content-Disposition"] = f'attachment; filename="{pdf_path.name}"'
        msg.attach(part)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
        logger.info("Email enviado a %s factura %s", to_email, invoice.number)
        return {"ok": True, "message": f"Enviado a {to_email}"}
    except Exception as e:
        logger.exception("send_invoice_email")
        return {"ok": False, "message": str(e)}
