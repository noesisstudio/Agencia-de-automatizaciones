from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.security import decrypt_nif, encrypt_nif, mask_nif
from app.database import get_db
from app.models import Client, ClientFolder, Invoice, User
from app.schemas import (
    ClientCreate,
    ClientFolderCreate,
    ClientFolderResponse,
    ClientResponse,
    ClientUpdate,
    InvoiceResponse,
)
from app.services.invoice_service import invoice_to_response

router = APIRouter(prefix="/clients", tags=["clients"])


def _client_response(db: Session, client: Client) -> ClientResponse:
    nif = decrypt_nif(client.encrypted_nif)
    inv_q = db.query(Invoice).filter(Invoice.client_id == client.id, Invoice.is_deleted.is_(False))
    count = inv_q.count()
    total = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(Invoice.client_id == client.id, Invoice.is_deleted.is_(False))
        .scalar()
    )
    return ClientResponse(
        id=client.id,
        name=client.name,
        nif_masked=mask_nif(nif),
        email=client.email,
        phone=client.phone,
        address=client.address,
        folder_id=client.folder_id,
        folder_name=client.folder.name if client.folder else None,
        invoice_count=count,
        total_billed=float(total or 0),
        created_at=client.created_at,
    )


@router.get("", response_model=list[ClientResponse])
def list_clients(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
) -> list[ClientResponse]:
    q = db.query(Client)
    if search.strip():
        q = q.filter(Client.name.ilike(f"%{search.strip()}%"))
    rows = q.order_by(Client.name).offset((page - 1) * limit).limit(limit).all()
    return [_client_response(db, c) for c in rows]


@router.post("", response_model=ClientResponse)
def create_client(
    body: ClientCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ClientResponse:
    client = Client(
        name=body.name,
        encrypted_nif=encrypt_nif(body.nif),
        email=body.email,
        phone=body.phone,
        address=body.address,
        folder_id=body.folder_id,
        created_by=user.id,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _client_response(db, client)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ClientResponse:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    return _client_response(db, client)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    body: ClientUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ClientResponse:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    if body.name is not None:
        client.name = body.name
    if body.nif is not None:
        client.encrypted_nif = encrypt_nif(body.nif)
    if body.email is not None:
        client.email = body.email
    if body.phone is not None:
        client.phone = body.phone
    if body.address is not None:
        client.address = body.address
    if body.folder_id is not None:
        client.folder_id = body.folder_id
    db.commit()
    db.refresh(client)
    return _client_response(db, client)


@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    invoice_count = (
        db.query(Invoice)
        .filter(Invoice.client_id == client.id, Invoice.is_deleted.is_(False))
        .count()
    )
    if invoice_count > 0:
        raise HTTPException(
            400,
            "No puedes eliminar este cliente porque tiene facturas asociadas. "
            "Reasigna o elimina esas facturas primero.",
        )
    db.delete(client)
    db.commit()
    return {"message": "Cliente eliminado"}


@router.get("/{client_id}/invoices", response_model=list[InvoiceResponse])
def client_invoices(
    client_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[InvoiceResponse]:
    rows = (
        db.query(Invoice)
        .filter(Invoice.client_id == client_id, Invoice.is_deleted.is_(False))
        .order_by(Invoice.created_at.desc())
        .all()
    )
    return [invoice_to_response(i) for i in rows]


@router.get("/{client_id}/folders", response_model=list[ClientFolderResponse])
def client_folders(
    client_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[ClientFolder]:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    if client.folder:
        return [client.folder]
    return []


@router.post("/{client_id}/folders", response_model=ClientFolderResponse)
def assign_folder(
    client_id: int,
    body: ClientFolderCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ClientFolder:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")
    folder = db.query(ClientFolder).filter(ClientFolder.name == body.name).first()
    if not folder:
        folder = ClientFolder(name=body.name, description=body.description)
        db.add(folder)
        db.flush()
    client.folder_id = folder.id
    db.commit()
    db.refresh(folder)
    return folder
