import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (role: UserRole, email?: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USERS: Record<UserRole, User> = {
  donor: {
    id: 'usr-donor-01',
    email: 'chef.maya@grandbistro.com',
    fullName: 'Chef Maya Lin',
    role: 'donor',
    phone: '+1 (555) 392-8172',
    organizationId: 'org-donor-01',
    organizationName: 'The Grand Heritage Bistro',
    status: 'active',
    createdAt: '2026-01-15T08:00:00Z',
  },
  ngo: {
    id: 'usr-ngo-01',
    email: 'intake@hopecommunityshelter.org',
    fullName: 'Rev. Marcus Vance',
    role: 'ngo',
    phone: '+1 (555) 728-4901',
    organizationId: 'org-ngo-01',
    organizationName: 'Hope Community Shelter & Kitchen',
    status: 'active',
    createdAt: '2026-01-10T09:30:00Z',
  },
  volunteer: {
    id: 'usr-vol-01',
    email: 'alex.rivera.courier@gmail.com',
    fullName: 'Alex Rivera',
    role: 'volunteer',
    phone: '+1 (555) 819-2041',
    status: 'active',
    createdAt: '2026-02-01T14:15:00Z',
  },
  admin: {
    id: 'usr-adm-01',
    email: 'admin.dispatch@lastplate.org',
    fullName: 'Sarah Chen',
    role: 'admin',
    phone: '+1 (800) 527-8752',
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

  const login = async (selectedRole: UserRole, email?: string) => {
    // Simulated auth delay
    await new Promise((res) => setTimeout(res, 300));
    const targetUser = DEMO_USERS[selectedRole];
    const resolvedUser = email ? { ...targetUser, email } : targetUser;
    const dummyToken = `demo_jwt_token_${selectedRole}_${Date.now()}`;
    setUser(resolvedUser);
    setToken(dummyToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('lastplate_user');
    localStorage.removeItem('lastplate_token');
  };

  const switchRole = (newRole: UserRole) => {
    const targetUser = DEMO_USERS[newRole];
    setUser(targetUser);
    setToken(`demo_jwt_token_${newRole}_${Date.now()}`);
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
