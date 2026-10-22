"""
Pydantic Schemas for Authentication, Registration, and User/Organization Profiles.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, EmailStr, Field


class UserLogin(BaseModel):
    """Payload for user authentication."""

    email: EmailStr = Field(..., example="chef@grandbistro.org")
    password: str = Field(..., min_length=6, example="LastPlate#2026")


class UserRegister(BaseModel):
    """Payload for registering a new user and optional organization."""

    email: EmailStr = Field(..., example="manager@citycanteen.org")
    password: str = Field(..., min_length=8, example="SecurePass#2026")
    full_name: str = Field(..., min_length=2, example="Vikram Seth")
    phone: Optional[str] = Field(default=None, example="+91 98765 12345")
    role: str = Field(..., pattern="^(donor|ngo|volunteer)$", example="donor")

    # Optional Organization Details (for donors and NGOs)
    organization_name: Optional[str] = Field(default=None, example="City Central Canteen")
    org_type: Optional[str] = Field(
        default=None,
        example="canteen",
        description="restaurant, bakery, caterer, canteen, event_organizer, ngo_shelter, community_kitchen, food_bank",
    )
    address: Optional[str] = Field(default=None, example="14 North Boulevard")
    postal_code: Optional[str] = Field(default=None, example="560005")
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0, example=12.9730)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0, example=77.6010)
    max_daily_meals: Optional[int] = Field(default=100, ge=1, example=200)
    refrigeration_available: Optional[bool] = Field(default=True)


class OrganizationResponse(BaseModel):
    """Organization profile response representation."""

    id: uuid.UUID
    name: str
    org_type: str
    address: str
    postal_code: str
    latitude: float
    longitude: float
    contact_phone: str
    contact_email: str
    is_verified: bool
    verification_notes: Optional[str] = None
    max_daily_meals: int
    refrigeration_available: bool
    operating_hours: Optional[Dict[str, Any]] = None
    dietary_capabilities: Optional[List[str]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """User profile response representation."""

    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    organization_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Access token and user profile returned upon successful authentication."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    organization: Optional[OrganizationResponse] = None


class VerifyOrganizationPayload(BaseModel):
    """Administrative payload for verifying or rejecting an organization."""

    is_verified: bool = Field(..., description="Set True to approve or False to revoke/reject.")
    verification_notes: Optional[str] = Field(
        default=None,
        description="Reason or inspector remarks for the approval or rejection.",
        example="Tax exemption certificate and food hygiene audit verified.",
    )
