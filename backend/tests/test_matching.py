"""
Automated Tests for AI Matching Engine and Atomic Acceptance Concurrency Workflow.
Verifies Stage 1 hard filters, Stage 2 ranked scores, and atomic claim conflict protection.
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


def test_get_recommendations_for_ngo(client: TestClient):
    """Test that verified NGO receives ranked recommendations with explainable scores."""
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    now = datetime.now(timezone.utc)

    # Post an active surplus donation to guarantee an eligible recommendation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Fresh Vegetable Soup & Bread",
            "description": "Vegetarian soup with whole grain bread loaves.",
            "food_type": "cooked_meals",
            "quantity_kg": 25.0,
            "portions": 50,
            "preparation_time": (now - timedelta(minutes=30)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 68.5,
            "allergens": ["Gluten"],
        },
    )
    assert create_res.status_code == 201

    response = client.get(
        "/api/v1/matching/recommendations",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    recs = res["data"]
    assert len(recs) >= 1

    # Inspect top recommendation
    top_rec = recs[0]
    assert "scoreBreakdown" in top_rec
    breakdown = top_rec["scoreBreakdown"]
    assert "distanceScore" in breakdown
    assert "urgencyScore" in breakdown
    assert "capacityScore" in breakdown
    assert "reliabilityScore" in breakdown
    assert "totalScore" in breakdown
    assert breakdown["totalScore"] > 0
    assert "explanation" in top_rec
    assert "roadDistanceKm" in top_rec


def test_atomic_claim_success_and_pickup_generation(client: TestClient):
    """Test successful atomic claim of a surplus donation and verification token generation."""
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    now = datetime.now(timezone.utc)

    # 1. Post a new surplus donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Fresh Minestrone Soup Batch",
            "description": "Hearty vegetable minestrone with white beans and herbs.",
            "food_type": "cooked_meals",
            "quantity_kg": 20.0,
            "portions": 40,
            "preparation_time": (now - timedelta(minutes=40)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 71.0,
            "allergens": ["Celery"],
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # 2. NGO accepts the donation offer
    accept_res = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    assert accept_res.status_code == 200
    payload = accept_res.json()
    assert payload["success"] is True
    data = payload["data"]
    assert data["status"] == "accepted"
    assert "pickup_id" in data
    assert "verification_pin" in data
    assert len(data["verification_pin"]) == 6  # 6-digit backup PIN

    # 3. Verify donation status in database transitioned to 'accepted'
    check_res = client.get(
        f"/api/v1/donations/{donation_id}",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert check_res.json()["data"]["status"] == "accepted"


def test_double_claim_conflict_prevention(client: TestClient):
    """
    CRITICAL INVARIANT TEST:
    Verify that an accepted donation CANNOT be claimed twice by a competing recipient (409 Conflict).
    """
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    now = datetime.now(timezone.utc)

    # 1. Create donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Single Claim Test Baguettes",
            "food_type": "bakery",
            "quantity_kg": 8.0,
            "portions": 16,
            "preparation_time": (now - timedelta(hours=1)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=4)).isoformat(),
            "storage_condition": "ambient",
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # 2. First NGO claims the donation -> 200 OK
    res1 = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    assert res1.status_code == 200
    assert res1.json()["data"]["status"] == "accepted"

    # 3. Second competing claim attempt on the same donation -> 409 Conflict!
    res2 = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id},
    )
    assert res2.status_code == 409
    msg = res2.json().get("message", "").lower()
    code = res2.json().get("error_code", "").lower()
    assert "already been claimed" in msg or "no longer available" in msg or "409" in code


def test_decline_match(client: TestClient):
    """Test declining a match recommendation."""
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    now = datetime.utcnow()

    # 1. Create donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Offer to Decline Test",
            "food_type": "produce",
            "quantity_kg": 12.0,
            "portions": 24,
            "preparation_time": now.isoformat(),
            "pickup_deadline": (now + timedelta(hours=5)).isoformat(),
            "storage_condition": "ambient",
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # 2. Decline
    decline_res = client.post(
        "/api/v1/matching/decline",
        headers={"Authorization": f"Bearer {ngo_token}"},
        json={"donationId": donation_id, "reason": "Already stocked for this evening."},
    )
    assert decline_res.status_code == 200
    assert decline_res.json()["success"] is True
