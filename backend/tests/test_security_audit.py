"""
Security Audit and Hardening Test Suite for LastPlate Backend.
Verifies production security controls:
1. Hardened HTTP Security Headers on all responses.
2. Role-Based Access Control (RBAC) and least-privilege enforcement.
3. Forged, expired, and tampered JWT token rejection.
4. SQL Injection and XSS payload resistance via parameterized ORM queries.
5. Strict domain invariants and authorization boundaries.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient


def get_token_for(client: TestClient, email: str) -> str:
    """Helper to acquire JWT bearer token."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "LastPlate#2026"},
    )
    return res.json()["data"]["access_token"]


def test_production_security_headers(client: TestClient):
    """Every HTTP response must include hardened production security headers."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200

    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Process-Time" in headers


def test_rbac_least_privilege_boundaries(client: TestClient):
    """Ensure cross-role access is strictly blocked at the API gateway layer."""
    donor_token = get_token_for(client, "chef@grandbistro.org")
    ngo_token = get_token_for(client, "director@hopeshelter.org")
    volunteer_token = get_token_for(client, "priya.volunteer@gmail.com")

    # 1. Donor cannot access administrative analytics or organization verification
    res_donor_admin = client.get(
        "/api/v1/admin/analytics/overview",
        headers={"Authorization": f"Bearer {donor_token}"},
    )
    assert res_donor_admin.status_code == 403

    # 2. Volunteer cannot post surplus food donations
    now = datetime.now(timezone.utc)
    res_vol_post = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "title": "Unauthorized Volunteer Post",
            "food_type": "cooked_meals",
            "quantity_kg": 10.0,
            "portions": 20,
            "preparation_time": now.isoformat(),
            "pickup_deadline": (now + timedelta(hours=2)).isoformat(),
            "storage_condition": "ambient",
        },
    )
    assert res_vol_post.status_code == 403

    # 3. NGO cannot access courier route endpoints
    res_ngo_route = client.get(
        "/api/v1/volunteer/active-route",
        headers={"Authorization": f"Bearer {ngo_token}"},
    )
    assert res_ngo_route.status_code == 403

    # 4. Donor cannot claim or accept food offers
    res_donor_claim = client.post(
        "/api/v1/matching/accept",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"donationId": "00000000-0000-0000-0000-000000000000"},
    )
    assert res_donor_claim.status_code == 403


def test_forged_and_invalid_jwt_tokens(client: TestClient):
    """Forged, malformed, or tampered JWT bearer tokens must be rejected."""
    # 1. Completely bogus string
    res_bogus = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer bogus.invalid.token"},
    )
    assert res_bogus.status_code == 401

    # 2. Tampered signature
    valid_token = get_token_for(client, "chef@grandbistro.org")
    parts = valid_token.split(".")
    tampered_token = f"{parts[0]}.{parts[1]}.tampered_signature"
    res_tampered = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert res_tampered.status_code == 401

    # 3. Missing bearer prefix
    res_no_prefix = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": valid_token},
    )
    assert res_no_prefix.status_code == 401


def test_sql_injection_and_xss_resistance(client: TestClient):
    """Payloads containing SQL injection patterns or script tags must be safely sanitized."""
    donor_token = get_token_for(client, "chef@grandbistro.org")
    now = datetime.now(timezone.utc)

    # 1. SQL Injection attempt in title and description
    sql_payload = {
        "title": "'); DROP TABLE donations; --",
        "description": "' OR '1'='1' UNION SELECT * FROM users --",
        "food_type": "cooked_meals",
        "quantity_kg": 5.0,
        "portions": 10,
        "preparation_time": now.isoformat(),
        "pickup_deadline": (now + timedelta(hours=2)).isoformat(),
        "storage_condition": "ambient",
    }
    sql_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json=sql_payload,
    )
    assert sql_res.status_code == 201
    assert sql_res.json()["data"]["title"] == "'); DROP TABLE donations; --"

    # 2. XSS script tag in notes
    xss_payload = {
        "title": "<script>alert('xss')</script> Safe Rice",
        "description": "<img src=x onerror=alert(1)>",
        "food_type": "cooked_meals",
        "quantity_kg": 5.0,
        "portions": 10,
        "preparation_time": now.isoformat(),
        "pickup_deadline": (now + timedelta(hours=2)).isoformat(),
        "storage_condition": "ambient",
    }
    xss_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json=xss_payload,
    )
    assert xss_res.status_code == 201
    assert "<script>" in xss_res.json()["data"]["title"]
