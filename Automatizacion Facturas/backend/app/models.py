"""Solo definición de tablas en la base de datos."""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class InvoiceStatus(str, enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    pagada = "pagada"
    vencida = "vencida"
    anulada = "anulada"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    supabase_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    invoices: Mapped[list[Invoice]] = relationship(back_populates="created_by_user")


class ClientFolder(Base):
    __tablename__ = "client_folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    clients: Mapped[list[Client]] = relationship(back_populates="folder")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="folder")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    encrypted_nif: Mapped[str | None] = mapped_column(String(512), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("client_folders.id"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    folder: Mapped[ClientFolder | None] = relationship(back_populates="clients")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="client")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    iva_rate: Mapped[float] = mapped_column(Float, default=21.0)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    unit: Mapped[str] = mapped_column(String(30), default="ud")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("client_folders.id"), nullable=True)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus), default=InvoiceStatus.borrador, index=True
    )
    issue_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    due_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    base_amount: Mapped[float] = mapped_column(Float, default=0.0)
    iva_amount: Mapped[float] = mapped_column(Float, default=0.0)
    irpf_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extracted_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    client: Mapped[Client | None] = relationship(back_populates="invoices")
    folder: Mapped[ClientFolder | None] = relationship(back_populates="invoices")
    created_by_user: Mapped[User | None] = relationship(back_populates="invoices")
    lines: Mapped[list[InvoiceLine]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )
    status_history: Mapped[list[InvoiceStatusHistory]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), index=True)
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    iva_rate: Mapped[float] = mapped_column(Float, default=21.0)
    line_total: Mapped[float] = mapped_column(Float, default=0.0)

    invoice: Mapped[Invoice] = relationship(back_populates="lines")


class InvoiceStatusHistory(Base):
    __tablename__ = "invoice_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30))
    changed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    invoice: Mapped[Invoice] = relationship(back_populates="status_history")


class IntegrationSettings(Base):
    """Configuración de integraciones (Google Sheets) editable desde la app.

    Tiene prioridad sobre los valores del .env cuando los campos están rellenos.
    """

    __tablename__ = "integration_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    google_spreadsheet_id: Mapped[str] = mapped_column(String(255), default="")
    google_sheet_name: Mapped[str] = mapped_column(String(120), default="")
    sheets_auto_sync: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    nif: Mapped[str] = mapped_column(String(20), default="")
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    invoice_prefix: Mapped[str] = mapped_column(String(20), default="FAC")
    next_invoice_number: Mapped[int] = mapped_column(Integer, default=1)
    default_iva_rate: Mapped[float] = mapped_column(Float, default=21.0)
    default_irpf_rate: Mapped[float] = mapped_column(Float, default=0.0)
