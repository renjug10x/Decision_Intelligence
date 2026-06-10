import type { AxiosInstance } from 'axios';
import {
  type User,
  type LoginCredentials,
  type OTPValidation,
  type AuthResponse,
  type OTPResponse,
  type AuthServiceInterface,
  type ValidateTokenResponse,
  type CompleteRegistrationData,
  type ResetCurrentPasswordData,
} from '@/types/auth';
import { env } from '@/config/environment';
import { apiRoutes } from '@/config/routes';
import { isTokenExpired } from '@/utils/jwtUtils';

export const createAuthService = (apiService: AxiosInstance): AuthServiceInterface => {
  const setToken = (token: string): void => {
    (apiService as import('@/types/auth').ApiClient).setToken(token);
  };

  const clearToken = (): void => {
    (apiService as import('@/types/auth').ApiClient).clearToken();
  };

  const login = async (credentials: LoginCredentials): Promise<OTPResponse> => {
    const response = await apiService.post(apiRoutes.auth.login, credentials);
    return (response.data?.data ?? response.data) as OTPResponse;
  };

  const validateOTP = async (otpData: OTPValidation): Promise<AuthResponse> => {
    const response = await apiService.post(apiRoutes.auth.validateOtp, otpData);
    const responseData = (response.data?.data ?? response.data) as AuthResponse;
    if (responseData.access_token) {
      setToken(responseData.access_token);
    }
    return responseData;
  };

  const validateToken = async (token: string): Promise<ValidateTokenResponse> => {
    const response = await apiService.post(apiRoutes.auth.validateToken, { token });
    const userData = (response.data?.data ?? response.data) as ValidateTokenResponse;
    if (userData && userData.valid === false) {
      await logout();
      throw new Error('Token validation failed: token is invalid');
    }
    if (userData && typeof window !== 'undefined' && userData.valid !== false) {
      localStorage.setItem(env.USER_STORAGE_KEY, JSON.stringify(userData));
    }
    return userData;
  };

  const getCurrentUser = async (): Promise<ValidateTokenResponse | null> => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(env.JWT_STORAGE_KEY);
    if (!token) return null;
    try {
      return await validateToken(token);
    } catch {
      return null;
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await apiService.post(apiRoutes.auth.forgotPassword, { email });
  };

  const resetPasswordWithToken = async (data: {
    token: string;
    email: string;
    new_password: string;
    confirm_password: string;
  }): Promise<AuthResponse> => {
    const response = await apiService.post(apiRoutes.auth.resetPassword, data);
    const responseData = (response.data?.data ?? response.data) as AuthResponse;
    if (responseData?.access_token) {
      setToken(responseData.access_token);
    }
    return responseData;
  };

  const resetCurrentPassword = async (data: ResetCurrentPasswordData): Promise<AuthResponse> => {
    const response = await apiService.post(apiRoutes.auth.resetCurrentPassword, data);
    const responseData = (response.data?.data ?? response.data) as AuthResponse;
    if (responseData?.access_token) {
      setToken(responseData.access_token);
    }
    return responseData;
  };

  const refreshToken = async (refreshTokenValue: string): Promise<AuthResponse> => {
    const response = await apiService.post(apiRoutes.auth.refreshToken, {
      refresh_token: refreshTokenValue,
    });
    const responseData = (response.data?.data ?? response.data) as AuthResponse;
    if (responseData.access_token) {
      setToken(responseData.access_token);
    }
    return responseData;
  };

  const completeRegistration = async (data: CompleteRegistrationData): Promise<AuthResponse> => {
    const response = await apiService.post(apiRoutes.auth.completeRegistration, data);
    const responseData = (response.data?.data ?? response.data) as AuthResponse;
    if (responseData?.access_token) {
      setToken(responseData.access_token);
    }
    return responseData;
  };

  const logout = async (): Promise<void> => {
    let hasValidToken = false;
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(env.JWT_STORAGE_KEY);
      hasValidToken = storedToken !== null && !isTokenExpired(storedToken);
    }
    if (hasValidToken) {
      try {
        await apiService.post(apiRoutes.auth.logout);
      } catch (apiError) {
        console.error('Logout API error:', apiError);
      }
    }
    clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(env.JWT_STORAGE_KEY);
      localStorage.removeItem(env.USER_STORAGE_KEY);
    }
  };

  const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(env.JWT_STORAGE_KEY);
    if (!token) return false;
    return !isTokenExpired(token);
  };

  const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(env.JWT_STORAGE_KEY);
  };

  const getStoredUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const userData = localStorage.getItem(env.USER_STORAGE_KEY);
      return userData ? (JSON.parse(userData) as User) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  };

  return {
    login,
    validateOTP,
    validateToken,
    getCurrentUser,
    logout,
    isAuthenticated,
    getStoredToken,
    getStoredUser,
    setToken,
    clearToken,
    forgotPassword,
    resetPasswordWithToken,
    resetCurrentPassword,
    refreshToken,
    completeRegistration,
  };
};
