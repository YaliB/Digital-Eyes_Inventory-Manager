from fastapi import APIRouter

from backend.api_routers import database_entities, database_images

router = APIRouter(prefix="/database", tags=["database"])


@router.get("/test")
async def test_database():
    return {"message": "Database route is working!"}


router.include_router(
    database_images.router,
    prefix="/images",
    tags=["database", "images"],
)
router.include_router(database_entities.router, tags=["database"])