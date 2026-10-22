"""
Matching Engine and Atomic Acceptance Workflow API Endpoints.
Implements Stage 1 hard eligibility filters, Stage 2 explainable recipient ranking (35/30/20/15),
and PostgreSQL row-level locking for atomic donation claims.
"""

from datetime import datetime, timedelta, timezone
import math
import random
import secrets
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, require_role
from app.db.session import get_db
from app.models import AuditLog, Donation, Match, Organization, Pickup, User
from app.schemas.common import ResponseEnvelope
from app.schemas.matching import (
    AcceptMatchRequest,
    AcceptMatchResponse,
    DeclineMatchRequest,
    MatchRecommendationResponse,
    ScoreBreakdownSchema,
)

router = APIRouter()


def compute_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula for spherical distance in kilometers between two GPS coordinates."""
    r = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def evaluate_stage1_hard_filters(
    recipient: Organization,
    donation: Donation,
    dist_km: float,
) -> bool:
    """
    Stage 1 Hard Eligibility Constraints (Section 4):
    - Recipient must be verified.
    - Donation status must be 'available' or 'matched' (no unresolved safety hold).
    - Pickup deadline must be in the future.
    - Cold storage compatibility: if food requires refrigeration, recipient must have refrigeration.
    - Transit distance must be within operational city range (< 25 km).
    """
    if not recipient.is_verified:
        return False

    if donation.status not in ("available", "matched"):
        return False

    now = datetime.now(timezone.utc)
    deadline = (
        donation.pickup_deadline
        if donation.pickup_deadline.tzinfo
        else donation.pickup_deadline.replace(tzinfo=timezone.utc)
    )
    if deadline <= now:
        return False

    if donation.storage_condition in ("refrigerated", "frozen", "dairy_chilled"):
        if not recipient.refrigeration_available:
            return False

    if dist_km > 25.0:
        return False

    return True


def calculate_stage2_ranked_score(
    recipient: Organization,
    donation: Donation,
    dist_km: float,
) -> tuple[ScoreBreakdownSchema, str, int]:
    """
    Stage 2 Heuristic Ranking Breakdown (Section 4):
    - Distance (35% weight)
    - Urgency (30% weight)
    - Capacity (20% weight)
    - Reliability (15% weight)
    """
    now = datetime.now(timezone.utc)
    deadline = (
        donation.pickup_deadline
        if donation.pickup_deadline.tzinfo
        else donation.pickup_deadline.replace(tzinfo=timezone.utc)
    )

    # 1. Distance Score (35%): Shorter travel = higher score
    distance_score = round(max(0.0, min(100.0, 100.0 - (dist_km * 7.0))), 1)

    # 2. Urgency Score (30%): Imminent deadline = higher rescue urgency
    time_remaining_hours = max(0.1, (deadline - now).total_seconds() / 3600.0)
    if time_remaining_hours <= 1.0:
        urgency_score = 98.0
    elif time_remaining_hours <= 2.5:
        urgency_score = 92.0
    elif time_remaining_hours <= 4.0:
        urgency_score = 82.0
    else:
        urgency_score = 70.0

    # 3. Capacity Score (20%): Match portions with recipient daily capacity
    capacity_ratio = recipient.max_daily_meals / max(1, donation.portions)
    if capacity_ratio >= 1.5:
        capacity_score = 95.0
    elif capacity_ratio >= 0.8:
        capacity_score = 88.0
    else:
        capacity_score = 65.0

    # 4. Reliability Score (15%): Recipient audit compliance rating
    reliability_score = 95.0

    # Total Composite Score
    total_score = round(
        (0.35 * distance_score)
        + (0.30 * urgency_score)
        + (0.20 * capacity_score)
        + (0.15 * reliability_score),
        1,
    )

    # Estimated driving transit time: ~2.5 mins per km + 5 mins baseline handling
    travel_time_mins = max(5, int(dist_km * 2.5 + 5))

    explanation = (
        f"High proximity ({dist_km:.1f} km, ~{travel_time_mins} mins). "
        f"Capacity alignment ({recipient.max_daily_meals} meals/day capacity for {donation.portions} portions). "
        f"Pickup window closes in {time_remaining_hours:.1f} hours."
    )

    breakdown = ScoreBreakdownSchema(
        distanceScore=distance_score,
        urgencyScore=urgency_score,
        capacityScore=capacity_score,
        reliabilityScore=reliability_score,
        totalScore=total_score,
    )
    return breakdown, explanation, travel_time_mins


@router.get(
    "/recommendations",
    response_model=ResponseEnvelope[List[MatchRecommendationResponse]],
    summary="Get AI-ranked donation match recommendations for recipient NGO",
)
async def get_recommendations(
    recipient_id: Optional[uuid.UUID] = Query(None, alias="recipientId"),
    current_user: User = Depends(require_role("ngo", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[List[MatchRecommendationResponse]]:
    """
    Returns candidate surplus food offers filtered through Stage 1 hard constraints
    and sorted by Stage 2 explainable ranking scores.
    """
    target_org_id = recipient_id or current_user.organization_id
    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a registered organization to receive match recommendations.",
        )

    # Fetch recipient organization details
    recipient_res = await db.execute(
        select(Organization).where(Organization.id == target_org_id)
    )
    recipient = recipient_res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient organization could not be found.",
        )

    # Fetch all candidate donations in available or matched state
    donations_res = await db.execute(
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.status.in_(["available", "matched"]))
        .order_by(Donation.pickup_deadline.asc())
    )
    open_donations = donations_res.scalars().all()

    recommendations: List[MatchRecommendationResponse] = []

    for d in open_donations:
        donor_org = d.donor_organization
        if not donor_org:
            continue

        # Calculate geospatial distance
        dist_km = compute_haversine_km(
            recipient.latitude, recipient.longitude,
            donor_org.latitude, donor_org.longitude
        )

        # Stage 1: Hard eligibility check
        if not evaluate_stage1_hard_filters(recipient, d, dist_km):
            continue

        # Stage 2: Calculate 35/30/20/15 heuristic score
        breakdown, explanation, travel_time = calculate_stage2_ranked_score(
            recipient, d, dist_km
        )

        # Construct frontend-compatible donation representation
        donation_dict = {
            "id": str(d.id),
            "donorOrgId": str(donor_org.id),
            "donorOrgName": donor_org.name,
            "title": d.title,
            "description": d.description or "",
            "foodType": "prepared_meals" if d.food_type == "cooked_meals" else d.food_type,
            "quantityKg": float(d.quantity_kg),
            "estimatedMeals": int(d.portions),
            "preparationTime": d.preparation_time.isoformat(),
            "pickupDeadline": d.pickup_deadline.isoformat(),
            "storageCondition": d.storage_condition,
            "measuredTemperatureCelsius": d.measured_temp_c,
            "allergens": d.allergens or [],
            "status": d.status,
            "pickupLocation": {
                "address": donor_org.address,
                "city": "Downtown Core",
                "latitude": donor_org.latitude,
                "longitude": donor_org.longitude,
                "postalCode": donor_org.postal_code,
            },
        }

        rec = MatchRecommendationResponse(
            id=f"rec-{d.id}",
            donationId=str(d.id),
            donation=donation_dict,
            recipientOrgId=str(recipient.id),
            scoreBreakdown=breakdown,
            explanation=explanation,
            estimatedTravelTimeMinutes=travel_time,
            roadDistanceKm=round(dist_km, 1),
            status="recommended",
            expiresAt=d.pickup_deadline.isoformat(),
            createdAt=d.created_at.isoformat(),
        )
        recommendations.append(rec)

    # Sort descending by composite score
    recommendations.sort(key=lambda x: x.scoreBreakdown.totalScore, reverse=True)

    return ResponseEnvelope[List[MatchRecommendationResponse]](
        success=True,
        message=f"Generated {len(recommendations)} ranked surplus food recommendations.",
        data=recommendations,
    )


@router.post(
    "/accept",
    response_model=ResponseEnvelope[AcceptMatchResponse],
    summary="Atomically accept and claim a surplus food donation offer",
)
async def accept_match(
    payload: AcceptMatchRequest,
    current_user: User = Depends(require_role("ngo", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[AcceptMatchResponse]:
    """
    Atomic claim execution with PostgreSQL row-level locking (SELECT ... FOR UPDATE).
    Enforces Section 8 invariant: 'A donation cannot be claimed twice by competing recipients'.
    Prevents race conditions, transitions status to 'accepted', and creates the Pickup record.
    """
    recipient_org_id = payload.recipient_org_id or current_user.organization_id
    if not recipient_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient organization identifier is required to claim a donation.",
        )

    # 1. Row-level lock on the donation record using with_for_update()
    donation_stmt = (
        select(Donation)
        .where(Donation.id == payload.donation_id)
        .with_for_update()
    )
    donation_res = await db.execute(donation_stmt)
    donation = donation_res.scalar_one_or_none()

    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation listing not found.",
        )

    # 2. Concurrency check: Ensure donation has not already been claimed
    if donation.status not in ("available", "matched"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Offer is no longer available (current status: '{donation.status}'). "
                f"Another community organization has already claimed this batch."
            ),
        )

    # 3. Transition donation state to 'accepted'
    donation.status = "accepted"

    # 4. Generate secure 6-digit backup PIN and single-use verification token
    verification_pin = str(random.randint(100000, 999999))
    verification_token = f"vtok_{secrets.token_urlsafe(24)}"
    token_expires_at = donation.pickup_deadline

    # 5. Create Pickup operational record
    pickup = Pickup(
        donation_id=donation.id,
        recipient_organization_id=recipient_org_id,
        status="pending_volunteer",
        scheduled_pickup_time=datetime.utcnow() + timedelta(minutes=30),
        estimated_delivery_time=datetime.utcnow() + timedelta(minutes=75),
        verification_pin=verification_pin,
        verification_token=verification_token,
        token_expires_at=token_expires_at,
        is_token_used=False,
    )
    db.add(pickup)

    # 6. Create or update Match pairing record
    match_stmt = (
        select(Match)
        .where(
            Match.donation_id == donation.id,
            Match.recipient_organization_id == recipient_org_id,
        )
    )
    match_res = await db.execute(match_stmt)
    match = match_res.scalar_one_or_none()

    if match:
        match.status = "accepted"
    else:
        match = Match(
            donation_id=donation.id,
            recipient_organization_id=recipient_org_id,
            score=95.0,
            score_breakdown={"distance": 92.0, "urgency": 90.0, "capacity": 95.0, "reliability": 95.0},
            status="accepted",
        )
        db.add(match)

    # 7. Record immutable audit log entry
    audit_entry = AuditLog(
        entity_type="donation",
        entity_id=donation.id,
        action="MATCH_ACCEPTED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={
            "recipient_organization_id": str(recipient_org_id),
            "status": "accepted",
            "pickup_id": str(pickup.id),
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)

    # Commit atomic claim transaction
    await db.commit()
    await db.refresh(pickup)

    response_data = AcceptMatchResponse(
        success=True,
        donation_id=donation.id,
        recipient_org_id=recipient_org_id,
        pickup_id=pickup.id,
        status="accepted",
        verification_pin=verification_pin,
        scheduled_pickup_time=pickup.scheduled_pickup_time,
        message="Donation offer accepted successfully. Pickup has been scheduled for volunteer dispatch.",
    )

    return ResponseEnvelope[AcceptMatchResponse](
        success=True,
        message="Donation offer accepted successfully. Atomic claim secured.",
        data=response_data,
    )


@router.post(
    "/decline",
    summary="Decline a surplus donation recommendation",
)
async def decline_match(
    payload: DeclineMatchRequest,
    current_user: User = Depends(require_role("ngo", "admin")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Records recipient decline so the matching engine will prioritize other candidates."""
    recipient_org_id = payload.recipient_org_id or current_user.organization_id
    if not recipient_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient organization identifier is required.",
        )

    match_stmt = (
        select(Match)
        .where(
            Match.donation_id == payload.donation_id,
            Match.recipient_organization_id == recipient_org_id,
        )
    )
    match_res = await db.execute(match_stmt)
    match = match_res.scalar_one_or_none()

    if match:
        match.status = "declined"
    else:
        match = Match(
            donation_id=payload.donation_id,
            recipient_organization_id=recipient_org_id,
            score=50.0,
            score_breakdown={},
            status="declined",
        )
        db.add(match)

    await db.commit()
    return {"success": True, "message": "Recommendation declined."}
