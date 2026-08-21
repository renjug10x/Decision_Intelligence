/**
 * Interpretation verification (ATL-06C, ADR-057).
 *
 * A provider proposes; this module disposes. Every candidate interpretation is checked against the
 * premise set and refused outright if it fails any rule — never hedged, never softened, never kept
 * with a caveat. A caveated unsupported reading is still an unsupported reading, and it is the more
 * dangerous of the two because the caveat reads as diligence.
 *
 * The rules are ordered from cheapest and most structural to most semantic, so a refusal names the
 * FIRST thing wrong rather than an incidental later one — the same discipline ATL-06A applies to
 * source admission, for the same reason: an auditor reading `unknown-premise` should not have to
 * wonder whether the statement also invented a statistic.
 *
 * Two rules carry most of the weight.
 *
 *   `echoes-rejected-claim` is the enforcement of "rejected claims remain audit-only". The premise
 *   set never contains a rejected claim, so a well-behaved provider cannot use one. This rule
 *   catches the case that matters anyway: a provider that saw the same page in its own training data
 *   and reproduces the substance of a claim this estate refused. Structural exclusion prevents the
 *   easy failure; this catches the interesting one.
 *
 *   `unsupported-quantity` exists because numbers are what survive a meeting. A reader forgets the
 *   sentence and remembers "forty per cent", so a figure that appears in no cited premise is the
 *   single most damaging thing an interpretation can invent.
 */

import {
  MARKUP_PATTERN
} from '../../../packages/contracts/src/capability-atlas-model';
import type {
  DroppedInterpretation, InterpretationDropReason, InterpretationPremise
} from '../../../packages/contracts/src/atlas-grounding-model';
import type { RejectedClaim } from '../../../packages/contracts/src/atlas-grounding-model';
import { assertsCogniXFact } from '../grounding/provenance';
import { PUBLISHER_BY_HOST } from '../grounding/providers/source-resolution';

/** An interpretation is a reading, not an essay. */
export const MAX_INTERPRETATION_LENGTH = 500;
/** Shared runs of this many content words mean the statement is reproducing a claim, not reasoning. */
export const ECHO_NGRAM = 6;
/** …or this share of a rejected claim's content words, which catches a reordered restatement. */
export const ECHO_CONTAINMENT_RATIO = 0.7;

/**
 * Organisations a statement may name only when a cited premise names them. Publishers come from the
 * ATL-06B tier map so the two cannot drift; the vendors are the platforms this estate is compared
 * against, and are the names most likely to be hallucinated into a market reading.
 */
export const NAMEABLE_ORGANISATIONS: readonly string[] = [
  ...new Set([
    ...Object.values(PUBLISHER_BY_HOST),
    'Blue Yonder', 'SAP', 'Oracle', 'o9', 'Kinaxis', 'Anaplan', 'Relex', 'Symphony'
  ])
];

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was',
  'were', 'be', 'been', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'has', 'have', 'not', 'no'
]);

function contentWords(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
}

function ngrams(words: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

export function echoesRejectedClaim(text: string, rejected: RejectedClaim[]): RejectedClaim | null {
  const words = contentWords(text);
  if (words.length === 0) return null;
  const statementGrams = ngrams(words, ECHO_NGRAM);
  const statementSet = new Set(words);

  for (const claim of rejected) {
    const claimWords = contentWords(claim.claim);
    if (claimWords.length === 0) continue;
    for (const gram of ngrams(claimWords, ECHO_NGRAM)) {
      if (statementGrams.has(gram)) return claim;
    }
    const shared = claimWords.filter(w => statementSet.has(w)).length;
    if (shared / claimWords.length >= ECHO_CONTAINMENT_RATIO) return claim;
  }
  return null;
}

/** Numerals and percentages. A figure that appears in no cited premise was invented. */
export function unsupportedQuantities(text: string, cited: InterpretationPremise[]): string[] {
  const figures = text.match(/\b\d+(?:[.,]\d+)?\s*%?/g) ?? [];
  const haystack = cited.map(p => `${p.text} ${p.label}`).join(' ');
  return figures
    .map(f => f.trim())
    .filter(f => {
      const bare = f.replace(/\s*%$/, '');
      return !haystack.includes(bare);
    });
}

export function unsupportedOrganisations(text: string, cited: InterpretationPremise[]): string[] {
  const haystack = cited.map(p => `${p.text} ${p.label} ${p.citation}`).join(' ').toLowerCase();
  return NAMEABLE_ORGANISATIONS.filter(org => {
    const pattern = new RegExp(`\\b${org.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return pattern.test(text) && !haystack.includes(org.toLowerCase());
  });
}

export interface CandidateInterpretation {
  text: string;
  rests_on: string[];
}

export interface VerificationOutcome {
  accepted: boolean;
  drop: DroppedInterpretation | null;
  /** The premises the statement was verified against, in the order supplied. */
  cited: InterpretationPremise[];
}

function refuse(text: string, reason: InterpretationDropReason, detail: string): VerificationOutcome {
  return { accepted: false, drop: { text, reason, detail }, cited: [] };
}

export function verifyInterpretation(
  candidate: CandidateInterpretation,
  premises: InterpretationPremise[],
  rejected: RejectedClaim[]
): VerificationOutcome {
  const text = (candidate.text ?? '').trim();

  if (!text) return refuse(text, 'empty', 'The provider proposed an empty statement.');
  if (MARKUP_PATTERN.test(text)) {
    return refuse(text, 'markup', 'The statement contained markup, which no governed field may carry.');
  }
  if (text.length > MAX_INTERPRETATION_LENGTH) {
    return refuse(text, 'too-long',
      `An interpretation is a reading, not an essay: ${text.length} characters exceeds the ${MAX_INTERPRETATION_LENGTH}-character bound.`);
  }

  const byId = new Map(premises.map(p => [p.premise_id, p]));
  const ids = candidate.rests_on ?? [];
  const unknown = ids.filter(id => !byId.has(id));
  if (unknown.length > 0) {
    return refuse(text, 'unknown-premise',
      `The statement cites ${unknown.join(', ')}, which is not among the premises it was given. A citation that does not resolve is indistinguishable from an invented one.`);
  }

  const cited = ids.map(id => byId.get(id)!);
  if (!cited.some(p => p.kind === 'governed')) {
    return refuse(text, 'no-governed-premise',
      'The statement rests on no governed CogniX record. An interpretation may read the market, but it may only stand on what this estate actually holds (ADR-048).');
  }

  if (assertsCogniXFact(text)) {
    return refuse(text, 'asserts-cognix-fact',
      'The statement asserts a fact about what CogniX does. Statements about this estate come from governed records; an interpretation may name a direction and may not redefine a capability.');
  }

  const echoed = echoesRejectedClaim(text, rejected);
  if (echoed) {
    return refuse(text, 'echoes-rejected-claim',
      `The statement reproduces the substance of a claim that failed source admission (${echoed.reason}). Rejected evidence is audit material; it may be inspected and it may not be reasoned from.`);
  }

  const figures = unsupportedQuantities(text, cited);
  if (figures.length > 0) {
    return refuse(text, 'unsupported-quantity',
      `The statement contains ${figures.join(', ')}, which appears in none of the premises it cites. A figure a reader will remember must come from evidence they can check.`);
  }

  const orgs = unsupportedOrganisations(text, cited);
  if (orgs.length > 0) {
    return refuse(text, 'unsupported-publisher',
      `The statement names ${orgs.join(', ')}, which no cited premise mentions.`);
  }

  return { accepted: true, drop: null, cited };
}
