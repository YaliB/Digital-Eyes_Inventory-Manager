"""POST /baseline — uploads a morning baseline photo for a shelf."""
from fastapi import APIRouter

router = APIRouter()


@router.post("/baseline")
async def upload_baseline():
    return {"status": "not_implemented_yet"}
