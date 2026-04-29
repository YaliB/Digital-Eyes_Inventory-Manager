from fastapi import APIRouter

# import sub-routers
from backend.api_routers.database import (
    subr_imgs
    )

router = APIRouter(
    prefix="/database",
    tags=["database"]
)

@router.get("/test")
async def test_database():
    return {"message": "Database route is working!"}

router.include_router(
    subr_imgs.router,
    prefix="/imgs",
    tags=["database", "imgs"]
    )