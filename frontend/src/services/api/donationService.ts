import apiClient from './client';
import { mockStore } from './mockDataStore';
import { Donation, CreateDonationDTO, FoodType, DonationStatus } from '../../types';

function mapApiDonationToFrontend(item: any): Donation {
  return {
    id: String(item.id),
    donorOrgId: String(item.donor_organization_id),
    donorOrgName: item.donor_organization_name || 'The Grand Heritage Bistro',
    donorType: 'Restaurant',
    title: item.title,
    description: item.description || '',
    foodType: (item.food_type === 'cooked_meals' ? 'prepared_meals' : item.food_type) as FoodType,
    quantityKg: Number(item.quantity_kg),
    estimatedMeals: Number(item.portions),
    preparationTime: item.preparation_time,
    pickupDeadline: item.pickup_deadline,
    storageCondition: item.storage_condition,
    measuredTemperatureCelsius: item.measured_temp_c,
    allergens: item.allergens || [],
    packagingType: 'Sanitized food-grade containers',
    pickupLocation: {
      address: '42 Promenade Avenue, Downtown Core',
      city: 'Downtown Core',
      latitude: 12.9716,
      longitude: 77.5946,
      postalCode: '560001',
    },
    status: item.status as DonationStatus,
    safetyHoldReason: item.safety_notes,
    verificationMethod: 'QR',
    pinCode: '749216',
    verificationToken: `vtok_sec_${item.id}`,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export const donationService = {
  async getAll(): Promise<Donation[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/donations');
      if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data.map(mapApiDonationToFrontend);
      }
      return mockStore.getDonations();
    } catch {
      console.info('[Mock API] Using mockStore for donationService.getAll()');
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getDonations();
    }
  },

  async getById(id: string): Promise<Donation | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(`/donations/${id}`);
      if (res.data && res.data.success && res.data.data) {
        return mapApiDonationToFrontend(res.data.data);
      }
      return mockStore.getDonationById(id) || null;
    } catch {
      console.info(`[Mock API] Using mockStore for donationService.getById(${id})`);
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getDonationById(id) || null;
    }
  },

  async create(dto: CreateDonationDTO, donorOrgId: string, donorOrgName: string): Promise<Donation> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/donations', {
        title: dto.title,
        description: dto.description,
        food_type: dto.foodType,
        quantity_kg: dto.quantityKg,
        portions: dto.estimatedMeals,
        preparation_time: dto.preparationTime,
        pickup_deadline: dto.pickupDeadline,
        storage_condition: dto.storageCondition,
        measured_temp_c: dto.measuredTemperatureCelsius,
        allergens: dto.allergens,
        packaging_type: dto.packagingType,
      });

      if (res.data && res.data.success && res.data.data) {
        return mapApiDonationToFrontend(res.data.data);
      }
      return mockStore.createDonation(dto, donorOrgId, donorOrgName);
    } catch (err) {
      console.info('[Mock API] Using mockStore for donationService.create()', err);
      await new Promise((r) => setTimeout(r, 300));
      return mockStore.createDonation(dto, donorOrgId, donorOrgName);
    }
  },

  async cancel(id: string, reason: string): Promise<Donation | null> {
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(`/donations/${id}/cancel`, { reason });
      if (res.data && res.data.success && res.data.data) {
        return mapApiDonationToFrontend(res.data.data);
      }
      return mockStore.cancelDonation(id, reason);
    } catch {
      console.info(`[Mock API] Using mockStore for donationService.cancel(${id})`);
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.cancelDonation(id, reason);
    }
  },
};
