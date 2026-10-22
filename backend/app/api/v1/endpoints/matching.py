"""
Matching Engine and Atomic Acceptance Workflow API Endpoints.
Implements Stage 1 hard eligibility filters, Stage 2 explainable recipient ranking (35/30/20/15),
PostgreSQL row-level locking for atomic claims, split-donation allocation, and candidate discovery.
"""

from datetime import datetime, timedelta, timezone
import random
import secrets
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
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
    DonationRecipientsResponse,
    MatchRecommendationResponse,
    MatchRecordResponse,
    RecipientMatchResponse,
    ScoreBreakdownSchema,
    SplitDonationPlanResponse,
    TriggerMatchingResponse,
)
from app.services.matching_engine import matching_engine

router = APIRouter()


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
    and sorted by Stage 2 explainable ranking scores for the recipient organization.
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
        dist_km = matching_engine.compute_haversine_km(
            recipient.latitude, recipient.longitude,
            donor_org.latitude, donor_org.longitude,
        )

        # Stage 1: Hard eligibility check
        is_eligible, _ = matching_engine.evaluate_stage1_hard_filters(recipient, d, dist_km)
        if not is_eligible:
            continue

        # Stage 2: Calculate 35/30/20/15 heuristic score
        breakdown, explanation, travel_time = await matching_engine.calculate_stage2_ranked_score(
            recipient, d, dist_km, db
        )

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
                "city": "Metro Core",
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
    recommendations.sort(key=lambda r: r.scoreBreakdown.totalScore, reverse=True)

    return ResponseEnvelope[List[MatchRecommendationResponse]](
        success=True,
        message=f"Retrieved {len(recommendations)} eligible surplus food match recommendations.",
        data=recommendations,
    )


@router.get(
    "/donations/{donation_id}/recipients",
    response_model=ResponseEnvelope[DonationRecipientsResponse],
    summary="Get ranked eligible recipients for a specific donation (Donors & Admins)",
)
async def get_donation_recipients(
    donation_id: uuid.UUID,
    current_user: User = Depends(require_role("donor", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[DonationRecipientsResponse]:
    """
    Ranks all eligible recipient NGOs in the city for a specific donation post,
    displaying score breakdowns, proximity, and operational capacity.
    """
    stmt = (
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.id == donation_id)
    )
    res = await db.execute(stmt)
    donation = res.scalar_one_or_none()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation post could not be found.",
        )

    # Authorization check for donor: must own the donation unless admin
    if current_user.role == "donor" and donation.donor_organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view matches for this donation.",
        )

    candidates = await matching_engine.find_and_rank_recipients(donation, db)

    # Fetch any existing match records to include match_id
    matches_stmt = select(Match).where(Match.donation_id == donation.id)
    matches_res = await db.execute(matches_stmt)
    matches_map = {m.recipient_organization_id: m for m in matches_res.scalars().all()}

    recipient_responses: List[RecipientMatchResponse] = []
    for cand in candidates:
        r = cand["recipient"]
        match_obj = matches_map.get(r.id)

        recipient_responses.append(
            RecipientMatchResponse(
                recipient_id=r.id,
                recipient_name=r.name,
                org_type=r.org_type,
                address=r.address,
                contact_phone=r.contact_phone,
                distance_km=cand["distance_km"],
                estimated_travel_time_minutes=cand["travel_time_mins"],
                max_daily_meals=r.max_daily_meals,
                refrigeration_available=r.refrigeration_available,
                score=cand["score"],
                score_breakdown=cand["score_breakdown"],
                explanation=cand["explanation"],
                status=match_obj.status if match_obj else "suggested",
                match_id=match_obj.id if match_obj else None,
            )
        )

    data = DonationRecipientsResponse(
        donation_id=donation.id,
        title=donation.title,
        food_type=donation.food_type,
        quantity_kg=donation.quantity_kg,
        portions=donation.portions,
        pickup_deadline=donation.pickup_deadline,
        recipients=recipient_responses,
        total_eligible=len(recipient_responses),
    )

    return ResponseEnvelope[DonationRecipientsResponse](
        success=True,
        message=f"Found {len(recipient_responses)} eligible recipient kitchens for this surplus post.",
        data=data,
    )


@router.get(
    "/donations/{donation_id}/split-plan",
    response_model=ResponseEnvelope[SplitDonationPlanResponse],
    summary="Get multi-recipient split allocation plan for large surplus batches",
)
async def get_split_plan(
    donation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[SplitDonationPlanResponse]:
    """
    Computes a split-donation redistribution plan across multiple community kitchens
    to ensure full rescue without overwhelming any single facility.
    """
    stmt = (
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.id == donation_id)
    )
    res = await db.execute(stmt)
    donation = res.scalar_one_or_none()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation post could not be found.",
        )

    split_plan = await matching_engine.calculate_split_plan(donation, db)

    return ResponseEnvelope[SplitDonationPlanResponse](
        success=True,
        message="Split donation redistribution plan calculated successfully.",
        data=split_plan,
    )


@router.post(
    "/trigger/{donation_id}",
    response_model=ResponseEnvelope[TriggerMatchingResponse],
    summary="Trigger AI matching engine on demand for a donation (Donors & Admins)",
)
async def trigger_matching(
    donation_id: uuid.UUID,
    current_user: User = Depends(require_role("donor", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[TriggerMatchingResponse]:
    """
    Executes the matching engine for a donation post, generates persistent Match records,
    and dispatches notifications to recipient coordinators.
    """
    stmt = select(Donation).where(Donation.id == donation_id)
    res = await db.execute(stmt)
    donation = res.scalar_one_or_none()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation post could not be found.",
        )

    if current_user.role == "donor" and donation.donor_organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to trigger matching for this donation.",
        )

    matches = await matching_engine.match_and_persist_donation(donation.id, db, notify=True)

    top_name = None
    top_score = None
    if matches:
        top_match = matches[0]
        top_score = top_match.score
        top_org_res = await db.execute(
            select(Organization.name).where(Organization.id == top_match.recipient_organization_id)
        )
        top_name = top_org_res.scalar_one_or_none()

    result = TriggerMatchingResponse(
        donation_id=donation.id,
        matches_generated=len(matches),
        top_recipient_name=top_name,
        top_score=top_score,
        notifications_dispatched=len(matches),
        status="matched" if matches else "no_eligible_matches",
    )

    return ResponseEnvelope[TriggerMatchingResponse](
        success=True,
        message=f"Matching completed. Generated {len(matches)} persistent recipient pairings.",
        data=result,
    )


@router.get(
    "/matches",
    response_model=ResponseEnvelope[List[MatchRecordResponse]],
    summary="Query persistent Match records with filters",
)
async def list_matches(
    donation_id: Optional[uuid.UUID] = Query(None, alias="donationId"),
    recipient_org_id: Optional[uuid.UUID] = Query(None, alias="recipientOrgId"),
    match_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[List[MatchRecordResponse]]:
    """List existing persistent match records with optional filtering."""
    query = select(Match).options(selectinload(Match.recipient_organization))

    # Apply role scoping
    if current_user.role == "ngo" and current_user.organization_id:
        query = query.where(Match.recipient_organization_id == current_user.organization_id)
    elif current_user.role == "donor" and current_user.organization_id:
        query = query.join(Donation).where(Donation.donor_organization_id == current_user.organization_id)

    if donation_id:
        query = query.where(Match.donation_id == donation_id)
    if recipient_org_id and current_user.role == "admin":
        query = query.where(Match.recipient_organization_id == recipient_org_id)
    if match_status:
        query = query.where(Match.status == match_status)

    query = query.order_by(Match.score.desc())
    res = await db.execute(query)
    matches = res.scalars().all()

    response_list: List[MatchRecordResponse] = []
    for m in matches:
        rec_name = m.recipient_organization.name if m.recipient_organization else None
        response_list.append(
            MatchRecordResponse(
                id=m.id,
                donation_id=m.donation_id,
                recipient_organization_id=m.recipient_organization_id,
                recipient_name=rec_name,
                score=m.score,
                score_breakdown=m.score_breakdown,
                status=m.status,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
        )

    return ResponseEnvelope[List[MatchRecordResponse]](
        success=True,
        message=f"Retrieved {len(response_list)} match records.",
        data=response_list,
    )


@router.post(
    "/accept",
    response_model=ResponseEnvelope[AcceptMatchResponse],
    summary="Atomically claim surplus food donation offer",
)
async def accept_match(
    payload: AcceptMatchRequest,
    current_user: User = Depends(require_role("ngo", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[AcceptMatchResponse]:
    """
    Enforces atomic acceptance of a surplus food donation offer.
    Uses PostgreSQL row-level locking (SELECT ... FOR UPDATE) to ensure
    that competing claims return a 409 Conflict.
    Transitions donation status to 'accepted' and generates operational Pickup record.
    """
    target_org_id = payload.recipient_org_id or current_user.organization_id
    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient organization ID is required to accept a donation.",
        )

    # 1. Acquire Row-Level Lock on Donation record (SELECT ... FOR UPDATE)
    lock_stmt = (
        select(Donation)
        .where(Donation.id == payload.donation_id)
        .with_for_update()
    )
    lock_result = await db.execute(lock_stmt)
    donation = lock_result.scalar_one_or_none()

    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested donation does not exist.",
        )

    # 2. Enforce Concurrency Invariant: Must be in 'available' or 'matched' state
    if donation.status not in ("available", "matched"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Donation cannot be claimed because its current status is '{donation.status}'. It may have already been claimed by another recipient.",
        )

    # 3. Check Pickup Deadline
    now = datetime.now(timezone.utc)
    deadline = (
        donation.pickup_deadline
        if donation.pickup_deadline.tzinfo
        else donation.pickup_deadline.replace(tzinfo=timezone.utc)
    )
    if deadline <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot claim donation because the pickup collection window has expired.",
        )

    # 4. Verify Recipient Organization is active & verified
    org_res = await db.execute(
        select(Organization).where(Organization.id == target_org_id)
    )
    recipient_org = org_res.scalar_one_or_none()
    if not recipient_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient organization could not be found.",
        )
    if not recipient_org.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recipient organization must be verified by an administrator before claiming food donations.",
        )

    # 5. Transition Donation Status to 'accepted'
    previous_status = donation.status
    donation.status = "accepted"

    # 6. Generate Single-Use 6-Digit Backup PIN and Verification Token
    verification_pin = f"{random.randint(100000, 999999)}"
    verification_token = secrets.token_urlsafe(32)

    # 7. Create Operational Pickup Record
    scheduled_pickup = datetime.now(timezone.utc) + timedelta(minutes=45)
    pickup = Pickup(
        donation_id=donation.id,
        recipient_organization_id=recipient_org.id,
        status="pending_volunteer",
        verification_pin=verification_pin,
        verification_token=verification_token,
        token_expires_at=donation.pickup_deadline,
        scheduled_pickup_time=scheduled_pickup,
    )
    db.add(pickup)
    await db.flush()

    # 8. Update Match status to 'accepted'
    match_stmt = select(Match).where(
        Match.donation_id == donation.id,
        Match.recipient_organization_id == recipient_org.id,
    )
    match_res = await db.execute(match_stmt)
    matched_entry = match_res.scalar_one_or_none()
    if matched_entry:
        matched_entry.status = "accepted"
    else:
        new_match = Match(
            donation_id=donation.id,
            recipient_organization_id=recipient_org.id,
            score=95.0,
            score_breakdown={"total": 95.0, "status": "direct_acceptance"},
            status="accepted",
        )
        db.add(new_match)

    # Set competing suggested matches for this donation to 'expired'
    expire_stmt = (
        update(Match)
        .where(
            Match.donation_id == donation.id,
            Match.recipient_organization_id != recipient_org.id,
            Match.status == "suggested",
        )
        .values(status="expired")
    )
    await db.execute(expire_stmt)

    # 9. Record Immutable Audit Log
    audit_entry = AuditLog(
        entity_type="match",
        entity_id=donation.id,
        action="MATCH_ACCEPTED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_before={"status": previous_status},
        payload_after={
            "status": "accepted",
            "recipient_organization_id": str(recipient_org.id),
            "recipient_organization_name": recipient_org.name,
            "pickup_id": str(pickup.id),
            "verification_pin": verification_pin,
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)

    # 10. Commit the transaction to release row lock
    await db.commit()
    await db.refresh(pickup)

    response_data = AcceptMatchResponse(
        success=True,
        donation_id=donation.id,
        recipient_org_id=recipient_org.id,
        pickup_id=pickup.id,
        status="accepted",
        verification_pin=verification_pin,
        scheduled_pickup_time=scheduled_pickup,
        message=f"Donation offer accepted for {recipient_org.name}. Backup verification PIN: {verification_pin}",
    )

    return ResponseEnvelope[AcceptMatchResponse](
        success=True,
        message="Donation offer successfully claimed and assigned for volunteer dispatch.",
        data=response_data,
    )


@router.post(
    "/decline",
    response_model=ResponseEnvelope[Dict[str, Any]],
    summary="Decline surplus food donation offer",
)
async def decline_match(
    payload: DeclineMatchRequest,
    current_user: User = Depends(require_role("ngo", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[Dict[str, Any]]:
    """Records a recipient decline of a surplus donation offer."""
    target_org_id = payload.recipient_org_id or current_user.organization_id
    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient organization ID is required.",
        )

    match_stmt = select(Match).where(
        Match.donation_id == payload.donation_id,
        Match.recipient_organization_id == target_org_id,
    )
    match_res = await db.execute(match_stmt)
    matched_entry = match_res.scalar_one_or_none()

    if matched_entry:
        matched_entry.status = "declined"
    else:
        new_match = Match(
            donation_id=payload.donation_id,
            recipient_organization_id=target_org_id,
            score=0.0,
            score_breakdown={"reason": payload.reason or "Declined by recipient"},
            status="declined",
        )
        db.add(new_match)

    audit_entry = AuditLog(
        entity_type="match",
        entity_id=payload.donation_id,
        action="MATCH_DECLINED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={"reason": payload.reason},
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()

    return ResponseEnvelope[Dict[str, Any]](
        success=True,
        message="Donation offer declined successfully.",
        data={"donation_id": str(payload.donation_id), "status": "declined"},
    )
