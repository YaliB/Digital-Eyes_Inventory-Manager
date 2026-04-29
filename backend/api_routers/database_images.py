from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.db_core import get_db
from backend.db.db_models import Image
from backend.schemas.database import DeleteResponse, ImageResponse

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads" / "images"


def _build_relative_image_path(filename: str, media_type: str) -> Path:
    suffix = Path(filename).suffix.lower() or ALLOWED_CONTENT_TYPES[media_type]
    return Path("uploads") / "images" / f"{uuid4().hex}{suffix}"


def _resolve_absolute_image_path(relative_path: str) -> Path:
    return Path(__file__).resolve().parents[1] / relative_path


async def _get_image_or_404(db: AsyncSession, image_id: int) -> Image:
    image = await db.get(Image, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return image


@router.post("/upload", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    category: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    file_content = await file.read()
    if not file_content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Max 10MB.")

    relative_path = _build_relative_image_path(
        file.filename or "uploaded-image",
        file.content_type,
    )
    absolute_path = Path(__file__).resolve().parents[1] / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(file_content)

    image = Image(
        filename=file.filename or absolute_path.name,
        stored_path=relative_path.as_posix(),
        media_type=file.content_type,
        size_bytes=len(file_content),
        created_at=datetime.now(timezone.utc),
        category=category,
    )
    db.add(image)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        if absolute_path.exists():
            absolute_path.unlink()
        raise

    await db.refresh(image)
    return image


@router.get("", response_model=list[ImageResponse])
async def list_images(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).order_by(Image.created_at.desc(), Image.id.desc()))
    return list(result.scalars().all())


@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(image_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_image_or_404(db, image_id)


@router.get("/{image_id}/file")
async def view_image_file(image_id: int, db: AsyncSession = Depends(get_db)):
    image = await _get_image_or_404(db, image_id)
    absolute_path = _resolve_absolute_image_path(image.stored_path)
    if not absolute_path.exists():
        raise HTTPException(status_code=404, detail="Stored image file not found")
    return FileResponse(path=absolute_path, media_type=image.media_type, filename=image.filename)


@router.delete("/{image_id}", response_model=DeleteResponse)
async def delete_image(image_id: int, db: AsyncSession = Depends(get_db)):
    image = await _get_image_or_404(db, image_id)
    absolute_path = _resolve_absolute_image_path(image.stored_path)
    await db.delete(image)
    await db.commit()
    if absolute_path.exists():
        absolute_path.unlink()

    return DeleteResponse(message="Image deleted successfully", id=image_id)