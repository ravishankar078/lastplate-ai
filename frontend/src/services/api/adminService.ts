import apiClient from './client';
import { mockStore } from './mockDataStore';
import { Organization, AuditLogEntry } from '../../types';

export const adminService = {
  async getOrganizations(): Promise<Organization[]> {
    try {
      const res = await apiClient.get<Organization[]>('/admin/organizations');
      return res.data;
    } catch {
      console.info('[Mock API] Using mockStore for adminService.getOrganizations()');
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getOrganizations();
    }
  },

  async verifyOrganization(orgId: string): Promise<Organization | null> {
    try {
      const res = await apiClient.post<Organization>(`/admin/organizations/${orgId}/verify`);
      return res.data;
    } catch {
      console.info(`[Mock API] Using mockStore for adminService.verifyOrganization(${orgId})`);
      await new Promise((r) => setTimeout(r, 250));
      return mockStore.verifyOrganization(orgId);
    }
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const res = await apiClient.get<AuditLogEntry[]>('/admin/audit-logs');
      return res.data;
    } catch {
      console.info('[Mock API] Using mockStore for adminService.getAuditLogs()');
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getAuditLogs();
    }
  },
};
