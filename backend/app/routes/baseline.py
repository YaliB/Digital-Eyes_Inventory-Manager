"""POST /baseline — uploads a morning baseline photo for a shelf."""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, require_roles
from app.schemas.baseline import BaselineUploadResponse

logger = logging.getLogger(__name__)
router = APIRouter()
MAX_IMAGE_BYTES = 10 * 1024 * 1024


async def get_db():
    """DB session dependency — Yali implements the real version in app/db/."""
    raise NotImplementedError("Yali: wire up DB session here")


@router.post("/baseline", response_model=BaselineUploadResponse)
async def upload_baseline(
    shelf_id: str = Form(...),
    image: UploadFile = File(...),
    user: CurrentUser = Depends(require_roles("worker", "manager")),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a morning baseline photo for a specific shelf.
    Accessible by: worker, manager. Suppliers get 403.
    """
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large. Max 10MB.")
    if image.content_type not in ("image/jpeg", "image/jpg", "image/png"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported type: {image.content_type}. Use JPEG or PNG.",
        )

    baseline_id = uuid4()
    captured_at = datetime.now(timezone.utc)

    await db.execute(
        text("""
            INSERT INTO baselines (id, shelf_id, worker_id, image_data, captured_at)
            VALUES (:id, :shelf_id, :worker_id, :image_data, :captured_at)
        """),
        {
            "id": str(baseline_id),
            "shelf_id": shelf_id,
            "worker_id": user.user_id,
            "image_data": image_bytes,
            "captured_at": captured_at,
        },
    )
    await db.commit()

    logger.info(
        "Baseline saved: id=%s shelf=%s by user=%s role=%s",
        baseline_id,
        shelf_id,
        user.user_id,
        user.role,
    )

    return BaselineUploadResponse(
        baseline_id=baseline_id,
        shelf_id=shelf_id,
        captured_at=captured_at,
    )
