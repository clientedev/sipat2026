import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getStoredToken, setStoredToken } from '../lib/api';
import { reconnectSocketWithAuth } from '../lib/socket';

export interface AuthUserProfile {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  registrationCode: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EVALUATOR' | 'PARTICIPANT';
  totalPoints: number;
  level: number;
  levelTitle: string;
  levelProgressPercent: number;
  nextLevelPoints: number | null;
  avatarUrl: string | null;
  isMinor: boolean;
  imageConsent: boolean;
  classGroup: {
    id: string;
    code: string;
    name: string;
    courseArea: string;
    shift: string;
  } | null;
}

export interface PublicAppConfig {
  schoolName: string;
  eventTitle: string;
  eventTheme: string;
  eventSlogan: string;
  eventStartDate: string;
  eventEndDate: string;
  officialLogoUrl: string | null;
  registrationOpen: boolean;
  activeQrCode: string | null;
  registrationUrl: string;
  qrDataUrl: string | null;
  classes: Array<{
    id: string;
    code: string;
    name: string;
    courseArea: string;
    shift: string;
  }>;
  programPreview: Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    difficulty: string;
    eventDay: number;
    eventDateLabel: string;
    points: number;
    status: string;
    opensAt: string | null;
  }>;
  badges: Array<{
    slug: string;
    name: string;
    description: string;
    iconName: string;
    accentColor: string;
  }>;
  vapidPublicKey: string | null;
}

interface AuthContextValue {
  user: AuthUserProfile | null;
  loading: boolean;
  publicConfig: PublicAppConfig | null;
  setSession: (token: string, user: AuthUserProfile) => void;
  refreshUser: () => Promise<void>;
  refreshPublicConfig: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicAppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPublicConfig = useCallback(async () => {
    try {
      const cfg = await apiFetch<PublicAppConfig>('/api/public/config');
      setPublicConfig(cfg);
    } catch {
      // ignore offline
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: AuthUserProfile }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
      if (getStoredToken()) {
        setStoredToken(null);
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([refreshPublicConfig(), refreshUser()]).finally(() => {
      setLoading(false);
    });
  }, [refreshPublicConfig, refreshUser]);

  const setSession = useCallback((token: string, newUser: AuthUserProfile) => {
    setStoredToken(token);
    setUser(newUser);
    reconnectSocketWithAuth();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    reconnectSocketWithAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        publicConfig,
        setSession,
        refreshUser,
        refreshPublicConfig,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  return ctx;
}
