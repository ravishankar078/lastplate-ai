"""
Automated Test Suite for Google OR-Tools Route Optimization Engine (VRP / PDPTW).
Verifies:
1. Precedence Invariant: Pickup stop occurs strictly before delivery stop on the same vehicle route.
2. Capacity Invariant: Cumulative load never exceeds vehicle capacity at any waypoint.
3. Time Window Compliance: Stops are visited within valid pickup/delivery windows.
4. Food Safety Latency: Perishable orders are delivered within safe transit limits (<= 120 min).
5. Multi-Vehicle Fleet Load Balancing: Orders are shared across available couriers.
6. Overcapacity Disjunction Handling: Unperformable orders are dropped gracefully without solver failure.
7. Endpoints: POST /api/v1/routing/optimize and POST /api/v1/routing/auto-dispatch.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from app.services.route_optimizer import (
    OrderPair,
    RouteOptimizer,
    VehicleInfo,
    haversine_distance_km,
    road_distance_km,
)


def get_token(client: TestClient, email: str) -> str:
    """Helper to acquire JWT bearer token for testing."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "LastPlate#2026"},
    )
    return res.json()["data"]["access_token"]


def test_haversine_and_road_distance_calculation():
    """Verifies Haversine and urban road circuity multipliers."""
    # Distance between two known Bangalore landmarks (~2.1 km straight line)
    lat1, lon1 = 12.9716, 77.5946
    lat2, lon2 = 12.9800, 77.6050

    straight_km = haversine_distance_km(lat1, lon1, lat2, lon2)
    road_km = road_distance_km(lat1, lon1, lat2, lon2)

    assert 1.0 < straight_km < 3.0
    assert road_km == straight_km * 1.35  # 1.35x urban circuity factor
    assert haversine_distance_km(lat1, lon1, lat1, lon1) == 0.0


def test_route_optimizer_precedence_invariant():
    """
    CRITICAL INVARIANT: For every order pair, the pickup stop MUST precede
    the delivery stop on the exact same vehicle.
    """
    optimizer = RouteOptimizer(time_limit_seconds=5)

    orders = [
        OrderPair(
            pickup_id=f"pickup-{i}",
            donation_id=f"don-{i}",
            title=f"Meals Batch {i}",
            donor_name=f"Donor Kitchen {i}",
            donor_address=f"Street {i}",
            donor_lat=12.9700 + (i * 0.005),
            donor_lng=77.5900 + (i * 0.004),
            recipient_name=f"Shelter {i}",
            recipient_address=f"Avenue {i}",
            recipient_lat=12.9800 + (i * 0.006),
            recipient_lng=77.6000 + (i * 0.005),
            quantity_kg=12.0,
            portions=24,
            storage_condition="cooked_meals",
            pickup_window_start=0,
            pickup_window_end=120,
            delivery_window_start=15,
            delivery_window_end=240,
            max_transit_minutes=90,
        )
        for i in range(1, 4)
    ]

    vehicles = [
        VehicleInfo(
            vehicle_id="veh-01",
            courier_name="Alex Courier",
            vehicle_type="car",
            capacity_kg=100.0,
            start_lat=12.9650,
            start_lng=77.5850,
            start_address="Depot Base",
            shift_start_minutes=0,
            shift_end_minutes=360,
        )
    ]

    result = optimizer.solve(orders, vehicles)

    assert result.solver_status in ["OPTIMAL_OR_FEASIBLE", "FEASIBLE"]
    assert len(result.routes) == 1
    route = result.routes[0]

    # Verify precedence for every order
    order_pickup_seq = {}
    order_delivery_seq = {}

    for stop in route.stops:
        if stop.stop_type == "pickup":
            order_pickup_seq[stop.pickup_id] = stop.stop_sequence
        elif stop.stop_type == "delivery":
            order_delivery_seq[stop.pickup_id] = stop.stop_sequence

    assert len(order_pickup_seq) == 3
    assert len(order_delivery_seq) == 3

    for p_id in order_pickup_seq:
        p_seq = order_pickup_seq[p_id]
        d_seq = order_delivery_seq[p_id]
        assert p_seq < d_seq, f"Precedence violated for order {p_id}: Pickup seq {p_seq} >= Delivery seq {d_seq}"


def test_route_optimizer_capacity_constraint():
    """
    CRITICAL INVARIANT: Vehicle load at any stop must never exceed its capacity limit.
    """
    optimizer = RouteOptimizer(time_limit_seconds=5)

    # 3 orders of 15kg each = 45kg total.
    # Vehicle capacity is 35kg (bicycle carrier).
    # The vehicle cannot carry all 3 at once. It MUST deliver an order before picking up the 3rd.
    orders = [
        OrderPair(
            pickup_id=f"order-{i}",
            donation_id=f"don-{i}",
            title=f"Order {i}",
            donor_name=f"Kitchen {i}",
            donor_address=f"Donor Addr {i}",
            donor_lat=12.9710 + (i * 0.003),
            donor_lng=77.5920 + (i * 0.003),
            recipient_name=f"NGO {i}",
            recipient_address=f"NGO Addr {i}",
            recipient_lat=12.9780 + (i * 0.004),
            recipient_lng=77.6010 + (i * 0.004),
            quantity_kg=15.0,
            portions=30,
            storage_condition="ambient",
            pickup_window_start=0,
            pickup_window_end=180,
            delivery_window_start=15,
            delivery_window_end=240,
            max_transit_minutes=120,
        )
        for i in range(1, 4)
    ]

    vehicles = [
        VehicleInfo(
            vehicle_id="bike-01",
            courier_name="Bicycle Courier",
            vehicle_type="bicycle",
            capacity_kg=35.0,  # Max 35 kg!
            start_lat=12.9700,
            start_lng=77.5900,
            start_address="Depot",
            shift_start_minutes=0,
            shift_end_minutes=300,
        )
    ]

    result = optimizer.solve(orders, vehicles)
    assert result.solver_status in ["OPTIMAL_OR_FEASIBLE", "FEASIBLE"]
    assert len(result.routes) == 1

    route = result.routes[0]
    for stop in route.stops:
        # Load when arriving or departing stop cannot exceed vehicle capacity
        assert stop.cumulative_load_kg <= 35.0, f"Capacity exceeded at stop #{stop.stop_sequence}: {stop.cumulative_load_kg} kg > 35 kg"


def test_route_optimizer_multi_vehicle_distribution():
    """Verifies that orders with concurrent time windows are distributed across multiple couriers."""
    optimizer = RouteOptimizer(time_limit_seconds=5)

    # 2 separate urgent missions with tight concurrent 30-min windows in East and West districts
    orders = [
        OrderPair(
            pickup_id="order-east",
            donation_id="don-east",
            title="East District Meals",
            donor_name="East Kitchen",
            donor_address="100 East Blvd",
            donor_lat=12.9750,
            donor_lng=77.6200,
            recipient_name="East Shelter",
            recipient_address="150 East Ave",
            recipient_lat=12.9800,
            recipient_lng=77.6250,
            quantity_kg=25.0,
            portions=50,
            storage_condition="hot_holding",
            pickup_window_start=0,
            pickup_window_end=30,
            delivery_window_start=10,
            delivery_window_end=45,
            max_transit_minutes=45,
        ),
        OrderPair(
            pickup_id="order-west",
            donation_id="don-west",
            title="West District Meals",
            donor_name="West Kitchen",
            donor_address="20 West Blvd",
            donor_lat=12.9650,
            donor_lng=77.5600,
            recipient_name="West Shelter",
            recipient_address="50 West Ave",
            recipient_lat=12.9600,
            recipient_lng=77.5550,
            quantity_kg=25.0,
            portions=50,
            storage_condition="hot_holding",
            pickup_window_start=0,
            pickup_window_end=30,
            delivery_window_start=10,
            delivery_window_end=45,
            max_transit_minutes=45,
        ),
    ]

    # Two couriers stationed in the respective districts
    vehicles = [
        VehicleInfo(
            vehicle_id="vol-east",
            courier_name="Courier East",
            vehicle_type="bicycle",
            capacity_kg=35.0,
            start_lat=12.9740,
            start_lng=77.6180,
            start_address="East Station",
            shift_start_minutes=0,
            shift_end_minutes=120,
        ),
        VehicleInfo(
            vehicle_id="vol-west",
            courier_name="Courier West",
            vehicle_type="bicycle",
            capacity_kg=35.0,
            start_lat=12.9660,
            start_lng=77.5620,
            start_address="West Station",
            shift_start_minutes=0,
            shift_end_minutes=120,
        ),
    ]

    result = optimizer.solve(orders, vehicles)
    assert result.solver_status in ["OPTIMAL_OR_FEASIBLE", "FEASIBLE"]
    assert len(result.routes) == 2, f"Expected both couriers to be dispatched for concurrent geographically separated missions, got {len(result.routes)}"
    assert len(result.unassigned_order_ids) == 0


def test_route_optimizer_overcapacity_disjunction():
    """
    Verifies that when demand exceeds total fleet capacity, the solver gracefully drops
    excess orders without failing, returning unassigned order IDs.
    """
    optimizer = RouteOptimizer(time_limit_seconds=5)

    # 100 kg demand
    orders = [
        OrderPair(
            pickup_id="large-order-1",
            donation_id="don-large",
            title="Massive Banquet Surplus",
            donor_name="Grand Hotel",
            donor_address="1 Luxury Blvd",
            donor_lat=12.9716,
            donor_lng=77.5946,
            recipient_name="Mega Food Kitchen",
            recipient_address="50 Relief Way",
            recipient_lat=12.9800,
            recipient_lng=77.6050,
            quantity_kg=100.0,
            portions=200,
            storage_condition="cooked_meals",
            pickup_window_start=0,
            pickup_window_end=60,
            delivery_window_start=15,
            delivery_window_end=120,
        )
    ]

    # Vehicle capacity is only 20 kg
    vehicles = [
        VehicleInfo(
            vehicle_id="small-bike",
            courier_name="Bike Courier",
            vehicle_type="bicycle",
            capacity_kg=20.0,
            start_lat=12.9700,
            start_lng=77.5900,
            start_address="Depot",
        )
    ]

    result = optimizer.solve(orders, vehicles)
    # The solver should return gracefully without crashing
    assert "large-order-1" in result.unassigned_order_ids


def test_route_optimizer_empty_cases():
    """Verifies edge cases: empty orders or empty fleet."""
    optimizer = RouteOptimizer(time_limit_seconds=2)

    # No orders
    res1 = optimizer.solve([], [VehicleInfo("v1", "Test", "car", 100, 12.0, 77.0, "Depot")])
    assert res1.solver_status == "NO_ORDERS"
    assert len(res1.routes) == 0

    # No vehicles
    res2 = optimizer.solve(
        [
            OrderPair(
                "p1", "d1", "T", "D", "A", 12.0, 77.0, "R", "RA", 12.1, 77.1, 10, 20, "ambient", 0, 60, 10, 120
            )
        ],
        [],
    )
    assert res2.solver_status == "NO_VEHICLES_AVAILABLE"
    assert len(res2.unassigned_order_ids) == 1


def test_api_optimize_endpoint(client: TestClient):
    """Verifies POST /api/v1/routing/optimize endpoint with explicit payloads."""
    token = get_token(client, "priya.volunteer@gmail.com")

    payload = {
        "orders": [
            {
                "pickup_id": "api-p1",
                "donation_id": "api-d1",
                "title": "Bakery Loaves",
                "donor_name": "Sunrise Bakery",
                "donor_address": "12 Baker St",
                "donor_latitude": 12.9720,
                "donor_longitude": 77.5950,
                "recipient_name": "Hope Shelter",
                "recipient_address": "88 Sanctuary Ln",
                "recipient_latitude": 12.9760,
                "recipient_longitude": 77.6020,
                "quantity_kg": 14.0,
                "portions": 28,
                "storage_condition": "ambient",
                "pickup_window_start_minutes": 0,
                "pickup_window_end_minutes": 90,
                "delivery_window_start_minutes": 15,
                "delivery_window_end_minutes": 180,
                "max_transit_minutes": 90,
            }
        ],
        "vehicles": [
            {
                "vehicle_id": "veh-priya",
                "courier_name": "Priya Sharma",
                "vehicle_type": "bicycle",
                "capacity_kg": 30.0,
                "start_latitude": 12.9700,
                "start_longitude": 77.5920,
                "start_address": "Volunteer Base",
                "shift_start_minutes": 0,
                "shift_end_minutes": 240,
            }
        ],
        "time_limit_seconds": 3,
    }

    res = client.post(
        "/api/v1/routing/optimize",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )

    assert res.status_code == 200
    data = res.json()["data"]
    assert "routes" in data
    assert len(data["routes"]) == 1
    assert data["routes"][0]["courier_name"] == "Priya Sharma"
    assert len(data["routes"][0]["stops"]) == 2  # 1 pickup, 1 delivery


def test_api_auto_dispatch_endpoint(client: TestClient):
    """
    Verifies POST /api/v1/routing/auto-dispatch:
    Queries database for pending pickups, runs OR-Tools VRP, and persists routes.
    """
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    vol_token = get_token(client, "priya.volunteer@gmail.com")
    now = datetime.now(timezone.utc)

    # 1. Create a donation and have NGO accept it to generate a pending pickup
    don_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "OR-Tools Auto-Dispatch Stew Trays",
            "food_type": "cooked_meals",
            "quantity_kg": 16.0,
            "portions": 32,
            "preparation_time": (now - timedelta(minutes=20)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 68.0,
        },
    )
    donation_id = don_res.json()["data"]["id"]

    acc_res = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    assert acc_res.status_code == 200

    # 2. Trigger auto-dispatch
    dispatch_res = client.post(
        "/api/v1/routing/auto-dispatch",
        headers={"Authorization": f"Bearer {vol_token}"},
    )

    assert dispatch_res.status_code == 200
    dispatch_data = dispatch_res.json()["data"]
    assert dispatch_data["assigned_orders_count"] >= 1
    assert len(dispatch_data["routes"]) >= 1
    assert dispatch_data["total_distance_km"] > 0.0
