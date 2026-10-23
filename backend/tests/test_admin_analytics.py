"""
Tests for Phase 12: Administrative Oversight, Platform Analytics, Food Safety Compliance & Audit Logs.
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


def test_analytics_overview_unauthorized(client: TestClient):
    """Anonymous and non-admin requests to /admin/analytics/overview must be rejected."""
    # 1. Anonymous request
    res = client.get("/api/v1/admin/analytics/overview")
    assert res.status_code == 401

    # 2. Donor request (forbidden: HTTP 403)
    donor_token = get_token(client, "chef@grandbistro.org")
    res_donor = client.get(
        "/api/v1/admin/analytics/overview",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert res_donor.status_code == 403


def test_analytics_overview_admin_success(client: TestClient):
    """Admin request to /admin/analytics/overview returns real computed metrics."""
    admin_token = get_token(client, "admin@lastplate.org")
    res = client.get(
        "/api/v1/admin/analytics/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]

    assert "total_donations" in data
    assert "completed_donations" in data
    assert "total_meals_rescued" in data
    assert "co2_avoided_kg" in data
    assert "landfill_diversion_rate" in data
    assert "active_donors" in data
    assert "verified_ngos" in data
    assert "active_volunteers" in data
    assert "category_breakdown" in data
    assert "status_breakdown" in data
    assert "daily_trends" in data
    assert len(data["daily_trends"]) == 7


def test_admin_organizations_list(client: TestClient):
    """Admin can query the full organization roster with operational metrics."""
    admin_token = get_token(client, "admin@lastplate.org")
    res = client.get(
        "/api/v1/admin/organizations",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    orgs = res.json()["data"]
    assert len(orgs) >= 2
    first = orgs[0]
    assert "id" in first
    assert "name" in first
    assert "category" in first
    assert "active_posts_count" in first


def test_admin_verify_and_suspend_organization(client: TestClient):
    """Admin can approve and suspend organizations, with immutable audit trail creation."""
    admin_token = get_token(client, "admin@lastplate.org")

    # Fetch organizations to get an ID
    res = client.get(
        "/api/v1/admin/organizations",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    orgs = res.json()["data"]
    target_org = orgs[0]
    target_id = target_org["id"]

    # 1. Verify organization
    verify_res = client.post(
        f"/api/v1/admin/organizations/{target_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_verified": True, "verification_notes": "All health inspection certificates verified."},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["is_verified"] is True

    # 2. Suspend organization
    suspend_res = client.post(
        f"/api/v1/admin/organizations/{target_id}/suspend",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_verified": False, "verification_notes": "Temporary suspension for hygiene reinspection."},
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["data"]["is_verified"] is False

    # 3. Restore verification
    restore_res = client.post(
        f"/api/v1/admin/organizations/{target_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_verified": True, "verification_notes": "Re-verified and cleared."},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["data"]["is_verified"] is True


def test_admin_audit_logs_query(client: TestClient):
    """Admin can query immutable audit trail with actor name resolutions."""
    admin_token = get_token(client, "admin@lastplate.org")
    res = client.get(
        "/api/v1/admin/audit-logs?limit=10",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    logs = res.json()["data"]
    assert isinstance(logs, list)
    if len(logs) > 0:
        first = logs[0]
        assert "action" in first
        assert "actor_name" in first
        assert "entity_type" in first


def test_admin_flagged_donations_review(client: TestClient):
    """Admin can view held donations and release or quarantine them."""
    donor_token = get_token(client, "chef@grandbistro.org")
    admin_token = get_token(client, "admin@lastplate.org")
    now = datetime.now(timezone.utc)

    # Post a surplus item
    don_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": "Quarantine Test Broth Trays",
            "food_type": "cooked_meals",
            "quantity_kg": 15.0,
            "portions": 30,
            "preparation_time": (now - timedelta(minutes=45)).isoformat(),
            "pickup_deadline": (now + timedelta(hours=2)).isoformat(),
            "storage_condition": "hot_holding",
            "allergens": ["Shellfish"],
            "safety_notes": "Inspect temperature before delivery.",
        },
    )
    assert don_res.status_code == 201
    donation_id = don_res.json()["data"]["id"]

    # 1. Review and quarantine reject (sets status to cancelled)
    review_res = client.post(
        f"/api/v1/admin/donations/{donation_id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "action": "quarantine_reject",
            "admin_notes": "Rejected per food safety regulatory threshold (temperature below 60°C).",
        },
    )
    assert review_res.status_code == 200
    assert review_res.json()["data"]["status"] == "cancelled"

    # 2. Release it back
    release_res = client.post(
        f"/api/v1/admin/donations/{donation_id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "action": "release",
            "admin_notes": "Secondary testing verified thermal preservation.",
        },
    )
    assert release_res.status_code == 200
    assert release_res.json()["data"]["status"] == "available"


def test_public_impact_endpoint(client: TestClient):
    """Public /impact endpoint returns verified platform metrics."""
    res = client.get("/api/v1/impact")
    assert res.status_code == 200
    data = res.json()["data"]

    assert "mealsRescued" in data
    assert "co2AvoidedKg" in data
    assert "activeDonors" in data
    assert "verifiedNGOs" in data
    assert "activeVolunteers" in data
    assert "isSampleData" in data
