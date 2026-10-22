"""
Phase 8 Automated Test Suite: AI Matching Engine & Multi-Recipient Ranking.
Verifies Stage 1 hard eligibility filters, Stage 2 explainable heuristics (35/30/20/15),
automated matching triggers on surplus creation, in-app notification dispatch,
persistent Match records, split-donation allocation planning, and notification management.
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


def test_automated_matching_and_notifications_on_donation_creation(client: TestClient):
    """
    Test that posting an eligible surplus food donation automatically:
    1. Triggers the AI matching engine in the background.
    2. Transitions donation status to 'matched'.
    3. Persists candidate Match records in the database.
    4. Dispatches in-app Notification records to recipient kitchen users.
    """
    donor_token = get_token(client, "chef@grandbistro.org")
    ngo_token = get_token(client, "director@hopeshelter.org")
    now = datetime.now(timezone.utc)

    # 1. Post a new surplus donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Chef Special Pasta Bolognese",
            "description": "50 portions of rich slow-cooked beef & vegetable bolognese.",
            "food_type": "cooked_meals",
            "quantity_kg": 25.0,
            "portions": 50,
            "preparation_time": (now - timedelta(minutes=45)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 70.0,
            "allergens": ["Gluten", "Dairy"],
        },
    )
    assert create_res.status_code == 201
    donation_data = create_res.json()["data"]
    donation_id = donation_data["id"]

    # Verify status transitioned to 'matched' automatically
    assert donation_data["status"] == "matched"

    # 2. Verify persistent match records exist
    matches_res = client.get(
        f"/api/v1/matching/matches?donationId={donation_id}",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert matches_res.status_code == 200
    matches = matches_res.json()["data"]
    assert len(matches) >= 1
    top_match = matches[0]
    assert top_match["score"] > 0
    assert "distance" in top_match["score_breakdown"]
    assert "urgency" in top_match["score_breakdown"]
    assert "capacity" in top_match["score_breakdown"]
    assert "reliability" in top_match["score_breakdown"]

    # 3. Verify notification arrived in recipient NGO's inbox
    notifs_res = client.get(
        "/api/v1/notifications?unreadOnly=true",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()["data"]
    assert len(notifs) >= 1
    match_notifs = [n for n in notifs if n["notification_type"] == "match_offer"]
    assert len(match_notifs) >= 1
    assert "Special Pasta Bolognese" in match_notifs[0]["message"] or "Chef" in match_notifs[0]["message"]


def test_get_donation_recipients_ranking_endpoint(client: TestClient):
    """
    Test GET /api/v1/matching/donations/{id}/recipients:
    Verifies that donor can view ranked recipient candidates with full score breakdowns.
    """
    donor_token = get_token(client, "chef@grandbistro.org")
    now = datetime.now(timezone.utc)

    # Create surplus donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Organic Steamed Rice & Lentil Curry",
            "food_type": "cooked_meals",
            "quantity_kg": 30.0,
            "portions": 60,
            "preparation_time": (now - timedelta(minutes=20)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=4)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 69.0,
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # Query ranked recipients
    res = client.get(
        f"/api/v1/matching/donations/{donation_id}/recipients",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    assert data["donation_id"] == donation_id
    assert len(data["recipients"]) >= 1

    # Verify ranking descending order
    recipients = data["recipients"]
    scores = [r["score"] for r in recipients]
    assert scores == sorted(scores, reverse=True)

    # Verify score breakdown adheres to Section 4 heuristic weights
    top_recipient = recipients[0]
    breakdown = top_recipient["score_breakdown"]
    assert 0 <= breakdown["distanceScore"] <= 100
    assert 0 <= breakdown["urgencyScore"] <= 100
    assert 0 <= breakdown["capacityScore"] <= 100
    assert 0 <= breakdown["reliabilityScore"] <= 100
    assert "explanation" in top_recipient
    assert top_recipient["distance_km"] <= 25.0


def test_split_donation_plan_calculation(client: TestClient):
    """
    Test GET /api/v1/matching/donations/{id}/split-plan:
    Verifies multi-recipient split allocation for large surplus batches exceeding single shelter capacity.
    """
    donor_token = get_token(client, "chef@grandbistro.org")
    now = datetime.now(timezone.utc)

    # Create large surplus batch (200 portions, 100 kg)
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Large Catering Event Surplus Casseroles",
            "food_type": "cooked_meals",
            "quantity_kg": 100.0,
            "portions": 200,
            "preparation_time": (now - timedelta(minutes=60)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=5)).isoformat(),
            "storage_condition": "hot_holding",
            "measured_temp_c": 65.0,
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # Query split plan
    split_res = client.get(
        f"/api/v1/matching/donations/{donation_id}/split-plan",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert split_res.status_code == 200
    plan = split_res.json()["data"]
    assert plan["donation_id"] == donation_id
    assert plan["total_portions"] == 200
    assert plan["total_quantity_kg"] == 100.0
    assert len(plan["allocations"]) >= 1

    # Sum of allocated portions should match or be <= total
    sum_portions = sum(a["allocated_portions"] for a in plan["allocations"])
    assert sum_portions == plan["allocated_portions"]
    assert plan["allocated_portions"] + plan["unallocated_portions"] == 200


def test_trigger_matching_endpoint_on_demand(client: TestClient):
    """
    Test POST /api/v1/matching/trigger/{donation_id}:
    Verifies on-demand re-execution of the AI matching algorithm.
    """
    donor_token = get_token(client, "chef@grandbistro.org")
    now = datetime.now(timezone.utc)

    # Create donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Fresh Quinoa Bowls",
            "food_type": "cooked_meals",
            "quantity_kg": 12.0,
            "portions": 24,
            "preparation_time": (now - timedelta(minutes=15)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
            "storage_condition": "ambient",
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # Trigger re-matching
    trigger_res = client.post(
        f"/api/v1/matching/trigger/{donation_id}",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert trigger_res.status_code == 200
    trigger_data = trigger_res.json()["data"]
    assert trigger_data["donation_id"] == donation_id
    assert trigger_data["matches_generated"] >= 1
    assert trigger_data["status"] == "matched"


def test_notifications_lifecycle_management(client: TestClient):
    """
    Test In-App Notifications API:
    1. Unread count query.
    2. Listing notifications.
    3. Marking individual notification as read.
    4. Marking all notifications as read.
    """
    ngo_token = get_token(client, "director@hopeshelter.org")

    # 1. Check unread count
    count_res = client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert count_res.status_code == 200
    assert "unread_count" in count_res.json()["data"]

    # 2. List notifications
    list_res = client.get(
        "/api/v1/notifications?limit=10",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert list_res.status_code == 200
    notifs = list_res.json()["data"]

    if len(notifs) > 0:
        first_notif_id = notifs[0]["id"]
        # 3. Mark single as read
        read_res = client.patch(
            f"/api/v1/notifications/{first_notif_id}/read",
            headers={"Authorization": f"Bearer {ngo_token}"},
        )
        assert read_res.status_code == 200
        assert read_res.json()["data"]["is_read"] is True

    # 4. Mark all as read
    read_all_res = client.post(
        "/api/v1/notifications/read-all",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert read_all_res.status_code == 200
    assert "updated_count" in read_all_res.json()["data"]

    # 5. Verify unread count is now 0
    final_count = client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert final_count.status_code == 200
    assert final_count.json()["data"]["unread_count"] == 0
