"""
WebSocket API Endpoints for Real-Time Event Streaming & Courier Telemetry.
Provides authenticated WebSocket connections with query-string JWT tokens,
bidirectional heartbeats, channel subscriptions, and live GPS streaming.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal, get_db
from app.models.user import User
from app.schemas.common import ResponseEnvelope
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("lastplate.ws_endpoint")
router = APIRouter()


async def get_ws_user(token: Optional[str]) -> Optional[User]:
    """Validates JWT token and fetches user for WebSocket connection."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None

        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.id == uuid.UUID(user_id))
            res = await session.execute(stmt)
            user = res.scalar_one_or_none()
            if user and user.is_active:
                return user
            return None
    except Exception as e:
        logger.debug(f"[WS Auth] Token validation failed: {e}")
        return None


@router.websocket("/stream")
async def websocket_event_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Unified Real-Time Event & Telemetry WebSocket Stream.
    Requires valid JWT token query parameter: `/api/v1/ws/stream?token=<access_token>`.
    """
    user = await get_ws_user(token)
    if not user:
        # Reject unauthenticated connection
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized: Invalid token")
        return

    user_id_str = str(user.id)
    user_role = user.role

    await ws_manager.connect(websocket, user_id=user_id_str, role=user_role)

    # Send initial welcome & connection confirmation frame
    await ws_manager.send_direct_message(
        websocket,
        {
            "type": "CONNECTION_ESTABLISHED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": user_id_str,
                "role": user_role,
                "full_name": user.full_name,
                "server_time": datetime.now(timezone.utc).isoformat(),
            },
        },
    )

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
            except json.JSONDecodeError:
                await ws_manager.send_direct_message(
                    websocket,
                    {"type": "ERROR", "message": "Invalid JSON frame received."},
                )
                continue

            msg_type = msg.get("type", "").lower()
            payload = msg.get("payload", {})

            # 1. Heartbeat Ping / Pong
            if msg_type == "ping":
                await ws_manager.send_direct_message(
                    websocket,
                    {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )

            # 2. Channel Subscription
            elif msg_type == "subscribe":
                channel = payload.get("channel") or msg.get("channel")
                if channel:
                    await ws_manager.subscribe(websocket, channel)
                    await ws_manager.send_direct_message(
                        websocket,
                        {
                            "type": "SUBSCRIBED",
                            "channel": channel,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                    )

            # 3. Channel Unsubscription
            elif msg_type == "unsubscribe":
                channel = payload.get("channel") or msg.get("channel")
                if channel:
                    await ws_manager.unsubscribe(websocket, channel)
                    await ws_manager.send_direct_message(
                        websocket,
                        {
                            "type": "UNSUBSCRIBED",
                            "channel": channel,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                    )

            # 4. Courier GPS Location Telemetry
            elif msg_type == "courier_location":
                telemetry = {
                    "courier_id": user_id_str,
                    "courier_name": user.full_name,
                    "latitude": payload.get("latitude", 0.0),
                    "longitude": payload.get("longitude", 0.0),
                    "speed_kmh": payload.get("speed_kmh", 0.0),
                    "heading_deg": payload.get("heading_deg", 0.0),
                    "route_id": payload.get("route_id"),
                    "pickup_id": payload.get("pickup_id"),
                }
                # Store in memory
                ws_manager.record_courier_location(user_id_str, telemetry)

                # Broadcast live telemetry update to dispatch channel
                await ws_manager.broadcast_to_channel(
                    "dispatch",
                    {
                        "type": "COURIER_LOCATION",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "payload": telemetry,
                    },
                )

            # Unknown event
            else:
                logger.debug(f"[WS] Unhandled message type: {msg_type}")

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, user_id=user_id_str, role=user_role)
    except Exception as e:
        logger.error(f"[WS Error] Connection error for user {user_id_str}: {e}")
        await ws_manager.disconnect(websocket, user_id=user_id_str, role=user_role)


# ---------------------------------------------------------------------------
# REST Endpoints for Real-Time Telemetry & Dispatchers
# ---------------------------------------------------------------------------

@router.get(
    "/telemetry/couriers",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="Get All Live Courier GPS Locations",
)
async def get_live_couriers(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns the latest GPS coordinates and velocities for all active couriers."""
    locations = ws_manager.get_all_courier_locations()
    return ResponseEnvelope(
        success=True,
        data=locations,
        message=f"Retrieved {len(locations)} active courier coordinates.",
    )


@router.get(
    "/telemetry/couriers/{courier_id}",
    response_model=ResponseEnvelope[Optional[Dict[str, Any]]],
    summary="Get Specific Courier GPS Location",
)
async def get_courier_telemetry(
    courier_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns the latest GPS coordinates for a specific courier."""
    location = ws_manager.get_courier_location(courier_id)
    return ResponseEnvelope(
        success=True,
        data=location,
        message="Courier location found." if location else "No recent telemetry for courier.",
    )


@router.post(
    "/broadcast",
    response_model=ResponseEnvelope[Dict[str, Any]],
    summary="Broadcast System-Wide Message (Admin only)",
)
async def broadcast_system_message(
    payload: Dict[str, Any],
    current_user: User = Depends(deps.require_role("admin")),
) -> Any:
    """Admin endpoint to broadcast an urgent system notification across all connected clients."""
    channel = payload.get("channel", "global")
    event_type = payload.get("type", "SYSTEM_ALERT")
    msg_data = payload.get("data", {})

    event_frame = {
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sender": current_user.full_name,
        "payload": msg_data,
    }

    if channel == "global":
        await ws_manager.broadcast_all(event_frame)
    else:
        await ws_manager.broadcast_to_channel(channel, event_frame)

    return ResponseEnvelope(
        success=True,
        data={"channel": channel, "event": event_type},
        message=f"Message broadcasted to channel '{channel}' successfully.",
    )
