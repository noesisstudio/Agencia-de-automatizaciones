"""Conexión con Google Sheets para que las empresas extraigan los datos de sus facturas.

Soporta dos flujos:
  * `append_invoice()` — añade una fila a partir de los datos crudos extraídos por IA.
  * `append_db_invoice()` / `sync_invoices()` — vuelca facturas de la base de datos
    para que la hoja sea siempre un reflejo fiel de FacturAI y se pueda importar a un
    programa de contabilidad.

Todas las funciones reciben un `SheetsConfig` ya resuelto (DB + .env), de modo que este
módulo no depende de la base de datos.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import gspread
from google.oauth2.service_account import Credentials

from app.core.security import decrypt_nif
from app.services.sheets_config import SheetsConfig

if TYPE_CHECKING:
    from app.models import Invoice

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Cabeceras del flujo IA (datos crudos extraídos del documento original).
AI_HEADERS = [
    "Nº",
    "Cliente",
    "NIF cliente",
    "Fecha",
    "Base",
    "% IVA",
    "Cuota IVA",
    "Total",
    "Concepto",
    "Emisor",
    "NIF emisor",
    "Rol detectado",
    "Archivo",
]

# Cabeceras de la hoja principal (facturas gestionadas → contabilidad).
DB_HEADERS = [
    "Nº Factura",
    "Cliente",
    "NIF",
    "Fecha emisión",
    "Vencimiento",
    "Estado",
    "Base imponible",
    "Cuota IVA",
    "Retención IRPF",
    "Total",
    "Carpeta",
    "Concepto / Notas",
    "Archivo origen",
    "Creada",
]


def _client(config: SheetsConfig):
    path = config.credentials_path
    if not path or not path.is_file():
        raise RuntimeError(
            "No se encuentra el JSON de la cuenta de servicio. Copia el archivo en "
            "backend/credentials/ o define GOOGLE_SERVICE_ACCOUNT_JSON en backend/.env."
        )
    creds = Credentials.from_service_account_file(str(path), scopes=SCOPES)
    return gspread.authorize(creds)


def _open_spreadsheet(config: SheetsConfig):
    if not config.spreadsheet_id.strip():
        raise RuntimeError("Falta el ID de la hoja de cálculo (Google Spreadsheet ID).")
    return _client(config).open_by_key(config.spreadsheet_id.strip())


def _worksheet(config: SheetsConfig, title: str):
    sh = _open_spreadsheet(config)
    try:
        return sh.worksheet(title)
    except gspread.WorksheetNotFound:
        return sh.add_worksheet(title=title, rows=200, cols=len(DB_HEADERS) + 2)


def test_connection(config: SheetsConfig) -> dict[str, Any]:
    """Comprueba que se puede abrir la hoja; devuelve su título y pestañas."""
    if not config.credentials_detected:
        return {"ok": False, "message": "No se ha detectado el archivo de credenciales."}
    if not config.spreadsheet_id.strip():
        return {"ok": False, "message": "Falta el ID de la hoja de cálculo."}
    try:
        sh = _open_spreadsheet(config)
        titles = [ws.title for ws in sh.worksheets()]
        return {
            "ok": True,
            "message": f"Conectado correctamente a «{sh.title}».",
            "title": sh.title,
            "worksheets": titles,
            "spreadsheet_url": config.spreadsheet_url,
        }
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "message": _friendly_error(e, config)}


def _friendly_error(e: Exception, config: SheetsConfig | None = None) -> str:
    name = type(e).__name__
    msg = str(e)
    email = config.service_account_email if config else None
    is_permission = (
        name == "PermissionError"
        or "PERMISSION_DENIED" in msg
        or "permission" in msg.lower()
        or "403" in msg
    )
    if is_permission:
        share = (
            f" Comparte la hoja de Google con «{email}» (botón Compartir → permiso de Editor)."
            if email
            else " Comparte la hoja con el email de la cuenta de servicio (client_email del JSON) como Editor."
        )
        return "Acceso denegado por Google." + share
    is_not_found = (
        name == "SpreadsheetNotFound"
        or "404" in msg
        or "NotFound" in msg
        or "Requested entity was not found" in msg
    )
    if is_not_found:
        return "No se encontró la hoja. Revisa que el ID del Spreadsheet sea correcto."
    if "SERVICE_DISABLED" in msg or "has not been used" in msg or "is disabled" in msg:
        return (
            "La API de Google Sheets/Drive no está habilitada en tu proyecto de Google "
            "Cloud. Habilítala y vuelve a intentarlo."
        )
    return msg or f"Error de Google Sheets ({name})."


def append_invoice(config: SheetsConfig, data: dict[str, Any], filename: str) -> dict[str, Any]:
    """Añade una fila desde los datos crudos extraídos por IA (flujo /invoice/process)."""
    if not config.configured:
        return {"ok": False, "skipped": True, "message": "Sheets no configurado"}
    try:
        ws = _worksheet(config, config.ai_sheet_name)
        if not ws.get_all_values():
            ws.append_row(AI_HEADERS)
        ctx = data.get("empresa_contexto") or {}
        rol = (ctx.get("rol_detectado") or "") if isinstance(ctx, dict) else ""
        row = [
            str(data.get("numero") or ""),
            str(data.get("cliente") or ""),
            str(data.get("nif_cliente") or ""),
            str(data.get("fecha") or ""),
            str(data.get("base_imponible") or ""),
            str(data.get("porcentaje_iva") or ""),
            str(data.get("cuota_iva") or ""),
            str(data.get("total") or ""),
            str(data.get("concepto") or ""),
            str(data.get("emisor") or ""),
            str(data.get("nif_emisor") or ""),
            rol,
            filename,
        ]
        ws.append_row(row, value_input_option="USER_ENTERED")
        return {"ok": True, "skipped": False, "message": "Fila añadida en Google Sheets"}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "skipped": False, "message": _friendly_error(e)}


def _invoice_row(invoice: "Invoice") -> list[Any]:
    client = getattr(invoice, "client", None)
    client_name = client.name if client else ""
    nif = decrypt_nif(client.encrypted_nif) if client else None
    folder = getattr(invoice, "folder", None)
    folder_name = folder.name if folder else ""
    status = invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status)
    created = invoice.created_at.strftime("%Y-%m-%d %H:%M") if invoice.created_at else ""
    return [
        invoice.number or "",
        client_name,
        nif or "",
        invoice.issue_date or "",
        invoice.due_date or "",
        status,
        float(invoice.base_amount or 0),
        float(invoice.iva_amount or 0),
        float(invoice.irpf_amount or 0),
        float(invoice.total_amount or 0),
        folder_name,
        (invoice.notes or "").replace("\n", " ").strip(),
        invoice.source_filename or "",
        created,
    ]


def append_db_invoice(config: SheetsConfig, invoice: "Invoice") -> dict[str, Any]:
    """Añade una factura de la base de datos a la hoja principal (best-effort, no lanza)."""
    if not config.configured:
        return {"ok": False, "skipped": True, "message": "Sheets no configurado"}
    try:
        ws = _worksheet(config, config.sheet_name)
        if not ws.get_all_values():
            ws.append_row(DB_HEADERS)
        ws.append_row(_invoice_row(invoice), value_input_option="USER_ENTERED")
        return {"ok": True, "skipped": False, "message": "Factura añadida a Google Sheets"}
    except Exception as e:  # noqa: BLE001 — best-effort, nunca debe romper la API
        return {"ok": False, "skipped": False, "message": _friendly_error(e)}


def sync_invoices(config: SheetsConfig, invoices: list["Invoice"]) -> dict[str, Any]:
    """Vuelca TODAS las facturas dadas a la hoja principal (sincronización completa)."""
    if not config.configured:
        return {"ok": False, "skipped": True, "synced": 0, "message": "Sheets no configurado"}

    try:
        ws = _worksheet(config, config.sheet_name)
        values: list[list[Any]] = [DB_HEADERS]
        for inv in invoices:
            values.append(_invoice_row(inv))
        ws.clear()
        ws.update(values, value_input_option="USER_ENTERED")
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(_friendly_error(e, config)) from e
    return {
        "ok": True,
        "skipped": False,
        "synced": len(invoices),
        "message": f"{len(invoices)} facturas sincronizadas en Google Sheets",
        "spreadsheet_url": config.spreadsheet_url,
        "sheet_name": config.sheet_name,
    }
