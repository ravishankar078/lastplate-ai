"""
Food Donation Management API Endpoints.
Implements the food donor surplus posting workflow, mandatory food safety checks,
and state machine transitions.
"""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, require_role
from app.db.session import get_db
from app.models import AuditLog, Donation, Organization, User
from app.schemas.common import ResponseEnvelope
from app.schemas.donation import (
    CancelDonationRequest,
    CreateDonationRequest,
    DonationResponse,
    UpdateDonationRequest,
)

router = APIRouter()


def evaluate_food_safety(
    storage_condition: str,
    measured_temp_c: Optional[float],
    pickup_deadline: datetime,
    safety_notes: Optional[str] = None,
) -> tuple[str, Optional[str]]:
    """
    Evaluates temperature thresholds and handling windows according to food safety standards.
    Returns (status, safety_notes).
    """
    now = datetime.now(timezone.utc)
    # Ensure timezone aware comparison
    deadline = (
        pickup_deadline
        if pickup_deadline.tzinfo
        else pickup_deadline.replace(tzinfo=timezone.utc)
    )

    if deadline <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pickup deadline must be set in the future.",
        )

    # 1. Hot Holding Safety Check: minimum 60.0°C (FDA / Food Safety standard)
    if storage_condition == "hot_holding":
        if measured_temp_c is not None and measured_temp_c < 60.0:
            notes = (
                f"Safety Hold: Hot food measured at {measured_temp_c}°C, "
                f"which is below the safe holding threshold (60.0°C). "
                f"Requires inspection before distribution."
            )
            return "safety_hold", notes

    # 2. Refrigerated / Cold Holding Safety Check: maximum 8.0°C
    if storage_condition == "refrigerated":
        if measured_temp_c is not None and measured_temp_c > 8.0:
            notes = (
                f"Safety Hold: Chilled food measured at {measured_temp_c}°C, "
                f"which exceeds the maximum chilled holding threshold (8.0°C)."
            )
            return "safety_hold", notes

    return "available", safety_notes


@router.post(
    "",
    response_model=ResponseEnvelope[DonationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Post surplus food donation (Donors & Admins)",
)
async def create_donation(
    payload: CreateDonationRequest,
    current_user: User = Depends(require_role("donor", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[DonationResponse]:
    """
    Post surplus food with quantity, storage conditions, allergens, and safety checks.
    Evaluates temperatures and places items in safety_hold if threshold rules are violated.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a registered organization to post surplus food.",
        )

    # Fetch donor organization name
    org_result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    donor_org = org_result.scalar_one_or_none()
    if not donor_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated organization could not be found.",
        )

    # Evaluate food safety rules
    initial_status, safety_notes = evaluate_food_safety(
        storage_condition=payload.storage_condition,
        measured_temp_c=payload.measured_temp_c,
        pickup_deadline=payload.pickup_deadline,
        safety_notes=payload.safety_notes,
    )

    donation = Donation(
        donor_organization_id=donor_org.id,
        title=payload.title,
        description=payload.description,
        food_type=payload.food_type,
        quantity_kg=payload.quantity_kg,
        portions=payload.portions,
        preparation_time=payload.preparation_time,
        pickup_deadline=payload.pickup_deadline,
        storage_condition=payload.storage_condition,
        allergens=payload.allergens,
        measured_temp_c=payload.measured_temp_c,
        status=initial_status,
        safety_notes=safety_notes,
    )
    db.add(donation)
    await db.flush()

    # Record creation in immutable audit log
    audit_entry = AuditLog(
        entity_type="donation",
        entity_id=donation.id,
        action="DONATION_CREATED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={
            "title": donation.title,
            "quantity_kg": donation.quantity_kg,
            "portions": donation.portions,
            "status": donation.status,
            "food_type": donation.food_type,
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(donation)

    # Automated Trigger: Match with verified recipients and dispatch notifications
    if initial_status == "available":
        try:
            from app.services.matching_engine import matching_engine
            await matching_engine.match_and_persist_donation(donation.id, db, notify=True)
            await db.refresh(donation)
        except Exception as e:
            logger.warning(f"Automated matching engine background execution encountered an issue: {e}")

    # Real-time WebSocket broadcast to subscribed NGOs and Donors
    try:
        from app.services.websocket_manager import ws_manager
        await ws_manager.broadcast_to_channel(
            "donations",
            {
                "type": "DONATION_CREATED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "donation_id": str(donation.id),
                    "title": donation.title,
                    "food_type": donation.food_type,
                    "quantity_kg": float(donation.quantity_kg),
                    "portions": donation.portions,
                    "storage_condition": donation.storage_condition,
                    "donor_name": donor_org.name,
                    "status": donation.status,
                },
            },
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket broadcast error: {ws_err}")

    response_data = DonationResponse.model_validate(donation)
    response_data.donor_organization_name = donor_org.name

    status_msg = (
        "Surplus listing created and matched with eligible recipients."
        if donation.status == "matched"
        else (
            "Surplus listing created and available for matching."
            if initial_status == "available"
            else "Surplus listing created but held for safety inspection."
        )
    )

    return ResponseEnvelope[DonationResponse](
        success=True,
        message=status_msg,
        data=response_data,
    )


@router.get(
    "",
    response_model=ResponseEnvelope[List[DonationResponse]],
    summary="List donations with role-based filtering",
)
async def list_donations(
    status_filter: Optional[str] = Query(None, alias="status"),
    food_type_filter: Optional[str] = Query(None, alias="food_type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[List[DonationResponse]]:
    """List surplus food donations matching caller role and query filters."""
    query = (
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .order_by(desc(Donation.created_at))
        .limit(limit)
        .offset(offset)
    )

    # Role-based scoping:
    # Donors primarily see their own listings
    if current_user.role == "donor":
        query = query.where(Donation.donor_organization_id == current_user.organization_id)
    # NGOs see open and claimable listings
    elif current_user.role == "ngo":
        if not status_filter:
            query = query.where(Donation.status.in_(["available", "matched"]))

    if status_filter:
        query = query.where(Donation.status == status_filter)

    if food_type_filter:
        query = query.where(Donation.food_type == food_type_filter)

    result = await db.execute(query)
    donations = result.scalars().all()

    response_list = []
    for d in donations:
        item = DonationResponse.model_validate(d)
        if d.donor_organization:
            item.donor_organization_name = d.donor_organization.name
        response_list.append(item)

    return ResponseEnvelope[List[DonationResponse]](
        success=True,
        message=f"Retrieved {len(response_list)} donation records.",
        data=response_list,
    )


@router.get(
    "/{donation_id}",
    response_model=ResponseEnvelope[DonationResponse],
    summary="Get single donation by ID",
)
async def get_donation(
    donation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[DonationResponse]:
    """Retrieve detailed specification and safety status for a single donation."""
    result = await db.execute(
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.id == donation_id)
    )
    donation = result.scalar_one_or_none()

    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation not found.",
        )

    # Permission check: Donors can only inspect their own listings unless public/matched
    if (
        current_user.role == "donor"
        and donation.donor_organization_id != current_user.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: this donation belongs to another organization.",
        )

    response_data = DonationResponse.model_validate(donation)
    if donation.donor_organization:
        response_data.donor_organization_name = donation.donor_organization.name

    return ResponseEnvelope[DonationResponse](
        success=True,
        message="Donation retrieved.",
        data=response_data,
    )


@router.put(
    "/{donation_id}",
    response_model=ResponseEnvelope[DonationResponse],
    summary="Update an available donation listing",
)
async def update_donation(
    donation_id: uuid.UUID,
    payload: UpdateDonationRequest,
    current_user: User = Depends(require_role("donor", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[DonationResponse]:
    """Update details for an unclaimed donation."""
    result = await db.execute(
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.id == donation_id)
    )
    donation = result.scalar_one_or_none()

    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation not found.",
        )

    if (
        current_user.role == "donor"
        and donation.donor_organization_id != current_user.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit donations posted by your organization.",
        )

    # Invariant: cannot edit once claimed or in transit
    if donation.status not in ("available", "matched", "safety_hold"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit donation in '{donation.status}' state. It is already accepted or in transit.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if hasattr(donation, field) and val is not None:
            setattr(donation, field, val)

    # Re-evaluate food safety if conditions changed
    if payload.storage_condition or payload.measured_temp_c is not None or payload.pickup_deadline:
        new_status, new_notes = evaluate_food_safety(
            storage_condition=donation.storage_condition,
            measured_temp_c=donation.measured_temp_c,
            pickup_deadline=donation.pickup_deadline,
            safety_notes=donation.safety_notes,
        )
        donation.status = new_status
        donation.safety_notes = new_notes

    audit_entry = AuditLog(
        entity_type="donation",
        entity_id=donation.id,
        action="DONATION_UPDATED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after=update_data,
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(donation)

    response_data = DonationResponse.model_validate(donation)
    if donation.donor_organization:
        response_data.donor_organization_name = donation.donor_organization.name

    return ResponseEnvelope[DonationResponse](
        success=True,
        message="Donation updated successfully.",
        data=response_data,
    )


@router.post(
    "/{donation_id}/cancel",
    response_model=ResponseEnvelope[DonationResponse],
    summary="Cancel surplus donation (Donors & Admins)",
)
async def cancel_donation(
    donation_id: uuid.UUID,
    payload: CancelDonationRequest,
    current_user: User = Depends(require_role("donor", "admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[DonationResponse]:
    """Cancel an open surplus food donation."""
    result = await db.execute(
        select(Donation)
        .options(selectinload(Donation.donor_organization))
        .where(Donation.id == donation_id)
    )
    donation = result.scalar_one_or_none()

    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation not found.",
        )

    if (
        current_user.role == "donor"
        and donation.donor_organization_id != current_user.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel donations created by your organization.",
        )

    if donation.status not in ("available", "matched", "safety_hold"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot cancel donation in status '{donation.status}'. "
                f"Once accepted or assigned, cancellation requires administrative dispatch coordination."
            ),
        )

    donation.status = "cancelled"
    donation.safety_notes = f"Cancelled by donor: {payload.reason}"

    audit_entry = AuditLog(
        entity_type="donation",
        entity_id=donation.id,
        action="DONATION_CANCELLED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        payload_after={"reason": payload.reason, "status": "cancelled"},
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(donation)

    response_data = DonationResponse.model_validate(donation)
    if donation.donor_organization:
        response_data.donor_organization_name = donation.donor_organization.name

    return ResponseEnvelope[DonationResponse](
        success=True,
        message=f"Donation cancelled: {payload.reason}",
        data=response_data,
    )
