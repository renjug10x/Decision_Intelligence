/**
 * External grounding provider abstraction (ATL-06A, ADR-049).
 *
 * A grounding provider RETRIEVES CANDIDATE CLAIMS. That is the whole of its authority. It does not
 * decide what is shown, it does not carry a trust level, and nothing it returns reaches a reader
 * without passing `provenance.admitClaim` and, where it touches a governed record,
 * `contradiction.detectContradictions`. A hostile adapter and a well-behaved one are subject to
 * exactly the same admission path, which is what makes *"no provider should be able to overwrite
 * governed capability facts"* a property of the architecture rather than a request to the provider.
 *
 * ATL-06A ships NO adapter, and the registry below is empty by design. `ATL-06B` adds one behind
 * this interface without touching admission, contradiction handling, envelope assembly or any
 * surface. The provider key is resolved server-side inside the adapter, is never written into a
 * record, a log or an envelope, and no field on any type in this layer can carry one.
 */

import type {
  ExternalClaim, GroundingSearchTransparency
} from '../../../packages/contracts/src/atlas-grounding-model';

export interface GroundingRequest {
  question: string;
  /** Declared topic classes the policy permitted for this question. */
  topics: string[];
  /** Capabilities the internal answer is about, so a provider can scope its retrieval. */
  capability_ids: string[];
  /**
   * ATL-06B, optional. The same capabilities with their names, so an adapter can relate a claim to
   * the ones it actually mentions instead of to all of them. Optional so an ATL-06A adapter, which
   * has only `capability_ids`, keeps behaving exactly as it did.
   */
  capabilities?: { id: string; name: string }[];
}

/**
 * ATL-06B. What a grounding provider returns when it can also account for HOW it searched.
 *
 * `claims` are candidates, not evidence — they still pass the unmodified ATL-06A admission gate.
 * `transparency` is what makes the retrieval auditable: the queries actually run, the model that ran
 * them, whether the answer came from cache, and how many model sentences were discarded for
 * carrying no grounding support at all.
 */
export interface GroundingRetrieval {
  claims: ExternalClaim[];
  transparency: GroundingSearchTransparency;
}

export interface ExternalGroundingProvider {
  readonly name: string;
  isConfigured(): boolean;
  retrieve(request: GroundingRequest): Promise<ExternalClaim[]>;
  /**
   * ATL-06B, optional. A provider that can account for its search implements this and the engine
   * prefers it. Left optional so an adapter written against the ATL-06A seam keeps working
   * unchanged — which is the property `run-atl06a-tests.ts` asserts and must keep asserting.
   */
  retrieveGrounded?(request: GroundingRequest): Promise<GroundingRetrieval>;
}

const providers: ExternalGroundingProvider[] = [];

export function registerGroundingProvider(p: ExternalGroundingProvider): void {
  providers.push(p);
}

/** Test-only. */
export function clearGroundingProviders(): void {
  providers.length = 0;
}

export function activeGroundingProvider(): ExternalGroundingProvider | null {
  return providers.find(p => p.isConfigured()) ?? null;
}
