"""
Organization Management and Verification API Endpoints.
Allows administrators to inspect pending registrations and verify/reject organizations.
"""

from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, require_role
from app.db.session import get_db
from app.models import AuditLog, Organization, User
from app.schemas.auth import OrganizationResponse, VerifyOrganizationPayload
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.get(
    "/pending",
    response_model=ResponseEnvelope[List[OrganizationResponse]],
    summary="List organizations awaiting administrative verification (Admin only)",
)
async def list_pending_organizations(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[List[OrganizationResponse]]:
    """Retrieve all food donor and recipient organizations pending verification review."""
    result = await db.execute(
        select(Organization)
        .where(Organization.is_verified == False)
        .order_by(Organization.created_at.desc())
    )
    organizations = result.scalars().all()
    org_list = [
        OrganizationResponse.model_validate(org) for org in organizations
    ]

    return ResponseEnvelope[List[OrganizationResponse]](
        success=True,
        message=f"Retrieved {len(org_list)} pending organizations.",
        data=org_list,
    )


@router.get(
    "/{org_id}",
    response_model=ResponseEnvelope[OrganizationResponse],
    summary="Get organization details by ID",
)
async def get_organization(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ResponseEnvelope[OrganizationResponse]:
    """Retrieve public and operational profile for a specific organization."""
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    return ResponseEnvelope[OrganizationResponse](
        success=True,
        message="Organization profile retrieved.",
        data=OrganizationResponse.model_validate(org),
    )


@router.post(
    "/{org_id}/verify",
    response_model=ResponseEnvelope[OrganizationResponse],
    summary="Approve or reject organization verification (Admin only)",
)
async def verify_organization(
    org_id: uuid.UUID,
    payload: VerifyOrganizationPayload,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[OrganizationResponse]:
    """Admin workflow: approve or reject organization credentials and update associated users."""
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    prev_verified = org.is_verified
    org.is_verified = payload.is_verified
    if payload.verification_notes:
        org.verification_notes = payload.verification_notes

    # Update verification status for all users belonging to this organization
    await db.execute(
        update(User)
        .where(User.organization_id == org.id)
        .values(is_verified=payload.is_verified)
    )

    # Record verification in immutable audit log
    audit_entry = AuditLog(
        entity_type="organization",
        entity_id=org.id,
        action="ORGANIZATION_VERIFIED" if payload.is_verified else "ORGANIZATION_REJECTED",
        actor_id=admin.id,
        actor_role=admin.role,
        payload_before={"is_verified": prev_verified},
        payload_after={
            "is_verified": payload.is_verified,
            "verification_notes": payload.verification_notes,
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(org)

    status_str = "verified and approved" if payload.is_verified else "verification rejected"
    return ResponseEnvelope[OrganizationResponse](
        success=True,
        message=f"Organization '{org.name}' has been {status_str}.",
        data=OrganizationResponse.model_validate(org),
    )
