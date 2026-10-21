import apiClient from './client';
import { mockStore } from './mockDataStore';
import { Donation, CreateDonationDTO } from '../../types';

export const donationService = {
  async getAll(): Promise<Donation[]> {
    try {
      const res = await apiClient.get<Donation[]>('/donations');
      return res.data;
    } catch {
      console.info('[Mock API] Using mockStore for donationService.getAll()');
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getDonations();
    }
  },

  async getById(id: string): Promise<Donation | null> {
    try {
      const res = await apiClient.get<Donation>(`/donations/${id}`);
      return res.data;
    } catch {
      console.info(`[Mock API] Using mockStore for donationService.getById(${id})`);
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getDonationById(id) || null;
    }
  },

  async create(dto: CreateDonationDTO, donorOrgId: string, donorOrgName: string): Promise<Donation> {
    try {
      const res = await apiClient.post<Donation>('/donations', dto);
      return res.data;
    } catch {
      console.info('[Mock API] Using mockStore for donationService.create()');
      await new Promise((r) => setTimeout(r, 300));
      return mockStore.createDonation(dto, donorOrgId, donorOrgName);
    }
  },

  async cancel(id: string, reason: string): Promise<Donation | null> {
    try {
      const res = await apiClient.post<Donation>(`/donations/${id}/cancel`, { reason });
      return res.data;
    } catch {
      console.info(`[Mock API] Using mockStore for donationService.cancel(${id})`);
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.cancelDonation(id, reason);
    }
  },
};
