from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api_routers import analyze, auth, baseline, database_admin, history
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(database_admin.router)
app.include_router(auth.router)
app.include_router(baseline.router)
app.include_router(analyze.router)
app.include_router(history.router)


if __name__ == "__main__":
    pass