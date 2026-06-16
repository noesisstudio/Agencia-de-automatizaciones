"""Catálogo y motores de presupuesto por tenant (sin IA)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services import knowledge_store
from app.services.motor_presupuesto import MotorPresupuestoWhatsApp, cargar_catalogo

_BACKEND_DATA = Path(__file__).resolve().parents[2] / "data"
_CATALOGO_DEMO = _BACKEND_DATA / "catalogo_ejemplo.json"
_MONOREPO_DEMO = (
    Path(__file__).resolve().parents[4] / "Presupuesto Whatsapp" / "catalogo_ejemplo.json"
)

_motores: dict[str, MotorPresupuestoWhatsApp] = {}


def catalogo_path(tenant_id: str) -> Path:
    """Ruta del catálogo: tenant → env → demo empaquetado."""
    custom = knowledge_store.tenant_dir(tenant_id) / "catalogo.json"
    if custom.is_file():
        return custom

    env_path = (settings.presupuesto_catalogo_path or "").strip()
    if env_path:
        p = Path(env_path)
        if p.is_file():
            return p

    if _CATALOGO_DEMO.is_file():
        return _CATALOGO_DEMO
    if _MONOREPO_DEMO.is_file():
        return _MONOREPO_DEMO

    raise FileNotFoundError(
        "No hay catálogo: sube data/tenants/{id}/catalogo.json o define PRESUPUESTO_CATALOGO_PATH"
    )


def get_motor(tenant_id: str) -> MotorPresupuestoWhatsApp:
    tid = knowledge_store.slug_id(tenant_id)
    ruta = catalogo_path(tid)
    motor = _motores.get(tid)
    if motor is None or motor.ruta_catalogo != ruta:
        motor = MotorPresupuestoWhatsApp(ruta)
        _motores[tid] = motor
    return motor


def invalidar_motor(tenant_id: str) -> None:
    tid = knowledge_store.slug_id(tenant_id)
    _motores.pop(tid, None)


def leer_catalogo(tenant_id: str) -> dict[str, Any]:
    return cargar_catalogo(catalogo_path(tenant_id))


def guardar_catalogo(tenant_id: str, data: dict[str, Any]) -> Path:
    knowledge_store.ensure_tenant(tenant_id)
    path = knowledge_store.tenant_dir(tenant_id) / "catalogo.json"
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    invalidar_motor(tenant_id)
    return path


def diagnostico_presupuesto(tenant_id: str) -> dict[str, Any]:
    tid = knowledge_store.slug_id(tenant_id)
    bloqueos: list[dict[str, str]] = []
    try:
        ruta = catalogo_path(tid)
        cat = cargar_catalogo(ruta)
        servicios = cat.get("servicios") or []
        if not servicios:
            bloqueos.append(
                {
                    "codigo": "catalogo_vacio",
                    "mensaje": "El catálogo no tiene servicios.",
                    "solucion": "Añade líneas en catalogo.json del cliente.",
                }
            )
    except FileNotFoundError as e:
        bloqueos.append(
            {
                "codigo": "sin_catalogo",
                "mensaje": str(e),
                "solucion": "PUT /presupuesto/tenants/{id}/catalogo o copia catalogo_ejemplo.json",
            }
        )
    except json.JSONDecodeError:
        bloqueos.append(
            {
                "codigo": "catalogo_json_invalido",
                "mensaje": "catalogo.json no es JSON válido.",
                "solucion": "Corrige el archivo del tenant.",
            }
        )

    if not (settings.meta_access_token or "").strip():
        bloqueos.append(
            {
                "codigo": "meta_token",
                "mensaje": "Falta META_ACCESS_TOKEN.",
                "solucion": "Configura .env (mismas credenciales que el chatbot WhatsApp).",
            }
        )

    listo = len(bloqueos) == 0
    return {
        "tenant_id": tid,
        "modulo": "presupuesto_whatsapp",
        "listo": listo,
        "bloqueos": bloqueos,
        "mensaje_resumen": "Listo para presupuestos por WhatsApp."
        if listo
        else f"{len(bloqueos)} bloqueo(s) de configuración.",
    }
