import { Donation } from './donation';
import { Organization } from './organization';

export type MatchStatus = 'recommended' | 'suggested' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface ScoreBreakdown {
  distanceScore: number;     // 35% weight
  urgencyScore: number;      // 30% weight
  capacityScore: number;     // 20% weight
  reliabilityScore: number;  // 15% weight
  totalScore: number;        // Composite 0-100
}

export interface MatchRecommendation {
  id: string;
  donationId: string;
  donation: Donation;
  recipientOrgId: string;
  recipientOrg?: Organization;
  scoreBreakdown: ScoreBreakdown;
  explanation: string;
  estimatedTravelTimeMinutes: number;
  roadDistanceKm: number;
  status: MatchStatus;
  expiresAt: string; // ISO timestamp
  createdAt: string;
}

export interface RecipientMatch {
  recipient_id: string;
  recipient_name: string;
  org_type: string;
  address: string;
  contact_phone: string;
  distance_km: number;
  estimated_travel_time_minutes: number;
  max_daily_meals: number;
  refrigeration_available: boolean;
  score: number;
  score_breakdown: ScoreBreakdown;
  explanation: string;
  status: string;
  match_id?: string;
}

export interface DonationRecipientsResponse {
  donation_id: string;
  title: string;
  food_type: string;
  quantity_kg: number;
  portions: number;
  pickup_deadline: string;
  recipients: RecipientMatch[];
  total_eligible: number;
}

export interface SplitDonationAllocation {
  recipient_id: string;
  recipient_name: string;
  allocated_portions: number;
  allocated_quantity_kg: number;
  percentage_of_total: number;
  distance_km: number;
  score: number;
}

export interface SplitDonationPlan {
  donation_id: string;
  total_portions: number;
  total_quantity_kg: number;
  is_split_recommended: boolean;
  allocated_portions: number;
  unallocated_portions: number;
  allocations: SplitDonationAllocation[];
  notes: string;
}
