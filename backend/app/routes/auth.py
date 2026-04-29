"""
POST /auth/login — returns a JWT token.
For POC we use hardcoded demo users. Yali can wire up real DB users later.
"""

from fastapi import APIRouter, HTTPException, status

from app.auth.jwt import create_access_token, verify_password, hash_password
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth")

# ── Demo users for hackathon POC ──────────────────────────────────────────────
# Yali: replace this with a real DB lookup when users table is ready
# password hashes generated with: hash_password("password")
DEMO_USERS = {
    "worker1": {
        "user_id": "worker1",
        "role": "worker",
        "hashed_password": hash_password("worker123"),
    },
    "manager1": {
        "user_id": "manager1",
        "role": "manager",
        "hashed_password": hash_password("manager123"),
    },
    "supplier1": {
        "user_id": "supplier1",
        "role": "supplier",
        "hashed_password": hash_password("supplier123"),
    },
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
    user = DEMO_USERS.get(request.username)

    if not user or not verify_password(request.password, user["hashed_password"]):
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
