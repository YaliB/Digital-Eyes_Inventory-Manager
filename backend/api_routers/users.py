from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.db_core import get_db
from backend.db.db_models import User
from backend.schemas.common import DeleteResponse
from backend.schemas.database_entities import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )
    return user


def _apply_updates(user: User, updates: dict) -> None:
    for field_name, value in updates.items():
        setattr(user, field_name, value)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
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


@router.get("", response_model=list[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id.asc()))
    return list(result.scalars().all())


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_user_or_404(db, user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_or_404(db, user_id)
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


@router.delete("/{user_id}", response_model=DeleteResponse)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await _get_user_or_404(db, user_id)
    await db.delete(user)
    await db.commit()
    return DeleteResponse(message="User deleted successfully", id=user_id)