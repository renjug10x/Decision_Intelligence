/**
 * Deterministic query understanding for Level 1 search (ADR-050).
 *
 * People search the Atlas with questions, not keywords: "why did the decision change",
 * "what can I reuse outside retail", "capabilities for an architect". Three mechanical
 * problems follow, and all three are solved here without a model:
 *
 *   1. Function words match everything. "the", "did", "how", "I" are removed.
 *   2. Multi-word names lose to single-word noise. "Decision Gap" as a phrase must outrank a
 *      capability that merely contains the word "decision".
 *   3. Some questions are really filters. "reuse outside retail" is asking for platform-reusable
 *      capabilities; "for an architect" is asking for an audience lens.
 *
 * Point 3 is a DECLARED LEXICON, not inference. Every mapping below is written down, auditable
 * and reversible, and it is surfaced to the user as an explicit hint rather than silently
 * applied — the searcher is told "showing reusable capabilities" and can remove it.
 */

import type { CapabilityFilter, AudienceLens } from '../../packages/contracts/src/capability-atlas-model';

/** Function words carrying no discriminating power in a capability corpus. */
export const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me',
  'my', 'of', 'on', 'or', 'our', 'shall', 'should', 'show', 'so', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'to', 'us', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your'
]);

/** A hint the searcher is shown and can dismiss. Never applied silently. */
export interface QueryHint {
  kind: 'filter' | 'lens';
  label: string;
  /** The phrase in the query that produced the hint, so the user can see why. */
  trigger: string;
  filter?: Partial<CapabilityFilter>;
  lens?: AudienceLens;
}

/** Declared phrase-to-filter lexicon. Order matters: longer phrases are matched first. */
const FILTER_LEXICON: { phrases: string[]; hint: Omit<QueryHint, 'trigger'> }[] = [
  {
    phrases: ['reuse outside retail', 'outside retail', 'reusable', 'reuse elsewhere', 'other industries',
              'cross domain', 'cross-domain', 'beyond retail', 'reuse'],
    hint: { kind: 'filter', label: 'Reusable across domains', filter: { platform_reusable: true } }
  },
  {
    phrases: ['demo ready', 'can i demonstrate', 'demonstrate', 'ready to show', 'show a client'],
    hint: { kind: 'filter', label: 'Demonstration ready', filter: { demo_maturity: ['Production Ready'] } }
  },
  {
    phrases: ['what is real', 'actually built', 'fully implemented', 'production code'],
    hint: { kind: 'filter', label: 'Implemented only', filter: { implementation_status: ['implemented'] } }
  },
  {
    phrases: ['governance', 'governed', 'audit', 'compliance', 'control'],
    hint: { kind: 'filter', label: 'Governance controls', filter: { capability_type: ['governance-control'] } }
  }
];

/** Declared role-to-lens lexicon. */
const LENS_LEXICON: { phrases: string[]; lens: AudienceLens; label: string }[] = [
  { phrases: ['architect', 'architecture team', 'enterprise architect', 'technical architecture'],
    lens: 'architect', label: 'Architect lens' },
  { phrases: ['developer', 'engineer', 'implementation team', 'test engineer', 'how do i test'],
    lens: 'developer', label: 'Developer lens' },
  { phrases: ['sales', 'client conversation', 'selling', 'prospect', 'pitch'],
    lens: 'sales', label: 'Sales lens' },
  { phrases: ['executive', 'innovation executive', 'board', 'strategy'],
    lens: 'innovation-executive', label: 'Innovation Executive lens' }
];

export interface UnderstoodQuery {
  /** Whole governed identifiers, matched by equality (AC-ATL-02-10). */
  identifiers: string[];
  /** Content words, stopwords removed. */
  terms: string[];
  /** Adjacent content-word pairs, used for phrase boosting. */
  phrases: string[];
  /** Declared hints the UI shows and the user can dismiss. */
  hints: QueryHint[];
  /** True when the query was entirely function words. */
  empty: boolean;
}

const IDENTIFIER_PATTERN = /\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/g;

export function understandQuery(raw: string): UnderstoodQuery {
  const lower = raw.toLowerCase().trim();

  const identifiers = (raw.toUpperCase().match(IDENTIFIER_PATTERN) ?? []).map(i => i.toLowerCase());
  let residual = lower;
  for (const id of identifiers) residual = residual.split(id).join(' ');

  const hints: QueryHint[] = [];
  for (const entry of FILTER_LEXICON) {
    const phrase = [...entry.phrases].sort((a, b) => b.length - a.length).find(p => lower.includes(p));
    if (phrase) hints.push({ ...entry.hint, trigger: phrase });
  }
  for (const entry of LENS_LEXICON) {
    const phrase = [...entry.phrases].sort((a, b) => b.length - a.length).find(p => lower.includes(p));
    if (phrase) {
      hints.push({ kind: 'lens', label: entry.label, trigger: phrase, lens: entry.lens });
      break; // one lens at most
    }
  }

  const words = residual
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) phrases.push(`${words[i]} ${words[i + 1]}`);

  return {
    identifiers,
    terms: words,
    phrases,
    hints,
    empty: identifiers.length === 0 && words.length === 0
  };
}

/** Merge declared hints into an explicit filter. The caller decides whether to apply. */
export function hintsToFilter(hints: QueryHint[]): Partial<CapabilityFilter> {
  return hints.reduce<Partial<CapabilityFilter>>((acc, h) => ({ ...acc, ...(h.filter ?? {}) }), {});
}
