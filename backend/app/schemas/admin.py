"""
Pydantic Schemas for Administrative Analytics, Compliance, and Audit Trails.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class DailyImpactTrend(BaseModel):
    """Daily operational impact metric data point."""
    date: str
    meals: int
    weight_kg: float
    co2_kg: float


class AdminAnalyticsOverview(BaseModel):
    """Executive KPI summary and operational analytics computed from real database records."""
    total_donations: int = Field(..., description="Total food donations created in platform history")
    completed_donations: int = Field(..., description="Successfully delivered food rescue operations")
    active_donations: int = Field(..., description="Currently active or pending donations in progress")
    total_meals_rescued: int = Field(..., description="Calculated meal portions redistributed")
    total_quantity_kg: float = Field(..., description="Gross weight in kilograms of rescued food")
    co2_avoided_kg: float = Field(..., description="Avoided greenhouse gas emissions (2.5 kg CO2e / kg food)")
    landfill_diversion_rate: float = Field(..., description="Percentage of surplus successfully diverted from landfills")
    
    active_donors: int = Field(..., description="Count of registered donor organizations")
    verified_ngos: int = Field(..., description="Count of verified recipient NGO organizations")
    active_volunteers: int = Field(..., description="Count of registered active volunteer couriers")
    
    avg_pickup_time_minutes: float = Field(..., description="Average minutes elapsed from offer to collection")
    food_safety_compliance_rate: float = Field(..., description="Percentage of handovers complying with temperature SOP")
    
    category_breakdown: Dict[str, int] = Field(default_factory=dict, description="Donation count grouped by food type")
    status_breakdown: Dict[str, int] = Field(default_factory=dict, description="Donation count grouped by lifecycle status")
    daily_trends: List[DailyImpactTrend] = Field(default_factory=list, description="Historical 7-day trend metrics")
    
    is_sample_baseline: bool = Field(False, description="Indicates whether minimum baseline metrics are merged")


class AuditLogItem(BaseModel):
    """Serialized audit log entry with resolved actor details."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    action: str
    actor_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = "System Automation"
    actor_role: Optional[str] = "system"
    payload_before: Optional[Dict[str, Any]] = None
    payload_after: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime


class AdminOrganizationItem(BaseModel):
    """Organization item enriched with operational counts for administrative management."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    org_type: str
    category: str
    address: str
    postal_code: str
    contact_phone: str
    contact_email: str
    is_verified: bool
    verification_notes: Optional[str] = None
    created_at: datetime
    active_posts_count: int = 0
    completed_rescues_count: int = 0


class FlaggedDonationItem(BaseModel):
    """Donation held for safety review or quarantine."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    donor_organization_id: uuid.UUID
    donor_name: str
    title: str
    food_type: str
    quantity_kg: float
    portions: int
    storage_condition: str
    measured_temp_c: Optional[float] = None
    status: str
    safety_notes: Optional[str] = None
    created_at: datetime


class ReviewFlaggedDonationPayload(BaseModel):
    """Administrative action on a held donation."""
    action: str = Field(..., description="'release' to restore to available, or 'quarantine_reject' to cancel")
    admin_notes: str = Field(..., min_length=3, description="Regulatory rationale for the review outcome")
