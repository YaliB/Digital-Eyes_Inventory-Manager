from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    stored_path: str
    media_type: str
    size_bytes: int
    created_at: datetime
    category: str | None = None
    expiration_date: datetime | None = None