"""Almacén de conocimiento por empresa: fuentes estructuradas y compilación a knowledge.md."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

_DATA_ROOT = Path(__file__).resolve().parents[2] / "data" / "tenants"
_MAX_KNOWLEDGE_CHARS = 40_000

_SECTION_ORDER = (
    "reservas",
    "horario",
    "servicios",
    "faq",
    "contacto",
    "condiciones",
    "general",
)

_SECTION_TITLES = {
    "reservas": "Reservas y citas",
    "horario": "Horario",
    "servicios": "Servicios y precios orientativos",
    "faq": "Preguntas frecuentes",
    "contacto": "Contacto humano",
    "condiciones": "Condiciones",
    "general": "Información adicional",
}


def _slug(tenant_id: str) -> str:
    tid = re.sub(r"[^a-zA-Z0-9_-]", "", (tenant_id or "").strip())
    if not tid:
        raise ValueError("tenant_id inválido")
    return tid


def tenant_dir(tenant_id: str) -> Path:
    return _DATA_ROOT / _slug(tenant_id)


def knowledge_path(tenant_id: str) -> Path:
    return tenant_dir(tenant_id) / "knowledge.md"


def uploads_dir(tenant_id: str) -> Path:
    return tenant_dir(tenant_id) / "uploads"


def meta_path(tenant_id: str) -> Path:
    return tenant_dir(tenant_id) / "meta.json"


def sources_path(tenant_id: str) -> Path:
    return tenant_dir(tenant_id) / "sources.json"


def extracted_path(tenant_id: str, safe_name: str) -> Path:
    return uploads_dir(tenant_id) / f"{safe_name}.extracted.txt"


def ensure_tenant(tenant_id: str) -> Path:
    root = tenant_dir(tenant_id)
    root.mkdir(parents=True, exist_ok=True)
    uploads_dir(tenant_id).mkdir(parents=True, exist_ok=True)
    return root


def slug_id(tenant_id: str) -> str:
    return _slug(tenant_id)


def tenant_exists(tenant_id: str) -> bool:
    return meta_path(tenant_id).is_file()


def _latest_source_mtime(tenant_id: str) -> float:
    times: list[float] = []
    sp = sources_path(tenant_id)
    if sp.is_file():
        times.append(sp.stat().st_mtime)
    ud = uploads_dir(tenant_id)
    if ud.is_dir():
        for f in ud.iterdir():
            if f.is_file() and not f.name.endswith(".extracted.txt"):
                times.append(f.stat().st_mtime)
    return max(times) if times else 0.0


def needs_recompile(tenant_id: str) -> bool:
    kp = knowledge_path(tenant_id)
    if not kp.is_file():
        return True
    return _latest_source_mtime(tenant_id) > kp.stat().st_mtime + 0.001


def ensure_compiled(tenant_id: str) -> dict[str, Any] | None:
    """Regenera knowledge.md si sources.json o uploads son más recientes."""
    if not needs_recompile(tenant_id):
        return None
    return compile_knowledge(tenant_id)


def _touch_after_knowledge_change(tenant_id: str, nombre: str = "") -> dict[str, Any]:
    """Tras guardar/subir: conocimiento activo para chat y WhatsApp."""
    return touch_meta(tenant_id, nombre=nombre, publicado=True)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_text(texto: str) -> str:
    """Limpia saltos rotos de PDF y espacios redundantes."""
    t = (texto or "").replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    # Une palabras partidas por salto de línea en medio de frase (PDF)
    t = re.sub(r"(\w)-\n(\w)", r"\1\2", t)
    t = re.sub(r"([a-záéíóúñ,])\n([a-záéíóúñ])", r"\1 \2", t, flags=re.IGNORECASE)
    return t.strip()


def _infer_section(filename: str, texto: str) -> str:
    fn = filename.lower()
    blob = f"{filename}\n{texto[:1500]}".lower()
    if any(
        x in fn
        for x in (
            "catalogo",
            "catálogo",
            "database",
            "prueba",
            "sandbox",
            "inventario",
            "producto",
            "datos",
        )
    ):
        return "general"
    if len(texto) > 2500 and re.search(
        r"\b(sku|catálogo|catalogo|inventario|pvp|webhook)\b", blob
    ):
        return "general"
    if re.search(r"\b(reserv|cita|agenda|appointment)\w*\b", blob):
        return "reservas"
    if re.search(r"\b(horario|apertura|lunes|viernes|sábado|sabado)\b", blob):
        return "horario"
    if re.search(r"\b(servicio|precio|tarifa|consulta)\w*\b", blob):
        return "servicios"
    if re.search(r"\b(faq|pregunta|frecuent)\w*\b", blob):
        return "faq"
    if re.search(r"\b(contacto|teléfono|telefono|email|whatsapp)\b", blob):
        return "contacto"
    if re.search(r"\b(condicion|cancelación|cancelacion|pago|política)\w*\b", blob):
        return "condiciones"
    return "general"


def _base_has_section(text: str, section_key: str) -> bool:
    title = _SECTION_TITLES.get(section_key, section_key)
    return bool(
        re.search(rf"^##\s+{re.escape(title)}\b", text, re.MULTILINE | re.IGNORECASE)
    )


def _inject_blocks_in_section(text: str, section_key: str, blocks: list[str]) -> str:
    if not blocks:
        return text
    title = _SECTION_TITLES.get(section_key, section_key)
    insertion = "\n\n" + "\n\n".join(blocks)
    pattern = rf"(^##\s+{re.escape(title)}[^\n]*.*?)(?=^##\s+|\Z)"
    if re.search(pattern, text, re.MULTILINE | re.DOTALL | re.IGNORECASE):
        return re.sub(
            pattern,
            r"\1" + insertion,
            text,
            count=1,
            flags=re.MULTILINE | re.DOTALL | re.IGNORECASE,
        )
    return text


def _default_base_markdown(nombre: str) -> str:
    return f"""# {nombre}

Breve descripción de qué hace la empresa (1–2 frases).

## Horario
- Lunes a viernes: 9:00 – 20:00
- Sábados: 10:00 – 14:00
- Domingos: cerrado

## Servicios y precios orientativos
- Consulta inicial — 80 EUR (30 min)
- Servicio estándar — 150 EUR
- Mantenimiento mensual — 49 EUR/mes

## Preguntas frecuentes

### ¿Dónde estáis?
Dirección y ciudad. Indica si hay parking o transporte público cercano.

### ¿Cómo reservo?
Explica el proceso: web, teléfono, Booksy, etc. (solo información).

### ¿Cuál es el plazo de respuesta?
Respondemos en menos de 24 h laborables.

## Condiciones
- Forma de pago aceptada
- Política de cancelación si aplica

## Contacto humano
Teléfono y email para casos que el bot no pueda resolver.
"""


def _load_manifest_raw(tenant_id: str) -> dict[str, Any]:
    sp = sources_path(tenant_id)
    if not sp.is_file():
        return {}
    try:
        data = json.loads(sp.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _save_manifest(tenant_id: str, manifest: dict[str, Any]) -> None:
    manifest["updated_at"] = _now_iso()
    sources_path(tenant_id).write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _migrate_legacy_if_needed(tenant_id: str) -> None:
    """Convierte knowledge.md antiguo (concatenado) a sources.json una sola vez."""
    if sources_path(tenant_id).is_file():
        return
    kp = knowledge_path(tenant_id)
    if not kp.is_file():
        return
    raw = kp.read_text(encoding="utf-8")
    parts = re.split(r"\n## Archivo:\s*", raw, maxsplit=1)
    base = parts[0].strip()
    files: list[dict[str, Any]] = []
    if len(parts) > 1:
        rest = parts[1]
        for chunk in re.split(r"\n## Archivo:\s*", rest):
            chunk = chunk.strip()
            if not chunk:
                continue
            lines = chunk.split("\n", 1)
            fname = lines[0].strip()
            body = lines[1].strip() if len(lines) > 1 else ""
            if not body:
                continue
            safe = re.sub(r"[^\w.\-]", "_", fname)[:120]
            ep = extracted_path(tenant_id, safe)
            ep.write_text(body, encoding="utf-8")
            files.append(
                {
                    "nombre": safe,
                    "sha256": _sha256(body.encode("utf-8")),
                    "seccion": _infer_section(safe, body),
                    "titulo": safe,
                    "importado_at": _now_iso(),
                    "duplicado_de": None,
                }
            )
    manifest = {
        "version": 1,
        "base_markdown": base or _default_base_markdown(tenant_id),
        "archivos": files,
        "migrated_from_legacy": True,
    }
    _save_manifest(tenant_id, manifest)
    compile_knowledge(tenant_id)


def load_manifest(tenant_id: str) -> dict[str, Any]:
    ensure_tenant(tenant_id)
    _migrate_legacy_if_needed(tenant_id)
    manifest = _load_manifest_raw(tenant_id)
    if not manifest:
        meta = cargar_meta(tenant_id)
        nombre = str(meta.get("nombre") or tenant_id)
        manifest = {
            "version": 1,
            "base_markdown": _default_base_markdown(nombre),
            "archivos": [],
        }
        _save_manifest(tenant_id, manifest)
    return manifest


def compile_knowledge(tenant_id: str) -> dict[str, Any]:
    """Genera knowledge.md desde base + archivos, sin duplicados."""
    manifest = load_manifest(tenant_id)
    meta = cargar_meta(tenant_id)
    nombre = str(meta.get("nombre") or tenant_id)
    base = normalize_text(str(manifest.get("base_markdown") or ""))

    by_section: dict[str, list[str]] = {k: [] for k in _SECTION_ORDER}
    seen_hashes: set[str] = set()
    archivos_meta: list[dict[str, Any]] = []
    duplicados = 0

    for entry in manifest.get("archivos") or []:
        if not isinstance(entry, dict):
            continue
        fname = str(entry.get("nombre") or "").strip()
        sha = str(entry.get("sha256") or "").strip()
        if not fname:
            continue
        if sha and sha in seen_hashes:
            duplicados += 1
            entry = {**entry, "omitido": True, "motivo": "duplicado"}
            archivos_meta.append(entry)
            continue
        if sha:
            seen_hashes.add(sha)

        ep = extracted_path(tenant_id, fname)
        if ep.is_file():
            texto = normalize_text(ep.read_text(encoding="utf-8"))
        else:
            up = uploads_dir(tenant_id) / fname
            if up.is_file():
                texto = normalize_text(_read_upload_text(fname, up.read_bytes()))
                ep.write_text(texto, encoding="utf-8")
            else:
                continue

        if not texto:
            continue

        seccion = str(entry.get("seccion") or _infer_section(fname, texto))
        if seccion not in by_section:
            seccion = "general"
        titulo_doc = str(entry.get("titulo") or fname)
        bloque = f"### {titulo_doc}\n\n{texto}"
        by_section[seccion].append(bloque)
        archivos_meta.append({**entry, "seccion": seccion, "omitido": False})

    manifest["archivos"] = [a for a in archivos_meta if not a.get("omitido")]
    _save_manifest(tenant_id, manifest)

    chunks: list[str] = []
    compiled = ""
    if base:
        if not base.lstrip().startswith("#"):
            compiled = f"# {nombre}\n\n{base}"
        else:
            compiled = base

    for key in _SECTION_ORDER:
        blocks = by_section.get(key) or []
        if not blocks:
            continue
        if key != "general" and compiled and _base_has_section(compiled, key):
            compiled = _inject_blocks_in_section(compiled, key, blocks)
        else:
            title = _SECTION_TITLES[key]
            chunks.append(f"## {title}\n\n" + "\n\n".join(blocks))

    if chunks:
        compiled = normalize_text(compiled + "\n\n" + "\n\n".join(chunks))

    compiled = normalize_text(compiled)
    if len(compiled) > _MAX_KNOWLEDGE_CHARS:
        compiled = _trim_knowledge(compiled, _MAX_KNOWLEDGE_CHARS)

    knowledge_path(tenant_id).write_text(compiled + "\n", encoding="utf-8")
    touch_meta(tenant_id)
    return {
        "caracteres": len(compiled),
        "archivos_activos": len([a for a in archivos_meta if not a.get("omitido")]),
        "duplicados_omitidos": duplicados,
    }


def _trim_knowledge(texto: str, max_chars: int) -> str:
    if len(texto) <= max_chars:
        return texto
    return texto[: max_chars - 40].rstrip() + "\n\n[... contenido recortado ...]"


def _read_upload_text(filename: str, data: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return _extract_pdf(data)
    texto = data.decode("utf-8", errors="replace")
    if lower.endswith(".json"):
        try:
            payload = json.loads(texto)
            if isinstance(payload, dict):
                if "contenido" in payload:
                    return str(payload["contenido"])
                if "content" in payload:
                    return str(payload["content"])
                return json.dumps(payload, ensure_ascii=False, indent=2)
        except json.JSONDecodeError:
            pass
    return texto


def list_tenants() -> list[dict[str, Any]]:
    if not _DATA_ROOT.is_dir():
        return []
    out: list[dict[str, Any]] = []
    for d in sorted(_DATA_ROOT.iterdir()):
        if not d.is_dir():
            continue
        meta: dict[str, Any] = {}
        mp = d / "meta.json"
        if mp.is_file():
            try:
                meta = json.loads(mp.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        kp = d / "knowledge.md"
        sp = d / "sources.json"
        out.append(
            {
                "tenant_id": d.name,
                "nombre": meta.get("nombre", d.name),
                "contacto": meta.get("contacto", ""),
                "meta_phone_number_id": meta.get("meta_phone_number_id", ""),
                "publicado_at": meta.get("publicado_at"),
                "tiene_conocimiento": kp.is_file() and kp.stat().st_size > 20,
                "fuentes_estructuradas": sp.is_file(),
            }
        )
    return out


def crear_cliente(
    tenant_id: str,
    nombre: str,
    contacto: str = "",
    meta_phone_number_id: str = "",
) -> dict[str, Any]:
    tid = _slug(tenant_id)
    root = tenant_dir(tid)
    if root.exists() and (root / "meta.json").is_file():
        raise ValueError(f"Ya existe un cliente con el ID «{tid}»")
    ensure_tenant(tid)
    meta = {
        "tenant_id": tid,
        "nombre": (nombre or tid).strip(),
        "contacto": (contacto or "").strip(),
        "meta_phone_number_id": (meta_phone_number_id or "").strip(),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    meta_path(tid).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = {
        "version": 1,
        "base_markdown": _default_base_markdown(meta["nombre"]),
        "archivos": [],
    }
    _save_manifest(tid, manifest)
    compile_knowledge(tid)
    return meta


def actualizar_meta_cliente(tenant_id: str, campos: dict[str, Any]) -> dict[str, Any]:
    ensure_tenant(tenant_id)
    mp = meta_path(tenant_id)
    meta: dict[str, Any] = {}
    if mp.is_file():
        try:
            meta = json.loads(mp.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            meta = {}
    permitidos = ("nombre", "contacto", "meta_phone_number_id", "notas")
    for k in permitidos:
        if k in campos and campos[k] is not None:
            if k == "notas":
                meta[k] = campos[k]
            else:
                meta[k] = str(campos[k]).strip()
    meta["tenant_id"] = _slug(tenant_id)
    meta["updated_at"] = _now_iso()
    mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def cargar_meta(tenant_id: str) -> dict[str, Any]:
    mp = meta_path(tenant_id)
    if not mp.is_file():
        return {"tenant_id": _slug(tenant_id)}
    try:
        return json.loads(mp.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"tenant_id": _slug(tenant_id)}


def touch_meta(tenant_id: str, nombre: str = "", publicado: bool = False) -> dict[str, Any]:
    ensure_tenant(tenant_id)
    mp = meta_path(tenant_id)
    meta: dict[str, Any] = {}
    if mp.is_file():
        try:
            meta = json.loads(mp.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            meta = {}
    meta["tenant_id"] = _slug(tenant_id)
    if nombre:
        meta["nombre"] = nombre
    meta["updated_at"] = _now_iso()
    if publicado:
        meta["publicado_at"] = meta["updated_at"]
    mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def save_knowledge_text(tenant_id: str, texto: str, nombre: str = "") -> Path:
    if not tenant_exists(tenant_id):
        raise ValueError(f"No existe el cliente «{_slug(tenant_id)}». Créalo en Clientes.")
    ensure_tenant(tenant_id)
    manifest = load_manifest(tenant_id)
    manifest["base_markdown"] = normalize_text(texto)
    _save_manifest(tenant_id, manifest)
    compile_knowledge(tenant_id)
    _touch_after_knowledge_change(tenant_id, nombre=nombre)
    return knowledge_path(tenant_id)


def list_uploads(tenant_id: str) -> list[dict[str, Any]]:
    ud = uploads_dir(tenant_id)
    if not ud.is_dir():
        return []
    manifest = load_manifest(tenant_id)
    by_name = {
        str(a.get("nombre")): a
        for a in (manifest.get("archivos") or [])
        if isinstance(a, dict)
    }
    out: list[dict[str, Any]] = []
    for f in sorted(ud.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not f.is_file() or f.name.endswith(".extracted.txt"):
            continue
        st = f.stat()
        info = by_name.get(f.name, {})
        out.append(
            {
                "nombre": f.name,
                "bytes": st.st_size,
                "modificado": datetime.fromtimestamp(
                    st.st_mtime, tz=timezone.utc
                ).isoformat(),
                "seccion": info.get("seccion", ""),
                "sha256": info.get("sha256", ""),
            }
        )
    return out


def load_knowledge_text(tenant_id: str) -> str:
    ensure_compiled(tenant_id)
    path = knowledge_path(tenant_id)
    if not path.is_file():
        compile_knowledge(tenant_id)
        path = knowledge_path(tenant_id)
    if not path.is_file():
        return ""
    texto = path.read_text(encoding="utf-8").strip()
    if len(texto) > _MAX_KNOWLEDGE_CHARS:
        return _trim_knowledge(texto, _MAX_KNOWLEDGE_CHARS)
    return texto


def load_base_markdown(tenant_id: str) -> str:
    manifest = load_manifest(tenant_id)
    return str(manifest.get("base_markdown") or "")


def knowledge_stats(tenant_id: str) -> dict[str, Any]:
    texto = load_knowledge_text(tenant_id)
    manifest = load_manifest(tenant_id)
    archivos = manifest.get("archivos") or []
    return {
        "caracteres_base": len(load_base_markdown(tenant_id)),
        "caracteres_compilado": len(texto),
        "limite_caracteres": _MAX_KNOWLEDGE_CHARS,
        "archivos_activos": len(archivos),
        "recortado": len(texto) >= _MAX_KNOWLEDGE_CHARS - 50,
    }


def extract_section(tenant_id: str, section_key: str) -> str:
    """Fragmento de una sección del conocimiento compilado."""
    texto = load_knowledge_text(tenant_id)
    title = _SECTION_TITLES.get(section_key, section_key)
    pattern = rf"## {re.escape(title)}.*?(?=\n## |\Z)"
    m = re.search(pattern, texto, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(0).strip()
    if section_key == "reservas":
        m2 = re.search(r"## Reservas.*?(?=\n## |\Z)", texto, re.DOTALL | re.IGNORECASE)
        if m2:
            return m2.group(0).strip()
    return ""


def _extract_pdf(data: bytes) -> str:
    try:
        from io import BytesIO

        from pypdf import PdfReader

        reader = PdfReader(BytesIO(data))
        parts: list[str] = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
        return normalize_text("\n\n".join(parts))
    except ImportError:
        raise ValueError(
            "Para PDF instala pypdf en el backend: pip install pypdf"
        ) from None
    except Exception as exc:
        raise ValueError(f"No se pudo leer el PDF: {exc}") from exc


def import_file(tenant_id: str, filename: str, data: bytes) -> dict[str, Any]:
    ensure_tenant(tenant_id)
    safe = re.sub(r"[^\w.\-]", "_", Path(filename).name)[:120]
    sha = _sha256(data)
    dest = uploads_dir(tenant_id) / safe
    dest.write_bytes(data)

    manifest = load_manifest(tenant_id)
    archivos: list[dict[str, Any]] = list(manifest.get("archivos") or [])

    for existing in archivos:
        if existing.get("sha256") == sha:
            compile_stats = compile_knowledge(tenant_id)
            _touch_after_knowledge_change(tenant_id)
            return {
                "archivo": safe,
                "duplicado": True,
                "mensaje": "Este archivo ya estaba importado (mismo contenido).",
                "caracteres_anadidos": 0,
                "total_caracteres": knowledge_path(tenant_id).stat().st_size
                if knowledge_path(tenant_id).is_file()
                else 0,
                **compile_stats,
            }

    texto = normalize_text(_read_upload_text(safe, data))
    seccion = _infer_section(safe, texto)
    titulo = safe

    if safe.lower().endswith(".json"):
        try:
            payload = json.loads(data.decode("utf-8", errors="replace"))
            if isinstance(payload, dict):
                if payload.get("contenido"):
                    texto = normalize_text(str(payload["contenido"]))
                if payload.get("seccion"):
                    seccion = str(payload["seccion"]).strip().lower()
                if payload.get("titulo"):
                    titulo = str(payload["titulo"]).strip()
        except json.JSONDecodeError:
            pass

    extracted_path(tenant_id, safe).write_text(texto, encoding="utf-8")

    archivos = [a for a in archivos if a.get("nombre") != safe]
    archivos.append(
        {
            "nombre": safe,
            "sha256": sha,
            "seccion": seccion if seccion in _SECTION_TITLES else "general",
            "titulo": titulo,
            "importado_at": _now_iso(),
        }
    )
    manifest["archivos"] = archivos
    _save_manifest(tenant_id, manifest)
    stats = compile_knowledge(tenant_id)
    _touch_after_knowledge_change(tenant_id)
    kp = knowledge_path(tenant_id)
    return {
        "archivo": safe,
        "seccion": seccion,
        "duplicado": False,
        "caracteres_anadidos": len(texto),
        "total_caracteres": kp.stat().st_size if kp.is_file() else 0,
        **stats,
    }


def eliminar_cliente(tenant_id: str) -> dict[str, Any]:
    """Elimina por completo la carpeta del cliente (irreversible)."""
    tid = _slug(tenant_id)
    root = tenant_dir(tid)
    if not root.is_dir():
        raise ValueError(f"No existe el cliente «{tid}»")
    try:
        root.resolve().relative_to(_DATA_ROOT.resolve())
    except ValueError as exc:
        raise ValueError("Ruta de cliente inválida") from exc
    shutil.rmtree(root)
    return {"status": "ok", "tenant_id": tid, "eliminado": True}


def _html_to_text(html: str) -> str:
    t = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", html, flags=re.I)
    t = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", t, flags=re.I)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p\s*>", "\n\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    return normalize_text(t)


def import_from_url(tenant_id: str, url: str) -> dict[str, Any]:
    """Descarga una URL pública y la importa como documento (HTML o PDF)."""
    raw = (url or "").strip()
    if not raw.startswith(("http://", "https://")):
        raise ValueError("La URL debe empezar por http:// o https://")

    headers = {"User-Agent": "OpenixBot/1.0 (knowledge import)"}
    try:
        with httpx.Client(timeout=25.0, follow_redirects=True) as client:
            response = client.get(raw, headers=headers)
    except httpx.HTTPError as exc:
        raise ValueError(f"No se pudo acceder a la URL: {exc}") from exc

    if not response.is_success:
        raise ValueError(
            f"No se pudo descargar la página (HTTP {response.status_code})"
        )

    parsed = urlparse(raw)
    host = re.sub(r"[^a-zA-Z0-9_-]", "_", parsed.netloc or "web")[:40]
    path_bit = re.sub(r"[^a-zA-Z0-9_-]", "_", (parsed.path or "index").strip("/"))[:30]
    ct = (response.headers.get("content-type") or "").lower()

    if "pdf" in ct or raw.lower().endswith(".pdf"):
        filename = f"web-{host}-{path_bit or 'doc'}.pdf"
        return import_file(tenant_id, filename, response.content)

    if "html" in ct or "<html" in (response.text or "")[:500].lower():
        texto = _html_to_text(response.text or "")
        filename = f"web-{host}-{path_bit or 'page'}.md"
    else:
        texto = normalize_text(response.text or "")
        filename = f"web-{host}-{path_bit or 'page'}.txt"

    if len(texto.strip()) < 20:
        raise ValueError(
            "La página no tiene texto útil (¿login, CAPTCHA o contenido vacío?). "
            "Prueba otra URL o sube un PDF."
        )

    return import_file(tenant_id, filename, texto.encode("utf-8"))


def delete_upload(tenant_id: str, filename: str) -> dict[str, Any]:
    ensure_tenant(tenant_id)
    safe = re.sub(r"[^\w.\-]", "_", Path(filename).name)[:120]
    manifest = load_manifest(tenant_id)
    manifest["archivos"] = [
        a
        for a in (manifest.get("archivos") or [])
        if isinstance(a, dict) and a.get("nombre") != safe
    ]
    _save_manifest(tenant_id, manifest)
    for path in (uploads_dir(tenant_id) / safe, extracted_path(tenant_id, safe)):
        if path.is_file():
            path.unlink()
    stats = compile_knowledge(tenant_id)
    _touch_after_knowledge_change(tenant_id)
    return {"status": "ok", "eliminado": safe, **stats}


def rebuild_knowledge(tenant_id: str) -> dict[str, Any]:
    """Recompila desde sources.json y archivos en uploads/."""
    manifest = load_manifest(tenant_id)
    old_by_name = {
        str(a.get("nombre")): a
        for a in (manifest.get("archivos") or [])
        if isinstance(a, dict) and a.get("nombre")
    }
    ud = uploads_dir(tenant_id)
    archivos: list[dict[str, Any]] = []
    if ud.is_dir():
        for f in sorted(ud.iterdir()):
            if not f.is_file() or f.name.endswith(".extracted.txt"):
                continue
            data = f.read_bytes()
            sha = _sha256(data)
            texto = normalize_text(_read_upload_text(f.name, data))
            extracted_path(tenant_id, f.name).write_text(texto, encoding="utf-8")
            entry: dict[str, Any] = {
                "nombre": f.name,
                "sha256": sha,
                "seccion": _infer_section(f.name, texto),
                "titulo": f.name,
                "importado_at": _now_iso(),
            }
            prev = old_by_name.get(f.name)
            if prev and prev.get("sha256") == sha:
                if prev.get("seccion"):
                    entry["seccion"] = prev["seccion"]
                if prev.get("titulo"):
                    entry["titulo"] = prev["titulo"]
            archivos.append(entry)
    manifest["archivos"] = archivos
    _save_manifest(tenant_id, manifest)
    stats = compile_knowledge(tenant_id)
    _touch_after_knowledge_change(tenant_id)
    return {"status": "ok", **stats}


def publish(tenant_id: str, nombre: str = "") -> dict[str, Any]:
    compile_knowledge(tenant_id)
    if not load_knowledge_text(tenant_id).strip():
        raise ValueError("Sube o escribe conocimiento antes de publicar")
    meta = touch_meta(tenant_id, nombre=nombre, publicado=True)
    return {"tenant_id": _slug(tenant_id), "publicado": True, "meta": meta}
