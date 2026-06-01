"""Cálculo de IVA, IRPF y totales con redondeo correcto."""

from __future__ import annotations

import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

IVA_RATES = (4.0, 10.0, 21.0)
IRPF_RATES = (7.0, 15.0)


def _d(value: float | str | int) -> Decimal:
    return Decimal(str(value))


def round_money(value: Decimal | float) -> float:
    return float(_d(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def validate_spanish_nif(nif: str) -> bool:
    n = re.sub(r"[\s\-]", "", (nif or "").upper())
    if not n:
        return False
    if re.match(r"^[0-9]{8}[A-Z]$", n):
        letters = "TRWAGMYFPDXBNJZSQVHLCKE"
        return n[8] == letters[int(n[:8]) % 23]
    if re.match(r"^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$", n):
        return True
    if re.match(r"^X[0-9]{7}[A-Z]$", n):
        return True
    return False


def calculate_line_totals(
    quantity: float,
    unit_price: float,
    iva_rate: float,
) -> dict[str, float]:
    qty = _d(quantity)
    price = _d(unit_price)
    base = qty * price
    iva = base * _d(iva_rate) / Decimal("100")
    total = base + iva
    return {
        "base": round_money(base),
        "iva": round_money(iva),
        "line_total": round_money(total),
    }


def calculate_invoice_totals(
    lines: list[dict[str, Any]],
    irpf_rate: float = 0.0,
) -> dict[str, float]:
    base_total = Decimal("0")
    iva_total = Decimal("0")

    for line in lines:
        qty = _d(line.get("quantity", 1))
        price = _d(line.get("unit_price", 0))
        iva_rate = _d(line.get("iva_rate", 21))
        base = qty * price
        iva = base * iva_rate / Decimal("100")
        base_total += base
        iva_total += iva

    irpf = base_total * _d(irpf_rate) / Decimal("100")
    total = base_total + iva_total - irpf

    return {
        "base_amount": round_money(base_total),
        "iva_amount": round_money(iva_total),
        "irpf_amount": round_money(irpf),
        "total_amount": round_money(total),
    }
