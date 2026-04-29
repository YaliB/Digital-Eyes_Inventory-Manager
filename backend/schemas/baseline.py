"""Pydantic schemas for the /baseline endpoint."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class BaselineUploadResponse(BaseModel):
    baseline_id: UUID
    shelf_id: str
    captured_at: datetime
