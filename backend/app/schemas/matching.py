"""
Pydantic Schemas for AI Match Recommendations and Atomic Acceptance Workflow.
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
