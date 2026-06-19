from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.models import Client, CompanySettings, Invoice, InvoiceStatus, Product, User
from app.schemas import (
    ChartMonthPoint,
    ChartStatusPoint,
    CompanySettingsResponse,
    CompanySettingsUpdate,
    DashboardChartData,
    DashboardStats,
    InvoiceResponse,
)
from app.services.invoice_service import get_or_create_company_settings, invoice_to_response

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> DashboardStats:
    base = db.query(Invoice).filter(
        Invoice.owner_id == user.id, Invoice.is_deleted.is_(False)
    )
    total = base.count()
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_start = (month_start - timedelta(days=1)).replace(day=1)

    monthly = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(
            Invoice.owner_id == user.id,
            Invoice.is_deleted.is_(False),
            Invoice.created_at >= month_start,
        )
        .scalar()
    )
    prev_monthly = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(
            Invoice.owner_id == user.id,
            Invoice.is_deleted.is_(False),
            Invoice.created_at >= prev_start,
            Invoice.created_at < month_start,
        )
        .scalar()
    )
    change_pct = 0.0
    if prev_monthly and float(prev_monthly) > 0:
        change_pct = round(
            (float(monthly or 0) - float(prev_monthly)) / float(prev_monthly) * 100, 1
        )

    def count_status(st: InvoiceStatus) -> int:
        return base.filter(Invoice.status == st).count()

    return DashboardStats(
        total_invoices=total,
        draft_count=count_status(InvoiceStatus.borrador),
        sent_count=count_status(InvoiceStatus.enviada),
        paid_count=count_status(InvoiceStatus.pagada),
        overdue_count=count_status(InvoiceStatus.vencida),
        monthly_revenue=float(monthly or 0),
        monthly_change_pct=change_pct,
        total_clients=db.query(Client).filter(Client.owner_id == user.id).count(),
        total_products=db.query(Product).filter(Product.owner_id == user.id).count(),
    )


@router.get("/chart-data", response_model=DashboardChartData)
def chart_data(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> DashboardChartData:
    now = datetime.now(UTC)

    # 12 meses naturales (más reciente al final). Etiqueta "YYYY-MM".
    labels: list[str] = []
    for i in range(11, -1, -1):
        month_offset = now.month - i
        year = now.year + (month_offset - 1) // 12
        month = ((month_offset - 1) % 12) + 1
        labels.append(f"{year:04d}-{month:02d}")

    buckets = {lbl: {"total": 0.0, "count": 0} for lbl in labels}
    earliest = labels[0]

    # Agregación en Python: portable entre SQLite y PostgreSQL.
    rows = (
        db.query(Invoice.created_at, Invoice.total_amount)
        .filter(Invoice.owner_id == user.id, Invoice.is_deleted.is_(False))
        .all()
    )
    for created_at, total_amount in rows:
        if not created_at:
            continue
        lbl = f"{created_at.year:04d}-{created_at.month:02d}"
        if lbl < earliest or lbl not in buckets:
            continue
        buckets[lbl]["total"] += float(total_amount or 0)
        buckets[lbl]["count"] += 1

    monthly = [
        ChartMonthPoint(month=lbl, total=buckets[lbl]["total"], count=buckets[lbl]["count"])
        for lbl in labels
    ]

    by_status: list[ChartStatusPoint] = []
    for st in InvoiceStatus:
        c = (
            db.query(Invoice)
            .filter(
                Invoice.owner_id == user.id,
                Invoice.is_deleted.is_(False),
                Invoice.status == st,
            )
            .count()
        )
        by_status.append(ChartStatusPoint(status=st.value, count=c))

    return DashboardChartData(monthly=monthly, by_status=by_status)


@router.get("/recent", response_model=list[InvoiceResponse])
def recent_invoices(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[InvoiceResponse]:
    rows = (
        db.query(Invoice)
        .filter(Invoice.owner_id == user.id, Invoice.is_deleted.is_(False))
        .order_by(Invoice.created_at.desc())
        .limit(10)
        .all()
    )
    return [invoice_to_response(i) for i in rows]


@router.get("/alerts", response_model=list[InvoiceResponse])
def alerts(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[InvoiceResponse]:
    rows = (
        db.query(Invoice)
        .filter(
            Invoice.owner_id == user.id,
            Invoice.is_deleted.is_(False),
            Invoice.status.in_([InvoiceStatus.enviada, InvoiceStatus.vencida]),
        )
        .order_by(Invoice.created_at.desc())
        .limit(20)
        .all()
    )
    return [invoice_to_response(i) for i in rows]


@router.get("/settings", response_model=CompanySettingsResponse)
def get_settings(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> CompanySettings:
    return get_or_create_company_settings(db, user.id)


@router.put("/settings", response_model=CompanySettingsResponse)
def update_settings(
    body: CompanySettingsUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> CompanySettings:
    row = get_or_create_company_settings(db, user.id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row
