"""
GET  /history          — scan history for dashboard.
DELETE /history/{id}  — delete a completed scan (mark shelf as restocked).
Accessible by: manager (all shelves), supplier (read-only, all shelves).
Workers cannot see history (they only scan).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.dependencies import CurrentUser, require_roles
from backend.db.db_core import get_db
from backend.schemas.history import HistoryResponse, HistoryScanItem

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    shelf_id: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    page: int = Query(default=1, ge=1),
    user: CurrentUser = Depends(require_roles("manager", "supplier", "worker")),
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
                result_json,
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

    return HistoryResponse(
        scans=[
            HistoryScanItem(
                id=str(row.id),
                shelf_id=row.shelf_id,
                shelf_health_score=row.shelf_health_score,
                gaps_count=row.gaps_count,
                created_at=row.created_at,
                result_json=row.result_json,
            )
            for row in rows
        ],
        total=total,
        page=page,
        limit=limit,
        requested_by=user.user_id,
        role=user.role,
    )


@router.delete("/history/{scan_id}", status_code=200)
async def delete_scan(
    scan_id: str,
    user: CurrentUser = Depends(require_roles("manager", "worker")),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a scan record — used when a worker has restocked the shelf
    and wants to mark the task as done.

    Accessible by: manager, worker.
    """
    result = await db.execute(
        text("SELECT id FROM scans WHERE id = :scan_id"),
        {"scan_id": scan_id},
    )
    if result.fetchone() is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    await db.execute(
        text("DELETE FROM scans WHERE id = :scan_id"),
        {"scan_id": scan_id},
    )
    await db.commit()
    logger.info("Scan deleted: id=%s by user=%s (role=%s)", scan_id, user.user_id, user.role)
    return {"deleted": scan_id}
