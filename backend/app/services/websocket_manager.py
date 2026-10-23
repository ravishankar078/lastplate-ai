"""
WebSocket Connection Manager and Real-Time Event Dispatcher.
Manages persistent connections, room/channel subscriptions,
role-based fanout, and courier GPS location telemetry.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional, Set
import uuid

from fastapi import WebSocket

logger = logging.getLogger("lastplate.websocket")


class ConnectionManager:
    """
    Central connection registry for WebSockets.
    Maintains active connections mapped by User ID, Role, and Channel.
    """

    def __init__(self):
        # user_id -> set of active WebSockets (supports multiple tabs / devices)
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        # role -> set of active WebSockets
        self.role_connections: Dict[str, Set[WebSocket]] = {}
        # channel_name -> set of active WebSockets
        self.channel_subscriptions: Dict[str, Set[WebSocket]] = {
            "dispatch": set(),
            "donations": set(),
            "global": set(),
        }
        # In-memory latest telemetry coordinates per courier: courier_id -> {lat, lng, speed, ...}
        self.latest_courier_locations: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        role: str,
        default_channels: Optional[List[str]] = None,
    ):
        """Accepts a WebSocket and registers it into user, role, and channel sets."""
        await websocket.accept()

        async with self._lock:
            # Add to user connections
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)

            # Add to role connections
            if role not in self.role_connections:
                self.role_connections[role] = set()
            self.role_connections[role].add(websocket)

            # Default subscriptions
            channels = default_channels or ["global"]
            if role in ["admin", "volunteer"]:
                channels.append("dispatch")
            if role in ["admin", "ngo", "donor"]:
                channels.append("donations")

            for ch in channels:
                if ch not in self.channel_subscriptions:
                    self.channel_subscriptions[ch] = set()
                self.channel_subscriptions[ch].add(websocket)

        logger.info(
            f"[WS] Client connected: user={user_id}, role={role}, channels={channels}"
        )

    async def disconnect(
        self,
        websocket: WebSocket,
        user_id: str,
        role: str,
    ):
        """Removes a WebSocket from all mappings on client disconnect."""
        async with self._lock:
            # Remove from user set
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

            # Remove from role set
            if role in self.role_connections:
                self.role_connections[role].discard(websocket)
                if not self.role_connections[role]:
                    del self.role_connections[role]

            # Remove from all channels
            for ch_set in self.channel_subscriptions.values():
                ch_set.discard(websocket)

        logger.info(f"[WS] Client disconnected: user={user_id}, role={role}")

    async def subscribe(self, websocket: WebSocket, channel: str):
        """Subscribes a socket to an additional channel."""
        async with self._lock:
            if channel not in self.channel_subscriptions:
                self.channel_subscriptions[channel] = set()
            self.channel_subscriptions[channel].add(websocket)

    async def unsubscribe(self, websocket: WebSocket, channel: str):
        """Unsubscribes a socket from a channel."""
        async with self._lock:
            if channel in self.channel_subscriptions:
                self.channel_subscriptions[channel].discard(websocket)

    async def send_direct_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Sends a JSON-serialized frame directly to a single socket."""
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception as e:
            logger.debug(f"[WS] Error sending direct message: {e}")

    async def broadcast_to_user(self, user_id: str, message: Dict[str, Any]):
        """Sends an event frame to all active sessions of a specific user."""
        target_sockets = list(self.user_connections.get(str(user_id), []))
        dead_sockets = []

        for ws in target_sockets:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            async with self._lock:
                for ws in dead_sockets:
                    self.user_connections.get(str(user_id), set()).discard(ws)

    async def broadcast_to_channel(self, channel: str, message: Dict[str, Any]):
        """Broadcasts an event frame to all subscribers of a topic/channel."""
        target_sockets = list(self.channel_subscriptions.get(channel, []))
        dead_sockets = []

        for ws in target_sockets:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            async with self._lock:
                for ws in dead_sockets:
                    self.channel_subscriptions.get(channel, set()).discard(ws)

    async def broadcast_to_role(self, role: str, message: Dict[str, Any]):
        """Broadcasts an event frame to all connected users with a given role."""
        target_sockets = list(self.role_connections.get(role, []))
        dead_sockets = []

        for ws in target_sockets:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            async with self._lock:
                for ws in dead_sockets:
                    self.role_connections.get(role, set()).discard(ws)

    async def broadcast_all(self, message: Dict[str, Any]):
        """Broadcasts an event frame to every connected WebSocket client."""
        await self.broadcast_to_channel("global", message)

    def record_courier_location(self, courier_id: str, telemetry: Dict[str, Any]):
        """Records latest GPS coordinates in memory for telemetry tracking."""
        telemetry["timestamp"] = datetime.now(timezone.utc).isoformat()
        self.latest_courier_locations[courier_id] = telemetry

    def get_courier_location(self, courier_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves latest known telemetry coordinates for a courier."""
        return self.latest_courier_locations.get(courier_id)

    def get_all_courier_locations(self) -> List[Dict[str, Any]]:
        """Returns latest telemetry for all active couriers."""
        return list(self.latest_courier_locations.values())


# Global singleton ConnectionManager
ws_manager = ConnectionManager()
