export type AuditAction = 
  | 'DONATION_CREATED'
  | 'SAFETY_HOLD_APPLIED'
  | 'SAFETY_HOLD_CLEARED'
  | 'MATCH_RECOMMENDED'
  | 'MATCH_ACCEPTED'
  | 'MATCH_DECLINED'
  | 'ROUTE_OPTIMIZED'
  | 'VOLUNTEER_ASSIGNED'
  | 'PICKUP_CONFIRMED'
  | 'DELIVERY_CONFIRMED'
  | 'DONATION_CANCELLED'
  | 'ORGANIZATION_VERIFIED'
  | 'ACCOUNT_SUSPENDED';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: 'Donation' | 'Organization' | 'User' | 'Route' | 'Verification';
  entityId: string;
  performedByUserId: string;
  performedByName: string;
  performedByRole: string;
  ipAddress?: string;
  details: Record<string, unknown>;
  timestamp: string; // ISO
}

export type NotificationType = 'info' | 'action_required' | 'warning' | 'success';

export interface SystemNotification {
  id: string;
  userId?: string;
  targetRole?: 'donor' | 'ngo' | 'volunteer' | 'admin' | 'all';
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}
