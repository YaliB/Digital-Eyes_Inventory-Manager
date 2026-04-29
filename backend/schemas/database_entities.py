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