export const GDPR_CONSENT_KEY = 'di_gdpr_consent';

export type GdprConsent = {
  privacyPolicy: boolean;
  termsOfService: boolean;
  marketing: boolean;
  analytics: boolean;
  acceptedAt: string;
};

export function saveGdprConsent(consent: Omit<GdprConsent, 'acceptedAt'>): void {
  if (typeof window === 'undefined') return;
  const record: GdprConsent = { ...consent, acceptedAt: new Date().toISOString() };
  sessionStorage.setItem(GDPR_CONSENT_KEY, JSON.stringify(record));
}

export function getGdprConsent(): GdprConsent | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(GDPR_CONSENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GdprConsent;
  } catch {
    return null;
  }
}
