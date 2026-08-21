/**
 * Atlas External Grounding & Provenance Contract (ATL-06A).
 *
 * ADR-048 rules that CogniX-owned capability documentation, implementation evidence, architecture
 * and tests are authoritative for statements about what CogniX does, and that external research may
 * explain, summarise, compare and contextualise but may never redefine a capability. ADR-053 and
 * ADR-054 turn that ruling into an enforceable shape.
 *
 * The whole file exists to make one failure mode structurally impossible: an externally retrieved
 * claim read as a statement of what CogniX does. Three devices do that work, and each is a type
 * rather than a convention.
 *
 *   1. EVIDENCE CLASS IS A FIELD, NOT A HEADING. Every statement in a grounded response carries an
 *      `EvidenceClass` in the payload. A surface that fails to render the distinction is a surface
 *      defect; it is not a case of the data having lost the distinction.
 *
 *   2. PROVENANCE IS AN ADMISSION CONDITION, NOT AN ORNAMENT (ADR-054). `ExternalSource` has no
 *      optional provenance field. A claim whose source cannot state url, publisher, title,
 *      publication date and retrieval date is not rendered without provenance — it is not admitted
 *      at all, and the rejection is recorded so the omission is inspectable.
 *
 *   3. CONTRADICTION IS SEPARATED, NOT RESOLVED (ADR-053). Where external evidence disagrees with a
 *      governed CogniX fact, the governed fact wins and the disagreement is rendered as three
 *      distinct classes. There is deliberately no field on `ContradictionRecord` capable of holding
 *      a merged, reconciled or synthesised statement.
 *
 * ATL-06A ships the contract, the policy and the enforcement engine. It ships NO provider, NO
 * network call and NO market content: `ATL-06B` supplies the provider, `ATL-06C` the market corpus.
 * Their absence is stated to the reader rather than hidden, which is why `MarketContextBlock`
 * carries `absence_reason` and not merely an empty array.
 */

import type { CapabilityId, DemoMaturity, ImplementationStatus, LifecycleState } from './capability-atlas-model';

// ── The three evidence classes (ADR-048) ─────────────────────────────────────

/**
 * ADR-048's three classes, in the order a reader must encounter them. The ordering is part of the
 * contract: what CogniX owns is read before what the market says about the space, and interpretation
 * is read last because it is permitted only to rest on the two classes above it.
 */
export const EVIDENCE_CLASSES = ['from-cognix', 'market-context', 'ai-interpretation'] as const;
export type EvidenceClass = typeof EVIDENCE_CLASSES[number];

export const EVIDENCE_CLASS_LABEL: Record<EvidenceClass, string> = {
  'from-cognix': 'From CogniX',
  'market-context': 'Market Context',
  'ai-interpretation': 'AI Interpretation'
};

// ── Source provenance and admission (ADR-054) ────────────────────────────────

/**
 * Source tiers, ordered by what the estate is prepared to place next to a governed capability
 * record. `vendor-marketing` and `community` are declared so that a claim carrying one can be
 * rejected by name rather than silently dropped; `unknown` exists so an unclassifiable source is
 * inadmissible by construction rather than by omission.
 */
export const SOURCE_TIERS = [
  'primary-research', 'analyst', 'peer-reviewed', 'standards-body',
  'trade-press', 'vendor-marketing', 'community', 'unknown'
] as const;
export type SourceTier = typeof SOURCE_TIERS[number];

/** The only tiers admissible into the Market Context class. Published so a rejection is explainable. */
export const ADMISSIBLE_SOURCE_TIERS: readonly SourceTier[] =
  ['primary-research', 'analyst', 'peer-reviewed', 'standards-body', 'trade-press'] as const;

export type RetrievalMethod = 'manual' | 'search-grounding' | 'api';

/**
 * A source of external evidence. Every provenance field is REQUIRED, and `published_at` is
 * deliberately not nullable: `CAPABILITY_KNOWLEDGE_MODEL.md` rule V9 already forbids guessing a
 * publication date on a governed record, and an undated external source is treated the same way —
 * it is rejected with reason `undated-source` rather than rendered with a blank date.
 */
export interface ExternalSource {
  url: string;
  publisher: string;
  title: string;
  /** ISO-8601. An undated source is inadmissible; there is no sentinel value for "we do not know". */
  published_at: string;
  /** ISO-8601. When the claim was actually retrieved, not when the response was rendered. */
  retrieved_at: string;
  tier: SourceTier;
  retrieval_method: RetrievalMethod;
}

/**
 * One externally retrieved claim, before admission. A provider returns these; the grounding engine
 * decides which of them a reader ever sees.
 *
 * `about_capabilities` is the provider's assertion that the claim is RELEVANT TO those capabilities.
 * It is never read as an assertion ABOUT them: a claim listing `CAP-PROMOTION-INTELLIGENCE` gains no
 * authority over that record's governed fields, and `asserts_cognix_fact` detection exists precisely
 * so a provider attempting the opposite is rejected rather than believed.
 */
export interface ExternalClaim {
  claim_id: string;
  claim: string;
  source: ExternalSource;
  /** Topic class this claim was retrieved for; drives the freshness bound. */
  topic: string;
  about_capabilities: CapabilityId[];
  /** Adapter that supplied the claim. Never a key, never a credential (ADR-049). */
  provider: string;
}

export type ClaimRejectionReason =
  | 'external-not-permitted'
  | 'empty-claim'
  | 'missing-provenance'
  | 'insecure-source'
  | 'source-not-allowlisted'
  | 'inadmissible-tier'
  | 'undated-source'
  | 'implausible-date'
  | 'stale-source'
  | 'asserts-cognix-fact';

/**
 * A claim that was retrieved and NOT shown. Recorded rather than discarded so that "the market
 * section is thin" and "the market section was censored" are distinguishable to an auditor.
 */
export interface RejectedClaim {
  claim: string;
  reason: ClaimRejectionReason;
  detail: string;
  source_url: string | null;
}

export type FreshnessVerdict = 'fresh' | 'aging' | 'stale';

export interface FreshnessAssessment {
  verdict: FreshnessVerdict;
  age_days: number;
  max_age_days: number;
  /** Rendered next to the claim so the reader judges currency without arithmetic. */
  label: string;
}

// ── Grounding policy (ADR-048 fail-safe) ─────────────────────────────────────

/**
 * What external knowledge is permitted to do for a given question.
 *
 *   `internal-only`      — the question is about what CogniX does. External evidence adds nothing it
 *                          is permitted to add, and is not retrieved. This is also the FAIL-SAFE
 *                          default for an unclassifiable question (ADR-048).
 *   `external-permitted` — the question has a CogniX part and a market part. The CogniX part is
 *                          answered from governed records only; external evidence may contextualise.
 *   `external-required`  — the question cannot be answered from governed records at all. Without
 *                          admissible external evidence the correct output is a refusal.
 */
export const GROUNDING_INTENTS = ['internal-only', 'external-permitted', 'external-required'] as const;
export type GroundingIntent = typeof GROUNDING_INTENTS[number];

export interface GroundingDecision {
  intent: GroundingIntent;
  external_allowed: boolean;
  /** Written for a reader, not a log. Surfaced so the routing decision is inspectable. */
  reason: string;
  topics: string[];
  /** The declared signals that produced this classification. */
  matched_signals: string[];
  /** True when a CogniX-identity signal forced the classification down to internal-only. */
  failed_safe: boolean;
}

// ── Contradiction precedence (ADR-053) ───────────────────────────────────────

/**
 * The governed dimension an external claim collided with. Kept aligned with the three ADR-047
 * maturity dimensions plus data provenance, because those are the four ways an external claim
 * realistically overstates this estate.
 */
export const CONTRADICTION_DIMENSIONS =
  ['data-provenance', 'implementation', 'demonstration', 'lifecycle'] as const;
export type ContradictionDimension = typeof CONTRADICTION_DIMENSIONS[number];

/**
 * A disagreement between external evidence and a governed CogniX fact.
 *
 * There is no `resolved_statement`, no `merged_text` and no `confidence` field, and that absence is
 * the decision (ADR-053). The three strings below are rendered as three separated classes; nothing
 * in the type system permits a fourth string that reconciles them.
 *
 * `ai_interpretation` is template-generated from the governed record and the admitted claim. It may
 * name a direction; it may never assert a CogniX capability fact, which is why it always cites
 * `cognix_citation` — the From-CogniX statement it rests on (ADR-048).
 */
export interface ContradictionRecord {
  capability_id: CapabilityId;
  capability_name: string;
  dimension: ContradictionDimension;
  /** Quoted from the governed record. Authoritative, and stated first. */
  from_cognix: string;
  cognix_citation: CapabilityId;
  /** The external claim, unaltered, with its source. Never edited to agree with the record. */
  market_context: string;
  market_source: ExternalSource;
  /** Always `cognix-authoritative`. The field exists to be readable, not to be chosen. */
  resolution: 'cognix-authoritative';
  ai_interpretation: string;
}

// ── The grounded envelope ────────────────────────────────────────────────────

export interface FromCogniXStatement {
  text: string;
  capability_id: CapabilityId;
  capability_name: string;
  maturity: {
    lifecycle_state: LifecycleState | null;
    demo_maturity: DemoMaturity | null;
    implementation_status: ImplementationStatus;
  };
}

export interface MarketContextStatement {
  claim: string;
  source: ExternalSource;
  freshness: FreshnessAssessment;
  relates_to: CapabilityId[];
  provider: string;
}

/**
 * An interpretation. `rests_on` is not decorative: an interpretation with an empty `rests_on` is a
 * free-floating assertion, and the engine does not emit one (ADR-048).
 */
export interface AIInterpretationStatement {
  text: string;
  rests_on: CapabilityId[];
  /** Source URLs of the market claims this interpretation reads, if any. */
  informed_by: string[];
}

export interface FromCogniXBlock {
  evidence_class: 'from-cognix';
  statements: FromCogniXStatement[];
}

/**
 * `available: false` is a rendered state, never a silent empty list. A market section that is
 * absent because no provider is configured reads differently to one that is absent because every
 * retrieved claim failed admission, and the reader is entitled to both readings.
 */
export interface MarketContextBlock {
  evidence_class: 'market-context';
  available: boolean;
  absence_reason: string | null;
  statements: MarketContextStatement[];
}

export interface AIInterpretationBlock {
  evidence_class: 'ai-interpretation';
  available: boolean;
  absence_reason: string | null;
  statements: AIInterpretationStatement[];
}

export type GroundingRefusalReason =
  | 'insufficient-grounding'
  | 'no-grounding-provider'
  | 'all-claims-rejected';

/**
 * Stated when the question needed external evidence that could not be admitted. A refusal is an
 * outcome, not an error: ADR-049 already establishes that this estate refuses rather than
 * approximates, and a thin market section is not permitted to stand in for one.
 */
export interface GroundingRefusal {
  reason: GroundingRefusalReason;
  message: string;
  topics: string[];
}

export interface GroundedEnvelope {
  decision: GroundingDecision;
  from_cognix: FromCogniXBlock;
  market_context: MarketContextBlock;
  ai_interpretation: AIInterpretationBlock;
  contradictions: ContradictionRecord[];
  /** Every claim that was retrieved and not shown, with the reason it was not shown. */
  rejected_claims: RejectedClaim[];
  refusal: GroundingRefusal | null;
  /** Adapter name, or `null` when none is configured. Never a key or an endpoint (ADR-049). */
  provider: string | null;
  /** Policy version the envelope was produced under, so a stored answer is re-checkable. */
  policy_version: string;
}
