/**
 * Provider registration (ATL-06B).
 *
 * Registration is idempotent and unconditional; whether the adapter is USED is decided by
 * `isConfigured()`, which is true only when the server environment holds a key. Registering an
 * unconfigured adapter therefore changes nothing a reader sees, and keeps
 * "no external grounding provider is configured" as the accurate, tested statement it was in
 * ATL-06A rather than a claim that depends on import order.
 *
 * This module is imported only from server code. The adapter it constructs reads
 * `process.env.GEMINI_API_KEY` at call time, never at module load, so a key added after boot is
 * picked up and a key present at boot is never captured into a closure that outlives it.
 */

import { activeGroundingProvider, registerGroundingProvider } from '../provider';
import { createGoogleSearchGroundingProvider, PROVIDER_NAME } from './google-search-grounding';

let registered = false;

export function ensureGroundingProviderRegistered(): void {
  if (registered) return;
  registered = true;
  registerGroundingProvider(createGoogleSearchGroundingProvider());
}

/** Test-only, paired with `clearGroundingProviders()`. */
export function resetGroundingProviderRegistration(): void {
  registered = false;
}

export function groundingProviderStatus(): { registered: boolean; configured: boolean; name: string } {
  return { registered, configured: activeGroundingProvider() !== null, name: PROVIDER_NAME };
}
