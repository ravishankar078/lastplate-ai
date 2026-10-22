"""
Automated Database and Spatial Tests for LastPlate.
Verifies PostgreSQL connection, entity relationships, spatial distance calculation,
and readiness probe integration.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from app.db.session import AsyncSessionLocal
from app.models import Donation, Organization, User


@pytest.mark.asyncio
async def test_db_session_and_seeded_users():
    """Verify async database session can query seeded users and organizations."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "chef@grandbistro.org")
        )
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.full_name == "Elena Rostova"
        assert user.role == "donor"
        assert user.organization_id is not None

        # Verify organization link
        org_result = await session.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        org = org_result.scalar_one_or_none()
        assert org is not None
        assert org.name == "The Grand Heritage Bistro"
        assert org.is_verified is True


@pytest.mark.asyncio
async def test_spatial_proximity_query():
    """Verify PostgreSQL earthdistance calculation and spatial proximity ordering."""
    async with AsyncSessionLocal() as session:
        # Distance from Bistro (12.9716, 77.5946) to Hope Shelter (12.9750, 77.6050)
        query = text(
            """
            SELECT 
                name,
                (earth_distance(ll_to_earth(12.9716, 77.5946), ll_to_earth(latitude, longitude)) / 1000.0) AS dist_km
            FROM organizations
            WHERE name = 'Hope Community Shelter & Kitchen';
            """
        )
        result = await session.execute(query)
        row = result.fetchone()
        assert row is not None
        # Hope Shelter is ~1.19 km from Bistro
        assert 1.0 < row.dist_km < 1.5


@pytest.mark.asyncio
async def test_donation_model_constraints():
    """Verify surplus food donation properties and safety storage conditions."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Donation).where(Donation.food_type == "cooked_meals").limit(1)
        )
        donation = result.scalars().first()
        assert donation is not None
        assert donation.quantity_kg > 0
        assert donation.storage_condition == "hot_holding"
        assert donation.measured_temp_c is not None
        assert donation.status == "available"


def test_readiness_probe_reports_connected_database(client: TestClient):
    """Verify that /api/v1/ready probe reports real database connectivity."""
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["ready"] is True
    assert payload["data"]["services"]["database"] == "connected"
    assert "spatial_engine" in payload["data"]["services"]
