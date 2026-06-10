/**
 * Decode JWT payload and read `exp` (no signature verification).
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = parts[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    if (!json.exp) return false;
    return Date.now() >= json.exp * 1000;
  } catch {
    return true;
  }
}
