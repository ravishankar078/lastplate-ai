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
