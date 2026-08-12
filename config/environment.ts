/**
 * Client-side environment and storage keys.
 * `AUTH_API_URL` is exposed to the browser via `next.config.ts` `env` (see there).
 */
const prefix = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_AUTH_STORAGE_PREFIX ?? 'di_auth' : 'di_auth';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const rawAuth =
  (typeof process !== 'undefined' && process.env.AUTH_API_URL) || '';
const rawApi =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export const env = {
  /** Base URL for identity/auth endpoints only */
  AUTH_API_URL: trimTrailingSlash(rawAuth),
  /** Optional general API base for non-auth requests */
  API_BASE_URL: trimTrailingSlash(rawApi),
  JWT_STORAGE_KEY: `${prefix}_jwt`,
  USER_STORAGE_KEY: `${prefix}_user`,
  LOGOUT_EVENT_KEY: `${prefix}_logout_event`,
  /** Development & Demonstration Controlled Auth Bypass Flag */
  IS_DEMO_MODE: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COGNIX_DEMO_MODE === 'true',
} as const;
