// B2BForCorporates — AuthProvider
// Bridges the SaaS Dashboard UI with the B2B Nexus backend auth system.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { socketService } from '../services/socketService';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  emailNotifications?: boolean;
  phoneVerified?: boolean;
  // Account role: only admin vs regular user. "Buyer"/"seller" is a role per deal (see lib/dealRole.ts).
  // The API sends it uppercase (USER/ADMIN); compare case-insensitively.
  role: 'user' | 'admin' | 'USER' | 'ADMIN';
  companyId?: string;
  companyName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (session: { user?: AuthUser; csrfToken?: string }) => void;
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
      // setUser({
      //   id: "mock-admin-id",
      //   name: "Super Admin (Local Test)",
      //   email: "admin@local.test",
      //   role: "admin",
      // });
      setUser(null);
    }
  };

  useEffect(() => {
    // For local testing, we always try to fetch the user (which will fall back to our mock if it fails)
    fetchUser().finally(() => setLoading(false));
  }, []);

  // The server has already set the httpOnly auth cookies; we only keep the user and the in-memory CSRF token.
  const login = ({ user: userOverride, csrfToken }: { user?: AuthUser; csrfToken?: string }) => {
    apiClient.setCsrfToken(csrfToken);
    if (userOverride) setUser(userOverride);
    else fetchUser();
  };

  const logout = async () => {
    try { await apiClient.post('/auth/logout', {}); } catch {}
    apiClient.clearSession();
    socketService.disconnect();
    setUser(null);
  };

  const refreshUser = async () => { await fetchUser(); };

  // The server tells us when this account changes elsewhere (for example the email link was clicked in another tab or
  // on a phone), so the whole app updates at once without a refresh.
  useEffect(() => {
    if (!user) return;
    socketService.connect();
    return socketService.on('user:updated', () => { void fetchUser(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // UI convenience only — the backend enforces admin access on every /api/admin request.
  const isAdmin = user?.role?.toString().toLowerCase() === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
