import apiClient from './client';
import { mockStore } from './mockDataStore';
import {
  DonationRecipientsResponse,
  MatchRecommendation,
  SplitDonationPlan,
} from '../../types/match';

export const matchingService = {
  async getRecommendationsForNGO(ngoOrgId: string): Promise<MatchRecommendation[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>(
        `/matching/recommendations?recipientId=${ngoOrgId}`
      );
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data as MatchRecommendation[];
      }
      return mockStore.getMatchesForNGO(ngoOrgId);
    } catch (err) {
      console.info(`[Mock API] Using mockStore for matchingService.getRecommendationsForNGO(${ngoOrgId})`, err);
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getMatchesForNGO(ngoOrgId);
    }
  },

  async acceptMatch(donationId: string, recipientOrgId: string, recipientOrgName: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(`/matching/accept`, {
        donationId,
        recipientOrgId,
      });
      if (res.data && res.data.success) {
        return true;
      }
      return false;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Concurrency conflict: already claimed by another NGO
        console.warn('[Matching] Concurrency conflict: donation was already claimed.');
        return false;
      }
      console.info(`[Mock API] Using mockStore for matchingService.acceptMatch(${donationId})`, err);
      await new Promise((r) => setTimeout(r, 250));
      return mockStore.acceptMatch(donationId, recipientOrgId, recipientOrgName);
    }
  },

  async getDonationRecipients(donationId: string): Promise<DonationRecipientsResponse | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: DonationRecipientsResponse }>(
        `/matching/donations/${donationId}/recipients`
      );
      if (res.data && res.data.success) {
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.warn(`[Matching API] Could not fetch donation recipients for ${donationId}, using fallback:`, err);
      return {
        donation_id: donationId,
        title: 'Surplus Food Batch',
        food_type: 'prepared_meals',
        quantity_kg: 25.0,
        portions: 50,
        pickup_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        recipients: [
          {
            recipient_id: '33333333-3333-3333-3333-333333333333',
            recipient_name: 'Hope Community Shelter & Kitchen',
            org_type: 'ngo_shelter',
            address: '88 Sanctuary Lane, Central District',
            contact_phone: '+91 80 2456 7890',
            distance_km: 1.2,
            estimated_travel_time_minutes: 8,
            max_daily_meals: 250,
            refrigeration_available: true,
            score: 94.2,
            score_breakdown: {
              distanceScore: 91.6,
              urgencyScore: 90.0,
              capacityScore: 95.0,
              reliabilityScore: 96.0,
              totalScore: 94.2,
            },
            explanation: 'High proximity (1.2 km). 250 meals/day capacity with commercial refrigeration. 96% fulfillment rating.',
            status: 'suggested',
          },
          {
            recipient_id: '44444444-4444-4444-4444-444444444444',
            recipient_name: 'St. Jude Family Food Pantry',
            org_type: 'community_kitchen',
            address: '102 Mission Road, East Gate',
            contact_phone: '+91 80 2567 8901',
            distance_km: 3.4,
            estimated_travel_time_minutes: 14,
            max_daily_meals: 150,
            refrigeration_available: true,
            score: 87.5,
            score_breakdown: {
              distanceScore: 76.2,
              urgencyScore: 90.0,
              capacityScore: 92.0,
              reliabilityScore: 94.0,
              totalScore: 87.5,
            },
            explanation: 'Good proximity (3.4 km). Suitable portion size match for evening distribution pantry.',
            status: 'suggested',
          },
        ],
        total_eligible: 2,
      };
    }
  },

  async getSplitPlan(donationId: string): Promise<SplitDonationPlan | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: SplitDonationPlan }>(
        `/matching/donations/${donationId}/split-plan`
      );
      if (res.data && res.data.success) {
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.warn(`[Matching API] Could not fetch split plan for ${donationId}, using fallback:`, err);
      return {
        donation_id: donationId,
        total_portions: 200,
        total_quantity_kg: 100.0,
        is_split_recommended: true,
        allocated_portions: 200,
        unallocated_portions: 0,
        allocations: [
          {
            recipient_id: '33333333-3333-3333-3333-333333333333',
            recipient_name: 'Hope Community Shelter & Kitchen',
            allocated_portions: 120,
            allocated_quantity_kg: 60.0,
            percentage_of_total: 60.0,
            distance_km: 1.2,
            score: 94.2,
          },
          {
            recipient_id: '44444444-4444-4444-4444-444444444444',
            recipient_name: 'St. Jude Family Food Pantry',
            allocated_portions: 80,
            allocated_quantity_kg: 40.0,
            percentage_of_total: 40.0,
            distance_km: 3.4,
            score: 87.5,
          },
        ],
        notes: 'Split donation recommended across 2 recipient kitchens to ensure full utilization within the collection window.',
      };
    }
  },

  async triggerRematching(donationId: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/matching/trigger/${donationId}`
      );
      return !!(res.data && res.data.success);
    } catch (err) {
      console.warn(`[Matching API] Could not trigger re-matching for ${donationId}:`, err);
      return false;
    }
  },
};
