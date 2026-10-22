"""
Database Seed Script for LastPlate.
Populates local database with realistic baseline entities matching the Master Specification:
- Food Donor Organizations (Bistro, Bakery, Canteen)
- Recipient NGOs (Shelters, Community Kitchens, Food Banks)
- User Personas (Donor, NGO Director, Volunteer, System Admin)
- Active Surplus Food Donations with safety parameters
- Initial Audit Logs
"""

import asyncio
from datetime import datetime, timedelta
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models import (
    AuditLog,
    Donation,
    Organization,
    User,
)


async def seed_database() -> None:
    """Idempotently seed the LastPlate database."""
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            print("Database already contains records. Skipping seed.")
            return

        print("Seeding LastPlate database with baseline entities...")

        # 1. Organizations
        bistro = Organization(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            name="The Grand Heritage Bistro",
            org_type="restaurant",
            address="42 Promenade Avenue, Downtown Core",
            postal_code="560001",
            latitude=12.9716,
            longitude=77.5946,
            contact_phone="+91 80 2234 5678",
            contact_email="dispatch@grandbistro.org",
            is_verified=True,
            verification_notes="FSSAI Commercial License verified. High hygiene rating.",
            max_daily_meals=300,
            refrigeration_available=True,
            operating_hours={"open": "10:00", "close": "23:00"},
            dietary_capabilities=["vegetarian", "gluten_free", "halal"],
        )

        bakery = Organization(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            name="Artisan Daily Sourdough",
            org_type="bakery",
            address="15 Baker Street, Market Quarter",
            postal_code="560002",
            latitude=12.9780,
            longitude=77.5990,
            contact_phone="+91 80 2345 6789",
            contact_email="donations@artisansourdough.com",
            is_verified=True,
            verification_notes="Verified bakery operations. Baked goods safety compliance.",
            max_daily_meals=100,
            refrigeration_available=False,
            operating_hours={"open": "06:00", "close": "20:00"},
            dietary_capabilities=["vegetarian", "vegan"],
        )

        shelter = Organization(
            id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
            name="Hope Community Shelter & Kitchen",
            org_type="ngo_shelter",
            address="88 Sanctuary Lane, Central District",
            postal_code="560003",
            latitude=12.9750,
            longitude=77.6050,
            contact_phone="+91 80 2456 7890",
            contact_email="coordinator@hopeshelter.org",
            is_verified=True,
            verification_notes="Registered Non-Profit NGO. State Welfare certification valid.",
            max_daily_meals=250,
            refrigeration_available=True,
            operating_hours={"open": "07:00", "close": "22:00"},
            dietary_capabilities=["all"],
        )

        pantry = Organization(
            id=uuid.UUID("44444444-4444-4444-4444-444444444444"),
            name="St. Jude Family Food Pantry",
            org_type="community_kitchen",
            address="102 Mission Road, East Gate",
            postal_code="560004",
            latitude=12.9820,
            longitude=77.6100,
            contact_phone="+91 80 2567 8901",
            contact_email="info@stjudepantry.org",
            is_verified=True,
            verification_notes="Community kitchen certified by health inspector.",
            max_daily_meals=150,
            refrigeration_available=True,
            operating_hours={"open": "08:00", "close": "21:00"},
            dietary_capabilities=["all"],
        )

        session.add_all([bistro, bakery, shelter, pantry])
        await session.flush()

        # 2. Users (Passwords: dev password 'LastPlate#2026')
        from app.core.security import hash_password
        default_pw = hash_password("LastPlate#2026")

        donor_user = User(
            id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            email="chef@grandbistro.org",
            hashed_password=default_pw,
            full_name="Elena Rostova",
            phone="+91 98765 43210",
            role="donor",
            is_active=True,
            is_verified=True,
            organization_id=bistro.id,
        )

        ngo_user = User(
            id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            email="director@hopeshelter.org",
            hashed_password=default_pw,
            full_name="Rev. Marcus Vance",
            phone="+91 98765 43211",
            role="ngo",
            is_active=True,
            is_verified=True,
            organization_id=shelter.id,
        )

        volunteer_user = User(
            id=uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            email="priya.volunteer@gmail.com",
            hashed_password=default_pw,
            full_name="Priya Sharma",
            phone="+91 98765 43212",
            role="volunteer",
            is_active=True,
            is_verified=True,
            organization_id=None,
        )

        admin_user = User(
            id=uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            email="admin@lastplate.org",
            hashed_password=default_pw,
            full_name="Sarah Jenkins",
            phone="+91 98765 43213",
            role="admin",
            is_active=True,
            is_verified=True,
            organization_id=None,
        )

        session.add_all([donor_user, ngo_user, volunteer_user, admin_user])
        await session.flush()

        # 3. Active Donations
        now = datetime.utcnow()
        donation1 = Donation(
            id=uuid.UUID("55555555-5555-5555-5555-555555555555"),
            donor_organization_id=bistro.id,
            title="45 Freshly Packed Gourmet Lunch Trays",
            description="Steamed basmati rice, slow-cooked lentil curry, and paneer tikka skewers.",
            food_type="cooked_meals",
            quantity_kg=22.5,
            portions=45,
            preparation_time=now - timedelta(minutes=45),
            pickup_deadline=now + timedelta(hours=2, minutes=30),
            storage_condition="hot_holding",
            allergens=["Dairy", "Mustard"],
            measured_temp_c=68.5,
            status="available",
            safety_notes="Sealed in food-grade thermal containers at 68.5°C.",
        )

        donation2 = Donation(
            id=uuid.UUID("66666666-6666-6666-6666-666666666666"),
            donor_organization_id=bakery.id,
            title="30 Loaves Sourdough & Brioche Rolls",
            description="Morning batch surplus sourdough loaves and French brioche dinner rolls.",
            food_type="bakery",
            quantity_kg=15.0,
            portions=30,
            preparation_time=now - timedelta(hours=3),
            pickup_deadline=now + timedelta(hours=6),
            storage_condition="ambient",
            allergens=["Gluten", "Eggs"],
            measured_temp_c=None,
            status="available",
            safety_notes="Individually bagged in compostable kraft paper.",
        )

        session.add_all([donation1, donation2])
        await session.flush()

        # 4. Audit Log
        audit1 = AuditLog(
            entity_type="organization",
            entity_id=bistro.id,
            action="ORGANIZATION_VERIFIED",
            actor_id=admin_user.id,
            actor_role="admin",
            payload_before={"is_verified": False},
            payload_after={"is_verified": True},
            ip_address="127.0.0.1",
        )

        audit2 = AuditLog(
            entity_type="donation",
            entity_id=donation1.id,
            action="DONATION_CREATED",
            actor_id=donor_user.id,
            actor_role="donor",
            payload_before=None,
            payload_after={"quantity_kg": 22.5, "portions": 45, "status": "available"},
            ip_address="127.0.0.1",
        )

        session.add_all([audit1, audit2])
        await session.commit()
        print("Database seeded successfully with organizations, users, donations, and audit records!")


if __name__ == "__main__":
    asyncio.run(seed_database())
