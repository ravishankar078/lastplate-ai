import apiClient from './client';
import { mockStore } from './mockDataStore';
import { RoutePlan } from '../../types';

export const volunteerService = {
  async getActiveRoute(): Promise<RoutePlan> {
    try {
      const res = await apiClient.get<RoutePlan>('/routes/active');
      return res.data;
    } catch {
      console.info('[Mock API] Using mockStore for volunteerService.getActiveRoute()');
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getRoutePlan();
    }
  },

  async verifyStopHandover(stopId: string, verificationCode: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ verified: boolean }>('/routes/verify-stop', {
        stopId,
        code: verificationCode,
      });
      return res.data.verified;
    } catch {
      console.info(`[Mock API] Using mockStore for volunteerService.verifyStopHandover(${stopId})`);
      await new Promise((r) => setTimeout(r, 300));
      return mockStore.verifyStop(stopId, verificationCode);
    }
  },
};
