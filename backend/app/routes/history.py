"""
GET /history — scan history for dashboard.
Accessible by: manager (all shelves), supplier (read-only, all shelves).
Workers cannot see history (they only scan).
"""

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, require_roles
from app.routes.baseline import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/history")
async def get_history(
    shelf_id: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    page: int = Query(default=1, ge=1),
    user: CurrentUser = Depends(require_roles("manager", "supplier")),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated scan history.

    - manager: can filter by shelf_id, sees all analytics
    - supplier: read-only view, same data
    - worker: 403 Forbidden
    """
    offset = (page - 1) * limit

    filters = "WHERE 1=1"
    params: dict = {"limit": limit, "offset": offset}

    if shelf_id:
        filters += " AND shelf_id = :shelf_id"
        params["shelf_id"] = shelf_id

    result = await db.execute(
        text(f"""
            SELECT
                id,
                shelf_id,
                shelf_health_score,
                gaps_count,
                created_at
            FROM scans
            {filters}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    rows = result.fetchall()

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM scans {filters}"),
        params,
    )
    total = count_result.scalar()

    return {
        "scans": [
            {
                "id": str(row.id),
                "shelf_id": row.shelf_id,
                "shelf_health_score": row.shelf_health_score,
                "gaps_count": row.gaps_count,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "requested_by": user.user_id,
        "role": user.role,
    }
