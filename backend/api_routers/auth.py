"""POST /auth/login — returns a JWT token."""

from fastapi import APIRouter, HTTPException, status

from backend.auth.jwt import create_access_token
from backend.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth")

# Demo users for POC — replace with real user lookup against the DB in production
DEMO_USERS = {
    "manager1":  {"user_id": "manager1",  "role": "manager",  "password": "manager123"},
    "worker1":   {"user_id": "worker1",   "role": "worker",   "password": "worker123"},
    "supplier1": {"user_id": "supplier1", "role": "supplier", "password": "supplier123"},
}


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = DEMO_USERS.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token(
        user_id=user["user_id"],
        role=user["role"],
    )

    return TokenResponse(
        access_token=token,
        role=user["role"],
        user_id=user["user_id"],
    )
