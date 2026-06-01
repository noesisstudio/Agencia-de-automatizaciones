from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.models import Product, User
from app.schemas import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
) -> list[Product]:
    q = db.query(Product)
    if search.strip():
        q = q.filter(Product.name.ilike(f"%{search.strip()}%"))
    return q.order_by(Product.name).offset((page - 1) * limit).limit(limit).all()


@router.post("", response_model=ProductResponse)
def create_product(
    body: ProductCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> Product:
    row = Product(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> Product:
    row = db.query(Product).filter(Product.id == product_id).first()
    if not row:
        raise HTTPException(404, "Producto no encontrado")
    return row


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> Product:
    row = db.query(Product).filter(Product.id == product_id).first()
    if not row:
        raise HTTPException(404, "Producto no encontrado")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    row = db.query(Product).filter(Product.id == product_id).first()
    if not row:
        raise HTTPException(404, "Producto no encontrado")
    db.delete(row)
    db.commit()
    return {"message": "Producto eliminado"}
