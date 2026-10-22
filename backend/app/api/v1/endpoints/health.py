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


from sqlalchemy import text
from app.db.session import engine


@router.get(
    "/ready",
    response_model=ResponseEnvelope[ReadinessResponse],
    status_code=status.HTTP_200_OK,
    summary="Application Readiness Probe",
    description="Verifies the service and database are ready to accept user traffic and external requests.",
)
async def get_readiness() -> ResponseEnvelope[ReadinessResponse]:
    """Check if the service and database are ready to handle traffic."""
    db_status = "disconnected"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as exc:
        db_status = f"error: {str(exc)}"

    is_ready = db_status == "connected"
    services_status = {
        "api": "ready",
        "configuration": "loaded",
        "cors": "configured",
        "database": db_status,
        "spatial_engine": "cube, earthdistance, GiST (active)",
    }
    data = ReadinessResponse(
        ready=is_ready,
        services=services_status,
        timestamp=datetime.utcnow(),
    )
    return ResponseEnvelope[ReadinessResponse](
        success=is_ready,
        message="Service and database are ready to handle incoming traffic."
        if is_ready
        else "Service is degraded: database connectivity failure.",
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
