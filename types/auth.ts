import type { Role } from '@/lib/context';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  EXEC = 'EXEC',
  CATEGORY_MANAGER = 'CATEGORY_MANAGER',
  STORE_MANAGER = 'STORE_MANAGER',
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OTPValidation {
  email: string;
  otp_code: string;
}

export interface OTPResponse {
  message?: string;
  [key: string]: unknown;
}

export interface AuthTenant {
  id?: string;
  [key: string]: unknown;
}

export interface AuthUserPayload {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: string[];
  role?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  access_token?: string;
  email?: string;
  username?: string;
  role?: string;
  user?: AuthUserPayload;
  tenant?: AuthTenant;
  [key: string]: unknown;
}

/** Token validation API payload (shape varies by backend) */
export interface ValidateTokenResponse {
  valid?: boolean;
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole | string;
  email?: string;
  organization_id?: string;
  tenant_id?: string;
  isLoggedIn?: boolean;
  [key: string]: unknown;
}

export interface User {
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole | string;
  email?: string;
  organization_id?: string;
  tenant_id?: string;
  isLoggedIn?: boolean;
  /** Mapped app role for this POC (set on login / hydrate) */
  appRole?: Role;
}

export interface CompleteRegistrationData {
  token: string;
  temporary_password: string;
  new_password: string;
  confirm_password: string;
  [key: string]: unknown;
}

export interface ResetCurrentPasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (authResponse: AuthResponse, token: string) => void;
  logout: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  updateUser: (userData: Partial<User>) => void;
}

export interface AuthServiceInterface {
  login: (credentials: LoginCredentials) => Promise<OTPResponse>;
  validateOTP: (otpData: OTPValidation) => Promise<AuthResponse>;
  validateToken: (token: string) => Promise<ValidateTokenResponse>;
  getCurrentUser: () => Promise<ValidateTokenResponse | null>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  getStoredToken: () => string | null;
  getStoredUser: () => User | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPasswordWithToken: (data: {
    token: string;
    email: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<AuthResponse>;
  resetCurrentPassword: (data: ResetCurrentPasswordData) => Promise<AuthResponse>;
  refreshToken: (refreshToken: string) => Promise<AuthResponse>;
  completeRegistration: (data: CompleteRegistrationData) => Promise<AuthResponse>;
}

export type ApiClient = import('axios').AxiosInstance & {
  setToken: (token: string) => void;
  clearToken: () => void;
};
