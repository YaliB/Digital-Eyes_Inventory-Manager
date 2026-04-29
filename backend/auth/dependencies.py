"""
FastAPI auth dependencies.
Inject these into route functions to require authentication and specific roles.

Usage examples:
    # Require any authenticated user
    @router.get("/something")
    async def my_route(user=Depends(get_current_user)):
        ...

    # Require worker or manager role
    @router.post("/baseline")
    async def upload_baseline(user=Depends(require_roles("worker", "manager"))):
        ...

    # Require manager only
    @router.get("/analytics")
    async def analytics(user=Depends(require_roles("manager"))):
        ...
"""

import logging
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from backend.auth.jwt import decode_token

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    user_id: str
    role: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Extract and validate the JWT token from the Authorization header.
    Returns a CurrentUser dataclass with user_id and role.
    Raises 401 if token is missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        role: str = payload.get("role")

        if not user_id or not role:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    return CurrentUser(user_id=user_id, role=role)


def require_roles(*allowed_roles: str):
    """
    Role-based access control dependency factory.
    Returns a FastAPI dependency that enforces role membership.

    Usage: Depends(require_roles("worker", "manager"))
    """

    async def _check_role(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {' or '.join(allowed_roles)}. Your role: {user.role}",
            )
        return user

    return _check_role
