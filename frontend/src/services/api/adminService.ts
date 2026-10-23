import apiClient from './client';
import { mockStore } from './mockDataStore';
import { 
  AuditLogEntry, 
  AdminAnalyticsOverview, 
  AdminOrganizationItem, 
  FlaggedDonationItem,
  ImpactStats
} from '../../types';

export const adminService = {
  /**
   * Retrieves operational analytics and computed impact metrics from real backend database.
   */
  async getAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminAnalyticsOverview }>(
        '/admin/analytics/overview'
      );
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
      return fallbackAnalytics;
    } catch (err) {
      console.warn('[Admin API] Falling back to default analytics overview:', err);
      return fallbackAnalytics;
    }
  },

  /**
   * Retrieves all registered donor and NGO organizations with metrics.
   */
  async getOrganizations(): Promise<AdminOrganizationItem[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminOrganizationItem[] }>(
        '/admin/organizations'
      );
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return (mockStore.getOrganizations() as any);
    } catch {
      console.info('[Mock API] Using mockStore for adminService.getOrganizations()');
      await new Promise((r) => setTimeout(r, 200));
      return (mockStore.getOrganizations() as any);
    }
  },

  /**
   * Verifies and approves organization credentials.
   */
  async verifyOrganization(orgId: string): Promise<AdminOrganizationItem | null> {
    try {
      const res = await apiClient.post<{ success: boolean; data: AdminOrganizationItem }>(
        `/admin/organizations/${orgId}/verify`,
        { is_verified: true, verification_notes: "Approved by Platform Administrator." }
      );
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
      return (mockStore.verifyOrganization(orgId) as any);
    } catch {
      console.info(`[Mock API] Using mockStore for adminService.verifyOrganization(${orgId})`);
      await new Promise((r) => setTimeout(r, 250));
      return (mockStore.verifyOrganization(orgId) as any);
    }
  },

  /**
   * Suspends an organization's active operations.
   */
  async suspendOrganization(orgId: string, notes?: string): Promise<AdminOrganizationItem | null> {
    try {
      const res = await apiClient.post<{ success: boolean; data: AdminOrganizationItem }>(
        `/admin/organizations/${orgId}/suspend`,
        { is_verified: false, verification_notes: notes || "Suspended pending review." }
      );
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.warn(`[Admin API] Error suspending organization ${orgId}:`, err);
      return null;
    }
  },

  /**
   * Retrieves immutable audit logs joined with actor details.
   */
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/admin/audit-logs');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          performedByUserId: log.actor_id || '',
          performedByName: log.actor_name || 'System Automation',
          performedByRole: log.actor_role || 'system',
          ipAddress: log.ip_address || '127.0.0.1',
          details: log.payload_after || log.payload_before || {},
          timestamp: log.timestamp,
        }));
      }
      return mockStore.getAuditLogs();
    } catch {
      console.info('[Mock API] Using mockStore for adminService.getAuditLogs()');
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getAuditLogs();
    }
  },

  /**
   * Retrieves donations currently held for food safety review.
   */
  async getFlaggedDonations(): Promise<FlaggedDonationItem[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: FlaggedDonationItem[] }>(
        '/admin/donations/flagged'
      );
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    } catch (err) {
      console.warn('[Admin API] Error loading flagged donations:', err);
      return [];
    }
  },

  /**
   * Reviews and either clears or quarantine-rejects a held donation.
   */
  async reviewFlaggedDonation(
    donationId: string, 
    action: 'release' | 'quarantine_reject', 
    adminNotes: string
  ): Promise<FlaggedDonationItem | null> {
    try {
      const res = await apiClient.post<{ success: boolean; data: FlaggedDonationItem }>(
        `/admin/donations/${donationId}/review`,
        { action, admin_notes: adminNotes }
      );
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.warn(`[Admin API] Error reviewing donation ${donationId}:`, err);
      return null;
    }
  },

  /**
   * Public impact stats for landing page and impact section.
   */
  async getPublicImpact(): Promise<ImpactStats> {
    try {
      const res = await apiClient.get<{ success: boolean; data: ImpactStats }>('/impact');
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
      return fallbackImpact;
    } catch (err) {
      console.warn('[Admin API] Error loading public impact metrics:', err);
      return fallbackImpact;
    }
  },
};

const fallbackAnalytics: AdminAnalyticsOverview = {
  total_donations: 86,
  completed_donations: 82,
  active_donations: 4,
  total_meals_rescued: 42850,
  total_quantity_kg: 18854.0,
  co2_avoided_kg: 47135.0,
  landfill_diversion_rate: 98.6,
  active_donors: 184,
  verified_ngos: 62,
  active_volunteers: 310,
  avg_pickup_time_minutes: 24.5,
  food_safety_compliance_rate: 99.4,
  category_breakdown: {
    cooked_meals: 38,
    bakery: 24,
    raw_produce: 14,
    packaged_goods: 8,
    dairy_chilled: 2,
  },
  status_breakdown: {
    delivered: 82,
    in_transit: 2,
    accepted: 1,
    available: 1,
  },
  daily_trends: [
    { date: 'Oct 17', meals: 280, weight_kg: 123.2, co2_kg: 308.0 },
    { date: 'Oct 18', meals: 340, weight_kg: 149.6, co2_kg: 374.0 },
    { date: 'Oct 19', meals: 310, weight_kg: 136.4, co2_kg: 341.0 },
    { date: 'Oct 20', meals: 420, weight_kg: 184.8, co2_kg: 462.0 },
    { date: 'Oct 21', meals: 390, weight_kg: 171.6, co2_kg: 429.0 },
    { date: 'Oct 22', meals: 450, weight_kg: 198.0, co2_kg: 495.0 },
    { date: 'Oct 23', meals: 510, weight_kg: 224.4, co2_kg: 561.0 },
  ],
  is_sample_baseline: true,
};

const fallbackImpact: ImpactStats = {
  mealsRescued: 42850,
  co2AvoidedKg: 47135,
  activeDonors: 184,
  verifiedNGOs: 62,
  activeVolunteers: 310,
  avgPickupTimeMinutes: 38,
  landfillDiversionKg: 18854,
  isSampleData: true,
};
