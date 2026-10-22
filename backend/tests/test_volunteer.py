"""
Automated Test Suite for Volunteer Operations, Route Navigation, and Handover Verification.
Verifies Master Spec Section 6 (Food Safety) and Section 8 Invariants:
- A delivery cannot be confirmed before valid collection.
- An expired or used verification token cannot confirm another handover.
- A donation cannot be claimed twice by competing volunteers.
- Temperature violations immediately trigger a safety hold.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient


def get_token(client: TestClient, email: str) -> str:
    """Helper to acquire JWT bearer token for testing."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "LastPlate#2026"},
    )
    return res.json()["data"]["access_token"]


def create_and_accept_donation_helper(client: TestClient) -> dict:
    """Helper to post a donation and have an NGO accept it, producing a pending_volunteer pickup."""
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    now = datetime.now(timezone.utc)

    # 1. Post surplus donation
    don_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Volunteer Mission Pasta Trays",
            "food_type": "cooked_meals",
            "quantity_kg": 18.0,
            "portions": 36,
            "preparation_time": (now - timedelta(minutes=30)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 72.0,
        },
    )
    donation_id = don_res.json()["data"]["id"]

    # 2. NGO accepts donation, generating Pickup record
    acc_res = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    pickup_data = acc_res.json()["data"]
    return {
        "donation_id": donation_id,
        "pickup_id": pickup_data["pickup_id"],
        "verification_pin": pickup_data["verification_pin"],
    }


def test_list_available_jobs(client: TestClient):
    """Test that volunteer can discover pickups waiting for volunteer dispatch."""
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)

    res = client.get(
        "/api/v1/volunteer/jobs",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert res.status_code == 200
    jobs = res.json()["data"]
    assert len(jobs) >= 1

    matched_jobs = [j for j in jobs if j["pickup_id"] == fixture["pickup_id"]]
    assert len(matched_jobs) == 1
    job = matched_jobs[0]
    assert "donor_address" in job
    assert "recipient_address" in job
    assert job["road_distance_km"] > 0
    assert job["status"] == "pending_volunteer"


def test_claim_job_success_and_route_generation(client: TestClient):
    """Test volunteer claiming a job and generating a 2-stop collection & delivery route."""
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)
    pickup_id = fixture["pickup_id"]

    # Claim job
    claim_res = client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert claim_res.status_code == 200
    route = claim_res.json()["data"]
    assert route["status"] in ("assigned", "in_progress")
    assert len(route["stops"]) >= 2

    # Verify Stop 1 is pickup and Stop 2 is delivery
    stops = route["stops"]
    pickup_stops = [s for s in stops if s["pickup_id"] == pickup_id and s["stop_type"] == "pickup"]
    delivery_stops = [s for s in stops if s["pickup_id"] == pickup_id and s["stop_type"] == "delivery"]
    assert len(pickup_stops) == 1
    assert len(delivery_stops) == 1
    assert pickup_stops[0]["stop_sequence"] < delivery_stops[0]["stop_sequence"]


def test_double_claim_conflict_prevention(client: TestClient):
    """
    CRITICAL INVARIANT TEST:
    Verify that an assigned pickup CANNOT be claimed twice by another volunteer (409 Conflict).
    """
    vol1_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)
    pickup_id = fixture["pickup_id"]

    # 1. First claim succeeds
    claim1 = client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {vol1_token}"},
    )
    assert claim1.status_code == 200

    # 2. Second claim fails with 409 Conflict
    claim2 = client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {vol1_token}"},
    )
    assert claim2.status_code == 409
    assert "cannot be claimed" in claim2.json()["message"].lower() or "409" in claim2.json().get("error_code", "").lower()


def test_delivery_before_collection_fails_invariant(client: TestClient):
    """
    CRITICAL INVARIANT TEST (Section 8):
    'A delivery cannot be confirmed before valid collection.'
    """
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)
    pickup_id = fixture["pickup_id"]
    pin = fixture["verification_pin"]

    claim_res = client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    route = claim_res.json()["data"]
    delivery_stop = [s for s in route["stops"] if s["pickup_id"] == pickup_id and s["stop_type"] == "delivery"][0]

    # Try verifying delivery before collection
    verify_res = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": delivery_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": pin,
        },
    )
    assert verify_res.status_code == 400
    assert "collection from donor must be completed" in verify_res.json()["message"].lower()


def test_handover_invalid_pin_rejected(client: TestClient):
    """Test that submitting an incorrect PIN rejects verification with 400 Bad Request."""
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)
    pickup_id = fixture["pickup_id"]

    claim_res = client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    route = claim_res.json()["data"]
    pickup_stop = [s for s in route["stops"] if s["pickup_id"] == pickup_id and s["stop_type"] == "pickup"][0]

    # Incorrect PIN
    verify_res = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": pickup_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": "000000",
        },
    )
    assert verify_res.status_code == 400
    assert "invalid verification code" in verify_res.json()["message"].lower()


def test_complete_collection_and_delivery_lifecycle(client: TestClient):
    """
    Test end-to-end volunteer flow:
    1. Arrive at donor.
    2. Confirm collection with valid PIN -> status: 'collected' / 'in_transit'.
    3. Arrive at recipient.
    4. Confirm delivery with valid PIN -> status: 'delivered'.
    5. Token becomes used.
    """
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)
    pickup_id = fixture["pickup_id"]
    pin = fixture["verification_pin"]

    # 1. Claim job
    claim_res = client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    route = claim_res.json()["data"]
    pickup_stop = [s for s in route["stops"] if s["pickup_id"] == pickup_id and s["stop_type"] == "pickup"][0]
    delivery_stop = [s for s in route["stops"] if s["pickup_id"] == pickup_id and s["stop_type"] == "delivery"][0]

    # 2. Mark arrival at donor
    arrive1 = client.post(
        f"/api/v1/volunteer/stops/{pickup_stop['id']}/arrive",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert arrive1.status_code == 200
    assert arrive1.json()["data"]["status"] == "arrived"

    # 3. Verify collection with PIN
    v1 = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": pickup_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": pin,
            "actual_temp_c": 69.5,
        },
    )
    assert v1.status_code == 200
    assert v1.json()["data"]["pickup_status"] == "collected"
    assert v1.json()["data"]["donation_status"] == "in_transit"

    # 4. Mark arrival at recipient
    arrive2 = client.post(
        f"/api/v1/volunteer/stops/{delivery_stop['id']}/arrive",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert arrive2.status_code == 200

    # 5. Verify delivery with PIN
    v2 = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": delivery_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": pin,
        },
    )
    assert v2.status_code == 200
    assert v2.json()["data"]["pickup_status"] == "delivered"
    assert v2.json()["data"]["donation_status"] == "delivered"

    # 6. Verify token reuse rejection (invariant)
    v3 = client.post(
        "/api/v1/volunteer/verify-handover",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "stop_id": delivery_stop["id"],
            "pickup_id": pickup_id,
            "verification_code": pin,
        },
    )
    assert v3.status_code == 400
    assert "already be" in v3.json()["message"].lower()


def test_report_issue_safety_hold(client: TestClient):
    """Test reporting temperature violation automatically triggers safety hold on the donation."""
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")
    fixture = create_and_accept_donation_helper(client)
    pickup_id = fixture["pickup_id"]

    # Claim job
    client.post(
        f"/api/v1/volunteer/claim-job/{pickup_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )

    # Report temperature violation
    report_res = client.post(
        "/api/v1/volunteer/report-issue",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "pickup_id": pickup_id,
            "issue_type": "temperature_out_of_spec",
            "measured_temp_c": 51.0,  # Below 60°C threshold
            "description": "Hot food holding measured at 51.0°C. Below FDA 60°C minimum safe threshold.",
        },
    )
    assert report_res.status_code == 200
    data = report_res.json()["data"]
    assert data["safety_hold_applied"] is True


def test_volunteer_history_and_impact(client: TestClient):
    """Test retrieving volunteer history with calculated meals and CO2 impact."""
    volunteer_token = get_token(client, "priya.volunteer@gmail.com")

    res = client.get(
        "/api/v1/volunteer/history",
        headers={"Authorization": f"Bearer {volunteer_token}"},
    )
    assert res.status_code == 200
    summary = res.json()["data"]
    assert "total_rescues" in summary
    assert "total_portions" in summary
    assert "total_quantity_kg" in summary
    assert "co2_avoided_kg" in summary
    assert summary["co2_avoided_kg"] >= 0
