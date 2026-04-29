"""POST /analyze — compares a comparison photo against the latest baseline."""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.dependencies import CurrentUser, require_roles
from backend.api_routers.baseline import get_db
from backend.schemas.analyze import AnalyzeResponse
from backend.services.analyze_service import run_analysis

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_IMAGE_BYTES = 10 * 1024 * 1024


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_shelf(
    shelf_id: str = Form(...),
    image: UploadFile = File(...),
    user: CurrentUser = Depends(require_roles("worker", "manager")),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a comparison photo and get full shelf gap analysis.
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

    try:
        result = await run_analysis(
            shelf_id=shelf_id,
            comparison_bytes=image_bytes,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(
            "Analysis failed for shelf=%s user=%s: %s", shelf_id, user.user_id, str(e)
        )
        raise HTTPException(
            status_code=500, detail="Analysis failed. Please try again."
        )

    return result
