from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.db_core import get_db
from backend.db.db_models import Product
from backend.schemas.common import DeleteResponse
from backend.schemas.database_entities import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])


async def _get_product_or_404(db: AsyncSession, product_id: int) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found",
        )
    return product


def _apply_updates(product: Product, updates: dict) -> None:
    for field_name, value in updates.items():
        setattr(product, field_name, value)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("", response_model=list[ProductResponse])
async def list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).order_by(Product.id.asc()))
    return list(result.scalars().all())


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_product_or_404(db, product_id)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    product = await _get_product_or_404(db, product_id)
    _apply_updates(product, payload.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", response_model=DeleteResponse)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await _get_product_or_404(db, product_id)
    await db.delete(product)
    await db.commit()
    return DeleteResponse(message="Product deleted successfully", id=product_id)