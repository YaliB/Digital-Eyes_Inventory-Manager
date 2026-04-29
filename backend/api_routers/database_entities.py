from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.db_core import get_db
from backend.db.db_models import Inventory, Product, User
from backend.schemas.common import DeleteResponse
from backend.schemas.database_entities import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


async def _get_or_404(
    db: AsyncSession,
    model: type[User] | type[Product] | type[Inventory],
    entity_id: int,
    detail: str,
):
    entity = await db.get(model, entity_id)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return entity


async def _ensure_product_exists(db: AsyncSession, product_id: int) -> None:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found",
        )


def _apply_updates(entity: User | Product | Inventory, updates: dict) -> None:
    for field_name, value in updates.items():
        setattr(entity, field_name, value)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=payload.password,
        role=payload.role,
        items_type_added=payload.items_type_added,
        uploaded_photos=payload.uploaded_photos,
    )
    db.add(user)

    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with the same username or email already exists",
        ) from error

    await db.refresh(user)
    return user


@router.get("/users", response_model=list[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id.asc()))
    return list(result.scalars().all())


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, User, user_id, f"User {user_id} not found")


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    user = await _get_or_404(db, User, user_id, f"User {user_id} not found")
    updates = payload.model_dump(exclude_unset=True)
    password = updates.pop("password", None)
    if password is not None:
        updates["hashed_password"] = password
    _apply_updates(user, updates)

    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with the same username or email already exists",
        ) from error

    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=DeleteResponse)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await _get_or_404(db, User, user_id, f"User {user_id} not found")
    await db.delete(user)
    await db.commit()
    return DeleteResponse(message="User deleted successfully", id=user_id)


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/products", response_model=list[ProductResponse])
async def list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).order_by(Product.id.asc()))
    return list(result.scalars().all())


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, Product, product_id, f"Product {product_id} not found")


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    product = await _get_or_404(
        db,
        Product,
        product_id,
        f"Product {product_id} not found",
    )
    _apply_updates(product, payload.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", response_model=DeleteResponse)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await _get_or_404(
        db,
        Product,
        product_id,
        f"Product {product_id} not found",
    )
    await db.delete(product)
    await db.commit()
    return DeleteResponse(message="Product deleted successfully", id=product_id)


@router.post(
    "/inventory",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
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


@router.get("/inventory", response_model=list[InventoryResponse])
async def list_inventory(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Inventory).order_by(Inventory.id.asc()))
    return list(result.scalars().all())


@router.get("/inventory/{inventory_id}", response_model=InventoryResponse)
async def get_inventory_item(inventory_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(
        db,
        Inventory,
        inventory_id,
        f"Inventory item {inventory_id} not found",
    )


@router.put("/inventory/{inventory_id}", response_model=InventoryResponse)
async def update_inventory_item(
    inventory_id: int,
    payload: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    inventory_item = await _get_or_404(
        db,
        Inventory,
        inventory_id,
        f"Inventory item {inventory_id} not found",
    )
    updates = payload.model_dump(exclude_unset=True)
    product_id = updates.get("product_id")
    if product_id is not None:
        await _ensure_product_exists(db, product_id)
    _apply_updates(inventory_item, updates)
    await db.commit()
    await db.refresh(inventory_item)
    return inventory_item


@router.delete("/inventory/{inventory_id}", response_model=DeleteResponse)
async def delete_inventory_item(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
):
    inventory_item = await _get_or_404(
        db,
        Inventory,
        inventory_id,
        f"Inventory item {inventory_id} not found",
    )
    await db.delete(inventory_item)
    await db.commit()
    return DeleteResponse(message="Inventory item deleted successfully", id=inventory_id)