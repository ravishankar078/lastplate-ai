"""
Pydantic Schemas for OR-Tools Route Optimization and Dispatch.
"""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field


class OptimizeOrderInput(BaseModel):
    pickup_id: str
    donation_id: str
    title: str
    donor_name: str
    donor_address: str
    donor_latitude: float
    donor_longitude: float
    recipient_name: str
    recipient_address: str
    recipient_latitude: float
    recipient_longitude: float
    quantity_kg: float = Field(gt=0)
    portions: int = Field(gt=0)
    storage_condition: str = "ambient"
    pickup_window_start_minutes: int = 0
    pickup_window_end_minutes: int = 120
    delivery_window_start_minutes: int = 30
    delivery_window_end_minutes: int = 240
    max_transit_minutes: int = 120


class OptimizeVehicleInput(BaseModel):
    vehicle_id: str
    courier_name: str
    vehicle_type: str = "bicycle"  # 'bicycle', 'car', 'van'
    capacity_kg: float = Field(default=30.0, gt=0)
    start_latitude: float
    start_longitude: float
    start_address: str
    shift_start_minutes: int = 0
    shift_end_minutes: int = 480


class OptimizeRouteRequest(BaseModel):
    orders: List[OptimizeOrderInput]
    vehicles: List[OptimizeVehicleInput]
    depot_latitude: Optional[float] = None
    depot_longitude: Optional[float] = None
    depot_address: Optional[str] = "Central Hub, Metro Core"
    time_limit_seconds: int = Field(default=5, ge=1, le=30)


class OptimizedStopResponse(BaseModel):
    stop_sequence: int
    stop_type: str  # 'pickup' or 'delivery'
    pickup_id: str
    organization_name: str
    address: str
    latitude: float
    longitude: float
    arrival_time_minutes: int
    departure_time_minutes: int
    cumulative_load_kg: float
    quantity_kg: float
    portions: int
    storage_condition: str
    food_safety_instructions: str


class OptimizedRoutePlanResponse(BaseModel):
    vehicle_id: str
    courier_name: str
    total_distance_km: float
    total_duration_minutes: int
    stops: List[OptimizedStopResponse]
    is_feasible: bool = True


class OptimizeRouteResultResponse(BaseModel):
    routes: List[OptimizedRoutePlanResponse]
    unassigned_order_ids: List[str]
    total_distance_km: float
    total_duration_minutes: int
    solver_status: str


class AutoDispatchResponse(BaseModel):
    assigned_routes_count: int
    assigned_orders_count: int
    unassigned_orders_count: int
    total_distance_km: float
    total_duration_minutes: int
    routes: List[OptimizedRoutePlanResponse]
    message: str
