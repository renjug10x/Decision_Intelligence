/**
 * Atlas AI provider abstraction (ADR-049).
 *
 * A provider may only ever NARRATE a grounded answer that has already been assembled from
 * governed knowledge. It is never a source of CogniX facts, and the Atlas is fully usable with no
 * provider configured — which is the state of this estate today.
 *
 * ADR-049 draws the line ADR-044 established: with no provider configured, or on provider
 * failure, Atlas AI degrades to deterministic results and says so. It never returns generated
 * capability content from a fallback path, because a fabricated capability claim is fabricated
 * input to a governed contract.
 *
 * ATL-05 ships NO provider adapter. The interface exists so ATL-06 can add one behind it without
 * touching retrieval, answer assembly or any surface.
 */

export interface NarrationRequest {
  question: string;
  /** Pre-assembled, already-cited answer sections. A provider may rephrase; it may not add facts. */
  groundedSections: { heading: string; text: string; citations: string[] }[];
  lens?: string;
}

export interface NarrationResult {
  narrated: string;
  provider: string;
}

export interface AtlasAIProvider {
  readonly name: string;
  isConfigured(): boolean;
  narrate(request: NarrationRequest): Promise<NarrationResult>;
}

/** Registry of adapters. Empty in ATL-05 by design. */
const providers: AtlasAIProvider[] = [];

export function registerProvider(p: AtlasAIProvider): void {
  providers.push(p);
}

/** Test-only. */
export function clearProviders(): void {
  providers.length = 0;
}

export function activeProvider(): AtlasAIProvider | null {
  return providers.find(p => p.isConfigured()) ?? null;
}

export type DegradationReason = 'no-provider-configured' | 'provider-failed' | 'not-requested';

export interface NarrationOutcome {
  narrated: string | null;
  provider: string | null;
  degraded: boolean;
  reason: DegradationReason;
  /** Shown to the user. The degradation is always stated, never hidden. */
  notice: string | null;
}

export async function narrateIfAvailable(request: NarrationRequest): Promise<NarrationOutcome> {
  const provider = activeProvider();
  if (!provider) {
    return {
      narrated: null, provider: null, degraded: true, reason: 'no-provider-configured',
      notice: 'No AI provider is configured, so this answer is assembled directly from governed CogniX records rather than narrated. Every statement below is quoted from the record it cites.'
    };
  }
  try {
    const result = await provider.narrate(request);
    return { narrated: result.narrated, provider: result.provider, degraded: false, reason: 'not-requested', notice: null };
  } catch {
    return {
      narrated: null, provider: provider.name, degraded: true, reason: 'provider-failed',
      notice: 'The AI provider was unavailable, so this answer is assembled directly from governed CogniX records. No content has been generated.'
    };
  }
}
