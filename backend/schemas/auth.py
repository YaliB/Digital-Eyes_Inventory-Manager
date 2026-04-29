"""Pydantic schemas for auth endpoints."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


class UserInfo(BaseModel):
    user_id: str
    role: str
