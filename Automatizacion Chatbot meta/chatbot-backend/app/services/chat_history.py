"""Última pregunta/respuesta por sesión (reformular si no entiende)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.knowledge_store import tenant_dir


def _path(tenant_id: str) -> Path:
    return tenant_dir(tenant_id) / "historial.json"


def _read(tenant_id: str) -> dict[str, Any]:
    p = _path(tenant_id)
    if not p.is_file():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def save(tenant_id: str, session_id: str, pregunta: str, respuesta: str) -> None:
    tenant_dir(tenant_id).mkdir(parents=True, exist_ok=True)
    data = _read(tenant_id)
    data[str(session_id)] = {
        "ultima_pregunta": pregunta,
        "ultima_respuesta": respuesta,
    }
    _path(tenant_id).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def last(tenant_id: str, session_id: str) -> tuple[str, str] | None:
    row = _read(tenant_id).get(str(session_id))
    if not isinstance(row, dict):
        return None
    p = str(row.get("ultima_pregunta") or "").strip()
    r = str(row.get("ultima_respuesta") or "").strip()
    return (p, r) if p and r else None
