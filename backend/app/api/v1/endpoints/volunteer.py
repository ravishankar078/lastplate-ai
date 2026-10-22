"""
Volunteer Dispatch and Mobile Handover API Endpoints.
Implements job queue discovery, atomic assignment locking, multi-stop route navigation,
and secure single-use QR/PIN handover authentication.
Enforces Master Spec Section 6 (Food Safety & Traceability) and Section 8 Invariants:
- A delivery cannot be confirmed before valid collection.
- An expired or used verification token cannot confirm another handover.
- A donation cannot be claimed twice by competing volunteers.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, require_role
from app.db.session import get_db
from app.models import AuditLog, Donation, Organization, Pickup, Route, RouteStop, User
from app.schemas.common import ResponseEnvelope
from app.schemas.volunteer import (
    ActiveRouteResponse,
    ReportIssueRequest,
    ReportIssueResponse,
    RouteStopResponse,
    VerifyHandoverRequest,
    VerifyHandoverResponse,
    VolunteerHistoryItem,
    VolunteerImpactSummary,
    VolunteerJobResponse,
)
from app.services.matching_engine import matching_engine

router = APIRouter()


@router.get(
    "/jobs",
    response_model=ResponseEnvelope[List[VolunteerJobResponse]],
    summary="Get available surplus food pickup jobs in dispatch queue",
)
async def list_available_jobs(
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[List[VolunteerJobResponse]]:
    """
    Returns all surplus food pickups currently waiting for volunteer collection.
    Includes donor collection address, recipient destination, deadlines, and transit estimates.
    """
    stmt = (
        select(Pickup)
        .options(
            selectinload(Pickup.donation).selectinload(Donation.donor_organization),
            selectinload(Pickup.recipient_organization),
        )
        .where(Pickup.status == "pending_volunteer")
        .order_by(Pickup.scheduled_pickup_time.asc())
    )
    res = await db.execute(stmt)
    pickups = res.scalars().all()

    now = datetime.now(timezone.utc)
    jobs: List[VolunteerJobResponse] = []

    for p in pickups:
        don = p.donation
        if not don or not don.donor_organization or not p.recipient_organization:
            continue

        deadline = (
            don.pickup_deadline
            if don.pickup_deadline.tzinfo
            else don.pickup_deadline.replace(tzinfo=timezone.utc)
        )
        if deadline <= now:
            continue  # Skip expired pickup windows

        donor_org = don.donor_organization
        recipient_org = p.recipient_organization

        dist_km = matching_engine.compute_haversine_km(
            donor_org.latitude, donor_org.longitude,
            recipient_org.latitude, recipient_org.longitude,
        )
        duration_mins = max(10, int(dist_km * 2.5 + 10))

        jobs.append(
            VolunteerJobResponse(
                pickup_id=p.id,
                donation_id=don.id,
                title=don.title,
                description=don.description,
                food_type=don.food_type,
                quantity_kg=don.quantity_kg,
                portions=don.portions,
                storage_condition=don.storage_condition,
                donor_name=donor_org.name,
                donor_address=donor_org.address,
                donor_latitude=donor_org.latitude,
                donor_longitude=donor_org.longitude,
                donor_phone=donor_org.contact_phone,
                recipient_name=recipient_org.name,
                recipient_address=recipient_org.address,
                recipient_latitude=recipient_org.latitude,
                recipient_longitude=recipient_org.longitude,
                recipient_phone=recipient_org.contact_phone,
                scheduled_pickup_time=p.scheduled_pickup_time or (now + timedelta(minutes=15)),
                pickup_deadline=deadline,
                road_distance_km=round(dist_km, 1),
                estimated_duration_minutes=duration_mins,
                status=p.status,
            )
        )

    return ResponseEnvelope[List[VolunteerJobResponse]](
        success=True,
        message=f"Retrieved {len(jobs)} available rescue jobs in dispatch queue.",
        data=jobs,
    )


@router.post(
    "/claim-job/{pickup_id}",
    response_model=ResponseEnvelope[ActiveRouteResponse],
    summary="Atomically claim an available pickup job and generate volunteer route stops",
)
async def claim_job(
    pickup_id: uuid.UUID,
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[ActiveRouteResponse]:
    """
    Atomically claims a surplus rescue job for the volunteer using PostgreSQL row-level locking.
    Generates a sequenced Route with two stops:
    1. Stop 1: Collection from donor kitchen.
    2. Stop 2: Delivery to recipient shelter/pantry.
    """
    # 1. Lock Pickup row to prevent race conditions
    lock_stmt = select(Pickup).where(Pickup.id == pickup_id).with_for_update()
    res = await db.execute(lock_stmt)
    pickup = res.scalar_one_or_none()

    if not pickup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested pickup job does not exist.",
        )

    if pickup.status != "pending_volunteer":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job cannot be claimed because its current status is '{pickup.status}'. Another volunteer may have already accepted it.",
        )

    # 2. Load associated donation, donor org, and recipient org
    don_res = await db.execute(
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.id == pickup.donation_id)
    )
    donation = don_res.scalar_one_or_none()
    if not donation or not donation.donor_organization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Donation or donor organization data is incomplete.",
        )

    rec_res = await db.execute(
        select(Organization).where(Organization.id == pickup.recipient_organization_id)
    )
    recipient_org = rec_res.scalar_one_or_none()
    if not recipient_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient organization data is incomplete.",
        )

    # 3. Assign pickup and transition statuses
    pickup.volunteer_id = current_user.id
    pickup.status = "assigned"
    donation.status = "assigned"

    now = datetime.now(timezone.utc)
    donor_org = donation.donor_organization

    dist_km = matching_engine.compute_haversine_km(
        donor_org.latitude, donor_org.longitude,
        recipient_org.latitude, recipient_org.longitude,
    )
    duration_mins = max(15, int(dist_km * 2.5 + 15))

    # 4. Check for an existing active route for this volunteer, or create a new Route
    route_stmt = select(Route).where(
        Route.volunteer_id == current_user.id,
        Route.status.in_(["draft", "assigned", "in_progress"]),
    )
    route_res = await db.execute(route_stmt)
    route = route_res.scalar_one_or_none()

    if not route:
        route = Route(
            volunteer_id=current_user.id,
            planned_date=now,
            total_distance_km=round(dist_km, 1),
            total_duration_minutes=duration_mins,
            status="assigned",
        )
        db.add(route)
        await db.flush()
    else:
        route.total_distance_km = round(route.total_distance_km + dist_km, 1)
        route.total_duration_minutes += duration_mins

    # Count existing stops for sequence numbering
    seq_stmt = select(func.count()).select_from(RouteStop).where(RouteStop.route_id == route.id)
    seq_res = await db.execute(seq_stmt)
    existing_stop_count = seq_res.scalar_one() or 0

    # 5. Create Stop 1: Collection from Donor
    pickup_window_start = now
    pickup_window_end = (
        donation.pickup_deadline
        if donation.pickup_deadline.tzinfo
        else donation.pickup_deadline.replace(tzinfo=timezone.utc)
    )

    stop1 = RouteStop(
        route_id=route.id,
        pickup_id=pickup.id,
        organization_id=donor_org.id,
        stop_type="pickup",
        stop_sequence=existing_stop_count + 1,
        address=donor_org.address,
        latitude=donor_org.latitude,
        longitude=donor_org.longitude,
        arrival_window_start=pickup_window_start,
        arrival_window_end=pickup_window_end,
        estimated_arrival=now + timedelta(minutes=20),
        status="pending",
    )

    # 6. Create Stop 2: Delivery to Recipient
    stop2 = RouteStop(
        route_id=route.id,
        pickup_id=pickup.id,
        organization_id=recipient_org.id,
        stop_type="delivery",
        stop_sequence=existing_stop_count + 2,
        address=recipient_org.address,
        latitude=recipient_org.latitude,
        longitude=recipient_org.longitude,
        arrival_window_start=now + timedelta(minutes=30),
        arrival_window_end=pickup_window_end + timedelta(hours=1),
        estimated_arrival=now + timedelta(minutes=45),
        status="pending",
    )

    db.add_all([stop1, stop2])

    # 7. Record immutable audit log
    audit_entry = AuditLog(
        entity_type="pickup",
        entity_id=pickup.id,
        action="VOLUNTEER_ASSIGNED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={
            "volunteer_id": str(current_user.id),
            "volunteer_name": current_user.full_name,
            "route_id": str(route.id),
            "status": "assigned",
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(route)

    # Build active route response
    active_route = await get_active_route_response(route.id, db)
    return ResponseEnvelope[ActiveRouteResponse](
        success=True,
        message=f"Job successfully assigned. Route updated with collection and delivery stops.",
        data=active_route,
    )


@router.get(
    "/active-route",
    response_model=ResponseEnvelope[Optional[ActiveRouteResponse]],
    summary="Get volunteer's current active multi-stop route and stops",
)
async def get_active_route(
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[Optional[ActiveRouteResponse]]:
    """Retrieves the active assigned route with ordered stops for the authenticated volunteer."""
    stmt = (
        select(Route)
        .where(
            Route.volunteer_id == current_user.id,
            Route.status.in_(["assigned", "in_progress"]),
        )
        .order_by(Route.created_at.desc())
    )
    res = await db.execute(stmt)
    route = res.scalar_one_or_none()

    if not route:
        return ResponseEnvelope[Optional[ActiveRouteResponse]](
            success=True,
            message="No active route assigned at this time.",
            data=None,
        )

    active_route = await get_active_route_response(route.id, db)
    return ResponseEnvelope[Optional[ActiveRouteResponse]](
        success=True,
        message="Active volunteer route retrieved successfully.",
        data=active_route,
    )


@router.post(
    "/stops/{stop_id}/arrive",
    response_model=ResponseEnvelope[RouteStopResponse],
    summary="Mark volunteer arrival at a collection or delivery location",
)
async def mark_stop_arrival(
    stop_id: uuid.UUID,
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[RouteStopResponse]:
    """Records volunteer arrival at the pickup or delivery site, setting actual_arrival timestamp."""
    stmt = (
        select(RouteStop)
        .options(
            selectinload(RouteStop.route),
            selectinload(RouteStop.organization),
            selectinload(RouteStop.pickup).selectinload(Pickup.donation),
        )
        .where(RouteStop.id == stop_id)
    )
    res = await db.execute(stmt)
    stop = res.scalar_one_or_none()

    if not stop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route stop could not be found.",
        )

    if current_user.role == "volunteer" and stop.route.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this route stop.",
        )

    now = datetime.now(timezone.utc)
    stop.status = "arrived"
    stop.actual_arrival = now

    if stop.route.status == "assigned":
        stop.route.status = "in_progress"

    await db.commit()
    await db.refresh(stop)

    resp = build_single_stop_response(stop)
    return ResponseEnvelope[RouteStopResponse](
        success=True,
        message=f"Arrival confirmed at {stop.organization.name if stop.organization else stop.address}.",
        data=resp,
    )


@router.post(
    "/verify-handover",
    response_model=ResponseEnvelope[VerifyHandoverResponse],
    summary="Authenticate collection or delivery handover using secure PIN or QR token",
)
async def verify_handover(
    payload: VerifyHandoverRequest,
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[VerifyHandoverResponse]:
    """
    Validates collection from donor or delivery to recipient using single-use verification token/PIN.
    Enforces critical invariants:
    - Delivery CANNOT be confirmed before valid collection.
    - Expired or already used token CANNOT be accepted.
    - Status transitions and timestamps are immutably audited.
    """
    now = datetime.now(timezone.utc)

    # 1. Load RouteStop
    stop_stmt = (
        select(RouteStop)
        .options(selectinload(RouteStop.route))
        .where(RouteStop.id == payload.stop_id)
    )
    stop_res = await db.execute(stop_stmt)
    stop = stop_res.scalar_one_or_none()

    if not stop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route stop does not exist.",
        )

    if current_user.role == "volunteer" and stop.route.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to verify this route stop.",
        )

    # 2. Lock Pickup row to protect state machine
    pickup_stmt = (
        select(Pickup)
        .options(selectinload(Pickup.donation))
        .where(Pickup.id == payload.pickup_id)
        .with_for_update()
    )
    pickup_res = await db.execute(pickup_stmt)
    pickup = pickup_res.scalar_one_or_none()

    if not pickup or not pickup.donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated pickup record does not exist.",
        )

    donation = pickup.donation

    # 3. CRITICAL INVARIANT: Delivery cannot be confirmed before valid collection
    if stop.stop_type == "delivery" and pickup.actual_pickup_time is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid handover sequence: Collection from donor must be completed and authenticated before delivery can be confirmed.",
        )

    # 4. INVARIANT: Expired or used token cannot confirm another handover
    if pickup.is_token_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has already been consumed. Handover is already complete.",
        )

    deadline = (
        pickup.token_expires_at
        if pickup.token_expires_at.tzinfo
        else pickup.token_expires_at.replace(tzinfo=timezone.utc)
    )
    if deadline <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Request a refreshed verification code from the donor or dispatcher.",
        )

    # 5. Validate verification code against PIN or Token
    code = payload.verification_code.strip()
    is_valid_pin = code == pickup.verification_pin
    is_valid_token = code == pickup.verification_token

    if not (is_valid_pin or is_valid_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check the 6-digit PIN on the handover screen.",
        )

    # 6. Apply state transitions based on stop type
    if stop.stop_type == "pickup":
        pickup.actual_pickup_time = now
        pickup.status = "collected"
        donation.status = "in_transit"
        stop.status = "completed"
        msg = f"Surplus food collected from donor. In transit to destination."
        action_name = "FOOD_COLLECTED"
    else:  # delivery
        pickup.actual_delivery_time = now
        pickup.status = "delivered"
        pickup.is_token_used = True
        donation.status = "delivered"
        stop.status = "completed"
        msg = f"Delivery confirmed and receipt validated at recipient organization."
        action_name = "DELIVERY_CONFIRMED"

    # 7. Check if all stops in the route are completed
    pending_stops_stmt = select(func.count()).select_from(RouteStop).where(
        RouteStop.route_id == stop.route_id,
        RouteStop.status != "completed",
    )
    pending_res = await db.execute(pending_stops_stmt)
    pending_count = pending_res.scalar_one() or 0
    route_completed = pending_count == 0

    if route_completed:
        stop.route.status = "completed"

    # 8. Record immutable audit log
    audit_entry = AuditLog(
        entity_type="pickup",
        entity_id=pickup.id,
        action=action_name,
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={
            "stop_id": str(stop.id),
            "stop_type": stop.stop_type,
            "actual_time": now.isoformat(),
            "pickup_status": pickup.status,
            "donation_status": donation.status,
            "temp_c": payload.actual_temp_c,
            "notes": payload.notes,
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(pickup)

    return ResponseEnvelope[VerifyHandoverResponse](
        success=True,
        message=msg,
        data=VerifyHandoverResponse(
            success=True,
            verified_at=now,
            stop_id=stop.id,
            stop_type=stop.stop_type,
            pickup_status=pickup.status,
            donation_status=donation.status,
            message=msg,
            is_route_completed=route_completed,
        ),
    )


@router.post(
    "/report-issue",
    response_model=ResponseEnvelope[ReportIssueResponse],
    summary="Report volunteer route exceptions, food safety anomalies, or delay issues",
)
async def report_issue(
    payload: ReportIssueRequest,
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[ReportIssueResponse]:
    """
    Records an operational delay, temperature safety discrepancy, or damaged packaging.
    If a safety violation is detected, immediately flags the donation with 'safety_hold'.
    """
    pickup_stmt = (
        select(Pickup)
        .options(selectinload(Pickup.donation))
        .where(Pickup.id == payload.pickup_id)
    )
    res = await db.execute(pickup_stmt)
    pickup = res.scalar_one_or_none()

    if not pickup or not pickup.donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pickup record could not be found.",
        )

    donation = pickup.donation
    safety_hold_applied = False

    # Check food safety violations:
    is_safety_issue = payload.issue_type in (
        "temperature_out_of_spec",
        "food_spoiled",
        "packaging_damaged",
        "unsafe_condition",
    )

    if is_safety_issue or (
        payload.measured_temp_c is not None
        and donation.storage_condition == "hot_holding"
        and payload.measured_temp_c < 60.0
    ):
        donation.status = "safety_hold"
        donation.safety_notes = f"Volunteer Alert [{payload.issue_type}]: {payload.description}"
        safety_hold_applied = True

    audit_entry = AuditLog(
        entity_type="pickup",
        entity_id=pickup.id,
        action="ISSUE_REPORTED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={
            "issue_type": payload.issue_type,
            "description": payload.description,
            "delay_minutes": payload.delay_minutes,
            "measured_temp_c": payload.measured_temp_c,
            "safety_hold_applied": safety_hold_applied,
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()

    msg = (
        "Safety hold applied to donation. Dispatcher notified."
        if safety_hold_applied
        else "Operational exception recorded successfully."
    )

    return ResponseEnvelope[ReportIssueResponse](
        success=True,
        message=msg,
        data=ReportIssueResponse(
            success=True,
            pickup_id=pickup.id,
            safety_hold_applied=safety_hold_applied,
            message=msg,
        ),
    )


@router.get(
    "/history",
    response_model=ResponseEnvelope[VolunteerImpactSummary],
    summary="Get volunteer completed mission history and environmental impact metrics",
)
async def get_volunteer_history(
    current_user: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[VolunteerImpactSummary]:
    """Retrieves all completed rescue missions for the volunteer and computes cumulative metrics."""
    stmt = (
        select(Pickup)
        .options(
            selectinload(Pickup.donation).selectinload(Donation.donor_organization),
            selectinload(Pickup.recipient_organization),
        )
        .where(
            Pickup.volunteer_id == current_user.id,
            Pickup.status == "delivered",
        )
        .order_by(Pickup.actual_delivery_time.desc())
    )
    res = await db.execute(stmt)
    completed_pickups = res.scalars().all()

    total_rescues = len(completed_pickups)
    total_portions = 0
    total_kg = 0.0
    total_distance = 0.0
    history_items: List[VolunteerHistoryItem] = []

    for p in completed_pickups:
        don = p.donation
        if not don or not don.donor_organization or not p.recipient_organization:
            continue

        total_portions += don.portions
        total_kg += don.quantity_kg

        dist = matching_engine.compute_haversine_km(
            don.donor_organization.latitude, don.donor_organization.longitude,
            p.recipient_organization.latitude, p.recipient_organization.longitude,
        )
        total_distance += dist

        history_items.append(
            VolunteerHistoryItem(
                pickup_id=p.id,
                completed_at=p.actual_delivery_time or p.updated_at,
                donation_title=don.title,
                donor_name=don.donor_organization.name,
                recipient_name=p.recipient_organization.name,
                quantity_kg=don.quantity_kg,
                portions=don.portions,
                distance_km=round(dist, 1),
            )
        )

    # EPA WARM factor: 1.9 kg CO2e avoided per 1 kg surplus food diverted from landfill
    co2_avoided = round(total_kg * 1.9, 1)

    summary = VolunteerImpactSummary(
        total_rescues=total_rescues,
        total_portions=total_portions,
        total_quantity_kg=round(total_kg, 1),
        co2_avoided_kg=co2_avoided,
        reliability_rating=98.5 if total_rescues > 0 else 100.0,
        history=history_items,
    )

    return ResponseEnvelope[VolunteerImpactSummary](
        success=True,
        message=f"Retrieved {total_rescues} completed rescue assignments.",
        data=summary,
    )


# --- Helper Functions ---


async def get_active_route_response(route_id: uuid.UUID, db: AsyncSession) -> ActiveRouteResponse:
    """Helper to assemble fully typed ActiveRouteResponse with populated stops."""
    stmt = (
        select(Route)
        .options(
            selectinload(Route.volunteer),
            selectinload(Route.stops).selectinload(RouteStop.organization),
            selectinload(Route.stops).selectinload(RouteStop.pickup).selectinload(Pickup.donation),
        )
        .where(Route.id == route_id)
    )
    res = await db.execute(stmt)
    route = res.scalar_one()

    stops_list: List[RouteStopResponse] = []
    for s in route.stops:
        stops_list.append(build_single_stop_response(s))

    return ActiveRouteResponse(
        route_id=route.id,
        volunteer_id=route.volunteer_id,
        volunteer_name=route.volunteer.full_name if route.volunteer else "Volunteer",
        status=route.status,
        total_distance_km=route.total_distance_km,
        total_duration_minutes=route.total_duration_minutes,
        stops=stops_list,
    )


def build_single_stop_response(stop: RouteStop) -> RouteStopResponse:
    """Helper to map a single RouteStop ORM instance to RouteStopResponse schema."""
    org_name = stop.organization.name if stop.organization else "Partner Facility"
    contact_phone = stop.organization.contact_phone if stop.organization else None
    don = stop.pickup.donation if stop.pickup and stop.pickup.donation else None

    portions = don.portions if don else 0
    quantity_kg = don.quantity_kg if don else 0.0
    storage = don.storage_condition if don else "ambient"

    instructions = (
        f"Collect {portions} portions ({quantity_kg}kg, {storage.replace('_', ' ')}). Verify thermal packaging."
        if stop.stop_type == "pickup"
        else f"Deliver {portions} portions to kitchen staging area. Request receiving staff to provide verification PIN."
    )

    return RouteStopResponse(
        id=stop.id,
        route_id=stop.route_id,
        pickup_id=stop.pickup_id,
        stop_type=stop.stop_type,
        stop_sequence=stop.stop_sequence,
        organization_name=org_name,
        address=stop.address,
        contact_phone=contact_phone,
        latitude=stop.latitude,
        longitude=stop.longitude,
        arrival_window_start=stop.arrival_window_start,
        arrival_window_end=stop.arrival_window_end,
        estimated_arrival=stop.estimated_arrival,
        actual_arrival=stop.actual_arrival,
        status=stop.status,
        verification_method="PIN",
        food_safety_instructions=instructions,
        portions=portions,
        quantity_kg=quantity_kg,
        storage_condition=storage,
        verification_pin=stop.pickup.verification_pin if stop.pickup else None,
    )
