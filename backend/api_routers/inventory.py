from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.db_core import get_db
from backend.db.db_models import Inventory, Product
from backend.schemas.common import DeleteResponse
from backend.schemas.database_entities import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


async def _get_inventory_or_404(db: AsyncSession, inventory_id: int) -> Inventory:
    inventory_item = await db.get(Inventory, inventory_id)
    if inventory_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item {inventory_id} not found",
        )
    return inventory_item


async def _ensure_product_exists(db: AsyncSession, product_id: int) -> None:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found",
        )


def _apply_updates(inventory_item: Inventory, updates: dict) -> None:
    for field_name, value in updates.items():
        setattr(inventory_item, field_name, value)


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    payload: InventoryCreate,
    db: AsyncSession = Depends(get_db),
):
    await _ensure_product_exists(db, payload.product_id)
    inventory_item = Inventory(**payload.model_dump())
    db.add(inventory_item)
    await db.commit()
    await db.refresh(inventory_item)
    return inventory_item


@router.get("", response_model=list[InventoryResponse])
async def list_inventory(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Inventory).order_by(Inventory.id.asc()))
    return list(result.scalars().all())


@router.get("/{inventory_id}", response_model=InventoryResponse)
async def get_inventory_item(inventory_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_inventory_or_404(db, inventory_id)


@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory_item(
    inventory_id: int,
    payload: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    inventory_item = await _get_inventory_or_404(db, inventory_id)
    updates = payload.model_dump(exclude_unset=True)
    product_id = updates.get("product_id")
    if product_id is not None:
        await _ensure_product_exists(db, product_id)
    _apply_updates(inventory_item, updates)
    await db.commit()
    await db.refresh(inventory_item)
    return inventory_item


@router.delete("/{inventory_id}", response_model=DeleteResponse)
async def delete_inventory_item(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
):
    inventory_item = await _get_inventory_or_404(db, inventory_id)
    await db.delete(inventory_item)
    await db.commit()
    return DeleteResponse(message="Inventory item deleted successfully", id=inventory_id)