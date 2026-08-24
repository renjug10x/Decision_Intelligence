/**
 * The governed search vocabulary (ADR-059).
 *
 * `ATL-06C` measured a real gap: on eighteen questions phrased the way a business person asks them,
 * Level 1 put the intended capability in the top three for **10 of 18**, and for **three** it did not
 * appear at all. Absence is the diagnosis — no re-weighting reaches a record that matched no term, so
 * the failure is lexical, not semantic. *"The right call afterwards"* never meets *regret*;
 * *"goes off"* never meets *expiry*; *"plug our own data feed"* never meets *connector*.
 *
 * This file closes that gap, and it is deliberately **content** rather than a scoring tweak. Every
 * entry is a governed record with an owner, a review date and a written rationale, and every entry
 * must name capabilities whose governed text actually contains the terms it introduces (rule W6).
 * An alias that cannot do that is inventing vocabulary — the failure `ATL-01` caught in the taxonomy
 * and rule V3 has forbidden ever since.
 *
 * Two consequences of that choice matter more than the entries themselves.
 *
 *   **Expansions are visible.** When an alias fires, the searcher is told which phrase fired, what it
 *   added and why. ADR-050 requires a surprising Level 1 result to be inspectable, and an alias
 *   silently rewriting a query would defeat that more thoroughly than bad ranking ever could.
 *
 *   **An alias-driven match never outranks a direct one.** Expanded terms carry a published weight
 *   factor below 1, so a capability the searcher actually named beats one the vocabulary reached.
 *
 * Adding an entry is a governed act: it needs a rationale someone can disagree with, evidence that
 * the terms exist in the corpus, and a review date. Removing one is a single line.
 */

import type { VocabularyAlias } from '../../packages/contracts/src/capability-atlas-model';

const OWNER = 'G10X Enterprise Innovation Lab';
const REVIEWED = '2026-08-21';

function alias(
  alias_id: string,
  phrase: string,
  governed_terms: string[],
  evidenced_by: string[],
  rationale: string
): VocabularyAlias {
  return { alias_id, phrase, governed_terms, evidenced_by, rationale, owner: OWNER, reviewed_at: REVIEWED };
}

export const SEARCH_VOCABULARY: VocabularyAlias[] = [
  alias('VOC-001', 'right call afterwards', ['regret'], ['CAP-DECISION-REGRET'],
    'Asking whether a committed decision was the right one, after the fact, is the definition of decision regret. The corpus calls it regret; nobody in a planning meeting does.'),
  alias('VOC-002', 'was it the right call', ['regret'], ['CAP-DECISION-REGRET'],
    'The same question in its most common spoken form, which shares no vocabulary with the governed record.'),
  alias('VOC-003', 'done nothing', ['counterfactual', 'baseline'], ['CAP-COUNTERFACTUAL-BASELINE'],
    'The do-nothing case is exactly what a counterfactual baseline models, and is how planners refer to it.'),
  alias('VOC-004', 'what would have happened', ['counterfactual'], ['CAP-COUNTERFACTUAL-BASELINE'],
    'The counterfactual question asked in plain language.'),
  alias('VOC-005', 'still time', ['window', 'closes', 'deadline'], ['CAP-DECISION-WINDOW'],
    'Asking whether there is time left to act is asking about the decision window, when it closes and the deadline it implies.'),
  alias('VOC-006', 'not move again', ['stability', 'revision'], ['CAP-FORECAST-STABILITY'],
    'Asking whether a number will move again is asking about forecast stability and how often the projection is revised.'),
  alias('VOC-007', 'different versions', ['shared', 'state'], ['CAP-SHARED-DECISION-STATE'],
    'Two teams holding different versions of a situation is the problem shared decision state exists to remove.'),
  alias('VOC-008', 'same situation', ['shared', 'state'], ['CAP-SHARED-DECISION-STATE'],
    'The companion phrasing of the same complaint, usually said in the same sentence.'),
  alias('VOC-009', 'promise', ['commitment'], ['CAP-COMMITMENT-INTELLIGENCE'],
    'A promise to a customer is a commitment in the governed vocabulary; the business word and the record word differ.'),
  alias('VOC-010', 'knock on effects', ['ripple', 'propagation'], ['CAP-DECISION-RIPPLE'],
    'Knock-on effects across the business are what decision ripple propagates and measures.'),
  alias('VOC-011', 'where this number came from', ['attestation', 'observation', 'authority'], ['CAP-OBSERVATION-CORRESPONDENCE'],
    'Asking where a figure came from is asking for the attestation behind the observation and the authority that stands behind it.'),
  alias('VOC-012', 'last time we tried', ['memory', 'recall'], ['CAP-ENTERPRISE-MEMORY'],
    'Recalling a previous attempt is what enterprise memory holds; the corpus speaks of memory and recall, not of what we tried last time.'),
  alias('VOC-013', 'trade offs', ['frontier', 'objectives'], ['CAP-OUTCOME-FRONTIER'],
    'A request for trade-offs rather than a single answer is a request for the multi-objective outcome frontier.'),
  alias('VOC-014', 'goes off', ['half', 'life', 'expiry', 'decay'], ['CAP-DECISION-CONTRACT'],
    'Asking when a recommendation goes off is asking about its half-life — how long the decision contract stays valid before it expires and decays.'),
  alias('VOC-015', 'go wrong', ['mortem', 'resilience'], ['CAP-DECISION-READINESS'],
    'Asking what could go wrong before committing is the pre-mortem, and resilience is what the record measures.'),
  alias('VOC-016', 'break the number down', ['decomposition', 'drivers'], ['CAP-DECISION-TIMELINE'],
    'Breaking a figure into what is driving it is demand decomposition.'),
  alias('VOC-017', 'what is driving it', ['decomposition', 'drivers'], ['CAP-DECISION-TIMELINE'],
    'The same request phrased as a question about causes rather than structure.'),
  alias('VOC-018', 'shops near', ['catchment'], ['CAP-OPPORTUNITY-WINDOW'],
    'Stores near a location are its catchment, which is the micro-market graph the record describes.'),
  alias('VOC-019', 'same mistake twice', ['learning', 'loop'], ['CAP-LEARNING-LOOP'],
    'Not repeating a mistake is precisely what the closed learning loop is for.'),
  alias('VOC-020', 'not thought of', ['curiosity', 'questions'], ['CAP-CURIOSITY-QUESTIONS'],
    'Asking what one has not thought to ask is the curiosity surface, which no other phrasing reaches.'),
  alias('VOC-021', 'plug our own data feed', ['connector', 'adapter', 'ingestion'], ['CAP-SIGNAL-CONNECTOR'],
    'Plugging in an external feed is the connector contract and its adapters; the business phrasing shares no term with the record.'),
  alias('VOC-022', 'pay for itself', ['promotion', 'uplift'], ['CAP-PROMOTION-INTELLIGENCE'],
    'Asking whether a discount pays for itself is asking whether promotional uplift covers its cost.')
];

/** Sorted longest-first so the most specific phrasing wins where two entries overlap. */
export const SEARCH_VOCABULARY_BY_LENGTH: VocabularyAlias[] =
  [...SEARCH_VOCABULARY].sort((a, b) => b.phrase.length - a.phrase.length);
