import { GeoLocation } from './organization';

export type StopType = 'pickup' | 'delivery';
export type StopStatus = 'pending' | 'arrived' | 'completed' | 'failed' | 'skipped';

export interface RouteStop {
  id: string;
  routeId: string;
  donationId: string;
  stopSequence: number;
  stopType: StopType;
  organizationName: string;
  contactPerson: string;
  contactPhone: string;
  location: GeoLocation;
  estimatedArrival: string; // ISO
  timeWindowStart: string;  // ISO
  timeWindowEnd: string;    // ISO
  serviceTimeMinutes: number;
  status: StopStatus;
  verificationMethod: 'QR' | 'PIN';
  verificationToken?: string;
  pinCode?: string;
  foodSummary: string;
  quantityKg: number;
  temperatureTarget: string;
  completedAt?: string;
  notes?: string;
}

export interface RoutePlan {
  id: string;
  volunteerId: string;
  volunteerName: string;
  date: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isFeasible: boolean;
  algorithm: 'Google OR-Tools VRP';
  stops: RouteStop[];
  createdAt: string;
}

export interface HandoverVerificationPayload {
  stopId: string;
  donationId: string;
  verificationMethod: 'QR' | 'PIN';
  tokenOrPin: string;
  measuredTemperature?: number;
  notes?: string;
}

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

