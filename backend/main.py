from fastapi import FastAPI
# from fastapi.routing import APIRouter

from api_routers.database import database_route

app = FastAPI(
    title="Digital-Eyes_Inventory-Manager",
    version="0.1.0"
)

app.include_router(database_route.router)


if __name__ == "__main__":
    pass