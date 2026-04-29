"""POST /analyze — compares a comparison photo against the latest baseline."""
from fastapi import APIRouter

router = APIRouter()


@router.post("/analyze")
async def analyze():
    return {"status": "not_implemented_yet"}
