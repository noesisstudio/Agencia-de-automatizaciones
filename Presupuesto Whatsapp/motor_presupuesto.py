"""
Motor de conversación WhatsApp: catálogo de servicios + selección numérica + presupuesto automático.

Pensado para que cada empresa sustituya `catalogo_ejemplo.json` (o apunte `OPENIX_PRESUPUESTO_CATALOGO`)
por su propio JSON con la misma forma.
"""

from __future__ import annotations

import json
import re
from enum import Enum
from pathlib import Path
from typing import Any


class Fase(str, Enum):
    INICIO = "inicio"
    SELECCION = "seleccion"
    FINAL = "final"


class SesionPresupuesto:
    __slots__ = ("fase", "ids_elegidos")

    def __init__(self) -> None:
        self.fase: Fase = Fase.INICIO
        self.ids_elegidos: list[str] = []


def _norm(txt: str) -> str:
    return re.sub(r"\s+", " ", (txt or "").strip().lower())


def cargar_catalogo(ruta: Path | str) -> dict[str, Any]:
    p = Path(ruta)
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def _servicio_por_indice(catalogo: dict[str, Any], indice_1: int) -> dict[str, Any] | None:
    servicios = catalogo.get("servicios") or []
    if 1 <= indice_1 <= len(servicios):
        return servicios[indice_1 - 1]
    return None


def _servicio_por_id(catalogo: dict[str, Any], sid: str) -> dict[str, Any] | None:
    sid = str(sid).strip()
    for s in catalogo.get("servicios") or []:
        if str(s.get("id", "")).strip() == sid:
            return s
    return None


def _lineas_catalogo(catalogo: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    empresa = catalogo.get("empresa", "Tu empresa")
    lines.append(f"*{empresa}*")
    lines.append("")
    lines.append("Servicios disponibles (responde con el *número* de la lista):")
    for i, s in enumerate(catalogo.get("servicios") or [], start=1):
        titulo = s.get("titulo", "Sin título")
        precio = s.get("precio", 0)
        moneda = catalogo.get("moneda", "EUR")
        lines.append(f"{i}) {titulo} — {precio} {moneda}")
    extra = catalogo.get("mensaje_bienvenida_extra")
    if extra:
        lines.append("")
        lines.append(str(extra))
    return lines


def _total_e_iva(catalogo: dict[str, Any], ids: list[str]) -> tuple[float, float, float, float]:
    """Subtotal sin IVA, IVA %, cuota IVA, total."""
    iva_pct = float(catalogo.get("iva_porcentaje") or 0)
    sub = 0.0
    seen: set[str] = set()
    for sid in ids:
        if sid in seen:
            continue
        seen.add(sid)
        s = _servicio_por_id(catalogo, sid)
        if s:
            sub += float(s.get("precio") or 0)
    cuota = round(sub * (iva_pct / 100.0), 2)
    total = round(sub + cuota, 2)
    return round(sub, 2), iva_pct, cuota, total


def _texto_presupuesto(catalogo: dict[str, Any], ids: list[str]) -> list[str]:
    moneda = catalogo.get("moneda", "EUR")
    empresa = catalogo.get("empresa", "")
    lineas: list[str] = [f"📋 *Presupuesto estimado*", f"_{empresa}_", ""]
    sub, iva_pct, cuota, total = _total_e_iva(catalogo, ids)
    if not ids:
        lineas.append("No hay líneas seleccionadas. Escribe REINICIAR para empezar de nuevo.")
        return lineas

    orden: list[str] = []
    seen: set[str] = set()
    for sid in ids:
        if sid in seen:
            continue
        seen.add(sid)
        orden.append(sid)

    for sid in orden:
        s = _servicio_por_id(catalogo, sid)
        if not s:
            continue
        titulo = s.get("titulo", "")
        precio = float(s.get("precio") or 0)
        det = s.get("detalle", "")
        lineas.append(f"· *{titulo}*")
        if det:
            lineas.append(f"  {det}")
        lineas.append(f"  → {precio} {moneda}")
        lineas.append("")

    lineas.append(f"Subtotal: *{sub} {moneda}*")
    if iva_pct:
        lineas.append(f"IVA ({iva_pct}%): {cuota} {moneda}")
    lineas.append(f"*Total: {total} {moneda}*")
    lineas.append("")
    lineas.append("Este importe es orientativo según el catálogo configurado.")
    lineas.append("Para formalizarlo, un comercial puede revisar el detalle contigo.")
    lineas.append("")
    lineas.append("Escribe *REINICIAR* para calcular otro presupuesto.")
    return lineas


class MotorPresupuestoWhatsApp:
    """Motor de presupuesto por conversación WhatsApp (memoria + disco opcional)."""

    def __init__(
        self,
        ruta_catalogo: Path | str,
        almacen_sesiones: Any | None = None,
    ) -> None:
        self.ruta_catalogo = Path(ruta_catalogo)
        self._catalogo: dict[str, Any] | None = None
        self._sesiones: dict[str, SesionPresupuesto] = {}
        self._almacen = almacen_sesiones

    def _cat(self) -> dict[str, Any]:
        if self._catalogo is None:
            self._catalogo = cargar_catalogo(self.ruta_catalogo)
        return self._catalogo

    def recargar_catalogo(self) -> None:
        self._catalogo = cargar_catalogo(self.ruta_catalogo)

    def _sesion(self, wa_id: str) -> SesionPresupuesto:
        if wa_id not in self._sesiones:
            self._sesiones[wa_id] = SesionPresupuesto()
        return self._sesiones[wa_id]

    def procesar_mensaje(self, wa_id: str, texto: str) -> list[str]:
        catalogo = self._cat()
        t = _norm(texto)
        ses = self._sesion(wa_id)

        if t in ("reiniciar", "reset", "empezar de nuevo", "menu", "inicio"):
            ses.fase = Fase.INICIO
            ses.ids_elegidos = []
            return _lineas_catalogo(catalogo)

        if t in ("ayuda", "help", "?"):
            return [
                "*Ayuda*",
                "",
                "· Escribe el *número* del servicio (1, 2, 3…) para añadirlo al presupuesto.",
                "· Puedes repetir para añadir varios (no se duplican en el total).",
                "· Escribe *LISTO* cuando quieras ver el presupuesto con IVA.",
                "· *REINICIAR* borra la selección y vuelve al catálogo.",
            ]

        if ses.fase == Fase.INICIO:
            ses.fase = Fase.SELECCION
            ses.ids_elegidos = []
            catalog_lines = _lineas_catalogo(catalogo)
            if re.match(r"^\d+$", t) or t in ("listo", "listo.", "fin", "total", "presupuesto"):
                extra = self._respuesta_seleccion(catalogo, ses, t)
                return ["\n".join(catalog_lines), *extra]
            return catalog_lines

        if ses.fase == Fase.SELECCION:
            return self._respuesta_seleccion(catalogo, ses, t)

        # FINAL: tras mostrar presupuesto, cualquier mensaje útil
        if ses.fase == Fase.FINAL:
            if t in ("reiniciar", "menu", "inicio"):
                ses.fase = Fase.INICIO
                ses.ids_elegidos = []
                return _lineas_catalogo(catalogo)
            return [
                "Ya tienes un presupuesto generado arriba.",
                "Escribe *REINICIAR* para empezar de cero con el catálogo.",
            ]

        return ["Error interno de estado. Escribe REINICIAR."]

    def _respuesta_seleccion(
        self, catalogo: dict[str, Any], ses: SesionPresupuesto, t: str
    ) -> list[str]:
        if t in ("listo", "listo.", "fin", "total", "presupuesto"):
            if not ses.ids_elegidos:
                return [
                    "Aún no has elegido ningún servicio.",
                    "Responde con un número de la lista o escribe AYUDA.",
                ]
            ses.fase = Fase.FINAL
            bloques = _texto_presupuesto(catalogo, ses.ids_elegidos)
            return ["\n".join(bloques)]

        m = re.match(r"^(\d+)$", t)
        if m:
            n = int(m.group(1))
            s = _servicio_por_indice(catalogo, n)
            if not s:
                return [
                    f"No existe el servicio número *{n}*.",
                    "Mira la lista y responde con un número válido o escribe AYUDA.",
                ]
            sid = str(s.get("id", str(n)))
            ses.ids_elegidos.append(sid)
            titulo = s.get("titulo", "")
            moneda = catalogo.get("moneda", "EUR")
            sub, _, _, total = _total_e_iva(catalogo, ses.ids_elegidos)
            return [
                f"Añadido: *{titulo}*",
                f"Parcial (sin duplicar líneas): *{sub} {moneda}* · Total con IVA estimado: *{total} {moneda}*",
                "",
                "Escribe otro *número* o *LISTO* para cerrar el presupuesto.",
            ]

        return [
            "No he entendido el mensaje.",
            "Responde con el *número* del servicio, *LISTO* o *AYUDA*.",
        ]
