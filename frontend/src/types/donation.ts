import { GeoLocation } from './organization';

export type FoodType = 
  | 'prepared_meals' 
  | 'baked_goods' 
  | 'produce' 
  | 'dairy_refrigerated' 
  | 'packaged_groceries';

export type StorageCondition = 
  | 'ambient' 
  | 'refrigerated' 
  | 'frozen' 
  | 'hot_holding';

export type DonationStatus = 
  | 'draft'
  | 'pending_triage'
  | 'safety_hold'
  | 'available'
  | 'matched'
  | 'accepted'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'expired'
  | 'cancelled';

export type Allergen = 
  | 'Gluten' 
  | 'Dairy' 
  | 'Eggs' 
  | 'Nuts' 
  | 'Peanuts' 
  | 'Soy' 
  | 'Shellfish' 
  | 'Fish' 
  | 'Sesame';

export interface Donation {
  id: string;
  donorOrgId: string;
  donorOrgName: string;
  donorType: string;
  title: string;
  description: string;
  foodType: FoodType;
  quantityKg: number;
  estimatedMeals: number;
  preparationTime: string; // ISO timestamp
  pickupDeadline: string;  // ISO timestamp
  storageCondition: StorageCondition;
  measuredTemperatureCelsius?: number;
  allergens: Allergen[];
  packagingType: string; // e.g. "Stainless inserts", "Sanitized food-grade containers"
  pickupLocation: GeoLocation;
  status: DonationStatus;
  safetyHoldReason?: string;
  safetyReviewedBy?: string;
  recipientOrgId?: string;
  recipientOrgName?: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  verificationMethod: 'QR' | 'PIN';
  verificationToken?: string;
  pinCode?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface CreateDonationDTO {
  title: string;
  description: string;
  foodType: FoodType;
  quantityKg: number;
  estimatedMeals: number;
  preparationTime: string;
  pickupDeadline: string;
  storageCondition: StorageCondition;
  measuredTemperatureCelsius?: number;
  allergens: Allergen[];
  packagingType: string;
  address?: string;
}
