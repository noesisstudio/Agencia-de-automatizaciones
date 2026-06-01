"""Base de conocimiento por empresa (documentación para RAG de borradores)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_DATA_ROOT = Path(__file__).resolve().parents[2] / "data" / "empresas"
_MAX_KNOWLEDGE_CHARS = 22_000


def _slug(empresa_id: str) -> str:
    eid = re.sub(r"[^a-zA-Z0-9_-]", "", (empresa_id or "").strip())
    if not eid:
        raise ValueError("empresa_id inválido")
    return eid


def slug_id(empresa_id: str) -> str:
    return _slug(empresa_id)


def empresa_dir(empresa_id: str) -> Path:
    return _DATA_ROOT / _slug(empresa_id)


def knowledge_path(empresa_id: str) -> Path:
    return empresa_dir(empresa_id) / "knowledge.md"


def meta_path(empresa_id: str) -> Path:
    return empresa_dir(empresa_id) / "meta.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def empresa_exists(empresa_id: str) -> bool:
    return meta_path(empresa_id).is_file()


def list_empresas() -> list[dict[str, Any]]:
    if not _DATA_ROOT.is_dir():
        return []
    out: list[dict[str, Any]] = []
    for d in sorted(_DATA_ROOT.iterdir()):
        if d.is_dir() and (d / "meta.json").is_file():
            meta = cargar_meta(d.name)
            out.append(
                {
                    "empresa_id": d.name,
                    "nombre": meta.get("nombre", d.name),
                    "caracteres": len(load_knowledge_text(d.name)),
                }
            )
    return out


def cargar_meta(empresa_id: str) -> dict[str, Any]:
    path = meta_path(empresa_id)
    if not path.is_file():
        return {"empresa_id": _slug(empresa_id), "nombre": empresa_id}
    return json.loads(path.read_text(encoding="utf-8"))


def guardar_meta(empresa_id: str, meta: dict[str, Any]) -> dict[str, Any]:
    empresa_dir(empresa_id).mkdir(parents=True, exist_ok=True)
    meta["empresa_id"] = _slug(empresa_id)
    meta["updated_at"] = _now_iso()
    meta_path(empresa_id).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return meta


def crear_empresa(empresa_id: str, nombre: str) -> dict[str, Any]:
    eid = _slug(empresa_id)
    if empresa_exists(eid):
        raise ValueError(f"La empresa «{eid}» ya existe")
    empresa_dir(eid).mkdir(parents=True, exist_ok=True)
    plantilla = (
        f"# {nombre}\n\n"
        "Documentación oficial de la empresa (servicios, FAQs, RGPD, integraciones).\n"
    )
    knowledge_path(eid).write_text(plantilla, encoding="utf-8")
    meta = {
        "empresa_id": eid,
        "nombre": nombre.strip() or eid,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    return guardar_meta(eid, meta)


def load_knowledge_text(empresa_id: str) -> str:
    path = knowledge_path(empresa_id)
    if not path.is_file():
        return ""
    texto = path.read_text(encoding="utf-8").strip()
    if len(texto) > _MAX_KNOWLEDGE_CHARS:
        return texto[:_MAX_KNOWLEDGE_CHARS] + "\n\n[... documento recortado ...]"
    return texto


def save_knowledge_text(empresa_id: str, texto: str) -> Path:
    if not empresa_exists(empresa_id):
        raise ValueError("Empresa no encontrada")
    path = knowledge_path(empresa_id)
    path.write_text((texto or "").strip(), encoding="utf-8")
    meta = cargar_meta(empresa_id)
    meta["updated_at"] = _now_iso()
    guardar_meta(empresa_id, meta)
    return path


def _split_knowledge_sections(texto: str) -> list[tuple[str, str]]:
    if not texto.strip():
        return []
    parts = re.split(r"(?=\n## )", "\n" + texto.strip())
    sections: list[tuple[str, str]] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.startswith("## "):
            lines = part.split("\n", 1)
            title = lines[0].strip()
            body = lines[1].strip() if len(lines) > 1 else ""
            sections.append((title, body))
        else:
            sections.append(("# Introducción", part))
    return sections


def _query_terms(query: str) -> set[str]:
    stop = {
        "para", "como", "este", "esta", "estos", "estas", "pero", "porque",
        "donde", "cuando", "sobre", "desde", "hasta", "entre", "tiene",
        "tienen", "puede", "pueden", "debe", "deben", "hola", "gracias",
        "saludo", "usted", "ustedes", "the", "and", "for", "with", "that",
        "this", "your", "have", "from", "what", "when", "about",
    }
    words = re.findall(r"[a-záéíóúüñ0-9]{4,}", (query or "").lower())
    return {w for w in words if w not in stop}


def retrieve_relevant_context(
    empresa_id: str,
    query: str,
    *,
    max_chars: int = 10_000,
    top_sections: int = 8,
) -> str:
    texto = load_knowledge_text(empresa_id)
    if not texto.strip():
        return ""

    terms = _query_terms(query)
    sections = _split_knowledge_sections(texto)
    if not sections:
        return texto[:max_chars]

    scored: list[tuple[float, str]] = []
    for title, body in sections:
        blob = f"{title}\n{body}".lower()
        if not terms:
            score = 0.0
        else:
            hits = sum(1 for t in terms if t in blob)
            score = hits / max(len(terms), 1)
        block = f"{title}\n\n{body}".strip() if body else title
        scored.append((score, block))

    scored.sort(key=lambda x: x[0], reverse=True)
    chosen: list[str] = []
    total = 0
    for score, block in scored[:top_sections]:
        if score <= 0 and chosen:
            continue
        if total + len(block) + 2 > max_chars:
            remaining = max_chars - total - 2
            if remaining > 200:
                chosen.append(block[:remaining] + "\n[...]")
            break
        chosen.append(block)
        total += len(block) + 2

    if not chosen:
        return texto[:max_chars]
    return "\n\n---\n\n".join(chosen)
