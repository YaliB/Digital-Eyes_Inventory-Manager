from fastapi import APIRouter

# import sub-routers
from api_routers.database import (
    subr_db_imgs
    )

router = APIRouter(
    prefix="/database",
    tags=["database"]
)

@router.get("/test")
async def test_database():
    return {"message": "Database route is working!"}

router.include_router(
    subr_db_imgs.router,
    prefix="/imgs",
    tags=["database", "imgs"]
    )