export type OrganizationType = 
  | 'Restaurant' 
  | 'Bakery' 
  | 'Caterer' 
  | 'Canteen' 
  | 'Supermarket' 
  | 'Shelter' 
  | 'CommunityKitchen' 
  | 'FoodPantry';

export type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'suspended';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  postalCode: string;
}

export interface OperatingHours {
  days: string[]; // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  openTime: string; // e.g. '08:00'
  closeTime: string; // e.g. '21:00'
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  category: 'donor' | 'recipient';
  contactPerson: string;
  email: string;
  phone: string;
  location: GeoLocation;
  verificationStatus: VerificationStatus;
  licenseNumber?: string;
  taxExemptId?: string; // 501(c)(3) or charitable ID
  dailyCapacityMeals?: number;
  acceptedFoodTypes?: string[];
  refrigerationAvailable?: boolean;
  hotHoldingAvailable?: boolean;
  operatingHours: OperatingHours;
  reliabilityScore: number; // 0-100 historical metric
  createdAt: string;
}
