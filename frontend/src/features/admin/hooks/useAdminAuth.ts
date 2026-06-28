import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/shared/lib/api';
import { clearAdminToken } from '@/features/admin/lib/adminSession';

interface AuthState {
  authenticated: boolean;
  email: string | null;
  loading: boolean;
}

type AdminAuthContextValue = AuthState & {
  checkAuth: (options?: { force?: boolean }) => Promise<AuthState>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
};

const INITIAL_AUTH_STATE: AuthState = {
  authenticated: false,
  email: null,
  loading: true,
};

const UNAUTHENTICATED_STATE: AuthState = {
  authenticated: false,
  email: null,
  loading: false,
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

let authCache: AuthState | null = null;
let authRequest: Promise<AuthState> | null = null;

function setAuthCache(next: AuthState): AuthState {
  authCache = next;
  return next;
}

async function fetchAdminAuthState(): Promise<AuthState> {
  if (authRequest) return authRequest;

  authRequest = (async () => {
    try {
      const base = getApiBaseUrl();
      const url = `${base}/api/v1/auth/me`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        clearAdminToken();
        return setAuthCache(UNAUTHENTICATED_STATE);
      }

      const data = await response.json().catch(() => null);

      if (data?.email) {
        return setAuthCache({
          authenticated: true,
          email: data.email,
          loading: false,
        });
      }

      clearAdminToken();
      return setAuthCache(UNAUTHENTICATED_STATE);
    } catch {
      clearAdminToken();
      return setAuthCache(UNAUTHENTICATED_STATE);
    } finally {
      authRequest = null;
    }
  })();

  return authRequest;
}

export function invalidateAdminAuthCache() {
  authCache = null;
  authRequest = null;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(authCache ?? INITIAL_AUTH_STATE);
  const navigate = useNavigate();

  const checkAuth = useCallback(async (options: { force?: boolean } = {}) => {
    if (options.force) {
      invalidateAdminAuthCache();
    }

    if (authCache && !options.force) {
      setAuth(authCache);
      return authCache;
    }

    const next = await fetchAdminAuthState();
    setAuth(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (authCache) {
      setAuth(authCache);
      if (!authCache.loading) {
        return () => {
          cancelled = true;
        };
      }
    }

    void (async () => {
      const next = await checkAuth();
      if (!cancelled) {
        setAuth(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      const base = getApiBaseUrl();
      await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      clearAdminToken();
      setAuth(setAuthCache(UNAUTHENTICATED_STATE));
      navigate('/admin/login');
    }
  }, [navigate]);

  const getAuthHeaders = useCallback(() => {
    return { 'Content-Type': 'application/json' };
  }, []);

  const value = useMemo<AdminAuthContextValue>(() => ({
    ...auth,
    checkAuth,
    logout,
    getAuthHeaders,
  }), [auth, checkAuth, logout, getAuthHeaders]);

  return createElement(AdminAuthContext.Provider, { value }, children);
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }

  return context;
};
