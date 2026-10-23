"""
Automated Test Suite for WebSockets Real-Time Event Streaming and Courier GPS Telemetry.
Verifies:
1. Unauthenticated rejection (missing or invalid token).
2. Authenticated handshake and welcome frame.
3. Bidirectional ping-pong heartbeat.
4. Dynamic channel subscribe / unsubscribe.
5. Live courier GPS telemetry streaming and dispatch broadcast.
6. Targeted user and role broadcast fanout.
7. Telemetry REST queries and admin system broadcast endpoint.
"""

from datetime import datetime, timezone
import json
import pytest
from fastapi.testclient import TestClient

from app.services.websocket_manager import ws_manager


def get_token(client: TestClient, email: str) -> str:
    """Helper to acquire JWT bearer token for testing."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "LastPlate#2026"},
    )
    return res.json()["data"]["access_token"]


def test_websocket_unauthenticated_rejected(client: TestClient):
    """Verifies that WebSocket connections without a valid token are rejected."""
    # 1. No token
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v1/ws/stream"):
            pass

    # 2. Bogus token
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v1/ws/stream?token=invalid.jwt.token"):
            pass


def test_websocket_authenticated_connect_and_welcome(client: TestClient):
    """Verifies that an authenticated client receives a CONNECTION_ESTABLISHED frame."""
    token = get_token(client, "priya.volunteer@gmail.com")

    with client.websocket_connect(f"/api/v1/ws/stream?token={token}") as ws:
        welcome_frame = json.loads(ws.receive_text())
        assert welcome_frame["type"] == "CONNECTION_ESTABLISHED"
        assert welcome_frame["payload"]["role"] == "volunteer"
        assert "server_time" in welcome_frame["payload"]


def test_websocket_heartbeat_ping_pong(client: TestClient):
    """Verifies bidirectional heartbeat ping / pong."""
    token = get_token(client, "priya.volunteer@gmail.com")

    with client.websocket_connect(f"/api/v1/ws/stream?token={token}") as ws:
        # Read welcome frame
        _ = ws.receive_text()

        # Send ping
        ws.send_text(json.dumps({"type": "ping"}))

        # Receive pong
        response = json.loads(ws.receive_text())
        assert response["type"] == "pong"
        assert "timestamp" in response


def test_websocket_channel_subscription(client: TestClient):
    """Verifies dynamic channel subscription and confirmation."""
    token = get_token(client, "chef@grandbistro.org")

    with client.websocket_connect(f"/api/v1/ws/stream?token={token}") as ws:
        # Read welcome frame
        _ = ws.receive_text()

        # Subscribe to custom channel
        ws.send_text(
            json.dumps({"type": "subscribe", "channel": "district_north_alerts"})
        )

        sub_ack = json.loads(ws.receive_text())
        assert sub_ack["type"] == "SUBSCRIBED"
        assert sub_ack["channel"] == "district_north_alerts"


def test_websocket_courier_gps_telemetry_streaming(client: TestClient):
    """
    Verifies that a courier streaming GPS coordinates over WebSocket
    causes live telemetry to broadcast to clients on the dispatch channel
    and updates the in-memory telemetry cache.
    """
    vol_token = get_token(client, "priya.volunteer@gmail.com")
    admin_token = get_token(client, "admin@lastplate.org")

    # Connect admin (automatically subscribed to 'dispatch')
    with client.websocket_connect(f"/api/v1/ws/stream?token={admin_token}") as admin_ws:
        # Clear welcome frame
        _ = admin_ws.receive_text()

        # Connect courier
        with client.websocket_connect(f"/api/v1/ws/stream?token={vol_token}") as courier_ws:
            _ = courier_ws.receive_text()

            # Courier sends live GPS telemetry packet
            telemetry_data = {
                "latitude": 12.9716,
                "longitude": 77.5946,
                "speed_kmh": 24.5,
                "heading_deg": 180.0,
                "route_id": "route-live-01",
            }
            courier_ws.send_text(
                json.dumps({
                    "type": "courier_location",
                    "payload": telemetry_data,
                })
            )

            # Admin client should receive the live broadcast
            received_frame = json.loads(admin_ws.receive_text())
            assert received_frame["type"] == "COURIER_LOCATION"
            assert received_frame["payload"]["latitude"] == 12.9716
            assert received_frame["payload"]["speed_kmh"] == 24.5

    # Verify REST endpoint retrieves latest telemetry
    rest_res = client.get(
        "/api/v1/ws/telemetry/couriers",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rest_res.status_code == 200
    locations = rest_res.json()["data"]
    assert any(loc["latitude"] == 12.9716 for loc in locations)


@pytest.mark.asyncio
async def test_websocket_targeted_user_and_role_broadcast(client: TestClient):
    """Verifies targeted broadcast to a specific user and role."""
    vol_token = get_token(client, "priya.volunteer@gmail.com")

    with client.websocket_connect(f"/api/v1/ws/stream?token={vol_token}") as ws:
        welcome_frame = json.loads(ws.receive_text())
        user_id = welcome_frame["payload"]["user_id"]

        # 1. Test targeted user broadcast
        await ws_manager.broadcast_to_user(
            user_id=user_id,
            message={
                "type": "NEW_JOB_ALERT",
                "payload": {"title": "Urgent Soup Kitchen Pickup"},
            },
        )
        msg1 = json.loads(ws.receive_text())
        assert msg1["type"] == "NEW_JOB_ALERT"
        assert msg1["payload"]["title"] == "Urgent Soup Kitchen Pickup"

        # 2. Test targeted role broadcast
        await ws_manager.broadcast_to_role(
            role="volunteer",
            message={
                "type": "FLEET_ANNOUNCEMENT",
                "payload": {"announcement": "Heavy rain alert in downtown sector"},
            },
        )
        msg2 = json.loads(ws.receive_text())
        assert msg2["type"] == "FLEET_ANNOUNCEMENT"


def test_websocket_admin_broadcast_endpoint(client: TestClient):
    """Verifies POST /api/v1/ws/broadcast endpoint."""
    admin_token = get_token(client, "admin@lastplate.org")
    vol_token = get_token(client, "priya.volunteer@gmail.com")

    with client.websocket_connect(f"/api/v1/ws/stream?token={vol_token}") as ws:
        _ = ws.receive_text()  # welcome

        # Admin sends broadcast
        b_res = client.post(
            "/api/v1/ws/broadcast",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "channel": "global",
                "type": "SYSTEM_MAINTENANCE",
                "data": {"message": "Scheduled routine health check in 10 minutes."},
            },
        )
        assert b_res.status_code == 200

        # Connected client receives broadcast frame
        received = json.loads(ws.receive_text())
        assert received["type"] == "SYSTEM_MAINTENANCE"
        assert received["payload"]["message"] == "Scheduled routine health check in 10 minutes."
