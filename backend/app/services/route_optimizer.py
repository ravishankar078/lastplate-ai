"""
Google OR-Tools Route Optimization Engine.
Solves the Capacitated Vehicle Routing Problem with Pickup and Delivery
and Time Windows (PDPTW) for surplus food rescue fleets.

Food Safety & Operational Invariants Enforced:
1. Pickup Precedence: Pickup node must be visited before Delivery node on the same vehicle.
2. Capacity Limits: Vehicle load (kg) cannot exceed vehicle capacity at any point.
3. Service Windows: Vehicle must arrive within agreed Donor pickup and NGO delivery windows.
4. Food Safety Chain: Perishable / Hot Holding orders must be delivered within max_transit_time (e.g. <= 120 mins).
5. Road Circuity: Urban road network distance approximated with 1.35 circuity coefficient.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Tuple
import uuid

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


# Constants
EARTH_RADIUS_KM = 6371.0
URBAN_CIRCUITY_FACTOR = 1.35
AVERAGE_URBAN_SPEED_KMH = 25.0
DEFAULT_SERVICE_TIME_MINUTES = 10
DEFAULT_MAX_TRANSIT_MINUTES = 120  # Max time food can stay in transit to ensure safety
DEFAULT_HORIZON_MINUTES = 480      # 8 hours planning horizon


@dataclass
class LocationNode:
    """Represents a physical stop node in the routing graph."""
    node_index: int
    name: str
    latitude: float
    longitude: float
    address: str
    demand_kg: float          # Positive for pickup, negative for delivery, 0 for depot
    service_time_minutes: int
    time_window_start: int    # Minutes from reference horizon
    time_window_end: int
    order_id: Optional[str] = None
    node_type: str = "depot"  # 'depot', 'pickup', 'delivery'
    portions: int = 0
    storage_condition: str = "ambient"
    max_transit_minutes: Optional[int] = None


@dataclass
class OrderPair:
    """A pickup and delivery request."""
    pickup_id: str
    donation_id: str
    title: str
    donor_name: str
    donor_address: str
    donor_lat: float
    donor_lng: float
    recipient_name: str
    recipient_address: str
    recipient_lat: float
    recipient_lng: float
    quantity_kg: float
    portions: int
    storage_condition: str
    pickup_window_start: int     # e.g., 0 min
    pickup_window_end: int       # e.g., 120 min
    delivery_window_start: int   # e.g., 30 min
    delivery_window_end: int     # e.g., 240 min
    max_transit_minutes: int = DEFAULT_MAX_TRANSIT_MINUTES


@dataclass
class VehicleInfo:
    """Courier vehicle capacity and operating constraints."""
    vehicle_id: str
    courier_name: str
    vehicle_type: str            # 'bicycle', 'car', 'van'
    capacity_kg: float           # e.g., 30kg (bike), 120kg (car), 350kg (van)
    start_lat: float
    start_lng: float
    start_address: str
    shift_start_minutes: int = 0
    shift_end_minutes: int = DEFAULT_HORIZON_MINUTES


@dataclass
class StopDetail:
    """Sequenced stop in an optimized route."""
    stop_sequence: int
    stop_type: str               # 'pickup' or 'delivery'
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


@dataclass
class OptimizedRoute:
    """Final route plan for a courier vehicle."""
    vehicle_id: str
    courier_name: str
    total_distance_km: float
    total_duration_minutes: int
    stops: List[StopDetail]
    is_feasible: bool = True


@dataclass
class OptimizationOutput:
    """Complete result from the OR-Tools VRP solver."""
    routes: List[OptimizedRoute]
    unassigned_order_ids: List[str]
    total_distance_km: float
    total_duration_minutes: int
    solver_status: str


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine great-circle distance between two GPS coordinates."""
    if lat1 == lat2 and lon1 == lon2:
        return 0.0

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


def road_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Estimates urban road distance using circuity multiplier."""
    return haversine_distance_km(lat1, lon1, lat2, lon2) * URBAN_CIRCUITY_FACTOR


def travel_time_minutes(dist_km: float) -> int:
    """Estimates travel time in integer minutes at standard urban speed."""
    if dist_km <= 0.001:
        return 0
    return max(1, int(round((dist_km / AVERAGE_URBAN_SPEED_KMH) * 60.0)))


class RouteOptimizer:
    """
    Google OR-Tools VRP Engine with Capacitated Pickup and Delivery
    with Time Windows (PDPTW) and Food Safety Latency Constraints.
    """

    def __init__(self, time_limit_seconds: int = 5):
        self.time_limit_seconds = time_limit_seconds

    def solve(
        self,
        orders: List[OrderPair],
        vehicles: List[VehicleInfo],
        depot_lat: Optional[float] = None,
        depot_lng: Optional[float] = None,
        depot_address: str = "Central Logistics Hub, Metro Core",
    ) -> OptimizationOutput:
        """
        Executes Google OR-Tools PDPTW solver across the provided orders and fleet.
        """
        if not orders:
            return OptimizationOutput(
                routes=[],
                unassigned_order_ids=[],
                total_distance_km=0.0,
                total_duration_minutes=0,
                solver_status="NO_ORDERS",
            )

        if not vehicles:
            return OptimizationOutput(
                routes=[],
                unassigned_order_ids=[o.pickup_id for o in orders],
                total_distance_km=0.0,
                total_duration_minutes=0,
                solver_status="NO_VEHICLES_AVAILABLE",
            )

        # 1. Build Location Nodes
        # Node 0: Depot
        if depot_lat is None or depot_lng is None:
            depot_lat = vehicles[0].start_lat
            depot_lng = vehicles[0].start_lng
            depot_address = vehicles[0].start_address

        nodes: List[LocationNode] = [
            LocationNode(
                node_index=0,
                name="Depot Hub",
                latitude=depot_lat,
                longitude=depot_lng,
                address=depot_address,
                demand_kg=0.0,
                service_time_minutes=0,
                time_window_start=0,
                time_window_end=DEFAULT_HORIZON_MINUTES,
                node_type="depot",
            )
        ]

        pickup_indices: List[int] = []
        delivery_indices: List[int] = []
        pickup_to_delivery_map: Dict[int, int] = {}
        node_order_map: Dict[int, OrderPair] = {}

        # For each order, add 1 pickup node and 1 delivery node
        for order in orders:
            p_idx = len(nodes)
            p_node = LocationNode(
                node_index=p_idx,
                name=order.donor_name,
                latitude=order.donor_lat,
                longitude=order.donor_lng,
                address=order.donor_address,
                demand_kg=order.quantity_kg,
                service_time_minutes=DEFAULT_SERVICE_TIME_MINUTES,
                time_window_start=order.pickup_window_start,
                time_window_end=order.pickup_window_end,
                order_id=order.pickup_id,
                node_type="pickup",
                portions=order.portions,
                storage_condition=order.storage_condition,
                max_transit_minutes=order.max_transit_minutes,
            )
            nodes.append(p_node)
            pickup_indices.append(p_idx)
            node_order_map[p_idx] = order

            d_idx = len(nodes)
            d_node = LocationNode(
                node_index=d_idx,
                name=order.recipient_name,
                latitude=order.recipient_lat,
                longitude=order.recipient_lng,
                address=order.recipient_address,
                demand_kg=-order.quantity_kg,
                service_time_minutes=DEFAULT_SERVICE_TIME_MINUTES,
                time_window_start=order.delivery_window_start,
                time_window_end=order.delivery_window_end,
                order_id=order.pickup_id,
                node_type="delivery",
                portions=order.portions,
                storage_condition=order.storage_condition,
                max_transit_minutes=order.max_transit_minutes,
            )
            nodes.append(d_node)
            delivery_indices.append(d_idx)
            node_order_map[d_idx] = order

            pickup_to_delivery_map[p_idx] = d_idx

        num_nodes = len(nodes)
        num_vehicles = len(vehicles)

        # 2. Build Distance and Travel Time Matrices
        distance_matrix: List[List[int]] = []  # In meters for precision
        travel_time_matrix: List[List[int]] = []  # In minutes

        for i in range(num_nodes):
            dist_row: List[int] = []
            time_row: List[int] = []
            for j in range(num_nodes):
                if i == j:
                    dist_row.append(0)
                    time_row.append(0)
                else:
                    d_km = road_distance_km(
                        nodes[i].latitude, nodes[i].longitude,
                        nodes[j].latitude, nodes[j].longitude
                    )
                    dist_row.append(int(round(d_km * 1000.0)))
                    time_row.append(travel_time_minutes(d_km))
            distance_matrix.append(dist_row)
            travel_time_matrix.append(time_row)

        # 3. Initialize OR-Tools Routing Index Manager and Model
        manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)

        # 4. Arc Cost Evaluator (Minimize Total Distance / Energy)
        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # 5. Capacity Dimension (Weight in kg)
        demands = [int(round(n.demand_kg)) for n in nodes]
        vehicle_capacities = [int(round(v.capacity_kg)) for v in vehicles]

        def demand_callback(from_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # Null capacity slack
            vehicle_capacities,
            True,  # Start cumulative demand to zero at depot
            "Capacity",
        )

        # 6. Time Dimension (Minutes) with Service Times and Time Windows
        def time_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            transit = travel_time_matrix[from_node][to_node]
            service = nodes[from_node].service_time_minutes
            return transit + service

        time_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.AddDimension(
            time_callback_index,
            DEFAULT_HORIZON_MINUTES,  # Slack time (waiting allowed if arrived early)
            DEFAULT_HORIZON_MINUTES,  # Horizon capacity
            False,                    # Start cumul variable doesn't have to be 0
            "Time",
        )
        time_dimension = routing.GetDimensionOrDie("Time")

        # Set time window constraints for all nodes
        for node_idx, node in enumerate(nodes):
            index = manager.NodeToIndex(node_idx)
            if index >= 0:
                time_dimension.CumulVar(index).SetRange(
                    node.time_window_start, node.time_window_end
                )

        # Set vehicle shift start/end windows
        for vehicle_id in range(num_vehicles):
            start_index = routing.Start(vehicle_id)
            end_index = routing.End(vehicle_id)
            v_info = vehicles[vehicle_id]
            time_dimension.CumulVar(start_index).SetRange(
                v_info.shift_start_minutes, v_info.shift_end_minutes
            )
            time_dimension.CumulVar(end_index).SetRange(
                v_info.shift_start_minutes, v_info.shift_end_minutes
            )

        # 7. Pickup and Delivery Constraints & Food Safety Latency
        for p_idx, d_idx in pickup_to_delivery_map.items():
            p_routing_idx = manager.NodeToIndex(p_idx)
            d_routing_idx = manager.NodeToIndex(d_idx)

            routing.AddPickupAndDelivery(p_routing_idx, d_routing_idx)

            # Same vehicle constraint: pickup and delivery must be carried by same courier
            routing.solver().Add(
                routing.VehicleVar(p_routing_idx) == routing.VehicleVar(d_routing_idx)
            )

            # Precedence constraint: Pickup must precede delivery
            routing.solver().Add(
                time_dimension.CumulVar(d_routing_idx) >= time_dimension.CumulVar(p_routing_idx)
            )

            # Food Safety: Max transit time from pickup to delivery (to prevent temperature danger zone)
            order_info = node_order_map[p_idx]
            max_transit = order_info.max_transit_minutes or DEFAULT_MAX_TRANSIT_MINUTES
            routing.solver().Add(
                time_dimension.CumulVar(d_routing_idx) - time_dimension.CumulVar(p_routing_idx)
                <= max_transit
            )

            # Add disjunction to allow dropping orders gracefully if capacity/time cannot accommodate
            penalty = 1_000_000
            routing.AddDisjunction([p_routing_idx], penalty)
            routing.AddDisjunction([d_routing_idx], penalty)

        # 8. Set Search Parameters and Solve
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = self.time_limit_seconds

        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            return OptimizationOutput(
                routes=[],
                unassigned_order_ids=[o.pickup_id for o in orders],
                total_distance_km=0.0,
                total_duration_minutes=0,
                solver_status="NO_FEASIBLE_SOLUTION",
            )

        # 9. Extract Optimized Routes and Visited Sequences
        capacity_dimension = routing.GetDimensionOrDie("Capacity")
        routes_output: List[OptimizedRoute] = []
        overall_distance_m = 0
        overall_duration_min = 0
        visited_orders: set = set()

        for vehicle_idx, v_info in enumerate(vehicles):
            index = routing.Start(vehicle_idx)
            v_stops: List[StopDetail] = []
            v_dist_m = 0
            seq_counter = 1

            while not routing.IsEnd(index):
                node_idx = manager.IndexToNode(index)
                if node_idx != 0:  # Skip depot for volunteer stops list
                    curr_node = nodes[node_idx]
                    arrival_time = solution.Min(time_dimension.CumulVar(index))
                    departure_time = arrival_time + curr_node.service_time_minutes
                    load_kg = solution.Value(capacity_dimension.CumulVar(index))

                    if curr_node.order_id:
                        visited_orders.add(curr_node.order_id)

                    sop = (
                        f"Collect {curr_node.portions} portions ({curr_node.demand_kg} kg). Inspect container seal."
                        if curr_node.node_type == "pickup"
                        else f"Deliver to receiving dock. Request 6-digit confirmation PIN from staff."
                    )

                    v_stops.append(
                        StopDetail(
                            stop_sequence=seq_counter,
                            stop_type=curr_node.node_type,
                            pickup_id=curr_node.order_id or str(uuid.uuid4()),
                            organization_name=curr_node.name,
                            address=curr_node.address,
                            latitude=curr_node.latitude,
                            longitude=curr_node.longitude,
                            arrival_time_minutes=arrival_time,
                            departure_time_minutes=departure_time,
                            cumulative_load_kg=float(load_kg),
                            quantity_kg=abs(curr_node.demand_kg),
                            portions=curr_node.portions,
                            storage_condition=curr_node.storage_condition,
                            food_safety_instructions=sop,
                        )
                    )
                    seq_counter += 1

                prev_index = index
                index = solution.Value(routing.NextVar(index))
                from_node = manager.IndexToNode(prev_index)
                to_node = manager.IndexToNode(index)
                v_dist_m += distance_matrix[from_node][to_node]

            # Route duration is departure at end minus arrival at start
            v_duration_min = solution.Min(time_dimension.CumulVar(index)) - solution.Min(
                time_dimension.CumulVar(routing.Start(vehicle_idx))
            )

            v_dist_km = round(v_dist_m / 1000.0, 2)
            overall_distance_m += v_dist_m
            overall_duration_min = max(overall_duration_min, v_duration_min)

            if v_stops:
                routes_output.append(
                    OptimizedRoute(
                        vehicle_id=v_info.vehicle_id,
                        courier_name=v_info.courier_name,
                        total_distance_km=v_dist_km,
                        total_duration_minutes=v_duration_min,
                        stops=v_stops,
                        is_feasible=True,
                    )
                )

        unassigned_ids = [
            o.pickup_id for o in orders if o.pickup_id not in visited_orders
        ]

        return OptimizationOutput(
            routes=routes_output,
            unassigned_order_ids=unassigned_ids,
            total_distance_km=round(overall_distance_m / 1000.0, 2),
            total_duration_minutes=overall_duration_min,
            solver_status="OPTIMAL_OR_FEASIBLE",
        )
