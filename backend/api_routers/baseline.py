"""POST /baseline — uploads a morning baseline photo for a shelf."""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.dependencies import CurrentUser, require_roles
from backend.db.db_core import get_db
from backend.schemas.baseline import BaselineStatusResponse, BaselineUploadResponse

logger = logging.getLogger(__name__)
router = APIRouter()
MAX_IMAGE_BYTES = 10 * 1024 * 1024


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


@router.get("/baseline/status", response_model=BaselineStatusResponse)
async def get_baseline_status(
    shelf_id: str = Query(...),
    user: CurrentUser = Depends(require_roles("worker", "manager")),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if a baseline exists for the given shelf.
    Returns the most recent baseline metadata (no image bytes).
    Accessible by: worker, manager.
    """
    result = await db.execute(
        text("""
            SELECT id, captured_at
            FROM baselines
            WHERE shelf_id = :shelf_id
            ORDER BY captured_at DESC
            LIMIT 1
        """),
        {"shelf_id": shelf_id},
    )
    row = result.fetchone()
    if row is None:
        return BaselineStatusResponse(exists=False)
    return BaselineStatusResponse(
        exists=True,
        captured_at=row.captured_at,
        baseline_id=str(row.id),
    )
