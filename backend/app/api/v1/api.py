"""
API v1 Router Aggregator.
Combines sub-routers for health, authentication, donations, matching, and routes.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import health

api_router = APIRouter()

# Health and System Probes
api_router.include_router(health.router, tags=["Health & System Probes"])
