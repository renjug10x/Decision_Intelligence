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
 *
 * A fourth problem was measured at `ATL-06C` and is solved the same way. Business phrasing and
 * governed vocabulary often share no words at all: *"the right call afterwards"* never meets
 * *regret*, *"goes off"* never meets *expiry*. The governed vocabulary in
 * `content/atlas/vocabulary.ts` maps one onto the other, and the expansion is **reported, never
 * silent** — an alias that quietly rewrote a query would defeat ADR-050's inspectability
 * requirement more thoroughly than bad ranking ever could (ADR-059).
 */

import type {
  CapabilityFilter, AudienceLens, QueryExpansion
} from '../../packages/contracts/src/capability-atlas-model';
import { SEARCH_VOCABULARY_BY_LENGTH } from '../../content/atlas/vocabulary';

/** Function words carrying no discriminating power in a capability corpus. */
export const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me',
  'my', 'of', 'on', 'or', 'our', 'shall', 'should', 'show', 'so', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'to', 'us', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
  // Quantifiers and pro-forms: grammatical, not discriminating, in a capability corpus.
  'all', 'any', 'also', 'both', 'each', 'else', 'every', 'everything', 'just', 'more', 'most',
  'much', 'no', 'none', 'nothing', 'only', 'other', 'others', 'own', 'same', 'some', 'something',
  'such', 'thing', 'things', 'very',
  // The product's own name. Every record in the corpus is a CogniX capability, so `cognix` is the
  // purest possible case of the rule above: it matches everything and therefore discriminates
  // nothing. Left in, it let "what capabilities does CogniX have on promotions?" score the whole
  // estate on the two words that carried no question (ADR-062).
  'cognix'
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

/**
 * Declared morphological normalisation (ADR-062).
 *
 * `ATL-04R` measured a defect that had been in Level 1 since `ATL-04` and had never been visible
 * because nobody had queried the plural: `promotions` returned NOTHING while `promotion` returned
 * five capabilities, `decisions` returned nothing while `decision` returned twenty-six, and
 * `capabilities` returned one against twenty-four. The corpus is written in the singular and
 * `containsWord` anchors to word boundaries, so a plural query simply misses every record.
 *
 * That is a mechanical failure, not a semantic one, so it is fixed mechanically rather than by
 * adding twenty vocabulary aliases for words the corpus already contains. The rules below are
 * DECLARED and English-specific, and they only ever ADD a form — the searcher's own word is never
 * removed or rewritten, so nothing that matched before stops matching.
 *
 * A form-derived hit is discounted and attributed for exactly the reason an alias-driven one is:
 * the reader can see that `promotions` reached `promotion`, and a record the searcher named
 * verbatim still outranks one reached by normalisation.
 */
const IRREGULAR_SINGULARS: Record<string, string> = {
  analyses: 'analysis',
  bases: 'basis',
  crises: 'crisis',
  hypotheses: 'hypothesis',
  theses: 'thesis',
  criteria: 'criterion',
  data: 'datum',
  people: 'person'
};

/** The singular of a plural content word, or `null` where the word is not a plural we recognise. */
export function singularize(word: string): string | null {
  if (word.length < 4) return null;
  const irregular = IRREGULAR_SINGULARS[word];
  if (irregular) return irregular;
  if (!word.endsWith('s') || word.endsWith('ss') || word.endsWith('us') || word.endsWith('is')) return null;
  // capabilities -> capability, opportunities -> opportunity
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  // analyses handled above; boxes -> box, watches -> watch, dishes -> dish
  if (/(?:ch|sh|s|x|z)es$/.test(word)) return word.slice(0, -2);
  // promotions -> promotion, signals -> signal, decisions -> decision
  return word.slice(0, -1);
}

export interface UnderstoodQuery {
  /** Whole governed identifiers, matched by equality (AC-ATL-02-10). */
  identifiers: string[];
  /** Content words, stopwords removed. THE SEARCHER'S OWN WORDS — never alias-expanded. */
  terms: string[];
  /** Adjacent content-word pairs, used for phrase boosting. */
  phrases: string[];
  /** Declared hints the UI shows and the user can dismiss. */
  hints: QueryHint[];
  /**
   * Governed terms contributed by the vocabulary, kept SEPARATE from `terms` so a match can be
   * attributed and weighted differently. A searcher's own word always outranks one we supplied.
   */
  alias_terms: string[];
  /**
   * Singular forms of the searcher's own plural words, kept separate from `terms` so a
   * form-derived match can be discounted and attributed back to the word they typed (ADR-062).
   */
  morphs: { form: string; from: string }[];
  /** Which alias fired, what it added and why. Rendered to the searcher (ADR-059). */
  expansions: QueryExpansion[];
  /** True when the query was entirely function words. */
  empty: boolean;
}

export interface UnderstandOptions {
  /** Default true. Set false to measure or reproduce unexpanded Level 1 behaviour. */
  expandAliases?: boolean;
}

const IDENTIFIER_PATTERN = /\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/g;

export function understandQuery(raw: string, options: UnderstandOptions = {}): UnderstoodQuery {
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

  // Morphological forms. Only added where the singular is not already a word the searcher used,
  // so a query containing both "promotion" and "promotions" is not double-counted.
  const ownWords = new Set(words);
  const morphs: { form: string; from: string }[] = [];
  for (const w of words) {
    const singular = singularize(w);
    if (singular && !ownWords.has(singular) && !morphs.some(m => m.form === singular)) {
      morphs.push({ form: singular, from: w });
    }
  }

  // Governed vocabulary. Longest phrase first, so the most specific entry wins where two overlap,
  // and a term the searcher already used is never re-added as an alias term — it is theirs.
  const expansions: QueryExpansion[] = [];
  const aliasTerms: string[] = [];
  if (options.expandAliases !== false) {
    const own = new Set(words);
    for (const entry of SEARCH_VOCABULARY_BY_LENGTH) {
      if (!lower.includes(entry.phrase)) continue;
      const added = entry.governed_terms.filter(t => !own.has(t) && !aliasTerms.includes(t));
      if (added.length === 0) continue;
      aliasTerms.push(...added);
      expansions.push({
        alias_id: entry.alias_id,
        phrase: entry.phrase,
        governed_terms: added,
        rationale: entry.rationale
      });
    }
  }

  return {
    identifiers,
    terms: words,
    phrases,
    hints,
    alias_terms: aliasTerms,
    morphs,
    expansions,
    empty: identifiers.length === 0 && words.length === 0 && aliasTerms.length === 0
  };
}

/** Merge declared hints into an explicit filter. The caller decides whether to apply. */
export function hintsToFilter(hints: QueryHint[]): Partial<CapabilityFilter> {
  return hints.reduce<Partial<CapabilityFilter>>((acc, h) => ({ ...acc, ...(h.filter ?? {}) }), {});
}
