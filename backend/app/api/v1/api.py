"""
API v1 Router Aggregator.
Combines sub-routers for health, authentication, organizations, donations, matching, and routes.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    auth,
    donations,
    health,
    matching,
    notifications,
    organizations,
    routing,
    volunteer,
    ws,
)

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

# In-App Notifications & Alerts
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["In-App Notifications & Alerts"]
)

# Volunteer Dispatch & Handover Verification
api_router.include_router(
    volunteer.router, prefix="/volunteer", tags=["Volunteer Dispatch & Handover"]
)

# Google OR-Tools VRP Route Optimization & Auto-Dispatch
api_router.include_router(
    routing.router, prefix="/routing", tags=["Google OR-Tools VRP Routing"]
)

# WebSockets Real-Time Event Streaming & Courier GPS Telemetry
api_router.include_router(
    ws.router, prefix="/ws", tags=["WebSockets & Live Telemetry"]
)

# Administrative Oversight, Analytics, and Audit Logs
api_router.include_router(
    admin.router, prefix="/admin", tags=["Administrative Oversight & Analytics"]
)
