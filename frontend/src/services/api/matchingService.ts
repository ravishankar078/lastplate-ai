import apiClient from './client';
import { mockStore } from './mockDataStore';
import { MatchRecommendation } from '../../types';

export const matchingService = {
  async getRecommendationsForNGO(ngoOrgId: string): Promise<MatchRecommendation[]> {
    try {
      const res = await apiClient.get<MatchRecommendation[]>(`/matching/recommendations?recipientId=${ngoOrgId}`);
      return res.data;
    } catch {
      console.info(`[Mock API] Using mockStore for matchingService.getRecommendationsForNGO(${ngoOrgId})`);
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getMatchesForNGO(ngoOrgId);
    }
  },

  async acceptMatch(donationId: string, recipientOrgId: string, recipientOrgName: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean }>(`/matching/accept`, {
        donationId,
        recipientOrgId,
      });
      return res.data.success;
    } catch {
      console.info(`[Mock API] Using mockStore for matchingService.acceptMatch(${donationId})`);
      await new Promise((r) => setTimeout(r, 250));
      return mockStore.acceptMatch(donationId, recipientOrgId, recipientOrgName);
    }
  },
};
