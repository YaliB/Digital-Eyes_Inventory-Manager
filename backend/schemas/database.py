from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


UserRole = Literal["worker", "manager", "supplier"]


class UserBase(BaseModel):
    username: str | None = Field(default=None, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    role: UserRole
    items_type_added: int = Field(default=0, ge=0)
    uploaded_photos: int = Field(default=0, ge=0)


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=255)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    password: str | None = Field(default=None, min_length=6, max_length=255)
    role: UserRole | None = None
    items_type_added: int | None = Field(default=None, ge=0)
    uploaded_photos: int | None = Field(default=None, ge=0)


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ProductBase(BaseModel):
    category: str | None = Field(default=None, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    img_path: str | None = Field(default=None, max_length=1024)
    price: int | None = Field(default=None, ge=0)
    price_on_sale: int | None = Field(default=None, ge=0)
    sale_expiration_date: datetime | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    category: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    img_path: str | None = Field(default=None, max_length=1024)
    price: int | None = Field(default=None, ge=0)
    price_on_sale: int | None = Field(default=None, ge=0)
    sale_expiration_date: datetime | None = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class InventoryBase(BaseModel):
    product_id: int = Field(ge=1)
    category: str | None = Field(default=None, max_length=255)
    quantity: int = Field(ge=0)
    on_shelf: bool = True
    shelf_restock: int = Field(default=0, ge=0)


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    product_id: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=255)
    quantity: int | None = Field(default=None, ge=0)
    on_shelf: bool | None = None
    shelf_restock: int | None = Field(default=None, ge=0)


class InventoryResponse(InventoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    stored_path: str
    media_type: str
    size_bytes: int
    created_at: datetime
    category: str | None = None
    expiration_date: datetime | None = None


class DeleteResponse(BaseModel):
    message: str
    id: int