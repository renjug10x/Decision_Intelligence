/**
 * Grounding policy — when external knowledge is allowed at all (ATL-06A, ADR-048).
 *
 * The policy is DECLARED DATA, not a heuristic buried in a prompt. Every signal that can move a
 * question out of internal-only is listed below, published through `/api/v1/atlas/grounding`, and
 * asserted in `tests/unit/run-atl06a-tests.ts`. A routing decision a reader cannot inspect is a
 * routing decision they cannot challenge, and the whole point of ADR-048 is challengeability.
 *
 * The classification fails safe DOWNWARD. ADR-048: *"Intent misclassification fails safe toward
 * internal-only."* Concretely, a CogniX-identity signal always wins over an external signal for the
 * CogniX portion of the question, because the cost of the two errors is not symmetric: answering a
 * market question from governed records produces a stated gap, whereas answering a CogniX question
 * from the web produces a confident falsehood about this estate.
 */

import {
  type GroundingDecision, type GroundingIntent
} from '../../../packages/contracts/src/atlas-grounding-model';
import { CAPABILITY_ID_PATTERN } from '../../../packages/contracts/src/capability-atlas-model';
import { detectExternalKnowledgeNeed } from '../ai/retrieval';

/** Bumped whenever any declared rule below changes, so a stored envelope is re-checkable. */
export const GROUNDING_POLICY_VERSION = '1.0.0';

/**
 * Phrases that make a question a question about THIS ESTATE. Any one of them means the CogniX
 * portion is answered from governed records, whatever else the question also asks.
 */
export const COGNIX_IDENTITY_SIGNALS: string[] = [
  'cognix', 'the atlas', 'this platform', 'the platform', 'our platform', 'our capability',
  'do we', 'can we', 'we have', 'we support', 'our demo', 'the demo', 'g10x'
];

/**
 * Question shapes that are inherently internal even without naming CogniX. "How does X work" asks
 * about an implementation this estate owns; a market source cannot answer it and must not be
 * allowed to try.
 */
export const INTERNAL_QUESTION_SHAPES: string[] = [
  'how does', 'how do i', 'how is', 'what is the', 'where is', 'which capability',
  'how mature', 'is it implemented', 'how do we', 'show me', 'demo path', 'how would i demo'
];

/**
 * Maximum admissible age of an external claim, by topic class (ADR-054). Kept per-topic because
 * currency means different things in each: an analyst quadrant ages differently to a price list.
 * A topic with no entry falls back to `DEFAULT_MAX_AGE_DAYS`, which is the strictest bound, so an
 * unrecognised topic is treated conservatively rather than permissively.
 */
export const TOPIC_MAX_AGE_DAYS: Record<string, number> = {
  'market and competitor landscape': 365,
  'current industry research': 730,
  'analyst commentary': 540,
  'commercial pricing': 180,
  'external customer references': 540,
  'third-party platform capability': 365
};

export const DEFAULT_MAX_AGE_DAYS = 180;

/** A claim older than this share of its bound is shown as `aging` rather than `fresh`. */
export const AGING_THRESHOLD_RATIO = 0.6;

export function maxAgeDaysFor(topic: string): number {
  return TOPIC_MAX_AGE_DAYS[topic] ?? DEFAULT_MAX_AGE_DAYS;
}

function containsAny(haystack: string, needles: string[]): string[] {
  return needles.filter(n => haystack.includes(n));
}

/**
 * Classify one question.
 *
 * Precedence, in order:
 *   1. No external topic signal at all           → `internal-only`.
 *   2. External topic AND a CogniX identity or
 *      internal-shape signal                     → `external-permitted`, `failed_safe: true`.
 *   3. External topic only                       → `external-required`.
 *
 * Case 2 is the fail-safe. It does not suppress the market section; it guarantees that the CogniX
 * portion of a comparative question is still answered from governed records, which is what
 * `AC-ATL-06-7` requires.
 */
export function classifyQuestion(question: string): GroundingDecision {
  const lower = question.toLowerCase();
  const topics = detectExternalKnowledgeNeed(question);

  const identityHits = containsAny(lower, COGNIX_IDENTITY_SIGNALS);
  const shapeHits = containsAny(lower, INTERNAL_QUESTION_SHAPES);
  const namesCapability = question.split(/\s+/).some(t => CAPABILITY_ID_PATTERN.test(t.replace(/[^A-Za-z0-9-]/g, '')));
  const internalHits = [...identityHits, ...shapeHits, ...(namesCapability ? ['names a CAP-* identifier'] : [])];

  if (topics.length === 0) {
    const intent: GroundingIntent = 'internal-only';
    return {
      intent,
      external_allowed: false,
      reason: internalHits.length > 0
        ? 'This question asks what CogniX does, so it is answered from governed CogniX records only. No external evidence was retrieved.'
        : 'No part of this question asks for market, competitor, analyst, pricing or third-party platform knowledge, so it is answered from governed CogniX records only.',
      topics: [],
      matched_signals: internalHits,
      failed_safe: false
    };
  }

  if (internalHits.length > 0) {
    return {
      intent: 'external-permitted',
      external_allowed: true,
      reason: `This question has a CogniX part and a market part. The CogniX part is answered from governed records only; external evidence may add ${topics.join(' and ')} as context and may not redefine any capability.`,
      topics,
      matched_signals: [...internalHits, ...topics],
      failed_safe: true
    };
  }

  return {
    intent: 'external-required',
    external_allowed: true,
    reason: `This question asks for ${topics.join(' and ')}, which CogniX-owned records do not hold. It can only be answered from sourced external evidence, and is refused if none can be admitted.`,
    topics,
    matched_signals: topics,
    failed_safe: false
  };
}
