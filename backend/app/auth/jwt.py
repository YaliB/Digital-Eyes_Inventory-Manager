"""
JWT token creation and verification.
Simple, stateless auth — no auth server needed for hackathon.
"""

import logging
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# These come from .env — never hardcode in real projects
SECRET_KEY = "CHANGE_THIS_IN_PRODUCTION_ENV"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours — full shift

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

VALID_ROLES = {"worker", "manager", "supplier"}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    user_id: str,
    role: str,
    expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES,
) -> str:
    """Create a signed JWT token with user_id and role embedded."""
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role: {role}. Must be one of {VALID_ROLES}")

    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    Raises JWTError if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning("Invalid JWT token: %s", str(e))
        raise
