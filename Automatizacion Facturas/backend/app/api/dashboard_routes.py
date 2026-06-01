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
    _: Annotated[User, Depends(get_current_user)],
) -> DashboardStats:
    base = db.query(Invoice).filter(Invoice.is_deleted.is_(False))
    total = base.count()
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_start = (month_start - timedelta(days=1)).replace(day=1)

    monthly = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(Invoice.is_deleted.is_(False), Invoice.created_at >= month_start)
        .scalar()
    )
    prev_monthly = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(
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
        total_clients=db.query(Client).count(),
        total_products=db.query(Product).count(),
    )


@router.get("/chart-data", response_model=DashboardChartData)
def chart_data(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> DashboardChartData:
    monthly: list[ChartMonthPoint] = []
    now = datetime.now(UTC)
    # Build exactly 12 distinct calendar months (no duplicates)
    for i in range(11, -1, -1):
        # Step by whole months: subtract i months from current year/month
        month_offset = now.month - i
        year = now.year + (month_offset - 1) // 12
        month = ((month_offset - 1) % 12) + 1
        label = f"{year:04d}-{month:02d}"
        total = (
            db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
            .filter(
                Invoice.is_deleted.is_(False),
                func.strftime("%Y-%m", Invoice.created_at) == label,
            )
            .scalar()
        )
        count = (
            db.query(Invoice)
            .filter(
                Invoice.is_deleted.is_(False),
                func.strftime("%Y-%m", Invoice.created_at) == label,
            )
            .count()
        )
        monthly.append(ChartMonthPoint(month=label, total=float(total or 0), count=count))

    by_status: list[ChartStatusPoint] = []
    for st in InvoiceStatus:
        c = (
            db.query(Invoice)
            .filter(Invoice.is_deleted.is_(False), Invoice.status == st)
            .count()
        )
        by_status.append(ChartStatusPoint(status=st.value, count=c))

    return DashboardChartData(monthly=monthly, by_status=by_status)


@router.get("/recent", response_model=list[InvoiceResponse])
def recent_invoices(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[InvoiceResponse]:
    rows = (
        db.query(Invoice)
        .filter(Invoice.is_deleted.is_(False))
        .order_by(Invoice.created_at.desc())
        .limit(10)
        .all()
    )
    return [invoice_to_response(i) for i in rows]


@router.get("/alerts", response_model=list[InvoiceResponse])
def alerts(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[InvoiceResponse]:
    rows = (
        db.query(Invoice)
        .filter(
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
    _: Annotated[User, Depends(get_current_user)],
) -> CompanySettings:
    return get_or_create_company_settings(db)


@router.put("/settings", response_model=CompanySettingsResponse)
def update_settings(
    body: CompanySettingsUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> CompanySettings:
    row = get_or_create_company_settings(db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row
