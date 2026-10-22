import apiClient from './client';
import { mockStore } from './mockDataStore';
import { RoutePlan, RouteStop, VolunteerImpactSummary, VolunteerJob } from '../../types';

export const volunteerService = {
  async getAvailableJobs(): Promise<VolunteerJob[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: VolunteerJob[] }>('/volunteer/jobs');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    } catch (err) {
      console.warn('[Volunteer API] Could not fetch available jobs from backend, using fallback:', err);
      return [
        {
          pickup_id: 'pickup-demo-01',
          donation_id: 'don-demo-01',
          title: '30 Hot Meals & Sourdough Rolls',
          description: 'Vegetable stew, pasta, and freshly baked artisan rolls.',
          food_type: 'prepared_meals',
          quantity_kg: 22.5,
          portions: 45,
          storage_condition: 'hot_holding',
          donor_name: 'The Grand Heritage Bistro',
          donor_address: '42 Promenade Avenue, Downtown Core',
          donor_latitude: 12.9716,
          donor_longitude: 77.5946,
          donor_phone: '+91 80 2234 5678',
          recipient_name: 'Hope Community Shelter & Kitchen',
          recipient_address: '88 Sanctuary Lane, Central District',
          recipient_latitude: 12.9750,
          recipient_longitude: 77.6050,
          recipient_phone: '+91 80 2456 7890',
          scheduled_pickup_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          pickup_deadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
          road_distance_km: 1.4,
          estimated_duration_minutes: 18,
          status: 'pending_volunteer',
        },
      ];
    }
  },

  async claimJob(pickupId: string): Promise<RoutePlan | null> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/volunteer/claim-job/${pickupId}`
      );
      if (res.data && res.data.success && res.data.data) {
        return mapBackendRouteToPlan(res.data.data);
      }
      return null;
    } catch (err) {
      console.warn(`[Volunteer API] Could not claim job ${pickupId}:`, err);
      return null;
    }
  },

  async getActiveRoute(): Promise<RoutePlan> {
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>('/volunteer/active-route');
      if (res.data && res.data.success && res.data.data) {
        return mapBackendRouteToPlan(res.data.data);
      }
      // If no active route in backend, fallback to mockStore
      return mockStore.getRoutePlan();
    } catch (err) {
      console.info('[Mock API] Using mockStore for volunteerService.getActiveRoute()', err);
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getRoutePlan();
    }
  },

  async markStopArrival(stopId: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/volunteer/stops/${stopId}/arrive`
      );
      return !!(res.data && res.data.success);
    } catch (err) {
      console.warn(`[Volunteer API] Could not mark arrival for stop ${stopId}:`, err);
      return false;
    }
  },

  async verifyStopHandover(
    stopId: string,
    verificationCode: string,
    pickupId?: string,
    actualTempC?: number
  ): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/volunteer/verify-handover', {
        stop_id: stopId,
        pickup_id: pickupId || stopId,
        verification_code: verificationCode,
        actual_temp_c: actualTempC,
      });
      return !!(res.data && res.data.success);
    } catch (err) {
      console.info(`[Mock API] Using mockStore fallback for volunteerService.verifyStopHandover(${stopId})`, err);
      await new Promise((r) => setTimeout(r, 250));
      return mockStore.verifyStop(stopId, verificationCode);
    }
  },

  async reportIssue(
    pickupId: string,
    issueType: string,
    description: string,
    tempC?: number
  ): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/volunteer/report-issue', {
        pickup_id: pickupId,
        issue_type: issueType,
        description,
        measured_temp_c: tempC,
      });
      return !!(res.data && res.data.success);
    } catch (err) {
      console.warn(`[Volunteer API] Could not report issue for ${pickupId}:`, err);
      return false;
    }
  },

  async getVolunteerHistory(): Promise<VolunteerImpactSummary | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: VolunteerImpactSummary }>('/volunteer/history');
      if (res.data && res.data.success) {
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.warn('[Volunteer API] Could not fetch history:', err);
      return null;
    }
  },
};

function mapBackendRouteToPlan(data: any): RoutePlan {
  const stops: RouteStop[] = (data.stops || []).map((s: any) => ({
    id: s.id,
    routeId: s.route_id,
    donationId: s.pickup_id,
    stopSequence: s.stop_sequence,
    stopType: s.stop_type,
    organizationName: s.organization_name,
    contactPerson: s.organization_name,
    contactPhone: s.contact_phone || '+91 80 2234 5678',
    location: {
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address,
      city: 'Metro Core',
      postalCode: '560001',
    },
    estimatedArrival: s.estimated_arrival || s.arrival_window_start,
    timeWindowStart: s.arrival_window_start,
    timeWindowEnd: s.arrival_window_end,
    serviceTimeMinutes: 15,
    status: s.status,
    verificationMethod: 'PIN' as const,
    pinCode: s.verification_pin || '749216',
    foodSummary: s.food_safety_instructions,
    quantityKg: s.quantity_kg,
    temperatureTarget: s.storage_condition ? s.storage_condition.replace('_', ' ') : 'hot holding',
  }));

  return {
    id: data.route_id,
    volunteerId: data.volunteer_id,
    volunteerName: data.volunteer_name || 'Volunteer',
    date: new Date().toISOString(),
    totalDistanceKm: data.total_distance_km,
    totalDurationMinutes: data.total_duration_minutes,
    isFeasible: true,
    algorithm: 'Google OR-Tools VRP' as const,
    stops,
    createdAt: new Date().toISOString(),
  };
}
