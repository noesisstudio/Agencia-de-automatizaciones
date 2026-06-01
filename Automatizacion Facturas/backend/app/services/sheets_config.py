"""Resolución de la configuración de Google Sheets.

Combina los valores del .env (Settings) con los guardados en la base de datos
(IntegrationSettings), dando prioridad a la DB cuando los campos están rellenos.

Exports principales:
    SheetsConfig         — dataclass inmutable con toda la info necesaria.
    resolve_sheets_config(db) — construye un SheetsConfig listo para usar.
    get_integration_settings(db) — devuelve (o crea) la fila de IntegrationSettings.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import settings as app_settings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


@dataclass(frozen=True)
class SheetsConfig:
    """Configuración unificada para Google Sheets (solo lectura)."""

    spreadsheet_id: str
    sheet_name: str
    ai_sheet_name: str
    auto_sync: bool
    credentials_path: Path | None
    credentials_detected: bool
    service_account_email: str

    @property
    def configured(self) -> bool:
        return self.credentials_detected and bool(self.spreadsheet_id.strip())

    @property
    def spreadsheet_url(self) -> str:
        sid = self.spreadsheet_id.strip()
        if not sid:
            return ""
        return f"https://docs.google.com/spreadsheets/d/{sid}/edit"


def _service_account_email(creds_path: Path | None) -> str:
    """Extrae el client_email del JSON de la cuenta de servicio."""
    if not creds_path or not creds_path.is_file():
        return ""
    try:
        import json

        data = json.loads(creds_path.read_text(encoding="utf-8"))
        return data.get("client_email", "")
    except Exception:  # noqa: BLE001
        return ""


def get_integration_settings(db: "Session"):
    """Devuelve la fila de IntegrationSettings (la crea si no existe)."""
    from app.models import IntegrationSettings

    row = db.query(IntegrationSettings).first()
    if not row:
        row = IntegrationSettings(
            google_spreadsheet_id="",
            google_sheet_name="",
            sheets_auto_sync=True,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def resolve_sheets_config(db: "Session") -> SheetsConfig:
    """Construye un SheetsConfig fusionando .env y DB."""
    row = get_integration_settings(db)
    creds_path = app_settings.resolved_service_account_path()
    detected = creds_path is not None and creds_path.is_file()

    # DB tiene prioridad si el campo no está vacío.
    spreadsheet_id = (row.google_spreadsheet_id or "").strip() or (
        app_settings.google_spreadsheet_id or ""
    ).strip()
    sheet_name = (row.google_sheet_name or "").strip() or (
        app_settings.google_sheet_name or "Facturas"
    ).strip()

    return SheetsConfig(
        spreadsheet_id=spreadsheet_id,
        sheet_name=sheet_name,
        ai_sheet_name="IA – Extracciones",
        auto_sync=row.sheets_auto_sync if row.sheets_auto_sync is not None else True,
        credentials_path=creds_path,
        credentials_detected=detected,
        service_account_email=_service_account_email(creds_path),
    )
