"""Solo validación de datos de entrada y salida con Pydantic."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6)
    email: str | None = None
    role: str = "user"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    role: str
    is_active: bool
    created_at: datetime


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class ClientFolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class ClientFolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    nif: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    folder_id: int | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    nif: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    folder_id: int | None = None


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    nif_masked: str | None = None
    email: str | None
    phone: str | None
    address: str | None
    folder_id: int | None
    folder_name: str | None = None
    invoice_count: int = 0
    total_billed: float = 0.0
    created_at: datetime


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    unit_price: float = Field(ge=0)
    iva_rate: float = Field(default=21.0, ge=0, le=100)
    code: str | None = None
    unit: str = "ud"


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    unit_price: float | None = Field(default=None, ge=0)
    iva_rate: float | None = Field(default=None, ge=0, le=100)
    code: str | None = None
    unit: str | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    unit_price: float
    iva_rate: float
    code: str | None
    unit: str
    created_at: datetime


class InvoiceLineSchema(BaseModel):
    description: str
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(ge=0)
    iva_rate: float = Field(default=21.0, ge=0, le=100)


class InvoiceCreate(BaseModel):
    client_id: int | None = None
    folder_id: int | None = None
    issue_date: str | None = None
    due_date: str | None = None
    lines: list[InvoiceLineSchema] = Field(min_length=1)
    irpf_rate: float = Field(default=0.0, ge=0, le=100)
    notes: str | None = None
    payment_terms: str | None = None


class InvoiceUpdate(BaseModel):
    client_id: int | None = None
    folder_id: int | None = None
    issue_date: str | None = None
    due_date: str | None = None
    lines: list[InvoiceLineSchema] | None = None
    irpf_rate: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    payment_terms: str | None = None


class InvoiceStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class InvoiceLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    quantity: float
    unit_price: float
    iva_rate: float
    line_total: float


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: str | None
    new_status: str
    note: str | None
    created_at: datetime


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    client_id: int | None
    client_name: str | None = None
    folder_id: int | None
    folder_name: str | None = None
    status: str
    issue_date: str | None
    due_date: str | None
    base_amount: float
    iva_amount: float
    irpf_amount: float
    irpf_rate: float = 0.0
    total_amount: float
    notes: str | None
    payment_terms: str | None
    pdf_path: str | None
    source_filename: str | None
    lines: list[InvoiceLineResponse] = []
    status_history: list[StatusHistoryResponse] = []
    created_at: datetime
    updated_at: datetime


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    limit: int


class DashboardStats(BaseModel):
    total_invoices: int
    draft_count: int
    sent_count: int
    paid_count: int
    overdue_count: int
    monthly_revenue: float
    monthly_change_pct: float
    total_clients: int
    total_products: int


class ChartMonthPoint(BaseModel):
    month: str
    total: float
    count: int


class ChartStatusPoint(BaseModel):
    status: str
    count: int


class DashboardChartData(BaseModel):
    monthly: list[ChartMonthPoint]
    by_status: list[ChartStatusPoint]


class CompanySettingsUpdate(BaseModel):
    name: str | None = None
    nif: str | None = None
    address: str | None = None
    email: str | None = None
    invoice_prefix: str | None = None
    default_iva_rate: float | None = None
    default_irpf_rate: float | None = None


class CompanySettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    nif: str
    address: str | None
    email: str | None
    invoice_prefix: str
    next_invoice_number: int
    default_iva_rate: float
    default_irpf_rate: float


class SheetsConfigUpdate(BaseModel):
    google_spreadsheet_id: str | None = None
    google_sheet_name: str | None = None
    sheets_auto_sync: bool | None = None


class SheetsStatusResponse(BaseModel):
    configured: bool
    credentials_detected: bool
    has_spreadsheet_id: bool
    auto_sync: bool
    sheet_name: str
    spreadsheet_id: str
    spreadsheet_url: str | None = None
    service_account_email: str | None = None


class ProcessInvoiceRequest(BaseModel):
    folder_id: int | None = None
    client_id: int | None = None
    save_to_db: bool = True


class MessageResponse(BaseModel):
    message: str
    detail: dict[str, Any] | None = None
