/**
 * Level 1 structured capability search (ADR-050).
 *
 * Deterministic, explainable and reproducible: the same corpus and query always produce the
 * same ordering, no model is involved, and the response names the fields that matched so a
 * surprising result is inspectable rather than mysterious.
 *
 * Level 1 must stand alone. Nothing here depends on an embedding index, an AI provider or a
 * network call — that is what keeps the Atlas usable when a key is missing or a quota is spent.
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

/** Documented field weights. Ranking is explainable because these are published. */
/** A whole-identifier hit outranks any free-text hit on the same field. */
export const IDENTIFIER_MATCH_MULTIPLIER = 5;

export const FIELD_WEIGHTS: Record<string, number> = {
  name: 10,
  capability_id: 8,
  summary: 5,
  tags: 3,
  business_problems: 3,
  delivered_by: 2,
  demonstrated_by: 2,
  originated_as: 2,
  evidenced_by: 2,
  domains: 1,
  personas: 1
};

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Governed identifiers — `DDF-01`, `CDI-07A`, `SOL-PROMO-01`, `PAT-BEH-05`, `CAP-DECISION-GAP` —
 * are matched WHOLE. Splitting them on the hyphen would reduce `DDF-01` to the tokens `ddf` and
 * `01`, and `01` then matches `CDI-01`, `SOL-PROMO-01` and every other identifier ending in the
 * same number. That is the numeric-suffix conflation ATL-01 recorded as gap `G6` and
 * `AC-ATL-02-10` forbids; it surfaced in Level 1 search as soon as ATL-03 populated enough
 * capabilities for two identifier families to collide.
 */
const IDENTIFIER_PATTERN = /\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/g;

/** Identifier-aware normalisation: whole identifiers survive as single tokens. */
function normaliseForIdentifier(s: string): string {
  return s.toLowerCase().trim();
}

function tokenise(q: string): { plain: string[]; identifiers: string[] } {
  const identifiers = (q.toUpperCase().match(IDENTIFIER_PATTERN) ?? []).map(i => i.toLowerCase());
  const withoutIdentifiers = identifiers.reduce(
    (acc, id) => acc.replace(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' '),
    q
  );
  const plain = normalise(withoutIdentifiers).split(' ').filter(t => t.length > 1);
  return { plain, identifiers };
}

function excerpt(value: string, token: string): string {
  const i = value.toLowerCase().indexOf(token);
  if (i < 0) return value.slice(0, 80);
  const start = Math.max(0, i - 30);
  return (start > 0 ? '…' : '') + value.slice(start, i + token.length + 40).trim();
}

function scoreField(
  fieldValue: string | string[],
  token: string,
  field: string,
  exactIdentifier = false
): SearchMatch | null {
  const weight = FIELD_WEIGHTS[field] ?? 1;
  if (exactIdentifier) {
    // Whole-identifier equality. `DDF-01` matches `DDF-01` and nothing else.
    if (Array.isArray(fieldValue)) {
      const hit = fieldValue.find(v => normaliseForIdentifier(v) === token);
      return hit ? { field, weight, excerpt: hit } : null;
    }
    return normaliseForIdentifier(fieldValue) === token
      ? { field, weight, excerpt: fieldValue }
      : null;
  }
  if (Array.isArray(fieldValue)) {
    const hit = fieldValue.find(v => normalise(v).includes(token));
    return hit ? { field, weight, excerpt: hit } : null;
  }
  return normalise(fieldValue).includes(token)
    ? { field, weight, excerpt: excerpt(fieldValue, token) }
    : null;
}

export interface SearchContext {
  resolveDemoMaturity: (c: CapabilityIdentity) => DemoMaturity | null;
}

export function searchCapabilities(
  identities: CapabilityIdentity[],
  query: string,
  filter: CapabilityFilter,
  ctx: SearchContext
): SearchResponse {
  const tokens = tokenise(query);
  const results: SearchResult[] = [];

  for (const c of identities) {
    const matches: SearchMatch[] = [];
    let score = 0;

    if (tokens.plain.length === 0 && tokens.identifiers.length === 0) {
      // No query: filters alone. Every surviving capability is a result, ordered by name.
      score = 1;
    } else {
      // Whole-identifier matches first. An identifier hit is decisive, so it carries a
      // multiplier: searching DDF-01 must not tie with a capability that merely shares a number.
      for (const id of tokens.identifiers) {
        const idMatches = [
          scoreField(c.capability_id, id, 'capability_id', true),
          scoreField(c.delivered_by, id, 'delivered_by', true),
          scoreField(c.demonstrated_by, id, 'demonstrated_by', true),
          scoreField(c.originated_as, id, 'originated_as', true),
          scoreField(c.evidenced_by, id, 'evidenced_by', true)
        ].filter((m): m is SearchMatch => m !== null);

        for (const m of idMatches) {
          score += m.weight * IDENTIFIER_MATCH_MULTIPLIER;
          if (!matches.some(existing => existing.field === m.field)) matches.push(m);
        }
      }

      for (const token of tokens.plain) {
        const fieldMatches = [
          scoreField(c.name, token, 'name'),
          scoreField(c.capability_id, token, 'capability_id'),
          scoreField(c.summary, token, 'summary'),
          scoreField(c.tags, token, 'tags'),
          scoreField(c.business_problems, token, 'business_problems'),
          scoreField(c.delivered_by, token, 'delivered_by'),
          scoreField(c.demonstrated_by, token, 'demonstrated_by'),
          scoreField(c.domains, token, 'domains'),
          scoreField(c.personas, token, 'personas')
        ].filter((m): m is SearchMatch => m !== null);

        for (const m of fieldMatches) {
          score += m.weight;
          if (!matches.some(existing => existing.field === m.field)) matches.push(m);
        }
      }
      if (score === 0) continue;
    }

    results.push({
      capability_id: c.capability_id,
      name: c.name,
      summary: c.summary,
      score,
      matches,
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
    applied_filters: filter
  };
}

/**
 * ADR-050: zero results return the nearest filter relaxation, never an empty page.
 * The most restrictive dimension is named first, because that is the one worth dropping.
 */
export function suggestRelaxation(filter: CapabilityFilter, query: string): string {
  const active: string[] = [];
  if (filter.domain?.length) active.push(`domain=${filter.domain.join(',')}`);
  if (filter.implementation_status?.length) active.push(`implementation_status=${filter.implementation_status.join(',')}`);
  if (filter.demo_maturity?.length) active.push(`demo_maturity=${filter.demo_maturity.join(',')}`);
  if (filter.lifecycle_state?.length) active.push(`lifecycle_state=${filter.lifecycle_state.join(',')}`);
  if (filter.tags?.length) active.push(`tags=${filter.tags.join(',')}`);
  if (filter.persona?.length) active.push(`persona=${filter.persona.join(',')}`);
  if (typeof filter.platform_reusable === 'boolean') active.push(`platform_reusable=${filter.platform_reusable}`);

  if (active.length > 0) {
    return `No capability matched. Try removing ${active[0]}, or search without filters.`;
  }
  if (query.trim().length > 0) {
    return `No capability matched "${query}". Try a business problem, a work package such as DDF-01, or browse by domain.`;
  }
  return 'No capabilities are registered. ATL-03 populates the remaining inventory.';
}
