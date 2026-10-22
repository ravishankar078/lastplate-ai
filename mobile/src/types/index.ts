export type StopType = 'pickup' | 'delivery';
export type StopStatus = 'pending' | 'arrived' | 'completed' | 'skipped';

export interface VolunteerJob {
  pickup_id: string;
  donation_id: string;
  title: string;
  description?: string;
  food_type: string;
  quantity_kg: number;
  portions: number;
  storage_condition: string;
  donor_name: string;
  donor_address: string;
  donor_latitude: number;
  donor_longitude: number;
  donor_phone?: string;
  recipient_name: string;
  recipient_address: string;
  recipient_latitude: number;
  recipient_longitude: number;
  recipient_phone?: string;
  scheduled_pickup_time: string;
  pickup_deadline: string;
  road_distance_km: number;
  estimated_duration_minutes: number;
  status: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  pickup_id: string;
  stop_type: StopType;
  stop_sequence: number;
  organization_name: string;
  address: string;
  contact_phone?: string;
  latitude: number;
  longitude: number;
  arrival_window_start: string;
  arrival_window_end: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  status: StopStatus;
  verification_method: 'PIN' | 'QR';
  food_safety_instructions: string;
  portions: number;
  quantity_kg: number;
  storage_condition: string;
  verification_pin?: string;
}

export interface ActiveRoute {
  route_id: string;
  volunteer_id: string;
  volunteer_name: string;
  status: string;
  total_distance_km: number;
  total_duration_minutes: number;
  stops: RouteStop[];
}

export interface VolunteerHistoryItem {
  pickup_id: string;
  completed_at: string;
  donation_title: string;
  donor_name: string;
  recipient_name: string;
  quantity_kg: number;
  portions: number;
  distance_km: number;
}

export interface VolunteerImpactSummary {
  total_rescues: number;
  total_portions: number;
  total_quantity_kg: number;
  co2_avoided_kg: number;
  reliability_rating: number;
  history: VolunteerHistoryItem[];
}
