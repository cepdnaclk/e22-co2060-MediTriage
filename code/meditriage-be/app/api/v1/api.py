"""
API v1 router — aggregates all controller routers.
"""
from fastapi import APIRouter
from app.api.v1.controllers import (
    auth_controller,
    triage_controller,
    patient_controller,
    user_controller,
)

api_router = APIRouter()

# Register controller routers
api_router.include_router(auth_controller.router)
api_router.include_router(triage_controller.router)
api_router.include_router(patient_controller.router)
api_router.include_router(user_controller.router)
