"""
Authentication and Session API Endpoints.
Supports standard JSON login, OAuth2 form compatibility, self-registration,
and current user profile resolution.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import AuditLog, Organization, User
from app.schemas.auth import (
    OrganizationResponse,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.post(
    "/login",
    response_model=ResponseEnvelope[TokenResponse],
    summary="Authenticate user and issue JWT bearer token",
)
async def login(
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[TokenResponse]:
    """Authenticate with email and password, returning user profile and access token."""
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    # Fetch linked organization if present
    org_response = None
    if user.organization_id:
        org_result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        org = org_result.scalar_one_or_none()
        if org:
            org_response = OrganizationResponse.model_validate(org)

    token = create_access_token(
        subject=user.id,
        role=user.role,
        organization_id=str(user.organization_id) if user.organization_id else None,
    )

    data = TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        organization=org_response,
    )
    return ResponseEnvelope[TokenResponse](
        success=True,
        message=f"Welcome back, {user.full_name}!",
        data=data,
    )


@router.post(
    "/token",
    summary="OAuth2 compatible token login for Swagger UI documentation",
    include_in_schema=True,
)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """OAuth2 password form login handler for Swagger UI."""
    result = await db.execute(
        select(User).where(User.email == form_data.username.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        subject=user.id,
        role=user.role,
        organization_id=str(user.organization_id) if user.organization_id else None,
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post(
    "/register",
    response_model=ResponseEnvelope[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user and optional organization",
)
async def register(
    payload: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[TokenResponse]:
    """Register a new Food Donor, NGO, or Volunteer."""
    # Check if email is already registered
    existing_user_result = await db.execute(
        select(User).where(User.email == payload.email.lower())
    )
    if existing_user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    organization = None
    # Create organization if role is donor or ngo and org name provided
    if payload.role in ("donor", "ngo") and payload.organization_name:
        default_org_type = (
            "restaurant" if payload.role == "donor" else "ngo_shelter"
        )
        organization = Organization(
            name=payload.organization_name,
            org_type=payload.org_type or default_org_type,
            address=payload.address or "Address pending verification",
            postal_code=payload.postal_code or "560001",
            latitude=payload.latitude if payload.latitude is not None else 12.9716,
            longitude=payload.longitude if payload.longitude is not None else 77.5946,
            contact_phone=payload.phone or "+91 00000 00000",
            contact_email=payload.email.lower(),
            is_verified=False,  # Requires administrative verification
            verification_notes="Registration submitted. Pending admin review.",
            max_daily_meals=payload.max_daily_meals or 100,
            refrigeration_available=payload.refrigeration_available
            if payload.refrigeration_available is not None
            else True,
        )
        db.add(organization)
        await db.flush()

    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        is_active=True,
        is_verified=False,
        organization_id=organization.id if organization else None,
    )
    db.add(new_user)
    await db.flush()

    # Record registration in immutable audit log
    audit_entry = AuditLog(
        entity_type="user",
        entity_id=new_user.id,
        action="USER_REGISTERED",
        actor_id=new_user.id,
        actor_role=new_user.role,
        payload_after={
            "email": new_user.email,
            "role": new_user.role,
            "organization_id": str(organization.id) if organization else None,
        },
        ip_address="127.0.0.1",
    )
    db.add(audit_entry)
    await db.commit()

    token = create_access_token(
        subject=new_user.id,
        role=new_user.role,
        organization_id=str(organization.id) if organization else None,
    )

    data = TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
        organization=OrganizationResponse.model_validate(organization)
        if organization
        else None,
    )
    return ResponseEnvelope[TokenResponse](
        success=True,
        message="Registration successful. Welcome to LastPlate!",
        data=data,
    )


@router.get(
    "/me",
    response_model=ResponseEnvelope[TokenResponse],
    summary="Get current authenticated user profile and organization",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[TokenResponse]:
    """Retrieve the currently authenticated user's profile and organization."""
    org_response = None
    if current_user.organization_id:
        org_result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        org = org_result.scalar_one_or_none()
        if org:
            org_response = OrganizationResponse.model_validate(org)

    token = create_access_token(
        subject=current_user.id,
        role=current_user.role,
        organization_id=str(current_user.organization_id)
        if current_user.organization_id
        else None,
    )

    data = TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
        organization=org_response,
    )
    return ResponseEnvelope[TokenResponse](
        success=True,
        message="Current session verified.",
        data=data,
    )
