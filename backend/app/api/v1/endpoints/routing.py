"""
API Endpoints for Google OR-Tools Route Optimization and Fleet Auto-Dispatch.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.schemas.common import ResponseEnvelope
from app.db.session import get_db
from app.models import (
    AuditLog,
    Donation,
    Organization,
    Pickup,
    Route,
    RouteStop,
    User,
)
from app.schemas.routing import (
    AutoDispatchResponse,
    OptimizeOrderInput,
    OptimizeRouteRequest,
    OptimizeRouteResultResponse,
    OptimizedRoutePlanResponse,
    OptimizedStopResponse,
)
from app.services.route_optimizer import (
    OrderPair,
    RouteOptimizer,
    VehicleInfo,
)

router = APIRouter()


@router.post(
    "/optimize",
    response_model=ResponseEnvelope[OptimizeRouteResultResponse],
    summary="Optimize Route Plan (OR-Tools VRP)",
)
async def optimize_route(
    payload: OptimizeRouteRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Directly invokes the Google OR-Tools PDPTW solver with custom orders and vehicles.
    Enforces pickup precedence, vehicle capacity, time windows, and food safety transit limits.
    """
    optimizer = RouteOptimizer(time_limit_seconds=payload.time_limit_seconds)

    order_pairs: List[OrderPair] = [
        OrderPair(
            pickup_id=o.pickup_id,
            donation_id=o.donation_id,
            title=o.title,
            donor_name=o.donor_name,
            donor_address=o.donor_address,
            donor_lat=o.donor_latitude,
            donor_lng=o.donor_longitude,
            recipient_name=o.recipient_name,
            recipient_address=o.recipient_address,
            recipient_lat=o.recipient_latitude,
            recipient_lng=o.recipient_longitude,
            quantity_kg=o.quantity_kg,
            portions=o.portions,
            storage_condition=o.storage_condition,
            pickup_window_start=o.pickup_window_start_minutes,
            pickup_window_end=o.pickup_window_end_minutes,
            delivery_window_start=o.delivery_window_start_minutes,
            delivery_window_end=o.delivery_window_end_minutes,
            max_transit_minutes=o.max_transit_minutes,
        )
        for o in payload.orders
    ]

    vehicles: List[VehicleInfo] = [
        VehicleInfo(
            vehicle_id=v.vehicle_id,
            courier_name=v.courier_name,
            vehicle_type=v.vehicle_type,
            capacity_kg=v.capacity_kg,
            start_lat=v.start_latitude,
            start_lng=v.start_longitude,
            start_address=v.start_address,
            shift_start_minutes=v.shift_start_minutes,
            shift_end_minutes=v.shift_end_minutes,
        )
        for v in payload.vehicles
    ]

    result = optimizer.solve(
        orders=order_pairs,
        vehicles=vehicles,
        depot_lat=payload.depot_latitude,
        depot_lng=payload.depot_longitude,
        depot_address=payload.depot_address or "Central Hub, Metro Core",
    )

    routes_data = [
        OptimizedRoutePlanResponse(
            vehicle_id=r.vehicle_id,
            courier_name=r.courier_name,
            total_distance_km=r.total_distance_km,
            total_duration_minutes=r.total_duration_minutes,
            is_feasible=r.is_feasible,
            stops=[
                OptimizedStopResponse(
                    stop_sequence=s.stop_sequence,
                    stop_type=s.stop_type,
                    pickup_id=s.pickup_id,
                    organization_name=s.organization_name,
                    address=s.address,
                    latitude=s.latitude,
                    longitude=s.longitude,
                    arrival_time_minutes=s.arrival_time_minutes,
                    departure_time_minutes=s.departure_time_minutes,
                    cumulative_load_kg=s.cumulative_load_kg,
                    quantity_kg=s.quantity_kg,
                    portions=s.portions,
                    storage_condition=s.storage_condition,
                    food_safety_instructions=s.food_safety_instructions,
                )
                for s in r.stops
            ],
        )
        for r in result.routes
    ]

    response_data = OptimizeRouteResultResponse(
        routes=routes_data,
        unassigned_order_ids=result.unassigned_order_ids,
        total_distance_km=result.total_distance_km,
        total_duration_minutes=result.total_duration_minutes,
        solver_status=result.solver_status,
    )

    return ResponseEnvelope(
        success=True,
        data=response_data,
        message=f"OR-Tools VRP solved: {len(routes_data)} routes planned, {len(result.unassigned_order_ids)} unassigned.",
    )


@router.post(
    "/auto-dispatch",
    response_model=ResponseEnvelope[AutoDispatchResponse],
    summary="Run Fleet Auto-Dispatch (OR-Tools VRP)",
)
async def run_auto_dispatch(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Automated Fleet Dispatch:
    1. Fetches all pending pickups (status='pending_volunteer').
    2. Fetches active verified volunteers.
    3. Solves the multi-vehicle PDPTW using Google OR-Tools.
    4. Persists assigned routes and sequenced stops to PostgreSQL in an atomic transaction.
    5. Transitions pickup status to 'assigned'.
    """
    # 1. Fetch pending pickups with donations and recipient organizations
    stmt = (
        select(Pickup)
        .options(
            selectinload(Pickup.donation).selectinload(Donation.donor_organization),
            selectinload(Pickup.recipient_organization),
        )
        .where(Pickup.status == "pending_volunteer")
    )
    res = await db.execute(stmt)
    pending_pickups = res.scalars().all()

    if not pending_pickups:
        return ResponseEnvelope(
            success=True,
            data=AutoDispatchResponse(
                assigned_routes_count=0,
                assigned_orders_count=0,
                unassigned_orders_count=0,
                total_distance_km=0.0,
                total_duration_minutes=0,
                routes=[],
                message="No pending pickups requiring dispatch.",
            ),
            message="No pending pickups found.",
        )

    # 2. Fetch available active volunteers
    vol_stmt = select(User).where(User.role == "volunteer", User.is_active == True)
    vol_res = await db.execute(vol_stmt)
    volunteers = vol_res.scalars().all()

    if not volunteers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active volunteers available in the fleet for auto-dispatch.",
        )

    # 3. Construct OrderPairs
    now = datetime.now(timezone.utc)
    order_pairs: List[OrderPair] = []
    pickup_dict: dict = {}

    for p in pending_pickups:
        don = p.donation
        rec = p.recipient_organization
        if not don or not don.donor_organization or not rec:
            continue

        pickup_dict[str(p.id)] = p

        order_pairs.append(
            OrderPair(
                pickup_id=str(p.id),
                donation_id=str(don.id),
                title=don.title,
                donor_name=don.donor_organization.name,
                donor_address=don.donor_organization.address,
                donor_lat=don.donor_organization.latitude,
                donor_lng=don.donor_organization.longitude,
                recipient_name=rec.name,
                recipient_address=rec.address,
                recipient_lat=rec.latitude,
                recipient_lng=rec.longitude,
                quantity_kg=float(don.quantity_kg),
                portions=don.portions,
                storage_condition=don.storage_condition,
                pickup_window_start=0,
                pickup_window_end=120,
                delivery_window_start=20,
                delivery_window_end=240,
                max_transit_minutes=90 if "hot" in don.storage_condition else 120,
            )
        )

    # 4. Construct VehicleInfos
    vehicles: List[VehicleInfo] = [
        VehicleInfo(
            vehicle_id=str(v.id),
            courier_name=v.full_name or "Courier Volunteer",
            vehicle_type="bicycle" if i % 2 == 0 else "car",
            capacity_kg=35.0 if i % 2 == 0 else 100.0,
            start_lat=12.9716,
            start_lng=77.5946,
            start_address="City Central Volunteer Depot, Metro Core",
            shift_start_minutes=0,
            shift_end_minutes=480,
        )
        for i, v in enumerate(volunteers)
    ]

    # 5. Solve via OR-Tools
    optimizer = RouteOptimizer(time_limit_seconds=5)
    opt_result = optimizer.solve(
        orders=order_pairs,
        vehicles=vehicles,
        depot_lat=12.9716,
        depot_lng=77.5946,
        depot_address="City Central Volunteer Depot, Metro Core",
    )

    # 6. Persist routes and update pickups
    assigned_orders_count = 0
    route_responses: List[OptimizedRoutePlanResponse] = []

    for r in opt_result.routes:
        vol_uuid = uuid.UUID(r.vehicle_id)

        db_route = Route(
            volunteer_id=vol_uuid,
            planned_date=now,
            total_distance_km=r.total_distance_km,
            total_duration_minutes=r.total_duration_minutes,
            status="assigned",
        )
        db.add(db_route)
        await db.flush()

        resp_stops: List[OptimizedStopResponse] = []

        for s in r.stops:
            pickup_uuid = uuid.UUID(s.pickup_id)
            p_obj = pickup_dict.get(s.pickup_id)

            arr_start = now + timedelta(minutes=s.arrival_time_minutes)
            arr_end = arr_start + timedelta(minutes=30)

            db_stop = RouteStop(
                route_id=db_route.id,
                pickup_id=pickup_uuid,
                organization_id=p_obj.recipient_organization_id if s.stop_type == "delivery" else (p_obj.donation.donor_organization_id if p_obj and p_obj.donation else None),
                stop_type=s.stop_type,
                stop_sequence=s.stop_sequence,
                address=s.address,
                latitude=s.latitude,
                longitude=s.longitude,
                arrival_window_start=arr_start,
                arrival_window_end=arr_end,
                estimated_arrival=arr_start,
                status="pending",
            )
            db.add(db_stop)

            # Update Pickup to assigned
            if p_obj and s.stop_type == "pickup":
                p_obj.volunteer_id = vol_uuid
                p_obj.status = "assigned"
                p_obj.scheduled_pickup_time = arr_start
                p_obj.estimated_delivery_time = arr_start + timedelta(minutes=45)
                assigned_orders_count += 1

            resp_stops.append(
                OptimizedStopResponse(
                    stop_sequence=s.stop_sequence,
                    stop_type=s.stop_type,
                    pickup_id=s.pickup_id,
                    organization_name=s.organization_name,
                    address=s.address,
                    latitude=s.latitude,
                    longitude=s.longitude,
                    arrival_time_minutes=s.arrival_time_minutes,
                    departure_time_minutes=s.departure_time_minutes,
                    cumulative_load_kg=s.cumulative_load_kg,
                    quantity_kg=s.quantity_kg,
                    portions=s.portions,
                    storage_condition=s.storage_condition,
                    food_safety_instructions=s.food_safety_instructions,
                )
            )

        route_responses.append(
            OptimizedRoutePlanResponse(
                vehicle_id=r.vehicle_id,
                courier_name=r.courier_name,
                total_distance_km=r.total_distance_km,
                total_duration_minutes=r.total_duration_minutes,
                is_feasible=r.is_feasible,
                stops=resp_stops,
            )
        )

    # 7. Audit Log
    db.add(
        AuditLog(
            actor_id=current_user.id,
            actor_role=current_user.role,
            action="route_auto_dispatch",
            entity_type="routes",
            entity_id=uuid.uuid4(),
            payload_after={
                "algorithm": "Google OR-Tools PDPTW",
                "routes_generated": len(route_responses),
                "orders_assigned": assigned_orders_count,
                "unassigned_orders": opt_result.unassigned_order_ids,
                "total_distance_km": opt_result.total_distance_km,
            },
        )
    )

    await db.commit()

    return ResponseEnvelope(
        success=True,
        data=AutoDispatchResponse(
            assigned_routes_count=len(route_responses),
            assigned_orders_count=assigned_orders_count,
            unassigned_orders_count=len(opt_result.unassigned_order_ids),
            total_distance_km=opt_result.total_distance_km,
            total_duration_minutes=opt_result.total_duration_minutes,
            routes=route_responses,
            message="Auto-dispatch completed successfully with Google OR-Tools VRP.",
        ),
        message=f"Auto-dispatch complete: {assigned_orders_count} orders assigned across {len(route_responses)} volunteer routes.",
    )
