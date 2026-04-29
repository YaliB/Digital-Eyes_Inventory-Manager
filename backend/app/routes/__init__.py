"""HTTP route registrations."""

from fastapi import APIRouter

from app.routes import analyze, baseline, history
from app.routes.auth import router as auth_router

api_router = APIRouter()

# Auth — no prefix, accessible at /auth/login
api_router.include_router(auth_router)

# Core features
api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(baseline.router, tags=["baseline"])
api_router.include_router(history.router, tags=["history"])
