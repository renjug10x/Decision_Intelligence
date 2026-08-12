'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AuthContextType, User, AuthResponse, ValidateTokenResponse } from '@/types/auth';
import { UserRole } from '@/types/auth';
import { getAuthApiService, createAuthService, setUnauthorizedCallback } from '@/services';
import { env } from '@/config/environment';
import { appRoutes } from '@/config/routes';
import { normalizeRole } from '@/utils/roleUtils';

export const COGNIX_DEMO_USER: User = {
  userId: 'DEMO-EXEC-01',
  username: 'Demo User',
  firstName: 'Demo',
  lastName: 'User',
  role: UserRole.ADMIN,
  email: 'demo.user@g10x.com',
  organization_id: 'G10X',
  tenant_id: 'G10X',
  isLoggedIn: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function recordToUser(raw: Record<string, unknown>, roleOverride?: UserRole | string): User {
  const roleRaw = raw.role ?? raw.user_role;
  const normalized =
    (roleOverride !== undefined ? normalizeRole(String(roleOverride)) : normalizeRole(roleRaw as string)) ||
    UserRole.USER;
  return {
    userId: (raw.userId ?? raw.id ?? raw.user_id) as string | undefined,
    username: (raw.username ?? raw.name ?? raw.email) as string | undefined,
    firstName: (raw.firstName ?? raw.first_name) as string | undefined,
    lastName: (raw.lastName ?? raw.last_name) as string | undefined,
    role: normalized,
    email: raw.email as string | undefined,
    organization_id: (raw.organization_id ?? raw.org_id) as string | undefined,
    tenant_id: (raw.tenant_id ?? raw.organization_id) as string | undefined,
    isLoggedIn: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const apiService = useMemo(() => getAuthApiService(), []);
  const authService = useMemo(() => createAuthService(apiService), [apiService]);

  const clearLocalAuth = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(env.JWT_STORAGE_KEY);
      localStorage.removeItem(env.USER_STORAGE_KEY);
    }
    authService.clearToken();
  }, [authService]);

  const handleUnauthorized = useCallback(() => {
    clearLocalAuth();
    router.push(appRoutes.login);
  }, [clearLocalAuth, router]);

  useEffect(() => {
    setUnauthorizedCallback(handleUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [handleUnauthorized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === env.LOGOUT_EVENT_KEY && e.newValue) {
        try {
          clearLocalAuth();
          router.push(appRoutes.login);
        } catch (error) {
          console.error('Error processing logout event:', error);
        }
      }
      if (e.key === env.JWT_STORAGE_KEY && e.newValue === null && user) {
        setUser(null);
        router.push(appRoutes.login);
      }
      if (e.key === env.USER_STORAGE_KEY && e.newValue === null && user) {
        setUser(null);
        router.push(appRoutes.login);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, router, clearLocalAuth]);

  const logout = useCallback(async () => {
    if (env.IS_DEMO_MODE) {
      setUser(COGNIX_DEMO_USER);
      router.push(appRoutes.home);
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        const logoutEvent = { timestamp: Date.now(), type: 'logout' as const };
        localStorage.setItem(env.LOGOUT_EVENT_KEY, JSON.stringify(logoutEvent));
        window.setTimeout(() => {
          localStorage.removeItem(env.LOGOUT_EVENT_KEY);
        }, 100);
      }
      setUser(null);
      router.push(appRoutes.login);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [authService, router]);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      if (env.IS_DEMO_MODE) {
        setUser(COGNIX_DEMO_USER);
        setIsLoading(false);
        return;
      }
      try {
        const storedToken = authService.getStoredToken();
        const storedUserData =
          typeof window !== 'undefined' ? localStorage.getItem(env.USER_STORAGE_KEY) : null;

        if (storedToken && storedUserData) {
          try {
            const cachedRaw = JSON.parse(storedUserData) as Record<string, unknown>;
            const normalizedRole = normalizeRole(cachedRaw.role as string) || UserRole.USER;
            const cachedUser = { ...recordToUser(cachedRaw, normalizedRole), role: normalizedRole };
            setUser(cachedUser);
            setIsLoading(false);

            try {
              const freshRaw = (await authService.validateToken(storedToken)) as ValidateTokenResponse;
              if (freshRaw && freshRaw.valid === false) {
                await authService.logout();
                setUser(null);
                return;
              }
              const normalized = normalizeRole(freshRaw.role as string) || UserRole.USER;
              const freshUser = {
                ...recordToUser(freshRaw as unknown as Record<string, unknown>, normalized),
                role: normalized,
              };
              setUser(freshUser);
              localStorage.setItem(env.USER_STORAGE_KEY, JSON.stringify(freshUser));
            } catch (validationError) {
              console.error('Token validation failed:', validationError);
              await authService.logout();
              setUser(null);
            }
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
            await authService.logout();
            setUser(null);
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        await authService.logout();
        setIsLoading(false);
      }
    };
    void initializeAuth();
  }, [authService]);

  const login = useCallback(
    (authResponse: AuthResponse, token: string) => {
      authService.setToken(token);
      if (typeof window !== 'undefined') {
        localStorage.setItem(env.JWT_STORAGE_KEY, token);
      }

      const normalizedRole =
        normalizeRole(authResponse.user?.role as string) ||
        normalizeRole(authResponse.user?.roles?.[0]) ||
        normalizeRole(authResponse.role as string) ||
        UserRole.USER;

      const firstName = authResponse.user?.first_name || '';
      const lastName = authResponse.user?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const userData: User = {
        userId: authResponse.user?.id,
        username: fullName || authResponse.user?.email || authResponse.email || authResponse.username,
        firstName: authResponse.user?.first_name,
        lastName: authResponse.user?.last_name,
        role: normalizedRole,
        email: authResponse.user?.email || authResponse.email,
        organization_id: authResponse.tenant?.id,
        tenant_id: authResponse.tenant?.id,
        isLoggedIn: true,
      };

      localStorage.setItem(env.USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    },
    [authService]
  );

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedToken = authService.getStoredToken();
      if (!storedToken) {
        return false;
      }
      const freshRaw = await authService.validateToken(storedToken);
      if (freshRaw && freshRaw.valid === false) {
        await authService.logout();
        setUser(null);
        return false;
      }
      const normalized = normalizeRole(freshRaw.role as string) || UserRole.USER;
      const nextUser = {
        ...recordToUser(freshRaw as unknown as Record<string, unknown>, normalized),
        role: normalized,
      };
      setUser(nextUser);
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      await authService.logout();
      setUser(null);
      return false;
    }
  }, [authService]);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const userRole = normalizeRole(user.role as string) || (user.role as UserRole);
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(userRole as UserRole);
    },
    [user]
  );

  const updateUser = useCallback(
    (userData: Partial<User>) => {
      if (!user) return;
      const updatedUser: User = {
        ...user,
        ...userData,
        username:
          userData.firstName !== undefined || userData.lastName !== undefined
            ? `${userData.firstName ?? user.firstName ?? ''} ${userData.lastName ?? user.lastName ?? ''}`.trim() ||
              userData.username ||
              user.username
            : userData.username ?? user.username,
      };
      setUser(updatedUser);
      localStorage.setItem(env.USER_STORAGE_KEY, JSON.stringify(updatedUser));
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    validateToken,
    hasRole,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
