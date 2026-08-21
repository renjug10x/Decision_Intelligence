/**
 * Level 1 structured capability search (ADR-050).
 *
 * Deterministic, explainable and reproducible: the same corpus and query always produce the same
 * ordering, no model is involved, and the response names the fields that matched so a surprising
 * result is inspectable rather than mysterious.
 *
 * Level 1 must stand alone. Nothing here depends on an embedding index, a provider or a network
 * call — that is what keeps the Atlas usable when a key is missing or a quota is spent.
 */

import type {
  CapabilityIdentity,
  CapabilityFilter,
  SearchMatch,
  SearchResult,
  SearchResponse,
  DemoMaturity,
  LifecycleState
} from '../../packages/contracts/src/capability-atlas-model';
import type { CapabilityIndex } from './capability-index';
import { understandQuery, type QueryHint } from './query-understanding';

/**
 * Documented field weights. Ranking is explainable because these are published.
 * Identity fields outrank knowledge prose: a name match is a stronger signal of intent than a
 * word appearing somewhere in an architecture narrative.
 */
export const FIELD_WEIGHTS: Record<string, number> = {
  name: 12,
  capability_id: 8,
  summary: 6,
  business_problems: 5,
  tags: 4,
  use_cases: 4,
  description: 3,
  innovation_thesis: 3,
  testing: 3,
  demo: 3,
  architecture: 2,
  technology: 2,
  usage: 2,
  client_questions: 2,
  cross_domain: 2,
  limitations: 1,
  domains: 1,
  personas: 1,
  capability_type: 1,
  delivered_by: 2,
  demonstrated_by: 2,
  originated_as: 2,
  evidenced_by: 2
};

/** A whole-identifier hit outranks any free-text hit (AC-ATL-02-10, ATL-01 gap G6). */
export const IDENTIFIER_MATCH_MULTIPLIER = 5;
/** An adjacent-word phrase hit outranks the sum of its parts: "Decision Gap" beats "decision". */
export const PHRASE_MATCH_MULTIPLIER = 4;

/**
 * Word-boundary containment.
 *
 * Plain substring matching makes short words catastrophic: `all` matches "actually", "recall"
 * and "small", so a nonsense query scores against half the corpus on incidental prose. Anchoring
 * to word boundaries is what makes a low-weight prose match mean something.
 */
const boundaryCache = new Map<string, RegExp>();
function containsWord(text: string, token: string): boolean {
  let re = boundaryCache.get(token);
  if (!re) {
    re = new RegExp(`(?:^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`, 'i');
    boundaryCache.set(token, re);
  }
  return re.test(text);
}

function excerpt(value: string, token: string): string {
  const i = value.toLowerCase().indexOf(token);
  if (i < 0) return value.slice(0, 80);
  const start = Math.max(0, i - 30);
  return (start > 0 ? '…' : '') + value.slice(start, i + token.length + 50).trim();
}

export interface SearchContext {
  resolveDemoMaturity: (c: CapabilityIdentity) => DemoMaturity | null;
}

export interface SearchOptions {
  /** Index-backed search over knowledge text. Without it, identity fields only. */
  index?: CapabilityIndex;
  /** Apply the declared hints as filters. The UI shows them either way. */
  applyHints?: boolean;
}

function identityFields(c: CapabilityIdentity): Record<string, string> {
  return {
    name: c.name.toLowerCase(),
    summary: c.summary.toLowerCase(),
    business_problems: c.business_problems.join(' ').toLowerCase(),
    tags: c.tags.join(' ').toLowerCase(),
    domains: c.domains.join(' ').toLowerCase(),
    personas: c.personas.join(' ').toLowerCase(),
    capability_type: c.capability_type.toLowerCase()
  };
}

export function searchCapabilities(
  identities: CapabilityIdentity[],
  query: string,
  filter: CapabilityFilter,
  ctx: SearchContext,
  options: SearchOptions = {}
): SearchResponse & { hints: QueryHint[] } {
  const q = understandQuery(query);
  const results: SearchResult[] = [];

  const indexById = new Map((options.index ?? []).map(e => [e.identity.capability_id, e]));

  for (const c of identities) {
    const entry = indexById.get(c.capability_id);
    const fields = entry ? entry.fields : identityFields(c);
    const identifiers = entry
      ? entry.identifiers
      : [c.capability_id, ...c.delivered_by, ...c.demonstrated_by, ...c.originated_as, ...c.evidenced_by]
          .map(i => i.toLowerCase());

    const matches: SearchMatch[] = [];
    let score = 0;

    const record = (field: string, weight: number, text: string, token: string) => {
      score += weight;
      if (!matches.some(m => m.field === field)) {
        matches.push({ field, weight, excerpt: excerpt(text, token) });
      }
    };

    if (q.empty) {
      score = 1; // filters-only browse
    } else {
      // 1. Whole governed identifiers, matched by equality. Decisive.
      for (const id of q.identifiers) {
        if (identifiers.includes(id)) {
          record('identifier', (FIELD_WEIGHTS.capability_id ?? 8) * IDENTIFIER_MATCH_MULTIPLIER, id, id);
        }
      }
      // 2. Adjacent-word phrases. "decision gap" must beat "decision".
      for (const phrase of q.phrases) {
        for (const [field, text] of Object.entries(fields)) {
          if (containsWord(text, phrase)) {
            record(field, (FIELD_WEIGHTS[field] ?? 1) * PHRASE_MATCH_MULTIPLIER, text, phrase);
          }
        }
      }
      // 3. Content words, stopwords already removed.
      for (const term of q.terms) {
        for (const [field, text] of Object.entries(fields)) {
          if (containsWord(text, term)) record(field, FIELD_WEIGHTS[field] ?? 1, text, term);
        }
      }
      if (score === 0) continue;
    }

    results.push({
      capability_id: c.capability_id,
      name: c.name,
      summary: c.summary,
      score,
      matches: matches.sort((a, b) => b.weight - a.weight).slice(0, 4),
      // Always attached: a searcher must never reach a simulated capability unaware (ADR-047).
      lifecycle_state: c.lifecycle_state as LifecycleState | null,
      demo_maturity: ctx.resolveDemoMaturity(c),
      implementation_status: c.implementation_status,
      level: 'structured'
    });
  }

  results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    query,
    level: 'structured',
    total: results.length,
    results,
    suggestion: results.length === 0 ? suggestRelaxation(filter, query) : null,
    applied_filters: filter,
    hints: q.hints
  };
}

/**
 * ADR-050: zero results return the nearest filter relaxation, never an empty page.
 * The most restrictive dimension is named first, because that is the one worth dropping.
 */
export function suggestRelaxation(filter: CapabilityFilter, query: string): string {
  const active: string[] = [];
  if (filter.domain?.length) active.push(`domain=${filter.domain.join(',')}`);
  if (filter.implementation_status?.length) active.push(`implementation status=${filter.implementation_status.join(',')}`);
  if (filter.demo_maturity?.length) active.push(`demo readiness=${filter.demo_maturity.join(',')}`);
  if (filter.capability_type?.length) active.push(`capability type=${filter.capability_type.join(',')}`);
  if (filter.business_problem?.length) active.push(`business problem=${filter.business_problem.join(',')}`);
  if (filter.tags?.length) active.push(`tags=${filter.tags.join(',')}`);
  if (filter.persona?.length) active.push(`persona=${filter.persona.join(',')}`);
  if (typeof filter.platform_reusable === 'boolean') active.push(`platform reusable=${filter.platform_reusable}`);

  if (active.length > 0) return `No capability matched. Try removing ${active[0]}, or search without filters.`;
  if (query.trim().length > 0) {
    return `No capability matched "${query}". Try a business problem such as forecast uncertainty, a work package such as DDF-01, or browse by domain.`;
  }
  return 'No capabilities are registered.';
}
