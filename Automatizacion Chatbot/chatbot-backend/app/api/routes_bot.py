"""Configuración del chatbot por empresa: clientes, documentos, chat."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.services import chat_diagnostics, chat_engine, knowledge_store

router = APIRouter(prefix="/tenants", tags=["chatbot"])


class CrearClienteBody(BaseModel):
    tenant_id: str = Field(..., min_length=2, max_length=48)
    nombre: str = Field(..., min_length=1)
    contacto: str = ""
    meta_phone_number_id: str = ""


class TenantMetaBody(BaseModel):
    nombre: str = ""


class ClienteMetaBody(BaseModel):
    nombre: str = ""
    contacto: str = ""
    meta_phone_number_id: str = ""
    notas: str = ""


class KnowledgeBody(BaseModel):
    texto: str
    nombre: str = ""


class UrlDocumentoBody(BaseModel):
    url: str


class ChatBody(BaseModel):
    mensaje: str
    session_id: str = "web-demo"


class ChatResponse(BaseModel):
    respuesta: str
    reformulado: bool = False
    ok: bool = True
    codigo_error: str | None = None
    solucion: str | None = None


@router.get("")
async def listar() -> dict[str, Any]:
    clientes = knowledge_store.list_tenants()
    return {"clientes": clientes, "tenants": clientes}


@router.post("")
async def crear_cliente(body: CrearClienteBody) -> dict[str, Any]:
    try:
        meta = knowledge_store.crear_cliente(
            body.tenant_id,
            body.nombre,
            contacto=body.contacto,
            meta_phone_number_id=body.meta_phone_number_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", "cliente": meta}


@router.get("/{tenant_id}")
async def obtener(tenant_id: str) -> dict[str, Any]:
    try:
        knowledge_store.ensure_tenant(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    meta = knowledge_store.cargar_meta(tenant_id)
    return {
        "tenant_id": tenant_id,
        "nombre": meta.get("nombre", tenant_id),
        "contacto": meta.get("contacto", ""),
        "meta_phone_number_id": meta.get("meta_phone_number_id", ""),
        "notas": meta.get("notas", ""),
        "publicado_at": meta.get("publicado_at"),
        "base_markdown": knowledge_store.load_base_markdown(tenant_id),
        "knowledge_markdown": knowledge_store.load_knowledge_text(tenant_id),
        "archivos_subidos": knowledge_store.list_uploads(tenant_id),
        "fuentes_estructuradas": knowledge_store.sources_path(tenant_id).is_file(),
        "stats": knowledge_store.knowledge_stats(tenant_id),
    }


@router.delete("/{tenant_id}")
async def eliminar_cliente(tenant_id: str) -> dict[str, Any]:
    try:
        return knowledge_store.eliminar_cliente(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.patch("/{tenant_id}")
async def actualizar_cliente(tenant_id: str, body: ClienteMetaBody) -> dict[str, Any]:
    try:
        meta = knowledge_store.actualizar_meta_cliente(
            tenant_id,
            body.model_dump(exclude_unset=True),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", "cliente": meta}


@router.put("/{tenant_id}/knowledge")
async def guardar_conocimiento(tenant_id: str, body: KnowledgeBody) -> dict[str, Any]:
    if not body.texto.strip():
        raise HTTPException(status_code=400, detail="Texto vacío")
    try:
        path = knowledge_store.save_knowledge_text(
            tenant_id, body.texto, nombre=body.nombre
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    stats = knowledge_store.knowledge_stats(tenant_id)
    return {
        "status": "ok",
        "ruta": str(path),
        "caracteres": stats["caracteres_base"],
        "stats": stats,
    }


@router.post("/{tenant_id}/documentos/url")
async def importar_documento_url(tenant_id: str, body: UrlDocumentoBody) -> dict[str, Any]:
    if not body.url.strip():
        raise HTTPException(status_code=400, detail="URL vacía")
    try:
        return knowledge_store.import_from_url(tenant_id, body.url.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{tenant_id}/documentos")
async def subir_documento(
    tenant_id: str,
    archivo: UploadFile = File(...),
) -> dict[str, Any]:
    if not archivo.filename:
        raise HTTPException(status_code=400, detail="Sin nombre de archivo")
    data = await archivo.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Máximo 8 MB")
    lower = archivo.filename.lower()
    if not lower.endswith((".md", ".txt", ".pdf", ".json")):
        raise HTTPException(
            status_code=400,
            detail="Formatos: .md, .txt, .pdf, .json",
        )
    try:
        info = knowledge_store.import_file(tenant_id, archivo.filename, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", **info, "stats": knowledge_store.knowledge_stats(tenant_id)}


@router.delete("/{tenant_id}/documentos/{nombre_archivo}")
async def eliminar_documento(tenant_id: str, nombre_archivo: str) -> dict[str, Any]:
    try:
        result = knowledge_store.delete_upload(tenant_id, nombre_archivo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {**result, "stats": knowledge_store.knowledge_stats(tenant_id)}


@router.post("/{tenant_id}/knowledge/rebuild")
async def recompilar_conocimiento(tenant_id: str) -> dict[str, Any]:
    try:
        result = knowledge_store.rebuild_knowledge(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {**result, "stats": knowledge_store.knowledge_stats(tenant_id)}


@router.get("/{tenant_id}/diagnostico")
async def diagnostico_chatbot(tenant_id: str) -> dict[str, Any]:
    try:
        knowledge_store.ensure_tenant(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return chat_diagnostics.diagnosticar_tenant(tenant_id, incluir_whatsapp=True)


@router.post("/{tenant_id}/publicar")
async def publicar(tenant_id: str, body: TenantMetaBody = TenantMetaBody()) -> dict[str, Any]:
    try:
        return knowledge_store.publish(tenant_id, nombre=body.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{tenant_id}/chat", response_model=ChatResponse)
async def probar_chat(tenant_id: str, body: ChatBody) -> ChatResponse:
    reformular = chat_engine.wants_rephrase(body.mensaje)
    result = await chat_engine.reply(
        tenant_id,
        body.session_id,
        body.mensaje,
        reformular=reformular,
        canal="web",
    )
    return ChatResponse(
        respuesta=result.respuesta,
        reformulado=result.reformulado,
        ok=result.ok,
        codigo_error=result.codigo_error,
        solucion=result.solucion,
    )
