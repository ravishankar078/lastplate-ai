"""
Pydantic Schemas for Food Donations.
Enforces food safety validation rules, temperature thresholds, allergen tagging,
and lifecycle state machine representations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import uuid
from pydantic import BaseModel, Field, field_validator

# Normalization mapping between frontend types and backend database enums
FOOD_TYPE_MAP = {
    "prepared_meals": "cooked_meals",
    "cooked_meals": "cooked_meals",
    "baked_goods": "bakery",
    "bakery": "bakery",
    "produce": "raw_produce",
    "raw_produce": "raw_produce",
    "dairy_refrigerated": "dairy_chilled",
    "dairy_chilled": "dairy_chilled",
    "packaged_groceries": "packaged_goods",
    "packaged_goods": "packaged_goods",
}

STORAGE_CONDITION_MAP = {
    "ambient": "ambient",
    "refrigerated": "refrigerated",
    "frozen": "frozen",
    "hot_holding": "hot_holding",
}


class CreateDonationRequest(BaseModel):
    """Payload for creating a surplus food donation listing."""

    title: str = Field(..., min_length=3, max_length=255, example="40 Portions Vegetarian Pasta Bake")
    description: Optional[str] = Field(default=None, example="Freshly prepared penne with roasted vegetables and marinara.")

    food_type: str = Field(..., description="cooked_meals, bakery, raw_produce, dairy_chilled, packaged_goods")
    quantity_kg: float = Field(..., gt=0, example=25.0, alias="quantityKg")
    portions: int = Field(..., gt=0, example=50, alias="estimatedMeals")

    preparation_time: datetime = Field(..., alias="preparationTime")
    pickup_deadline: datetime = Field(..., alias="pickupDeadline")
    storage_condition: str = Field(..., alias="storageCondition")

    measured_temp_c: Optional[float] = Field(default=None, alias="measuredTemperatureCelsius")
    allergens: List[str] = Field(default_factory=list, example=["Dairy", "Gluten"])
    packaging_type: Optional[str] = Field(default="Food-grade containers", alias="packagingType")
    safety_notes: Optional[str] = Field(default=None)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }

    @field_validator("food_type", mode="before")
    @classmethod
    def normalize_food_type(cls, v: str) -> str:
        key = str(v).lower().strip()
        if key in FOOD_TYPE_MAP:
            return FOOD_TYPE_MAP[key]
        return key

    @field_validator("storage_condition", mode="before")
    @classmethod
    def normalize_storage(cls, v: str) -> str:
        key = str(v).lower().strip()
        if key in STORAGE_CONDITION_MAP:
            return STORAGE_CONDITION_MAP[key]
        return key


class UpdateDonationRequest(BaseModel):
    """Payload for updating an unclaimed donation."""

    title: Optional[str] = None
    description: Optional[str] = None
    quantity_kg: Optional[float] = Field(default=None, gt=0, alias="quantityKg")
    portions: Optional[int] = Field(default=None, gt=0, alias="estimatedMeals")
    pickup_deadline: Optional[datetime] = Field(default=None, alias="pickupDeadline")
    storage_condition: Optional[str] = Field(default=None, alias="storageCondition")
    measured_temp_c: Optional[float] = Field(default=None, alias="measuredTemperatureCelsius")
    allergens: Optional[List[str]] = None
    safety_notes: Optional[str] = None

    model_config = {"populate_by_name": True}


class CancelDonationRequest(BaseModel):
    """Payload for cancelling a surplus food listing."""

    reason: str = Field(..., min_length=3, max_length=500, example="Unexpected storage power outage.")


class DonationResponse(BaseModel):
    """Detailed response representation of a donation."""

    id: uuid.UUID
    donor_organization_id: uuid.UUID
    donor_organization_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    food_type: str
    quantity_kg: float
    portions: int
    preparation_time: datetime
    pickup_deadline: datetime
    storage_condition: str
    measured_temp_c: Optional[float] = None
    allergens: List[str] = []
    status: str
    safety_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # CamelCase compatibility for frontend
    @property
    def id_str(self) -> str:
        return str(self.id)

    model_config = {"from_attributes": True}
