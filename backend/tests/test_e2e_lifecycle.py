"""
End-to-End Integration Test Suite for LastPlate Full Food Rescue Lifecycle.
Verifies Master Spec Section 13 Completion Criteria:
1. Verified Donor posts surplus food with food-safety parameters.
2. AI Matching Engine filters by hard constraints and scores candidate recipients.
3. Verified NGO claims offer atomically; anti-collision lock rejects concurrent claims.
4. Google OR-Tools VRP engine optimizes multi-stop courier routes with capacity & precedence.
5. Volunteer navigates route, timestamps arrivals, and confirms handovers via secure QR/PIN.
6. Handover verifies precedence invariant (cannot deliver before collection).
7. Expired/used tokens cannot be re-used.
8. Complete audit log chain and operational analytics reflect the delivered food.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient


def get_jwt(client: TestClient, email: str) -> str:
    """Helper to acquire JWT bearer token for role-based testing."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "LastPlate#2026"},
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]


def test_full_rescue_lifecycle_e2e(client: TestClient):
    """
    Executes the entire end-to-end food rescue workflow across Donor, NGO, Volunteer, and Admin.
    """
    donor_token = get_jwt(client, "chef@grandbistro.org")
    ngo_token = get_jwt(client, "director@hopeshelter.org")
    volunteer_token = get_jwt(client, "priya.volunteer@gmail.com")
    admin_token = get_jwt(client, "admin@lastplate.org")
    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------
    # STEP 1: Donor Posts Surplus Food with Safety Parameters
    # -------------------------------------------------------------
    create_payload = {
        "title": "E2E Lifecycle Gourmet Vegetable Lasagna",
        "description": "Freshly baked trays of roasted zucchini, spinach and ricotta lasagna.",
        "food_type": "cooked_meals",
        "quantity_kg": 20.0,
        "portions": 40,
        "preparation_time": (now - timedelta(minutes=40)).isoformat(),
        "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
        "storage_condition": "hot_holding",
        "allergens": ["Dairy", "Gluten"],
        "safety_notes": "Maintained in insulated commercial cambros above 65°C.",
    }

    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json=create_payload,
    )
    assert create_res.status_code == 201, f"Donation creation failed: {create_res.text}"
    donation_data = create_res.json()["data"]
    donation_id = donation_data["id"]
    assert donation_data["status"] in ("available", "matched")
    assert donation_data["portions"] == 40

    # -------------------------------------------------------------
    # STEP 2: AI Matching Engine Computes Recipient Recommendations
    # -------------------------------------------------------------
    match_res = client.get(
        "/api/v1/matching/recommendations",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert match_res.status_code == 200
    recommendations = match_res.json()["data"]
    assert len(recommendations) >= 1
    top_recommendation = recommendations[0]
    assert "scoreBreakdown" in top_recommendation
    assert top_recommendation["scoreBreakdown"]["totalScore"] > 0
    assert "distanceScore" in top_recommendation["scoreBreakdown"]

    # -------------------------------------------------------------
    # STEP 3: NGO Claims Surplus Atomically (With Anti-Collision Lock)
    # -------------------------------------------------------------
    claim_res = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    assert claim_res.status_code == 200
    claim_data = claim_res.json()["data"]
    assert claim_data["status"] == "accepted"
    pickup_id = claim_data["pickup_id"]
    verification_pin = claim_data["verification_pin"]
    assert len(verification_pin) == 6

    # Verify Anti-Collision Invariant: A second claim must be rejected with 409 Conflict
    dup_res = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    assert dup_res.status_code == 409, "Anti-collision failed: concurrent claim was not rejected"

    # -------------------------------------------------------------
    # STEP 4: Google OR-Tools VRP Auto-Dispatch Routes Courier
    # -------------------------------------------------------------
    dispatch_res = client.post(
        "/api/v1/routing/auto-dispatch",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert dispatch_res.status_code == 200
    dispatch_result = dispatch_res.json()["data"]
    assert dispatch_result["assigned_orders_count"] >= 1
    assert dispatch_result["total_distance_km"] > 0

    # -------------------------------------------------------------
    # STEP 5: Volunteer Courier Receives Route & Navigates Stops
    # -------------------------------------------------------------
    route_res = client.get(
        "/api/v1/volunteer/active-route",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert route_res.status_code == 200
    active_route = route_res.json()["data"]
    assert len(active_route["stops"]) >= 2

    # Identify pickup stop and delivery stop for this donation
    pickup_stop = next(s for s in active_route["stops"] if s["stop_type"] == "pickup" and s["pickup_id"] == pickup_id)
    delivery_stop = next(s for s in active_route["stops"] if s["stop_type"] == "delivery" and s["pickup_id"] == pickup_id)

    # Invariant Test: Cannot deliver before valid collection
    early_delivery_res = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": delivery_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": verification_pin,
        },
    )
    assert early_delivery_res.status_code == 400
    assert "collection from donor must be completed" in early_delivery_res.json()["message"].lower()

    # Courier arrives at Donor pickup location
    arrive_pickup_res = client.post(
        f"/api/v1/volunteer/stops/{pickup_stop['id']}/arrive",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert arrive_pickup_res.status_code == 200
    assert arrive_pickup_res.json()["data"]["status"] == "arrived"

    # Courier confirms Pickup Handover with temperature inspection
    verify_pickup_res = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": pickup_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": verification_pin,
            "actual_temp_c": 66.5,
            "notes": "Thermal seal verified, cambro temperature 66.5°C.",
        },
    )
    assert verify_pickup_res.status_code == 200
    assert verify_pickup_res.json()["data"]["pickup_status"] == "collected"
    assert verify_pickup_res.json()["data"]["donation_status"] == "in_transit"

    # Courier arrives at Recipient NGO shelter
    arrive_delivery_res = client.post(
        f"/api/v1/volunteer/stops/{delivery_stop['id']}/arrive",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert arrive_delivery_res.status_code == 200
    assert arrive_delivery_res.json()["data"]["status"] == "arrived"

    # Courier confirms Delivery Handover using verification PIN
    verify_delivery_res = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": delivery_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": verification_pin,
            "actual_temp_c": 63.2,
            "notes": "Delivered to receiving kitchen staff, hot holding confirmed.",
        },
    )
    assert verify_delivery_res.status_code == 200
    assert verify_delivery_res.json()["data"]["pickup_status"] == "delivered"
    assert verify_delivery_res.json()["data"]["donation_status"] == "delivered"

    # Verify Invariant: Expired or used verification token cannot be reused
    reused_res = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": delivery_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": verification_pin,
            "actual_temp_c": 63.2,
        },
    )
    assert reused_res.status_code == 400
    assert "already be" in reused_res.json()["message"].lower()

    # -------------------------------------------------------------
    # STEP 6: Immutable Regulatory Audit Trail Verification
    # -------------------------------------------------------------
    audit_res = client.get(
        "/api/v1/admin/audit-logs?limit=50",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert audit_res.status_code == 200
    audit_entries = audit_res.json()["data"]
    actions = [e["action"] for e in audit_entries]

    assert "DONATION_CREATED" in actions
    assert "MATCH_ACCEPTED" in actions
    assert "FOOD_COLLECTED" in actions
    assert "DELIVERY_CONFIRMED" in actions

    # -------------------------------------------------------------
    # STEP 7: Operational Analytics Reflects Delivered Surplus
    # -------------------------------------------------------------
    analytics_res = client.get(
        "/api/v1/admin/analytics/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()["data"]
    assert analytics_data["completed_donations"] >= 1
    assert analytics_data["total_meals_rescued"] >= 40
    assert analytics_data["co2_avoided_kg"] >= 10.0
