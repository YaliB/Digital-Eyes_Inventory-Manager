from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.api_routers.database import database_route
from backend.db.db_core import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Digital-Eyes_Inventory-Manager",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(database_route.router)


if __name__ == "__main__":
    pass