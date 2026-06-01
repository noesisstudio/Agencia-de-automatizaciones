"""Empresas y documentación (base de conocimiento)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import knowledge_store

router = APIRouter(prefix="/empresas", tags=["empresas"])


class CrearEmpresaBody(BaseModel):
    empresa_id: str = Field(..., min_length=2, max_length=48)
    nombre: str = Field(..., min_length=1)


class KnowledgeBody(BaseModel):
    texto: str = Field(..., min_length=10)


@router.get("")
async def listar() -> dict[str, Any]:
    return {"empresas": knowledge_store.list_empresas()}


@router.post("")
async def crear(body: CrearEmpresaBody) -> dict[str, Any]:
    try:
        meta = knowledge_store.crear_empresa(body.empresa_id, body.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"status": "ok", "empresa": meta}


@router.get("/{empresa_id}")
async def obtener(empresa_id: str) -> dict[str, Any]:
    eid = knowledge_store.slug_id(empresa_id)
    if not knowledge_store.empresa_exists(eid):
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    meta = knowledge_store.cargar_meta(eid)
    texto = knowledge_store.load_knowledge_text(eid)
    return {
        "empresa_id": eid,
        "nombre": meta.get("nombre", eid),
        "knowledge_markdown": texto,
        "caracteres": len(texto),
    }


@router.put("/{empresa_id}/knowledge")
async def guardar_conocimiento(empresa_id: str, body: KnowledgeBody) -> dict[str, Any]:
    eid = knowledge_store.slug_id(empresa_id)
    if not knowledge_store.empresa_exists(eid):
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    path = knowledge_store.save_knowledge_text(eid, body.texto)
    return {"status": "ok", "ruta": str(path), "caracteres": len(body.texto)}
