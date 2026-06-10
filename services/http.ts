import axios, { type AxiosInstance } from 'axios';
import { env } from '@/config/environment';
import type { ApiClient } from '@/types/auth';

let unauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedCallback(callback: (() => void) | null): void {
  unauthorizedCallback = callback;
}

let shared: ApiClient | null = null;
let authClient: ApiClient | null = null;

function attachTokenHelpers(client: AxiosInstance): ApiClient {
  const api = client as ApiClient;

  api.setToken = (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(env.JWT_STORAGE_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  };

  api.clearToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(env.JWT_STORAGE_KEY);
    }
    delete api.defaults.headers.common.Authorization;
  };

  return api;
}

function createClient(baseURL: string | undefined): ApiClient {
  const client = axios.create({
    baseURL: baseURL || undefined,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
  });

  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(env.JWT_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 401 && unauthorizedCallback) {
        unauthorizedCallback();
      }
      return Promise.reject(error);
    }
  );

  return attachTokenHelpers(client);
}

export function getSharedApiService(): ApiClient {
  if (!shared) {
    shared = createClient(env.API_BASE_URL || undefined);
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(env.JWT_STORAGE_KEY);
    if (token) {
      shared.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  }
  return shared;
}

/** Axios instance for identity/auth routes (`AUTH_API_URL`). */
export function getAuthApiService(): ApiClient {
  if (!authClient) {
    authClient = createClient(env.AUTH_API_URL || undefined);
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(env.JWT_STORAGE_KEY);
    if (token) {
      authClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  }
  return authClient;
}
