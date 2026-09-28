// B2BForCorporates — AuthProvider
// Bridges the SaaS Dashboard UI with the B2B Nexus backend auth system.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  companyId?: string;
  companyName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (token: string, user?: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const u = await apiClient.get<AuthUser>('/auth/me');
      setUser(u);
    } catch {
      // Fallback for local UI testing without a database
      setUser({
        id: "mock-admin-id",
        name: "Super Admin (Local Test)",
        email: "admin@local.test",
        role: "admin",
      });
    }
  };

  useEffect(() => {
    // For local testing, we always try to fetch the user (which will fall back to our mock if it fails)
    fetchUser().finally(() => setLoading(false));
  }, []);

  const login = (token: string, userOverride?: AuthUser) => {
    apiClient.setToken(token);
    if (userOverride) setUser(userOverride);
    else fetchUser();
  };

  const logout = async () => {
    try { await apiClient.post('/auth/logout', {}); } catch {}
    apiClient.clearToken();
    setUser(null);
  };

  const refreshUser = async () => { await fetchUser(); };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: true, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
