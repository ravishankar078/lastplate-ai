import apiClient from './client';
import { mockStore } from './mockDataStore';
import { MatchRecommendation } from '../../types';

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
};
