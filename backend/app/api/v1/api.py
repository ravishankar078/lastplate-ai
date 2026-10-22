"""
API v1 Router Aggregator.
Combines sub-routers for health, authentication, organizations, donations, matching, and routes.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, donations, health, matching, organizations

api_router = APIRouter()

# Health and System Probes
api_router.include_router(health.router, tags=["Health & System Probes"])

# Authentication and Profiles
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profiles"])

# Organizations and Verification Workflows
api_router.include_router(
    organizations.router, prefix="/organizations", tags=["Organizations & Verification"]
)

# Food Donations and Lifecycle Management
api_router.include_router(
    donations.router, prefix="/donations", tags=["Food Donations & Lifecycle"]
)

# AI Matching Engine and Atomic Claims
api_router.include_router(
    matching.router, prefix="/matching", tags=["AI Matching & Atomic Claims"]
)
