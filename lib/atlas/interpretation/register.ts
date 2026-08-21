/**
 * Interpretation provider registration (ATL-06C).
 *
 * Idempotent and unconditional, exactly as ATL-06B's grounding registration is: whether the adapter
 * is USED depends on `isConfigured()`, which is true only when the server environment holds a key.
 * Registering an unconfigured adapter therefore changes nothing a reader sees, and keeps
 * "no interpretation provider is configured" a tested statement rather than one that depends on
 * import order.
 */

import { activeInterpretationProvider, registerInterpretationProvider } from './provider';
import { createGeminiInterpretationProvider, PROVIDER_NAME } from './gemini-interpreter';

let registered = false;

export function ensureInterpretationProviderRegistered(): void {
  if (registered) return;
  registered = true;
  registerInterpretationProvider(createGeminiInterpretationProvider());
}

/** Test-only, paired with `clearInterpretationProviders()`. */
export function resetInterpretationProviderRegistration(): void {
  registered = false;
}

export function interpretationProviderStatus(): { registered: boolean; configured: boolean; name: string } {
  return { registered, configured: activeInterpretationProvider() !== null, name: PROVIDER_NAME };
}
