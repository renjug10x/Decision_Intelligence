/**
 * Governed Gemini model configuration (ADR-067).
 *
 * SERVER-SIDE CONFIGURATION. Not a secret — a model name is public — but it belongs to the server
 * runtime and is never exposed through a `NEXT_PUBLIC_*` variable, because a client that could
 * choose the model could choose a cheaper, weaker or retired one.
 *
 * This module exists because the estate learned the cost of the alternative. Model names were
 * hard-coded independently in three places — the grounding adapter, the interpretation adapter and
 * the live validation script — and when Google retired the aliases, all three broke at once while
 * every test kept passing. The tests passed because they run against recorded fixtures, which is
 * correct: fixtures prove refusal behaviour a live search cannot be made to produce on demand. What
 * fixtures cannot notice is that the model named in the request no longer exists.
 *
 * Two rules follow, and both are enforced rather than documented.
 *
 *   **One source.** Every call site resolves its model list from here. A model name written anywhere
 *   else in the Atlas provider layer is a defect, asserted in `run-atl06b-tests.ts`.
 *
 *   **No silent downgrade.** The previous design carried a fallback chain and retried the next model
 *   on a 404. That is how the defect stayed hidden: a retired primary quietly became a working
 *   secondary until the secondary went too. The default here is a **single verified model**. An
 *   operator may still configure a chain — deliberately, in one place, by setting `GEMINI_MODEL` to a
 *   comma-separated list — but nothing falls back by default, and when a model is gone the error
 *   names the model and the variable rather than degrading.
 */

/** The current model, verified against the live API for both generation and Google Search grounding. */
export const VERIFIED_GEMINI_MODEL = 'gemini-3.6-flash';

/** The server-side variable an operator may set to override it. Never `NEXT_PUBLIC_*`. */
export const GEMINI_MODEL_ENV_VAR = 'GEMINI_MODEL';

/**
 * Shape of an acceptable model identifier. Deliberately strict: a typo must fail loudly at the call
 * that needs it, not silently resolve to nothing and read as "no provider configured".
 */
export const GEMINI_MODEL_PATTERN = /^gemini-[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export type GeminiModelSource = 'default' | 'environment';

export interface GeminiModelResolution {
  models: string[];
  source: GeminiModelSource;
}

/**
 * Resolve the ordered model list for a provider call.
 *
 * Throws on a malformed override rather than ignoring it. An operator who mistypes `GEMINI_MODEL`
 * has made a configuration error, and the honest response is to say so at the point of use — the
 * same posture ADR-044 takes toward a missing key.
 */
export function resolveGeminiModelConfig(raw: string | undefined = process.env[GEMINI_MODEL_ENV_VAR]): GeminiModelResolution {
  const entries = (raw ?? '').split(',').map(m => m.trim()).filter(Boolean);
  if (entries.length === 0) {
    return { models: [VERIFIED_GEMINI_MODEL], source: 'default' };
  }
  const malformed = entries.filter(m => !GEMINI_MODEL_PATTERN.test(m));
  if (malformed.length > 0) {
    throw new Error(
      `${GEMINI_MODEL_ENV_VAR} contains ${malformed.length} unusable model name(s): ${malformed.join(', ')}. ` +
      `Expected identifiers such as '${VERIFIED_GEMINI_MODEL}', comma-separated for an explicit fallback chain.`
    );
  }
  return { models: entries, source: 'environment' };
}

/** Convenience for call sites that only need the ordered list. */
export function resolveGeminiModels(raw?: string): string[] {
  return resolveGeminiModelConfig(raw).models;
}

/** The model a call will actually use first. Reported in provenance and in the published policy. */
export function primaryGeminiModel(raw?: string): string {
  return resolveGeminiModels(raw)[0];
}
