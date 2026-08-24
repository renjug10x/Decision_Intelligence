/**
 * The recorded live-provider verification (ATL-07, ADR-068).
 *
 * `AC-ATL-06C-9` was closed by a real credentialed round trip. This file is what stops that closure
 * from quietly becoming a historical claim. It records what was verified, on which commit, and — the
 * load-bearing field — **which files invalidate it when they change**.
 *
 * The `ATL-06` sequence is the argument for this file existing. Three defects reached a credentialed
 * run before anything failed: a credential path no deployment provisioned, model aliases Google had
 * retired, and a `startIndex` elided at its default value. Every fixture-backed suite stayed green
 * through all three, correctly — a recorded response cannot notice that the world moved. Nothing was
 * watching the gap between "verified once" and "still true".
 *
 * Contract assumptions are listed individually rather than as prose, so a governance check can name
 * the one that broke and the code that depends on it.
 */

import type { ProviderVerificationRecord } from '../packages/contracts/src/atlas-governance-model';

export const PROVIDER_VERIFICATION: ProviderVerificationRecord = {
  provider: 'google-search-grounding',
  model: 'gemini-3.6-flash',
  verified_commit: 'f1c390bc',
  verified_at: '2026-08-21',
  scenarios: [
    { id: 'S1', description: 'current grocery demand-forecasting market question', outcome: 'provider invoked; claims admitted with complete provenance' },
    { id: 'S2', description: 'current forecast-uncertainty / decision-support market question', outcome: 'provider invoked; claims admitted with complete provenance' },
    { id: 'S3', description: 'internal Decision Gap question with research explicitly requested', outcome: 'provider NOT invoked — measured call count of zero' },
    { id: 'W1', description: 'wire contract on a real grounded response', outcome: '25 grounding supports; 25/25 exact byte-offset reconstruction' },
    { id: 'F1', description: 'failure behaviour against a non-existent model', outcome: 'status reported; credential never echoed' }
  ],
  /**
   * Change any of these and the verification above describes code that no longer exists. The list is
   * the provider layer plus the two modules that decide what reaches a reader from it.
   */
  verified_paths: [
    'lib/atlas/grounding/providers/google-search-grounding.ts',
    'lib/atlas/grounding/providers/grounding-extraction.ts',
    'lib/atlas/grounding/providers/source-resolution.ts',
    'lib/atlas/grounding/providers/gemini-grounding-types.ts',
    'lib/atlas/interpretation/gemini-interpreter.ts',
    'config/gemini-models.ts'
  ],
  contract_assumptions: [
    {
      assumption_id: 'PC-1',
      statement: 'The grounding tool is declared as `tools: [{ googleSearch: {} }]`, not the legacy `googleSearchRetrieval`.',
      depends_on: 'lib/atlas/grounding/providers/google-search-grounding.ts',
      verified_by: 'scripts/atlas-live-grounding-check.ts Stage 1, with a negative control'
    },
    {
      assumption_id: 'PC-2',
      statement: 'Structured output is requested with `responseMimeType` and `responseSchema` on `generationConfig`.',
      depends_on: 'lib/atlas/interpretation/gemini-interpreter.ts',
      verified_by: 'scripts/atlas-live-grounding-check.ts Stage 1'
    },
    {
      assumption_id: 'PC-3',
      statement: '`groundingSupports[].segment.endIndex` is always present; `startIndex` is elided at its default value and means byte 0.',
      depends_on: 'lib/atlas/grounding/providers/grounding-extraction.ts',
      verified_by: 'live run W1 (25/25 reconstruction) and the recorded regression fixtures'
    },
    {
      assumption_id: 'PC-4',
      statement: 'Segment offsets are BYTE offsets into the response part, not character offsets.',
      depends_on: 'lib/atlas/grounding/providers/grounding-extraction.ts',
      verified_by: 'run-atl06b-tests.ts B9 and the live reconstruction check'
    },
    {
      assumption_id: 'PC-5',
      statement: '`groundingChunks[].web.uri` is a grounding redirect, and `web.domain` is not populated by the Gemini Developer API, so the publisher must be resolved by following the redirect.',
      depends_on: 'lib/atlas/grounding/providers/source-resolution.ts',
      verified_by: 'live run source resolution'
    },
    {
      assumption_id: 'PC-6',
      statement: 'The credential is supplied as the `x-goog-api-key` header on `generativelanguage.googleapis.com/v1beta`.',
      depends_on: 'lib/atlas/grounding/providers/google-search-grounding.ts',
      verified_by: 'scripts/atlas-live-grounding-check.ts Stage 1'
    }
  ],
  /** A live verification older than this is reported as ageing, whatever the code has done since. */
  max_age_days: 90
};
