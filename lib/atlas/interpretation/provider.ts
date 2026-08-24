/**
 * The interpretation provider seam (ATL-06C, ADR-049, ADR-057).
 *
 * Deliberately a SEPARATE seam from the grounding provider, though both may be served by the same
 * vendor. They are different authorities: a grounding provider is allowed to go and look, an
 * interpretation provider is allowed to read what has already been admitted and say what it means.
 * Collapsing them would let a single adapter both source a claim and pronounce on it, and the
 * separation of powers is the whole architecture.
 *
 * An interpretation provider PROPOSES. Nothing it returns is shown until it survives
 * `verification.ts`, which is why the return type is a candidate rather than a statement.
 */

import type { InterpretationPremise } from '../../../packages/contracts/src/atlas-grounding-model';
import type { CandidateInterpretation } from './verification';

export interface InterpretationRequest {
  question: string;
  premises: InterpretationPremise[];
  /** Contradictions already separated by ATL-06A, so a reading does not re-litigate them. */
  contradictionSummaries: string[];
}

export interface InterpretationResult {
  candidates: CandidateInterpretation[];
  model: string | null;
}

export interface InterpretationProvider {
  readonly name: string;
  isConfigured(): boolean;
  interpret(request: InterpretationRequest): Promise<InterpretationResult>;
}

const providers: InterpretationProvider[] = [];

export function registerInterpretationProvider(p: InterpretationProvider): void {
  providers.push(p);
}

/** Test-only. */
export function clearInterpretationProviders(): void {
  providers.length = 0;
}

export function activeInterpretationProvider(): InterpretationProvider | null {
  return providers.find(p => p.isConfigured()) ?? null;
}
