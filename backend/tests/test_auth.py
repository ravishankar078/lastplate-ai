"""
Automated Tests for Authentication, Roles, RBAC, and Organization Verification.
"""

import pytest
from fastapi.testclient import TestClient


def test_login_success_donor(client: TestClient):
    """Test successful donor login returns JWT bearer token and organization profile."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "chef@grandbistro.org", "password": "LastPlate#2026"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    data = payload["data"]
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "chef@grandbistro.org"
    assert data["user"]["role"] == "donor"
    assert data["organization"] is not None
    assert data["organization"]["name"] == "The Grand Heritage Bistro"


def test_login_invalid_password(client: TestClient):
    """Test login failure on incorrect password."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "chef@grandbistro.org", "password": "WrongPassword123"},
    )
    assert response.status_code == 401
    payload = response.json()
    assert payload["success"] is False
    assert "Incorrect email or password" in payload["message"]


def test_login_unknown_email(client: TestClient):
    """Test login failure on non-existent account."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "LastPlate#2026"},
    )
    assert response.status_code == 401


def test_get_me_authenticated(client: TestClient):
    """Test /auth/me returns profile when valid Bearer token is provided."""
    # 1. Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "director@hopeshelter.org", "password": "LastPlate#2026"},
    )
    token = login_res.json()["data"]["access_token"]

    # 2. Get /me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    payload = me_res.json()
    assert payload["success"] is True
    assert payload["data"]["user"]["full_name"] == "Rev. Marcus Vance"
    assert payload["data"]["user"]["role"] == "ngo"
    assert payload["data"]["organization"]["name"] == "Hope Community Shelter & Kitchen"


def test_get_me_unauthorized(client: TestClient):
    """Test /auth/me fails when no token or invalid token is supplied."""
    res1 = client.get("/api/v1/auth/me")
    assert res1.status_code == 401

    res2 = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.value"},
    )
    assert res2.status_code == 401


def test_user_registration_lifecycle(client: TestClient):
    """Test self-registration for new organization and donor user."""
    new_email = "test.donor.cafe@example.com"
    reg_payload = {
        "email": new_email,
        "password": "SecurePassword#2026",
        "full_name": "Marcus Aurelius",
        "phone": "+91 99887 76655",
        "role": "donor",
        "organization_name": "Aurelius Artisanal Roastery",
        "org_type": "bakery",
        "address": "77 Espresso Lane",
        "postal_code": "560006",
        "latitude": 12.9745,
        "longitude": 77.6022,
        "max_daily_meals": 60,
        "refrigeration_available": True,
    }

    response = client.post("/api/v1/auth/register", json=reg_payload)
    # If already created in a previous test run, status could be 400 or 201
    if response.status_code == 400:
        assert "already exists" in response.json()["message"]
    else:
        assert response.status_code == 201
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["user"]["email"] == new_email
        assert payload["data"]["user"]["is_verified"] is False
        assert payload["data"]["organization"]["name"] == "Aurelius Artisanal Roastery"
        assert payload["data"]["organization"]["is_verified"] is False


def test_rbac_admin_only_access(client: TestClient):
    """Verify that only users with role='admin' can access pending verification queues."""
    # 1. Login as regular donor
    donor_res = client.post(
        "/api/v1/auth/login",
        json={"email": "chef@grandbistro.org", "password": "LastPlate#2026"},
    )
    donor_token = donor_res.json()["data"]["access_token"]

    # 2. Donor attempts to access admin endpoint -> 403 Forbidden
    forbidden_res = client.get(
        "/api/v1/organizations/pending",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert forbidden_res.status_code == 403
    assert "lacks permission" in forbidden_res.json()["message"]

    # 3. Login as admin
    admin_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@lastplate.org", "password": "LastPlate#2026"},
    )
    admin_token = admin_res.json()["data"]["access_token"]

    # 4. Admin accesses pending organizations -> 200 OK
    admin_pending_res = client.get(
        "/api/v1/organizations/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_pending_res.status_code == 200
    assert admin_pending_res.json()["success"] is True


def test_admin_verify_organization_workflow(client: TestClient):
    """Test administrative approval of an organization."""
    # 1. Login as admin
    admin_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@lastplate.org", "password": "LastPlate#2026"},
    )
    admin_token = admin_res.json()["data"]["access_token"]

    # 2. Get pending organizations
    pending_res = client.get(
        "/api/v1/organizations/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    pending_orgs = pending_res.json()["data"]

    # If an org is pending, verify it; otherwise test with known bistro id
    target_org_id = (
        pending_orgs[0]["id"]
        if len(pending_orgs) > 0
        else "11111111-1111-1111-1111-111111111111"
    )

    verify_res = client.post(
        f"/api/v1/organizations/{target_org_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "is_verified": True,
            "verification_notes": "Official FSSAI & Non-Profit verification audit passed.",
        },
    )
    assert verify_res.status_code == 200
    payload = verify_res.json()
    assert payload["success"] is True
    assert payload["data"]["is_verified"] is True
    assert "audit passed" in payload["data"]["verification_notes"]
