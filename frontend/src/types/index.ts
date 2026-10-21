export * from './user';
export * from './organization';
export * from './donation';
export * from './match';
export * from './route';
export * from './audit';

// Public site specific contracts (Phase 1)
export interface ImpactStats {
  mealsRescued: number;
  co2AvoidedKg: number;
  activeDonors: number;
  verifiedNGOs: number;
  activeVolunteers: number;
  avgPickupTimeMinutes: number;
  landfillDiversionKg: number;
  isSampleData: boolean;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  organization: string;
  userType: 'donor' | 'ngo' | 'volunteer';
  avatarInitials: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'donors' | 'ngos' | 'volunteers' | 'safety';
}

// Lightweight item used for public homepage showcase
export interface DonationItem {
  id: string;
  donorName: string;
  donorType: 'Restaurant' | 'Bakery' | 'Caterer' | 'Canteen' | 'Supermarket';
  title: string;
  description: string;
  foodType: import('./donation').FoodType;
  quantityKg: number;
  estimatedMeals: number;
  preparationTime: string;
  pickupDeadline: string;
  storageCondition: import('./donation').StorageCondition;
  allergens: string[];
  distanceKm: number;
  status: import('./donation').DonationStatus;
  urgencyScore: number;
  recipientName?: string;
  verificationMethod: 'QR' | 'PIN';
}
