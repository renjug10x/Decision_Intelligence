/**
 * Client-side environment and storage keys.
 * Auth base URL: build-time via `NEXT_PUBLIC_AUTH_API_URL`, runtime via `<meta name="auth-api-url">`
 * injected in `app/layout.tsx` from container `AUTH_API_URL`.
 */
const prefix = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_AUTH_STORAGE_PREFIX ?? 'di_auth' : 'di_auth';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Resolve identity/auth API base URL (browser meta tag → build-time public env). */
export function getAuthApiBaseUrl(): string {
  if (typeof document !== 'undefined') {
    const fromMeta = document.querySelector('meta[name="auth-api-url"]')?.getAttribute('content')?.trim();
    if (fromMeta) return trimTrailingSlash(fromMeta);
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_AUTH_API_URL ||
    process.env.AUTH_API_URL ||
    '';
  return trimTrailingSlash(fromEnv);
}

const rawApi =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export const env = {
  /** Base URL for identity/auth endpoints only (prefer `getAuthApiBaseUrl()` in HTTP clients) */
  AUTH_API_URL: getAuthApiBaseUrl(),
  /** Optional general API base for non-auth requests */
  API_BASE_URL: trimTrailingSlash(rawApi),
  JWT_STORAGE_KEY: `${prefix}_jwt`,
  USER_STORAGE_KEY: `${prefix}_user`,
  LOGOUT_EVENT_KEY: `${prefix}_logout_event`,
  /** Development & Demonstration Controlled Auth Bypass Flag */
  IS_DEMO_MODE: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COGNIX_DEMO_MODE === 'true',
} as const;
