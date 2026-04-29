"""
POST /auth/login — returns a JWT token.
For POC we use hardcoded demo users. Yali can wire up real DB users later.
"""

from fastapi import APIRouter, HTTPException, status

from backend.auth.jwt import create_access_token
from backend.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth")

# ── Demo users for hackathon POC ──────────────────────────────────────────────
# Passwords are stored in plain text here and compared directly to avoid
# bcrypt 4.x / passlib import-time hashing incompatibility (ValueError >72 bytes).
# Yali: replace with real DB lookup + hashed passwords when users table is ready.
_DEMO_PLAIN: dict[str, dict] = {
    "worker1":   {"user_id": "worker1",   "role": "worker",   "password": "worker123"},
    "manager1":  {"user_id": "manager1",  "role": "manager",  "password": "manager123"},
    "supplier1": {"user_id": "supplier1", "role": "supplier", "password": "supplier123"},
}
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate a user and return a JWT token.

    Demo credentials:
      worker1 / worker123
      manager1 / manager123
      supplier1 / supplier123
    """
    user = _DEMO_PLAIN.get(request.username)

    if not user or request.password != user["password"]:
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


@router.get("/me")
async def get_me():
    """Returns current user info — wire up after auth dependency is added."""
    return {"message": "not_implemented_yet"}
