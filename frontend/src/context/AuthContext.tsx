import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import apiClient from '../services/api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (role: UserRole, email?: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_CREDENTIALS: Record<UserRole, { email: string; password: string; name: string; org: string }> = {
  donor: {
    email: 'chef@grandbistro.org',
    password: 'LastPlate#2026',
    name: 'Elena Rostova',
    org: 'The Grand Heritage Bistro',
  },
  ngo: {
    email: 'director@hopeshelter.org',
    password: 'LastPlate#2026',
    name: 'Rev. Marcus Vance',
    org: 'Hope Community Shelter & Kitchen',
  },
  volunteer: {
    email: 'priya.volunteer@gmail.com',
    password: 'LastPlate#2026',
    name: 'Priya Sharma',
    org: 'Volunteer Logistics',
  },
  admin: {
    email: 'admin@lastplate.org',
    password: 'LastPlate#2026',
    name: 'Sarah Jenkins',
    org: 'LastPlate Central Dispatch',
  },
};

const DEMO_USERS: Record<UserRole, User> = {
  donor: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'chef@grandbistro.org',
    fullName: 'Elena Rostova',
    role: 'donor',
    phone: '+91 98765 43210',
    organizationId: '11111111-1111-1111-1111-111111111111',
    organizationName: 'The Grand Heritage Bistro',
    status: 'active',
    createdAt: '2026-01-15T08:00:00Z',
  },
  ngo: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'director@hopeshelter.org',
    fullName: 'Rev. Marcus Vance',
    role: 'ngo',
    phone: '+91 98765 43211',
    organizationId: '33333333-3333-3333-3333-333333333333',
    organizationName: 'Hope Community Shelter & Kitchen',
    status: 'active',
    createdAt: '2026-01-10T09:30:00Z',
  },
  volunteer: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'priya.volunteer@gmail.com',
    fullName: 'Priya Sharma',
    role: 'volunteer',
    phone: '+91 98765 43212',
    status: 'active',
    createdAt: '2026-02-01T14:15:00Z',
  },
  admin: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'admin@lastplate.org',
    fullName: 'Sarah Jenkins',
    role: 'admin',
    phone: '+91 98765 43213',
    organizationName: 'LastPlate Central Dispatch',
    status: 'active',
    createdAt: '2025-11-01T00:00:00Z',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lastplate_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('lastplate_token');
  });

  const role: UserRole = user?.role || 'donor';

  useEffect(() => {
    if (user) {
      localStorage.setItem('lastplate_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lastplate_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('lastplate_token', token);
    } else {
      localStorage.removeItem('lastplate_token');
    }
  }, [token]);

  const login = async (selectedRole: UserRole, email?: string, password?: string): Promise<boolean> => {
    const creds = ROLE_CREDENTIALS[selectedRole];
    const targetEmail = email || creds.email;
    const targetPassword = password || creds.password;

    try {
      const response = await apiClient.post('/auth/login', {
        email: targetEmail,
        password: targetPassword,
      });

      if (response.data && response.data.success && response.data.data) {
        const { access_token, user: apiUser, organization: apiOrg } = response.data.data;
        const mappedUser: User = {
          id: apiUser.id,
          email: apiUser.email,
          fullName: apiUser.full_name,
          role: apiUser.role as UserRole,
          phone: apiUser.phone || '',
          organizationId: apiOrg?.id || apiUser.organization_id,
          organizationName: apiOrg?.name || creds.org,
          status: apiUser.is_active ? 'active' : 'suspended',
          createdAt: apiUser.created_at,
        };
        setUser(mappedUser);
        setToken(access_token);
        return true;
      }
    } catch (err) {
      console.warn('[AuthContext] Backend API login failed or offline. Using local persona fallback.', err);
    }

    // Fallback to local demo persona store
    const targetUser = DEMO_USERS[selectedRole];
    const resolvedUser = email ? { ...targetUser, email } : targetUser;
    const dummyToken = `demo_jwt_token_${selectedRole}_${Date.now()}`;
    setUser(resolvedUser);
    setToken(dummyToken);
    return true;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('lastplate_user');
    localStorage.removeItem('lastplate_token');
  };

  const switchRole = async (newRole: UserRole) => {
    await login(newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
