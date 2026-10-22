"""
Automated Tests for Food Donation Lifecycle and Food Safety Validation.
"""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient


def get_auth_token(client: TestClient, email: str = "chef@grandbistro.org") -> str:
    """Helper to acquire JWT bearer token for testing."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "LastPlate#2026"},
    )
    return res.json()["data"]["access_token"]


def test_create_donation_hot_holding_success(client: TestClient):
    """Test creating compliant hot-holding surplus listing (>60°C)."""
    token = get_auth_token(client, "chef@grandbistro.org")
    now = datetime.utcnow()

    payload = {
        "title": "50 Portions Vegetable Biryani & Dal Makhani",
        "description": "Steamed basmati rice and rich slow-simmered black lentils.",
        "food_type": "cooked_meals",
        "quantity_kg": 35.0,
        "portions": 50,
        "preparation_time": (now - timedelta(minutes=30)).isoformat(),
        "pickup_deadline": (now + timedelta(hours=3)).isoformat(),
        "storage_condition": "hot_holding",
        "measured_temp_c": 68.5,
        "allergens": ["Dairy"],
        "safety_notes": "Maintained in temperature-controlled Cambro carriers.",
    }

    response = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 201
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["status"] == "available"
    assert data["quantity_kg"] == 35.0
    assert data["portions"] == 50
    assert data["donor_organization_name"] == "The Grand Heritage Bistro"


def test_create_donation_hot_holding_safety_hold(client: TestClient):
    """Test that hot food measured under 60°C is automatically placed on safety_hold."""
    token = get_auth_token(client, "chef@grandbistro.org")
    now = datetime.utcnow()

    # Temperature 45.0°C is in the danger zone (<60°C)
    payload = {
        "title": "Lukewarm Pasta Trays",
        "description": "Buffet surplus trays that cooled down.",
        "food_type": "cooked_meals",
        "quantity_kg": 15.0,
        "portions": 25,
        "preparation_time": (now - timedelta(hours=1)).isoformat(),
        "pickup_deadline": (now + timedelta(hours=2)).isoformat(),
        "storage_condition": "hot_holding",
        "measured_temp_c": 45.0,
        "allergens": ["Gluten"],
    }

    response = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 201
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["status"] == "safety_hold"
    assert "below the safe holding threshold" in data["safety_notes"]


def test_create_donation_past_deadline_rejected(client: TestClient):
    """Test that setting a deadline in the past is rejected with 400 Bad Request."""
    token = get_auth_token(client, "chef@grandbistro.org")
    now = datetime.utcnow()

    payload = {
        "title": "Expired Listing Test",
        "food_type": "bakery",
        "quantity_kg": 5.0,
        "portions": 10,
        "preparation_time": (now - timedelta(hours=2)).isoformat(),
        "pickup_deadline": (now - timedelta(minutes=10)).isoformat(),  # In the past!
        "storage_condition": "ambient",
    }

    response = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 400
    assert "future" in response.json()["message"].lower()


def test_list_donations_for_donor(client: TestClient):
    """Test listing donations returns donor-scoped records."""
    token = get_auth_token(client, "chef@grandbistro.org")
    response = client.get(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    items = res["data"]
    assert len(items) >= 1
    # Check that returned donations belong to Grand Heritage Bistro
    for item in items:
        assert item["donor_organization_name"] == "The Grand Heritage Bistro"


def test_update_and_cancel_donation(client: TestClient):
    """Test updating and cancelling a surplus food listing."""
    token = get_auth_token(client, "chef@grandbistro.org")
    now = datetime.utcnow()

    # 1. Create donation
    create_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Batch Sourdough Loaves to Edit",
            "food_type": "bakery",
            "quantity_kg": 10.0,
            "portions": 20,
            "preparation_time": (now - timedelta(hours=1)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=4)).isoformat(),
            "storage_condition": "ambient",
        },
    )
    donation_id = create_res.json()["data"]["id"]

    # 2. Update donation quantity
    update_res = client.put(
        f"/api/v1/donations/{donation_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"quantity_kg": 14.5, "portions": 28},
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["quantity_kg"] == 14.5
    assert update_res.json()["data"]["portions"] == 28

    # 3. Cancel donation
    cancel_res = client.post(
        f"/api/v1/donations/{donation_id}/cancel",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Bakery inventory recount adjusted."},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["status"] == "cancelled"


def test_forbidden_role_cannot_post_donation(client: TestClient):
    """Verify that volunteers and NGOs cannot create donor food listings."""
    vol_token = get_auth_token(client, "priya.volunteer@gmail.com")
    now = datetime.utcnow()

    response = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {vol_token}"},
        json={
            "title": "Unauthorized Listing",
            "food_type": "cooked_meals",
            "quantity_kg": 10.0,
            "portions": 15,
            "preparation_time": now.isoformat(),
            "pickup_deadline": (now + timedelta(hours=2)).isoformat(),
            "storage_condition": "ambient",
        },
    )
    assert response.status_code == 403
    assert "lacks permission" in response.json()["message"]
