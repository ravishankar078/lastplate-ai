"""
Pydantic Schemas for Volunteer Operations and Mobile Handover Workflows.
Enforces typed contracts for job queue, route navigation, and QR/PIN handover validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class VolunteerJobResponse(BaseModel):
    """Available surplus food pickup job in the volunteer dispatch queue."""

    pickup_id: uuid.UUID
    donation_id: uuid.UUID
    title: str
    description: Optional[str] = None
    food_type: str
    quantity_kg: float
    portions: int
    storage_condition: str
    donor_name: str
    donor_address: str
    donor_latitude: float
    donor_longitude: float
    donor_phone: Optional[str] = None
    recipient_name: str
    recipient_address: str
    recipient_latitude: float
    recipient_longitude: float
    recipient_phone: Optional[str] = None
    scheduled_pickup_time: datetime
    pickup_deadline: datetime
    road_distance_km: float
    estimated_duration_minutes: int
    status: str = "pending_volunteer"


class RouteStopResponse(BaseModel):
    """Detailed stop instruction in a volunteer collection and delivery route."""

    id: uuid.UUID
    route_id: uuid.UUID
    pickup_id: uuid.UUID
    stop_type: str = Field(..., description="'pickup' from donor or 'delivery' to recipient")
    stop_sequence: int
    organization_name: str
    address: str
    contact_phone: Optional[str] = None
    latitude: float
    longitude: float
    arrival_window_start: datetime
    arrival_window_end: datetime
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    status: str = Field(..., description="'pending', 'arrived', 'completed', 'skipped'")
    verification_method: str = "PIN"
    food_safety_instructions: str
    portions: int
    quantity_kg: float
    storage_condition: str
    verification_pin: Optional[str] = None  # Included for development / volunteer offline validation


class ActiveRouteResponse(BaseModel):
    """Volunteer active multi-stop collection and delivery plan."""

    route_id: uuid.UUID
    volunteer_id: uuid.UUID
    volunteer_name: str
    status: str
    total_distance_km: float
    total_duration_minutes: int
    stops: List[RouteStopResponse]


class VerifyHandoverRequest(BaseModel):
    """Verification payload for confirming food collection or delivery."""

    stop_id: uuid.UUID
    pickup_id: uuid.UUID
    verification_code: str = Field(..., description="6-digit backup PIN or cryptographic token")
    actual_temp_c: Optional[float] = Field(None, description="Optional food temperature check on collection")
    notes: Optional[str] = None


class VerifyHandoverResponse(BaseModel):
    """Operational confirmation after successful handover verification."""

    success: bool = True
    verified_at: datetime
    stop_id: uuid.UUID
    stop_type: str
    pickup_status: str
    donation_status: str
    message: str
    is_route_completed: bool = False


class ReportIssueRequest(BaseModel):
    """Volunteer exception or safety issue report."""

    pickup_id: uuid.UUID
    stop_id: Optional[uuid.UUID] = None
    issue_type: str = Field(
        ...,
        description="e.g. 'delay', 'temperature_out_of_spec', 'packaging_damaged', 'refused_by_donor', 'other'",
    )
    delay_minutes: Optional[int] = None
    measured_temp_c: Optional[float] = None
    description: str


class ReportIssueResponse(BaseModel):
    """Acknowledgment of reported operational issue or safety flag."""

    success: bool = True
    pickup_id: uuid.UUID
    safety_hold_applied: bool
    message: str


class VolunteerHistoryItem(BaseModel):
    """Summary of a completed surplus food rescue mission."""

    pickup_id: uuid.UUID
    completed_at: datetime
    donation_title: str
    donor_name: str
    recipient_name: str
    quantity_kg: float
    portions: int
    distance_km: float


class VolunteerImpactSummary(BaseModel):
    """Cumulative volunteer operational metrics and environmental impact."""

    total_rescues: int
    total_portions: int
    total_quantity_kg: float
    co2_avoided_kg: float
    reliability_rating: float
    history: List[VolunteerHistoryItem]
