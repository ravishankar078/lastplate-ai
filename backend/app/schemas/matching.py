"""
Pydantic Schemas for AI Match Recommendations, Recipient Ranking, and Atomic Acceptance.
Enforces Section 4 explainable scoring and Section 8 atomic claim contracts.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class ScoreBreakdownSchema(BaseModel):
    """Explainable scoring components matching the 35/30/20/15 heuristic weights."""

    distanceScore: float = Field(..., description="Proximity score (35% weight)")
    urgencyScore: float = Field(..., description="Time window urgency score (30% weight)")
    capacityScore: float = Field(..., description="Receiving capacity score (20% weight)")
    reliabilityScore: float = Field(..., description="Historical reliability score (15% weight)")
    totalScore: float = Field(..., description="Composite weighted recommendation score (0-100)")


class MatchRecommendationResponse(BaseModel):
    """Candidate surplus donation offer tailored to a specific recipient organization."""

    id: str
    donationId: str
    donation: Dict[str, Any]
    recipientOrgId: str
    scoreBreakdown: ScoreBreakdownSchema
    explanation: str
    estimatedTravelTimeMinutes: int
    roadDistanceKm: float
    status: str
    expiresAt: str
    createdAt: str


class RecipientMatchResponse(BaseModel):
    """Candidate recipient NGO recommendation for a specific surplus donation."""

    recipient_id: uuid.UUID
    recipient_name: str
    org_type: str
    address: str
    contact_phone: str
    distance_km: float
    estimated_travel_time_minutes: int
    max_daily_meals: int
    refrigeration_available: bool
    score: float
    score_breakdown: ScoreBreakdownSchema
    explanation: str
    status: str = "suggested"
    match_id: Optional[uuid.UUID] = None


class DonationRecipientsResponse(BaseModel):
    """Ranked eligible recipients for a specific posted donation."""

    donation_id: uuid.UUID
    title: str
    food_type: str
    quantity_kg: float
    portions: int
    pickup_deadline: datetime
    recipients: List[RecipientMatchResponse]
    total_eligible: int


class SplitDonationAllocationItem(BaseModel):
    """Individual recipient allocation within a split-donation redistribution plan."""

    recipient_id: uuid.UUID
    recipient_name: str
    allocated_portions: int
    allocated_quantity_kg: float
    percentage_of_total: float
    distance_km: float
    score: float


class SplitDonationPlanResponse(BaseModel):
    """Multi-recipient split donation distribution plan."""

    donation_id: uuid.UUID
    total_portions: int
    total_quantity_kg: float
    is_split_recommended: bool
    allocated_portions: int
    unallocated_portions: int
    allocations: List[SplitDonationAllocationItem]
    notes: str


class MatchRecordResponse(BaseModel):
    """Representation of a persistent Match database record."""

    id: uuid.UUID
    donation_id: uuid.UUID
    recipient_organization_id: uuid.UUID
    recipient_name: Optional[str] = None
    score: float
    score_breakdown: Dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TriggerMatchingResponse(BaseModel):
    """Result summary of automated or on-demand matching engine execution."""

    donation_id: uuid.UUID
    matches_generated: int
    top_recipient_name: Optional[str] = None
    top_score: Optional[float] = None
    notifications_dispatched: int
    status: str


class AcceptMatchRequest(BaseModel):
    """Payload for atomically accepting a surplus donation offer."""

    donation_id: uuid.UUID = Field(..., alias="donationId")
    recipient_org_id: Optional[uuid.UUID] = Field(default=None, alias="recipientOrgId")

    model_config = {"populate_by_name": True}


class DeclineMatchRequest(BaseModel):
    """Payload for declining a surplus donation offer."""

    donation_id: uuid.UUID = Field(..., alias="donationId")
    recipient_org_id: Optional[uuid.UUID] = Field(default=None, alias="recipientOrgId")
    reason: Optional[str] = Field(default=None, example="Already at maximum meal capacity for this shift.")

    model_config = {"populate_by_name": True}


class AcceptMatchResponse(BaseModel):
    """Operational confirmation payload returned upon successful atomic claim."""

    success: bool = True
    donation_id: uuid.UUID
    recipient_org_id: uuid.UUID
    pickup_id: uuid.UUID
    status: str = "accepted"
    verification_pin: str
    scheduled_pickup_time: Optional[datetime] = None
    message: str
