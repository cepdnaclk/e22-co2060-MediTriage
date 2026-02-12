"""
API v1 router — aggregates all endpoint routers.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import triage, auth, patients, users

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(auth.router)
api_router.include_router(triage.router)
api_router.include_router(patients.router)
api_router.include_router(users.router)
