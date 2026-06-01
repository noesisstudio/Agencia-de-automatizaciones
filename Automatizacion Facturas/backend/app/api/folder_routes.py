from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.models import ClientFolder, Invoice, User
from app.schemas import ClientFolderCreate, ClientFolderResponse, InvoiceResponse
from app.services.invoice_service import invoice_to_response

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[ClientFolderResponse])
def list_folders(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[ClientFolder]:
    return db.query(ClientFolder).order_by(ClientFolder.name).all()


@router.post("", response_model=ClientFolderResponse)
def create_folder(
    body: ClientFolderCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ClientFolder:
    existing = db.query(ClientFolder).filter(ClientFolder.name == body.name).first()
    if existing:
        raise HTTPException(400, "La carpeta ya existe")
    folder = ClientFolder(name=body.name, description=body.description)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.put("/{folder_id}", response_model=ClientFolderResponse)
def rename_folder(
    folder_id: int,
    body: ClientFolderCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ClientFolder:
    folder = db.query(ClientFolder).filter(ClientFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(404, "Carpeta no encontrada")
    folder.name = body.name
    folder.description = body.description
    db.commit()
    db.refresh(folder)
    return folder


@router.get("/{folder_id}/invoices", response_model=list[InvoiceResponse])
def folder_invoices(
    folder_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[InvoiceResponse]:
    rows = (
        db.query(Invoice)
        .filter(Invoice.folder_id == folder_id, Invoice.is_deleted.is_(False))
        .order_by(Invoice.created_at.desc())
        .all()
    )
    return [invoice_to_response(i) for i in rows]
