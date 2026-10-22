"""
API v1 Router Aggregator.
Combines sub-routers for health, authentication, organizations, donations, matching, and routes.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, organizations

api_router = APIRouter()

# Health and System Probes
api_router.include_router(health.router, tags=["Health & System Probes"])

# Authentication and Profiles
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profiles"])

# Organizations and Verification Workflows
api_router.include_router(
    organizations.router, prefix="/organizations", tags=["Organizations & Verification"]
)
