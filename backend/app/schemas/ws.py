"""
Pydantic Schemas for WebSocket Real-Time Events and Location Streaming.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class WebSocketMessage(BaseModel):
    """Base schema for inbound and outbound WebSocket frames."""

    type: str = Field(..., description="Message event type (e.g. 'ping', 'location_update', 'notification')")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Event generation timestamp",
    )
    payload: Optional[Dict[str, Any]] = Field(default=None, description="Event payload data")


class LocationUpdatePayload(BaseModel):
    """Inbound telemetry packet from courier mobile / web client."""

    courier_id: Optional[str] = None
    courier_name: Optional[str] = None
    route_id: Optional[str] = None
    pickup_id: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed_kmh: Optional[float] = Field(default=0.0, ge=0.0)
    heading_deg: Optional[float] = Field(default=0.0, ge=0.0, le=360.0)
    accuracy_m: Optional[float] = Field(default=5.0, ge=0.0)


class RealtimeNotificationPayload(BaseModel):
    """Outbound targeted notification payload."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    level: str = "info"  # 'info', 'success', 'warning', 'error'
    action_url: Optional[str] = None
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
