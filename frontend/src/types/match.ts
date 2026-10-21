import { Donation } from './donation';
import { Organization } from './organization';

export type MatchStatus = 'recommended' | 'accepted' | 'declined' | 'expired' | 'cancelled';

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
