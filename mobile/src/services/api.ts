import { ActiveRoute, RouteStop, VolunteerHistoryItem, VolunteerImpactSummary, VolunteerJob } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

let authToken: string | null = null;

export const api = {
  setAuthToken(token: string | null) {
    authToken = token;
  },

  async login(email: string, password: string):Promise<{ token: string; user: any } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        authToken = data.data.access_token;
        return { token: data.data.access_token, user: data.data.user };
      }
      return null;
    } catch {
      // Mock login for offline mobile demo
      authToken = 'demo-volunteer-token';
      return {
        token: 'demo-volunteer-token',
        user: {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          fullName: 'Priya Sharma',
          email: 'priya.volunteer@gmail.com',
          role: 'volunteer',
        },
      };
    }
  },

  async getAvailableJobs(): Promise<VolunteerJob[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/jobs`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        return data.data;
      }
      return fallbackJobs;
    } catch {
      return fallbackJobs;
    }
  },

  async claimJob(pickupId: string): Promise<ActiveRoute | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/claim-job/${pickupId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
      return null;
    } catch {
      return fallbackRoute;
    }
  },

  async getActiveRoute(): Promise<ActiveRoute | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/active-route`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        return data.data;
      }
      return fallbackRoute;
    } catch {
      return fallbackRoute;
    }
  },

  async markStopArrival(stopId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/stops/${stopId}/arrive`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      return res.ok;
    } catch {
      return true;
    }
  },

  async verifyHandover(
    stopId: string,
    pickupId: string,
    code: string,
    actualTempC?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/verify-handover`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stop_id: stopId,
          pickup_id: pickupId,
          verification_code: code,
          actual_temp_c: actualTempC,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Verification failed.' };
    } catch {
      if (code.length === 6) {
        return { success: true, message: 'Offline Demo: Handover verified successfully!' };
      }
      return { success: false, message: 'Invalid 6-digit verification code.' };
    }
  },

  async reportIssue(
    pickupId: string,
    issueType: string,
    description: string,
    tempC?: number
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/report-issue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_id: pickupId,
          issue_type: issueType,
          description,
          measured_temp_c: tempC,
        }),
      });
      return res.ok;
    } catch {
      return true;
    }
  },

  async getHistory(): Promise<VolunteerImpactSummary> {
    try {
      const res = await fetch(`${API_BASE_URL}/volunteer/history`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
      return fallbackHistory;
    } catch {
      return fallbackHistory;
    }
  },
};

// Resilient Fallback Data for offline / simulated environment
const fallbackJobs: VolunteerJob[] = [
  {
    pickup_id: 'pickup-01',
    donation_id: 'don-01',
    title: '50 Portions Vegetable Stew & Fresh Bread',
    description: 'Fresh prepared meals in sanitized thermal gastro trays.',
    food_type: 'cooked_meals',
    quantity_kg: 25.0,
    portions: 50,
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
    scheduled_pickup_time: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    pickup_deadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    road_distance_km: 1.8,
    estimated_duration_minutes: 20,
    status: 'pending_volunteer',
  },
  {
    pickup_id: 'pickup-02',
    donation_id: 'don-02',
    title: '30 Loaves Sourdough & Brioche Rolls',
    description: 'Artisan morning surplus baked goods, individually bagged.',
    food_type: 'bakery',
    quantity_kg: 15.0,
    portions: 30,
    storage_condition: 'ambient',
    donor_name: 'Artisan Daily Sourdough',
    donor_address: '15 Baker Street, Market Quarter',
    donor_latitude: 12.9780,
    donor_longitude: 77.5990,
    donor_phone: '+91 80 2345 6789',
    recipient_name: 'St. Jude Family Food Pantry',
    recipient_address: '102 Mission Road, East Gate',
    recipient_latitude: 12.9820,
    recipient_longitude: 77.6100,
    recipient_phone: '+91 80 2567 8901',
    scheduled_pickup_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    pickup_deadline: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    road_distance_km: 2.3,
    estimated_duration_minutes: 25,
    status: 'pending_volunteer',
  },
];

const fallbackRoute: ActiveRoute = {
  route_id: 'route-demo-01',
  volunteer_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  volunteer_name: 'Priya Sharma',
  status: 'assigned',
  total_distance_km: 4.1,
  total_duration_minutes: 35,
  stops: [
    {
      id: 'stop-01',
      route_id: 'route-demo-01',
      pickup_id: 'pickup-01',
      stop_type: 'pickup',
      stop_sequence: 1,
      organization_name: 'The Grand Heritage Bistro',
      address: '42 Promenade Avenue, Downtown Core',
      contact_phone: '+91 80 2234 5678',
      latitude: 12.9716,
      longitude: 77.5946,
      arrival_window_start: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      arrival_window_end: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      estimated_arrival: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'pending',
      verification_method: 'PIN',
      food_safety_instructions: 'Collect 50 portions (25kg, hot holding >= 60°C). Verify thermal seals.',
      portions: 50,
      quantity_kg: 25.0,
      storage_condition: 'hot_holding',
      verification_pin: '749216',
    },
    {
      id: 'stop-02',
      route_id: 'route-demo-01',
      pickup_id: 'pickup-01',
      stop_type: 'delivery',
      stop_sequence: 2,
      organization_name: 'Hope Community Shelter & Kitchen',
      address: '88 Sanctuary Lane, Central District',
      contact_phone: '+91 80 2456 7890',
      latitude: 12.9750,
      longitude: 77.6050,
      arrival_window_start: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      arrival_window_end: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      estimated_arrival: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
      status: 'pending',
      verification_method: 'PIN',
      food_safety_instructions: 'Deliver to receiving kitchen dock. Request 6-digit confirmation PIN from shelter staff.',
      portions: 50,
      quantity_kg: 25.0,
      storage_condition: 'hot_holding',
      verification_pin: '749216',
    },
  ],
};

const fallbackHistory: VolunteerImpactSummary = {
  total_rescues: 18,
  total_portions: 640,
  total_quantity_kg: 320.0,
  co2_avoided_kg: 608.0,
  reliability_rating: 99.2,
  history: [
    {
      pickup_id: 'p-hist-01',
      completed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      donation_title: '35 Hot Meals & Lentil Soup',
      donor_name: 'The Grand Heritage Bistro',
      recipient_name: 'Hope Community Shelter',
      quantity_kg: 17.5,
      portions: 35,
      distance_km: 1.8,
    },
    {
      pickup_id: 'p-hist-02',
      completed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      donation_title: '40 Sourdough Loaves & Pastries',
      donor_name: 'Artisan Daily Sourdough',
      recipient_name: 'St. Jude Family Food Pantry',
      quantity_kg: 20.0,
      portions: 40,
      distance_km: 2.1,
    },
  ],
};
