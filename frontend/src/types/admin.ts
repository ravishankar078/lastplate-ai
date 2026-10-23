/**
 * Types for Administrative Oversight, Analytics, and Regulatory Compliance.
 */

export interface DailyImpactTrend {
  date: string;
  meals: number;
  weight_kg: number;
  co2_kg: number;
}

export interface AdminAnalyticsOverview {
  total_donations: number;
  completed_donations: number;
  active_donations: number;
  total_meals_rescued: number;
  total_quantity_kg: number;
  co2_avoided_kg: number;
  landfill_diversion_rate: number;
  active_donors: number;
  verified_ngos: number;
  active_volunteers: number;
  avg_pickup_time_minutes: number;
  food_safety_compliance_rate: number;
  category_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  daily_trends: DailyImpactTrend[];
  is_sample_baseline: boolean;
}

export interface AdminOrganizationItem {
  id: string;
  name: string;
  org_type: string;
  category: 'donor' | 'ngo';
  address: string;
  postal_code: string;
  contact_phone: string;
  contact_email: string;
  is_verified: boolean;
  verification_notes?: string;
  created_at: string;
  active_posts_count: number;
  completed_rescues_count: number;
}

export interface FlaggedDonationItem {
  id: string;
  donor_organization_id: string;
  donor_name: string;
  title: string;
  food_type: string;
  quantity_kg: number;
  portions: number;
  storage_condition: string;
  measured_temp_c?: number;
  status: string;
  safety_notes?: string;
  created_at: string;
}
