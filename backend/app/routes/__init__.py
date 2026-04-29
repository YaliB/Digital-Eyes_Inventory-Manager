"""HTTP route registrations. Each route module defines its own APIRouter."""
from fastapi import APIRouter

from app.routes import analyze, baseline

api_router = APIRouter()
api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(baseline.router, tags=["baseline"])
