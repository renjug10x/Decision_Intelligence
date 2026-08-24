/**
 * Source admission and provenance enforcement (ATL-06A, ADR-054).
 *
 * ADR-048 rules that *"an external claim that cannot carry provenance is dropped rather than
 * rendered"*. This module is that sentence made executable, and it is deliberately the ONLY way a
 * claim can reach the Market Context class.
 *
 * The order of the checks matters and is asserted in test: cheap structural failures are reported
 * before expensive semantic ones, so a rejection reason names the FIRST thing wrong with a claim
 * rather than an incidental later one. An auditor reading `missing-provenance` should not have to
 * wonder whether the claim was also stale.
 *
 * Nothing here performs a network call, and nothing here reads a credential. Admission is a pure
 * function of the claim, the allowlist, the clock and the policy — which is what makes it testable
 * without a provider, and what makes `ATL-06B` unable to weaken it by supplying one.
 */

import {
  ADMISSIBLE_SOURCE_TIERS, SOURCE_TIERS,
  type ClaimRejectionReason, type ExternalClaim, type ExternalSource,
  type FreshnessAssessment, type RejectedClaim
} from '../../../packages/contracts/src/atlas-grounding-model';
import { AGING_THRESHOLD_RATIO, maxAgeDaysFor } from './policy';

/**
 * Publisher hosts whose evidence may be placed beside a governed capability record.
 *
 * An allowlist rather than a blocklist, for the reason ADR-048 gives about generic market claims:
 * the failure mode is an unsupported claim being indistinguishable from a supported one, and a
 * blocklist admits by default. Entries are matched on host suffix so a publisher's subdomains
 * resolve, and never on substring, so `gartner.com.example.net` does not pass as Gartner.
 *
 * `ATL-06C` owns extending this list as real market evidence is commissioned. `ATL-06A` seeds it
 * with publisher classes the estate already cites in governance, and the seeding is deliberately
 * small: an allowlist that admits everything is not an allowlist.
 */
export const TRUSTED_SOURCE_HOSTS: readonly string[] = [
  'gartner.com', 'forrester.com', 'idc.com', 'mckinsey.com', 'bain.com', 'bcg.com',
  'deloitte.com', 'pwc.com', 'kpmg.com', 'accenture.com',
  'nature.com', 'science.org', 'acm.org', 'ieee.org', 'arxiv.org',
  'iso.org', 'nist.gov', 'w3.org', 'gs1.org',
  'grocerydive.com', 'retailweek.com', 'supplychaindive.com', 'ft.com', 'economist.com'
] as const;

/**
 * Phrases by which a claim asserts a fact ABOUT COGNIX. A provider returning one of these is
 * attempting to write a governed capability fact from outside the governed corpus, which ADR-048
 * forbids outright. The claim is rejected — not downgraded, not rendered with a caveat — because a
 * caveated false statement about this estate is still a false statement about this estate.
 */
export const COGNIX_ASSERTION_PATTERNS: readonly RegExp[] = [
  /\bcognix\s+(?:is|has|does|can|will|supports?|provides?|offers?|delivers?|includes?|implements?|features?|lacks?|cannot|does not|doesn't)\b/i,
  /\bcognix'?s?\s+(?:capabilit|platform|implementation|roadmap|architecture|maturity)/i,
  /\bthe\s+cognix\s+\w+\s+(?:is|are|was|were)\b/i,
  /\bg10x\s+(?:is|has|does|can|will|supports?|provides?|offers?)\b/i
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?$/;

function isBlank(v: unknown): boolean {
  return typeof v !== 'string' || v.trim().length === 0;
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Suffix match on a host label boundary. `x.gartner.com` passes; `notgartner.com` does not. */
export function isAllowlistedHost(host: string): boolean {
  return TRUSTED_SOURCE_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

export function assertsCogniXFact(claim: string): boolean {
  return COGNIX_ASSERTION_PATTERNS.some(p => p.test(claim));
}

const DAY_MS = 86_400_000;

export function assessFreshness(source: ExternalSource, topic: string, now: Date): FreshnessAssessment {
  const maxAge = maxAgeDaysFor(topic);
  const ageDays = Math.floor((now.getTime() - new Date(source.published_at).getTime()) / DAY_MS);
  const verdict = ageDays > maxAge
    ? 'stale'
    : ageDays > maxAge * AGING_THRESHOLD_RATIO ? 'aging' : 'fresh';
  const label = verdict === 'fresh'
    ? `Published ${ageDays} days ago, within the ${maxAge}-day currency bound for ${topic}.`
    : verdict === 'aging'
      ? `Published ${ageDays} days ago, approaching the ${maxAge}-day currency bound for ${topic}. Treat as context, not as a current position.`
      : `Published ${ageDays} days ago, beyond the ${maxAge}-day currency bound for ${topic}.`;
  return { verdict, age_days: ageDays, max_age_days: maxAge, label };
}

export interface AdmissionResult {
  admitted: boolean;
  rejection: RejectedClaim | null;
  freshness: FreshnessAssessment | null;
}

function reject(claim: ExternalClaim, reason: ClaimRejectionReason, detail: string): AdmissionResult {
  return {
    admitted: false,
    rejection: { claim: claim.claim, reason, detail, source_url: claim.source?.url ?? null },
    freshness: null
  };
}

/**
 * Decide whether one retrieved claim may be shown, and why not when it may not.
 *
 * `externalAllowed` is passed in rather than recomputed so that a policy decision made once for the
 * question cannot drift per claim. When it is false every claim is rejected with
 * `external-not-permitted`, which is what makes `AC-ATL-06-7` hold even if a provider volunteers
 * results for an internal-only question.
 */
export function admitClaim(claim: ExternalClaim, externalAllowed: boolean, now: Date): AdmissionResult {
  if (!externalAllowed) {
    return reject(claim, 'external-not-permitted',
      'The question was classified internal-only, so no external claim may be shown alongside the answer.');
  }
  if (isBlank(claim.claim)) {
    return reject(claim, 'empty-claim', 'The claim carried no text.');
  }

  const s = claim.source;
  if (!s || isBlank(s.url) || isBlank(s.publisher) || isBlank(s.title) || isBlank(s.retrieved_at)) {
    return reject(claim, 'missing-provenance',
      'A claim must carry source url, publisher, title, publication date and retrieval date. This one does not, so it is dropped rather than rendered without provenance.');
  }
  if (isBlank(s.published_at) || !ISO_DATE.test(s.published_at)) {
    return reject(claim, 'undated-source',
      'The source carries no usable publication date. A date is never inferred, so the claim cannot be placed on a currency scale and is not shown.');
  }

  const host = hostOf(s.url);
  if (host === null) {
    return reject(claim, 'insecure-source',
      `Source url '${s.url}' is not a resolvable https address.`);
  }
  if (!isAllowlistedHost(host)) {
    return reject(claim, 'source-not-allowlisted',
      `Publisher host '${host}' is not on the declared trusted-source allowlist.`);
  }
  if (!SOURCE_TIERS.includes(s.tier) || !ADMISSIBLE_SOURCE_TIERS.includes(s.tier)) {
    return reject(claim, 'inadmissible-tier',
      `Source tier '${s.tier}' is not admissible. Admissible tiers are ${ADMISSIBLE_SOURCE_TIERS.join(', ')}.`);
  }

  const published = new Date(s.published_at).getTime();
  const retrieved = new Date(s.retrieved_at).getTime();
  if (Number.isNaN(published) || Number.isNaN(retrieved)) {
    return reject(claim, 'implausible-date', 'Publication or retrieval date could not be parsed.');
  }
  if (published > now.getTime() + DAY_MS || retrieved > now.getTime() + DAY_MS) {
    return reject(claim, 'implausible-date',
      'The source is dated in the future, which means the provenance cannot be relied on.');
  }
  if (retrieved < published - DAY_MS) {
    return reject(claim, 'implausible-date',
      'The claim was retrieved before its source was published.');
  }

  if (assertsCogniXFact(claim.claim)) {
    return reject(claim, 'asserts-cognix-fact',
      'The claim asserts a fact about CogniX. Statements about what CogniX does come from governed CogniX records; an external source may contextualise the space and may not redefine a capability.');
  }

  const freshness = assessFreshness(s, claim.topic, now);
  if (freshness.verdict === 'stale') {
    return reject(claim, 'stale-source',
      `${freshness.label} It is not shown, because presenting expired evidence as current market context is the failure this policy exists to prevent.`);
  }

  return { admitted: true, rejection: null, freshness };
}
