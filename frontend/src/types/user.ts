export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'admin';

export type UserStatus = 'active' | 'pending_verification' | 'suspended';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  organizationId?: string;
  organizationName?: string;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  role: UserRole;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phone: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationType?: string;
  capacityMeals?: number;
}
