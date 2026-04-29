from datetime import datetime

from pydantic import BaseModel


class HistoryScanItem(BaseModel):
    id: str
    shelf_id: str
    shelf_health_score: int
    gaps_count: int
    created_at: datetime


class HistoryResponse(BaseModel):
    scans: list[HistoryScanItem]
    total: int
    page: int
    limit: int
    requested_by: str
    role: str