/**
 * Client context intake (ATL-06D §7, §9, §28) — reading a natural brief into governed context.
 *
 * ── The rule that shapes every function here ────────────────────────────────
 * **Nothing about the client is inferred from model memory.** A brief naming *Tesco* yields the
 * organisation string the user typed and NOTHING ELSE: no revenue, no store count, no incumbent
 * planning platform, no "known challenges". The Atlas holds no client records and is not permitted
 * to behave as though it does — `ATL-06D` §28 states this directly, and it is the difference
 * between a preparation tool and a system that fabricates a client's situation for them.
 *
 * What IS read is the vocabulary this estate already governs:
 *
 *   - `bp-*` business problems, through the ADR-059 search vocabulary the Atlas already publishes,
 *     so "promotional volatility" reaches `bp-promotion-effectiveness` by the same governed
 *     mapping the search uses rather than by a second private lexicon.
 *   - `config/domains.ts` ids, matched on their declared names and a small governed synonym list.
 *   - duration, objective and orientation, matched on declared phrasings.
 *   - the client's ROLE as a verbatim span of the user's own words — never normalised into an
 *     `AudienceLens`, because those are different dimensions (§9).
 *
 * Every inference carries the span it was read from, so the user can see it and remove it. That is
 * the `ExplorationContext` precedent (ADR-050) applied to a second kind of context.
 */

import { DOMAIN_CATALOGUE } from '../../../config/domains';
import { BUSINESS_PROBLEMS } from '../../../content/atlas/business-problems';
import { SEARCH_VOCABULARY } from '../../../content/atlas/vocabulary';
import {
  MEETING_OBJECTIVES,
  type ClientContext, type ClientContextValue, type ClientOrientation, type MeetingObjective
} from '../../../packages/contracts/src/atlas-preparation-model';

// ── Declared lexicons ────────────────────────────────────────────────────────

/**
 * Domain synonyms.
 *
 * Deliberately small and declared rather than derived: `config/domains.ts` names are precise
 * (`retail_grocery`) and a client brief is not ("a UK grocery retailer"). Each entry maps a phrase
 * a person would actually write onto a domain id that already exists. An entry naming a domain the
 * catalogue does not hold is a defect, checked by rule `PR1`.
 */
const DOMAIN_PHRASES: { phrases: string[]; domain: string }[] = [
  { domain: 'retail_grocery', phrases: ['grocery', 'supermarket', 'food retail', 'grocer', 'convenience retail'] },
  { domain: 'digital_commerce', phrases: ['ecommerce', 'e-commerce', 'online retail', 'digital commerce', 'marketplace'] },
  { domain: 'cpg', phrases: ['cpg', 'fmcg', 'consumer goods', 'consumer packaged goods', 'brand manufacturer'] },
  { domain: 'fashion_apparel', phrases: ['fashion', 'apparel', 'clothing retail'] },
  { domain: 'logistics_distribution', phrases: ['logistics', 'distribution', 'third party logistics', '3pl', 'warehousing'] },
  { domain: 'transportation_mobility', phrases: ['transport', 'transportation', 'mobility', 'fleet'] },
  { domain: 'manufacturing', phrases: ['manufacturing', 'manufacturer', 'production plant'] },
  { domain: 'restaurants_food', phrases: ['restaurant', 'quick service', 'food service', 'qsr'] },
  { domain: 'hospitality_hotels', phrases: ['hotel', 'hospitality'] },
  { domain: 'healthcare_lifesciences', phrases: ['healthcare', 'life sciences', 'pharmaceutical', 'pharma'] },
  { domain: 'banking_finance', phrases: ['bank', 'banking', 'financial services'] },
  { domain: 'energy_utilities', phrases: ['energy', 'utilities', 'utility'] },
  { domain: 'public_sector', phrases: ['public sector', 'government', 'local authority'] },
  { domain: 'telecom', phrases: ['telecom', 'telecommunications', 'mobile operator'] },
  { domain: 'automotive', phrases: ['automotive', 'car manufacturer'] },
  { domain: 'aviation_airports', phrases: ['airport', 'aviation', 'airline'] }
];

/**
 * Role phrasings.
 *
 * These do NOT map to an `AudienceLens`. They classify the ORIENTATION of the room — whether the
 * person across the table reasons about architecture or about outcomes — which is a third
 * dimension again, and the one that decides how technical the pack should be (§7).
 */
const ROLE_PHRASES: { phrases: string[]; orientation: ClientOrientation }[] = [
  { orientation: 'technical', phrases: ['enterprise architect', 'solution architect', 'architect', 'cto', 'head of engineering', 'engineering lead', 'data engineer', 'platform lead', 'technical lead', 'developer', 'head of data', 'chief data officer'] },
  { orientation: 'executive', phrases: ['innovation director', 'director of innovation', 'chief executive', 'ceo', 'coo', 'cfo', 'commercial director', 'managing director', 'board', 'chief digital officer', 'head of strategy', 'transformation director'] },
  { orientation: 'mixed', phrases: ['head of demand planning', 'demand planning director', 'demand planning lead', 'demand planning manager', 'head of demand', 'demand planner', 'planning lead', 'supply chain director', 'head of supply chain', 'category manager', 'head of merchandising', 'planning manager', 'head of forecasting', 'operations director', 'head of replenishment', 'head of trading', 'commercial manager'] }
];

/** Objective phrasings. Order matters only in that a longer phrase wins (declared, not scored). */
const OBJECTIVE_PHRASES: { phrases: string[]; objective: MeetingObjective }[] = [
  { objective: 'demonstrate', phrases: ['demo', 'demonstrate', 'demonstration', 'show them', 'show the platform', 'walk them through'] },
  { objective: 'architecture', phrases: ['architecture', 'integrate', 'integration', 'how it fits', 'technical deep dive', 'apis', 'data flows'] },
  { objective: 'pilot', phrases: ['pilot', 'proof of concept', 'poc', 'trial', 'next steps on a project', 'scope a project'] },
  { objective: 'executive-innovation', phrases: ['innovation', 'what is different', 'whats different', 'strategic', 'board level', 'thought leadership'] },
  { objective: 'understand-challenges', phrases: ['discovery', 'understand their', 'learn about their', 'their challenges', 'their problems', 'listen'] }
];

/** Vendors named often enough in this space that recognising them is not a guess about the client. */
const KNOWN_VENDOR_PHRASES = [
  'blue yonder', 'blueyonder', 'o9', 'kinaxis', 'relex', 'sap ibp', 'sap', 'oracle', 'anaplan',
  'e2open', 'manhattan associates', 'infor', 'jda', 'toolsgroup', 'symphonyai', 'board',
  'logility', 'dynamics', 'databricks', 'snowflake', 'palantir'
];

// ── Reading ──────────────────────────────────────────────────────────────────

function inferred<T>(value: T, evidence: string): ClientContextValue<T> {
  return { value, source: 'inferred', evidence };
}

/** Longest declared phrase present in the text, so "sap ibp" beats "sap". */
function longestPhrase(lower: string, phrases: string[]): string | null {
  let best: string | null = null;
  for (const p of phrases) {
    if (lower.includes(p) && (!best || p.length > best.length)) best = p;
  }
  return best;
}

export function readDomain(lower: string): ClientContextValue<string> | null {
  let best: { domain: string; phrase: string } | null = null;
  for (const entry of DOMAIN_PHRASES) {
    const hit = longestPhrase(lower, entry.phrases);
    if (hit && (!best || hit.length > best.phrase.length)) best = { domain: entry.domain, phrase: hit };
  }
  return best ? inferred(best.domain, best.phrase) : null;
}

/**
 * Declared phrasings for each governed business problem.
 *
 * An earlier version of this function tokenised the `bp-*` LABEL and matched any word over four
 * characters. It was wrong in a way worth recording: the label *"Knowing what the platform can
 * do"* made the word **platform** a trigger, so the brief *"integrates with an existing planning
 * platform"* — a question about integration — was read as the client having a capability-discovery
 * problem, and the pack led with the Architectural Storyboard. Generic words in governed labels are
 * not evidence of a business problem.
 *
 * Each phrase here is declared, names a real `bp-*`, and is reviewable as content. Rule `PR2` checks
 * that every problem id used below exists in `BUSINESS_PROBLEMS`.
 */
const PROBLEM_PHRASES: { problem: string; phrases: string[] }[] = [
  { problem: 'bp-forecast-uncertainty', phrases: ['forecast uncertainty', 'forecast accuracy', 'forecasting', 'forecast', 'demand volatility', 'volatility', 'unpredictable demand', 'demand swings', 'trust the number', 'numbers keep changing', 'demand planning', 'demand signals'] },
  { problem: 'bp-stock-availability', phrases: ['stock availability', 'availability', 'out of stock', 'stockout', 'stock outs', 'on the shelf', 'replenishment', 'stock forecasting', 'inventory'] },
  { problem: 'bp-promotion-effectiveness', phrases: ['promotion', 'promotional', 'promotions', 'promo', 'campaign effectiveness', 'uplift', 'did the promotion'] },
  { problem: 'bp-supplier-reliability', phrases: ['supplier', 'suppliers', 'supply reliability', 'late deliveries', 'fill rate', 'keep the promise'] },
  { problem: 'bp-decision-latency', phrases: ['slow decisions', 'react quickly', 'reacting quickly', 'decision speed', 'too long to act', 'time to act', 'reacting to'] },
  { problem: 'bp-ai-trust', phrases: ['trust the ai', 'trust in ai', 'black box', 'explainability', 'explainable', 'why should we believe', 'model transparency'] },
  { problem: 'bp-decision-recall', phrases: ['what did we decide', 'institutional memory', 'organisational memory', 'forget', 'last time we', 'decision history'] },
  { problem: 'bp-margin-compression', phrases: ['margin', 'margins', 'profitability', 'cost pressure'] },
  { problem: 'bp-capability-discovery', phrases: ['what can cognix do', 'what the platform can do', 'capability discovery', 'what is genuinely different', 'what is different about', 'whats different about'] },
  { problem: 'bp-access-governance', phrases: ['access control', 'permissions', 'who can see', 'data governance', 'role based access'] }
];

/**
 * Business problems, read from declared phrasings AND the governed search vocabulary.
 *
 * The second pass is the load-bearing reuse: "was it the right call" reaches `regret` through the
 * ADR-059 vocabulary the Atlas search already publishes, so business phrasing that the estate has
 * already governed for retrieval is governed here too, rather than being duplicated into a second
 * private lexicon that could drift from it.
 */
export function readBusinessProblems(lower: string): ClientContextValue<string>[] {
  const out: ClientContextValue<string>[] = [];
  const seen = new Set<string>();

  for (const entry of PROBLEM_PHRASES) {
    const hit = longestPhrase(lower, entry.phrases);
    if (hit && !seen.has(entry.problem)) {
      seen.add(entry.problem);
      out.push(inferred(entry.problem, hit));
    }
  }

  for (const alias of SEARCH_VOCABULARY) {
    if (!lower.includes(alias.phrase)) continue;
    for (const p of BUSINESS_PROBLEMS) {
      if (seen.has(p.problem_id)) continue;
      const label = p.label.toLowerCase();
      // The alias must introduce a term that appears in the problem's own governed label, and the
      // term must be discriminating — a short generic token is not evidence of a problem.
      if (alias.governed_terms.some(t => t.length > 4 && label.includes(t))) {
        seen.add(p.problem_id);
        out.push(inferred(p.problem_id, alias.phrase));
      }
    }
  }

  return out;
}

/** Exported for rule `PR2`: every declared problem phrase must name a real governed problem. */
export function declaredProblemIds(): string[] {
  return PROBLEM_PHRASES.map(p => p.problem);
}

export function catalogueProblemIds(): Set<string> {
  return new Set(BUSINESS_PROBLEMS.map(p => p.problem_id));
}

/**
 * The client's role, as a verbatim span of the user's own words.
 *
 * Returns what the user wrote — "Head of Demand Planning" — not a normalised token, because the
 * role is rendered back to them and a normalised role reads as though the Atlas knows something
 * about the person that it does not.
 */
export function readClientRole(brief: string): { role: ClientContextValue<string>; orientation: ClientContextValue<ClientOrientation> } | null {
  const lower = brief.toLowerCase();
  let best: { phrase: string; orientation: ClientOrientation } | null = null;
  for (const entry of ROLE_PHRASES) {
    const hit = longestPhrase(lower, entry.phrases);
    if (hit && (!best || hit.length > best.phrase.length)) best = { phrase: hit, orientation: entry.orientation };
  }
  if (!best) return null;
  // Recover the user's own casing for the span they wrote.
  const at = lower.indexOf(best.phrase);
  const verbatim = brief.slice(at, at + best.phrase.length);
  return {
    role: inferred(verbatim, best.phrase),
    orientation: inferred(best.orientation, best.phrase)
  };
}

/** Minutes, read only from an explicit statement. Never defaulted — an absent duration is absent. */
export function readDuration(lower: string): ClientContextValue<number> | null {
  const mins = lower.match(/(\d{1,3})\s*(?:-|\s)?\s*(?:minute|minutes|min|mins)\b/);
  if (mins) return inferred(Number(mins[1]), mins[0].trim());
  const hours = lower.match(/(\d{1,2})\s*(?:-|\s)?\s*(?:hour|hours|hr|hrs)\b/);
  if (hours) return inferred(Number(hours[1]) * 60, hours[0].trim());
  if (/\bhalf an hour\b/.test(lower)) return inferred(30, 'half an hour');
  if (/\ban hour\b/.test(lower)) return inferred(60, 'an hour');
  return null;
}

export function readObjective(lower: string): ClientContextValue<MeetingObjective> | null {
  let best: { objective: MeetingObjective; phrase: string } | null = null;
  for (const entry of OBJECTIVE_PHRASES) {
    const hit = longestPhrase(lower, entry.phrases);
    if (hit && (!best || hit.length > best.phrase.length)) best = { objective: entry.objective, phrase: hit };
  }
  return best ? inferred(best.objective, best.phrase) : null;
}

export function readVendors(lower: string): string[] {
  const found = KNOWN_VENDOR_PHRASES.filter(v => new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower));
  // "sap ibp" subsumes "sap"; keep the more specific naming only.
  return found.filter(v => !found.some(other => other !== v && other.includes(v)));
}

/**
 * The organisation, read ONLY from an explicit possessive or preposition construction.
 *
 * Conservative on purpose. A false positive here puts a word in front of the user as "the client"
 * that they never named, and there is no upside that justifies it: the organisation contributes
 * nothing to capability selection, and is carried only so the pack can be titled.
 */
export function readOrganisation(brief: string): ClientContextValue<string> | null {
  const m = brief.match(/\b(?:at|with|for|meeting)\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3})/);
  if (!m) return null;
  const candidate = m[1].trim();
  // Reject sentence-initial capitals and role words that merely follow a preposition.
  if (/^(I|The|A|An|We|They|My|Head|Chief|Director|Enterprise|Innovation|Senior|Lead)\b/.test(candidate)) return null;
  if (candidate.length < 2) return null;
  return inferred(candidate, m[0]);
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export const EMPTY_CONTEXT: ClientContext = {
  brief: '',
  organisation: null,
  domain: null,
  client_role: null,
  business_problems: [],
  objective: null,
  duration_mins: null,
  orientation: null,
  capabilities_discussed: [],
  vendors_mentioned: [],
  refinements: []
};

/**
 * Read a brief into context, MERGING over anything already established.
 *
 * `ATL-06D` §31 requires that "make this more technical" refines rather than restarts. Merge order
 * is therefore: an existing `stated` or `chosen` value always survives a fresh inference, because a
 * value the user supplied outranks one the Atlas read. A fresh inference replaces a previous
 * inference, which is what lets a refinement move the duration from 30 to 15.
 */
export function readContext(brief: string, prior: Partial<ClientContext> = {}): ClientContext {
  const lower = brief.toLowerCase();
  const base: ClientContext = { ...EMPTY_CONTEXT, ...prior, brief: prior.brief ? `${prior.brief}\n${brief}`.trim() : brief };

  const keep = <T>(existing: ClientContextValue<T> | null | undefined, fresh: ClientContextValue<T> | null) => {
    if (existing && existing.source !== 'inferred') return existing;
    return fresh ?? existing ?? null;
  };

  const roleRead = readClientRole(brief);

  const freshProblems = readBusinessProblems(lower);
  const priorProblems = base.business_problems ?? [];
  const problemIds = new Set(priorProblems.map(p => p.value));

  return {
    brief: base.brief,
    organisation: keep(base.organisation, readOrganisation(brief)),
    domain: keep(base.domain, readDomain(lower)),
    client_role: keep(base.client_role, roleRead?.role ?? null),
    business_problems: [...priorProblems, ...freshProblems.filter(p => !problemIds.has(p.value))],
    objective: keep(base.objective, readObjective(lower)),
    duration_mins: keep(base.duration_mins, readDuration(lower)),
    orientation: keep(base.orientation, roleRead?.orientation ?? null),
    capabilities_discussed: base.capabilities_discussed ?? [],
    vendors_mentioned: [...new Set([...(base.vendors_mentioned ?? []), ...readVendors(lower)])],
    refinements: base.refinements ?? []
  };
}

/** Applied when the user answers a clarification. A chosen value outranks every inference. */
export function applyChoiceToContext(context: ClientContext, dimension: string, value: string): ClientContext {
  const chosen = <T>(v: T): ClientContextValue<T> => ({ value: v, source: 'chosen' });
  switch (dimension) {
    case 'objective':
      return MEETING_OBJECTIVES.includes(value as MeetingObjective)
        ? { ...context, objective: chosen(value as MeetingObjective) }
        : { ...context, refinements: [...context.refinements, value] };
    case 'duration': {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? { ...context, duration_mins: chosen(n) } : context;
    }
    case 'domain':
      return { ...context, domain: chosen(value) };
    case 'orientation':
      return { ...context, orientation: chosen(value as ClientOrientation) };
    case 'client_role':
      return { ...context, client_role: chosen(value) };
    default:
      return { ...context, refinements: [...context.refinements, value] };
  }
}

/** Exported for rule `PR1`: every declared domain phrase must name a real catalogue entry. */
export function declaredDomainIds(): string[] {
  return DOMAIN_PHRASES.map(d => d.domain);
}

export function catalogueDomainIds(): Set<string> {
  return new Set(DOMAIN_CATALOGUE.flatMap(c => c.items.map(i => i.id)));
}
