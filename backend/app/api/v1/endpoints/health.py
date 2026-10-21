"""
Health and Readiness Probes.
Used by load balancers, container orchestrators, and monitoring services.
"""

from datetime import datetime
from fastapi import APIRouter, status
from app.core.config import settings
from app.schemas.common import HealthResponse, ReadinessResponse, ResponseEnvelope

router = APIRouter()


@router.get(
    "/health",
    response_model=ResponseEnvelope[HealthResponse],
    status_code=status.HTTP_200_OK,
    summary="Application Health & Liveness Probe",
    description="Returns service liveness, project name, version, and server timestamp.",
)
async def get_health() -> ResponseEnvelope[HealthResponse]:
    """Check application liveness."""
    data = HealthResponse(
        status="healthy",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow(),
    )
    return ResponseEnvelope[HealthResponse](
        success=True,
        message="LastPlate API is operational.",
        data=data,
    )


@router.get(
    "/ready",
    response_model=ResponseEnvelope[ReadinessResponse],
    status_code=status.HTTP_200_OK,
    summary="Application Readiness Probe",
    description="Verifies the service is ready to accept user traffic and external requests.",
)
async def get_readiness() -> ResponseEnvelope[ReadinessResponse]:
    """Check if the service is ready to handle traffic."""
    # In Phase 3, the backend foundation is standalone.
    # In Phase 4, database connectivity checks will be connected here.
    services_status = {
        "api": "ready",
        "configuration": "loaded",
        "cors": "configured",
    }
    data = ReadinessResponse(
        ready=True,
        services=services_status,
        timestamp=datetime.utcnow(),
    )
    return ResponseEnvelope[ReadinessResponse](
        success=True,
        message="Service is ready to handle incoming traffic.",
        data=data,
    )


@router.get(
    "/ping",
    summary="Lightweight Heartbeat Ping",
    description="Returns immediate pong acknowledgment for ultra-fast connectivity verification.",
)
async def ping() -> dict:
    """Lightweight ping probe."""
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat()}
