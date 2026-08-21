/**
 * Progressive clarification for Atlas exploration (ATL-04R).
 *
 * `ATL-04` answered every query the same way: run Level 1, sort by score, render the list. For a
 * precise query that is exactly right. For "what capabilities does CogniX have on promotions?" it
 * returns fourteen capabilities across four problem spaces with no indication that the question had
 * four readings — a large flat result set standing in for an answer.
 *
 * This module makes the Atlas ask instead of guess. It is DETERMINISTIC: no model, no provider, no
 * network call, no embedding. Every clarification it offers is assembled from governed records —
 * `CAPABILITY_AREAS` and their declared aspects, the `LENS_LEXICON` and `FILTER_LEXICON` already
 * published by `query-understanding`, the domain catalogue, and the search result itself. That is a
 * deliberate constraint rather than an economy: an intent engine backed by an uncontrolled model
 * would put ungoverned content into the one surface whose job is to explain governed content, and
 * it would stop working the moment a key was missing. Clarification must work with no credential at
 * all, because it is how a reader reaches everything else.
 *
 * ── Confidence is qualitative, and that is not a compromise ─────────────────
 * `IntentState` has four values and no percentage. A numeric confidence would need calibrating
 * against something, nothing in the estate calibrates it, and printing an uncalibrated number to
 * make the interface look decisive is precisely the unsupported-metric failure Principle 12 forbids.
 * The four states are decided by counting governed structures — identifiers matched, areas spanned,
 * hints fired, members in scope — so a surprising clarification is inspectable in the way ADR-050
 * requires of a surprising search result.
 *
 * ── The rules that keep it from becoming an interrogation ───────────────────
 * 1. Never ask for something already inferable. "As an architect, how does promotion intelligence
 *    integrate?" declares its lens and its area, so it is asked nothing.
 * 2. Never ask more than `MAX_CLARIFICATION_STEPS` questions. Two is the ceiling, one is typical.
 * 3. Never narrow to something the query did not reach. A choice selects a subset of an area's
 *    governed members; it cannot widen a result set or introduce a capability from elsewhere.
 * 4. Never silently apply an inference. Everything inferred is returned in `ExplorationContext`
 *    carrying `source: 'inferred'`, so the interface can show it and the reader can remove it.
 * 5. Prepared responses are shortcuts, never restrictions — free text is accepted at every step.
 *
 * Governed by: ADR-050 · ADR-046 · ADR-061
 */

import type {
  CapabilityIdentity,
  CapabilityFilter,
  AudienceLens,
  AreaRelevance,
  ClarificationChoice,
  ClarificationQuestion,
  ClarificationResponse,
  ExplorationContext,
  IntentState,
  QueryExpansion
} from '../../packages/contracts/src/capability-atlas-model';
import { MAX_CLARIFICATION_STEPS } from '../../packages/contracts/src/capability-atlas-model';
import { CAPABILITY_AREAS, AREA_BY_CAPABILITY } from '../../content/atlas/capability-areas';
import { understandQuery } from './query-understanding';
import { searchCapabilities, type SearchContext } from './capability-search';
import { DOMAIN_CATALOGUE } from '../../config/domains';

/**
 * Queries about the platform rather than about a capability within it. Declared, not inferred: a
 * reader asking "what is CogniX?" must reach a platform explanation, and forcing them to pick a
 * capability area first would be the Atlas answering a question nobody asked (`ATL-04R` §20 D).
 */
export const PLATFORM_QUESTION_PHRASES = [
  'what is cognix',
  'what does cognix do',
  'what can cognix do',
  'tell me about cognix',
  'what is this platform',
  'what is this product',
  'introduce cognix',
  'cognix overview'
];

/**
 * Declared depth lexicon: phrasing that already states WHAT the reader wants to know, so the depth
 * question is not asked. Ordered longest-first at match time for the same reason the vocabulary is.
 */
const DEPTH_LEXICON: { phrases: string[]; depth: DepthChoice; lens: AudienceLens | null }[] = [
  { phrases: ['how do i demo', 'how do i demonstrate', 'demo to a client', 'show a client', 'demo path', 'demonstrate'],
    depth: 'demo', lens: 'sales' },
  { phrases: ['architecture', 'integrate', 'integration', 'data flow', 'contracts', 'apis', 'api'],
    depth: 'architecture', lens: 'architect' },
  { phrases: ['how is it tested', 'how do i test', 'test evidence', 'testing', 'test'],
    depth: 'testing', lens: 'developer' },
  { phrases: ['business value', 'business case', 'roi', 'why does it matter', 'strategic'],
    depth: 'value', lens: 'innovation-executive' },
  { phrases: ['compare', 'difference between', 'versus', ' vs '],
    depth: 'compare', lens: null }
];

export type DepthChoice = 'capabilities' | 'demo' | 'architecture' | 'testing' | 'value' | 'compare';

/** The depth choices offered when the reader has an area but has not said what they want from it. */
const DEPTH_CHOICES: { value: DepthChoice; label: string }[] = [
  { value: 'capabilities', label: 'What capabilities exist' },
  { value: 'demo', label: 'How to demonstrate them' },
  { value: 'value', label: 'Business value' },
  { value: 'architecture', label: 'Architecture and integration' },
  { value: 'testing', label: 'How they are tested' },
  { value: 'compare', label: 'Compare related capabilities' }
];

/**
 * Share of the total area score the leading area must hold before the Atlas stops asking which
 * area was meant. Published for the same reason the field weights are: a reader who thinks the
 * Atlas asked an unnecessary question can check the arithmetic.
 */
export const AREA_DOMINANCE_THRESHOLD = 0.55;
/**
 * The same bar, lowered, once the reader has already declared a lens or a depth. They have told the
 * Atlas something about their intent, so a leading area needs less of a margin before the Atlas
 * stops asking and starts showing.
 */
export const DECLARED_INTENT_DOMINANCE_THRESHOLD = 0.40;
/** An area below this share of the leading area's score is noise, not a second reading. */
export const AREA_RELEVANCE_FLOOR = 0.15;
/** Below this many members in scope, narrowing further is not worth a question. */
export const MIN_SCOPE_FOR_ASPECT_QUESTION = 3;

export interface ClarifyOptions {
  /** Default true. Set false to reproduce unexpanded behaviour, as Level 1 allows. */
  expandAliases?: boolean;
}

export interface ClarifyRequest {
  query: string;
  /** Accumulated context from previous steps. Absent on the first call. */
  context?: Partial<ExplorationContext>;
  step?: number;
}

function emptyContext(query: string): ExplorationContext {
  return { query, areas: [], aspects: [], lens: null, domain: null, refinements: [] };
}

/** Governed domain ids and names, flattened once. Domains are never invented — this is the catalogue. */
function domainMatches(lower: string): { value: string } | null {
  for (const category of DOMAIN_CATALOGUE) {
    for (const item of category.items) {
      const name = item.name.toLowerCase();
      if (lower.includes(name)) return { value: item.id };
      // "retail" reaches "Retail & Grocery"; the leading word only, so "food" cannot reach it.
      const lead = name.split(/[^a-z]+/).filter(Boolean)[0];
      if (lead && lead.length > 4 && new RegExp(`(^|[^a-z])${lead}([^a-z]|$)`).test(lower)) {
        return { value: item.id };
      }
    }
  }
  return null;
}

function detectDepth(lower: string): { depth: DepthChoice; lens: AudienceLens | null } | null {
  let best: { depth: DepthChoice; lens: AudienceLens | null; length: number } | null = null;
  for (const entry of DEPTH_LEXICON) {
    for (const phrase of entry.phrases) {
      if (!lower.includes(phrase)) continue;
      if (!best || phrase.length > best.length) {
        best = { depth: entry.depth, lens: entry.lens, length: phrase.length };
      }
    }
  }
  return best ? { depth: best.depth, lens: best.lens } : null;
}

export function isPlatformQuestion(query: string): boolean {
  const lower = query.toLowerCase().trim().replace(/[?.!]+$/, '');
  return PLATFORM_QUESTION_PHRASES.some(p => lower === p || lower.includes(p));
}

/**
 * Area relevance from a Level 1 result set.
 *
 * `score` orders the landscape and is never rendered as a measurement — it is the sum of the
 * search scores of the area's matching members, which is meaningful as a comparison between areas
 * on one query and meaningless as a number on its own.
 */
export function areaRelevance(
  results: { capability_id: string; name: string; score: number }[]
): AreaRelevance[] {
  const byArea = new Map<string, { score: number; matched: { id: string; name: string; score: number }[] }>();
  for (const r of results) {
    if (r.score <= 0) continue;
    const areaId = AREA_BY_CAPABILITY[r.capability_id];
    if (!areaId) continue;
    const entry = byArea.get(areaId) ?? { score: 0, matched: [] };
    entry.score += r.score;
    entry.matched.push({ id: r.capability_id, name: r.name, score: r.score });
    byArea.set(areaId, entry);
  }

  return [...byArea.entries()]
    .map(([area_id, entry]) => {
      const ordered = [...entry.matched].sort((a, b) => b.score - a.score);
      const lead = ordered.slice(0, 2).map(m => m.name);
      return {
        area_id,
        score: entry.score,
        matched: ordered.map(m => m.id),
        reason:
          ordered.length === 1
            ? `${lead[0]} matched here`
            : `${ordered.length} capabilities matched here, led by ${lead.join(' and ')}`
      };
    })
    .sort((a, b) => b.score - a.score || a.area_id.localeCompare(b.area_id));
}

function areaChoices(relevance: AreaRelevance[]): ClarificationChoice[] {
  const choices: ClarificationChoice[] = relevance.map(r => {
    const area = CAPABILITY_AREAS.find(a => a.area_id === r.area_id);
    return {
      choice_id: `area:${r.area_id}`,
      label: area ? area.name : r.area_id,
      dimension: 'area' as const,
      value: r.area_id,
      selects: r.matched
    };
  });
  choices.push({
    choice_id: 'area:all',
    label: 'Show me everything',
    dimension: 'area',
    value: 'all',
    selects: []
  });
  return choices;
}

function aspectChoices(areaId: string, scope: string[]): ClarificationChoice[] {
  const area = CAPABILITY_AREAS.find(a => a.area_id === areaId);
  if (!area) return [];
  const inScope = new Set(scope);

  const choices: ClarificationChoice[] = area.aspects
    // An aspect nothing in scope belongs to would offer the reader a dead end.
    .filter(aspect => aspect.selects.some(id => inScope.has(id)))
    .map(aspect => ({
      choice_id: `aspect:${aspect.aspect_id}`,
      label: aspect.label,
      dimension: 'aspect' as const,
      value: aspect.aspect_id,
      selects: aspect.selects.filter(id => inScope.has(id))
    }));

  // The technical reading is a depth choice rather than an aspect: it changes what the reader is
  // shown about the same capabilities, not which capabilities they are shown.
  choices.push({
    choice_id: 'depth:architecture',
    label: 'Architecture and integration',
    dimension: 'depth',
    value: 'architecture',
    selects: []
  });
  choices.push({
    choice_id: 'aspect:all',
    label: 'Show me everything',
    dimension: 'aspect',
    value: 'all',
    selects: []
  });
  return choices;
}

function depthChoices(): ClarificationChoice[] {
  return DEPTH_CHOICES.map(d => ({
    choice_id: `depth:${d.value}`,
    label: d.label,
    dimension: 'depth' as const,
    value: d.value,
    selects: []
  }));
}

/**
 * Resolve one clarification step.
 *
 * Returns the state, the visible context, the scope, the area landscape and — only where the Atlas
 * genuinely cannot proceed usefully — one question. Calling it again with the accumulated context
 * advances the conversation; calling it with a context that already answers everything ends it.
 */
export function clarify(
  identities: CapabilityIdentity[],
  request: ClarifyRequest,
  filter: CapabilityFilter,
  ctx: SearchContext,
  options: ClarifyOptions = {}
): ClarificationResponse {
  const query = request.query ?? '';
  const lower = [query, ...(request.context?.refinements ?? [])].join(' ').toLowerCase();
  const step = request.step ?? 0;

  const context: ExplorationContext = {
    ...emptyContext(query),
    ...request.context,
    query,
    areas: request.context?.areas ?? [],
    aspects: request.context?.aspects ?? [],
    refinements: request.context?.refinements ?? [],
    lens: request.context?.lens ?? null,
    domain: request.context?.domain ?? null
  };

  // A reader's free-text answer at a clarification step is re-run through Level 1 alongside their
  // original question rather than becoming a filter of its own. One deterministic mechanism decides
  // what text does to a result set, which is what keeps a surprising result explainable.
  const searchText = [query, ...context.refinements].join(' ').trim();
  const understood = understandQuery(searchText, { expandAliases: options.expandAliases });
  const expansions: QueryExpansion[] = understood.expansions;

  // ── Inference. Everything set here is marked `inferred` and is removable by the reader. ──
  if (!context.lens) {
    const lensHint = understood.hints.find(h => h.kind === 'lens');
    if (lensHint?.lens) context.lens = { value: lensHint.lens, source: 'inferred' };
  }
  const depth = detectDepth(lower);
  if (!context.lens && depth?.lens) context.lens = { value: depth.lens, source: 'inferred' };
  if (!context.domain) {
    const d = domainMatches(lower);
    if (d) context.domain = { value: d.value, source: 'inferred' };
  }

  const search = searchCapabilities(identities, searchText, filter, ctx, {
    expandAliases: options.expandAliases
  });

  /*
   * Relevance is floored before it leaves this function, and the floor is applied ONCE so that
   * everything downstream counts the same areas.
   *
   * Browser validation caught the alternative: the clarification asked about three areas while the
   * landscape announced six, because the question used the floored set and the landscape used the
   * raw one. Both numbers were arithmetically correct and the pair was incoherent — a reader cannot
   * be told their question spans six areas by a screen that just asked them to choose between three.
   * Areas below the floor scored on incidental prose; they are not a second reading of the question.
   */
  const allRelevance = areaRelevance(search.results);
  const relevanceLead = allRelevance[0];
  const relevance = relevanceLead
    ? allRelevance.filter(r => r.score >= relevanceLead.score * AREA_RELEVANCE_FLOOR)
    : allRelevance;

  // Scope starts as everything the query reached, then narrows by what the reader has chosen.
  let scope = search.results.filter(r => r.score > 0).map(r => r.capability_id);
  if (understood.empty) scope = identities.map(c => c.capability_id);

  const chosenAreaIds = context.areas.map(a => a.area_id);
  if (chosenAreaIds.length > 0) {
    const allowed = new Set(
      CAPABILITY_AREAS.filter(a => chosenAreaIds.includes(a.area_id)).flatMap(a => a.members)
    );
    const narrowed = scope.filter(id => allowed.has(id));
    // A chosen area with nothing in scope means the reader picked it from the landscape rather
    // than from the result set; its governed membership is then the honest scope.
    scope = narrowed.length > 0 ? narrowed : [...allowed];
  }

  for (const chosen of context.aspects) {
    const area = CAPABILITY_AREAS.find(a => a.area_id === chosen.area_id);
    const aspect = area?.aspects.find(x => x.aspect_id === chosen.aspect_id);
    if (!aspect) continue;
    const narrowed = scope.filter(id => aspect.selects.includes(id));
    // Rule 3: the fallback is the aspect's own governed members, never a wider set.
    scope = narrowed.length > 0 ? narrowed : [...aspect.selects];
  }

  const base = {
    context,
    in_scope: scope,
    area_relevance: relevance,
    expansions,
    step
  };

  // ── Terminal states, checked before any question is considered ──────────────
  if (isPlatformQuestion(query)) {
    return { ...base, state: 'clear', question: null };
  }
  if (!understood.empty && search.results.length === 0) {
    return { ...base, state: 'insufficient-evidence', question: null };
  }
  // A query naming a governed identifier has said exactly what it means.
  if (understood.identifiers.length > 0) {
    return { ...base, state: 'clear', question: null };
  }
  if (step >= MAX_CLARIFICATION_STEPS) {
    return { ...base, state: 'clear', question: null };
  }
  if (understood.empty) {
    // Browsing, not asking. The landscape is the answer.
    return { ...base, state: 'clear', question: null };
  }

  // ── Which area? Asked only where the reading is genuinely open ──────────────
  /*
   * Dominance is measured over the FULL relevance, not the floored set. How spread a question really
   * is includes the areas that only brushed it — discarding them first would make every query look
   * more focused than it is and would suppress clarifications that are worth asking. The floor
   * governs what is SHOWN and OFFERED; the raw spread governs whether to ask at all.
   */
  const total = allRelevance.reduce((sum, r) => sum + r.score, 0);
  const leader = relevance[0];
  // A reader who has already said who they are or what they want to know has narrowed the question
  // themselves. Asking them which area on top of that is the interrogation rule 2 exists to prevent,
  // so a declared intent lowers the bar the leading area has to clear.
  const intentDeclared = Boolean(context.lens || depth);
  const dominanceBar = intentDeclared
    ? DECLARED_INTENT_DOMINANCE_THRESHOLD
    : AREA_DOMINANCE_THRESHOLD;
  const dominant = Boolean(leader && total > 0 && leader.score / total >= dominanceBar);
  const spanned = relevance;

  if (chosenAreaIds.length === 0 && spanned.length >= 2 && !dominant) {
    return {
      ...base,
      state: 'multiple-interpretations',
      question: {
        dimension: 'area',
        question:
          spanned.length >= 3
            ? `That question spans ${spanned.length} capability areas. Which are you most interested in?`
            : 'That question has more than one reading. Which are you most interested in?',
        choices: areaChoices(spanned),
        multi_select: true
      }
    };
  }

  // ── Which aspect? Asked only where an area is settled and still holds several readings ──
  const settledAreaId = chosenAreaIds[0] ?? (dominant && leader ? leader.area_id : null);
  const aspectAnswered = context.aspects.length > 0;

  const spansSeveralAreas = chosenAreaIds.length === 0 && spanned.length >= 3;
  if (settledAreaId && !aspectAnswered && !depth && !spansSeveralAreas &&
      scope.length >= MIN_SCOPE_FOR_ASPECT_QUESTION) {
    const area = CAPABILITY_AREAS.find(a => a.area_id === settledAreaId);
    const choices = aspectChoices(settledAreaId, scope);
    // Two real aspects are the minimum for the question to be worth asking.
    if (area && choices.filter(c => c.dimension === 'aspect' && c.value !== 'all').length >= 2) {
      return {
        ...base,
        state: 'needs-clarification',
        question: {
          dimension: 'aspect',
          question: `Which aspect of ${area.name} are you most interested in?`,
          choices,
          multi_select: true
        }
      };
    }
  }

  // ── What do you want to know about it? Only once the set is settled and small ──
  if (settledAreaId && aspectAnswered && !depth && step < MAX_CLARIFICATION_STEPS) {
    const label = context.aspects
      .map(a => CAPABILITY_AREAS.find(x => x.area_id === a.area_id)?.aspects.find(y => y.aspect_id === a.aspect_id)?.label)
      .filter(Boolean)[0];
    return {
      ...base,
      state: 'needs-clarification',
      question: {
        dimension: 'depth',
        question: label
          ? `What would you like to understand about ${label.toLowerCase()}?`
          : 'What would you like to understand about these capabilities?',
        choices: depthChoices(),
        multi_select: false
      }
    };
  }

  return { ...base, state: 'clear', question: null };
}

/**
 * Fold a chosen response into the accumulated context.
 *
 * Free text becomes a refinement rather than a filter: the reader's own words are re-run through
 * Level 1 on the next step, which keeps one deterministic mechanism instead of growing a second
 * way for text to affect a result set.
 */
export function applyChoice(
  context: ExplorationContext,
  choice: ClarificationChoice
): ExplorationContext {
  const next: ExplorationContext = {
    ...context,
    areas: [...context.areas],
    aspects: [...context.aspects],
    refinements: [...context.refinements]
  };

  if (choice.dimension === 'area') {
    if (choice.value === 'all') return next;
    if (!next.areas.some(a => a.area_id === choice.value)) {
      next.areas.push({ area_id: choice.value, source: 'chosen' });
    }
    return next;
  }

  if (choice.dimension === 'aspect') {
    if (choice.value === 'all') return next;
    const owner = CAPABILITY_AREAS.find(a => a.aspects.some(x => x.aspect_id === choice.value));
    if (owner && !next.aspects.some(a => a.aspect_id === choice.value)) {
      next.aspects.push({ aspect_id: choice.value, area_id: owner.area_id, source: 'chosen' });
      if (!next.areas.some(a => a.area_id === owner.area_id)) {
        next.areas.push({ area_id: owner.area_id, source: 'chosen' });
      }
    }
    return next;
  }

  if (choice.dimension === 'lens') {
    next.lens = { value: choice.value as AudienceLens, source: 'chosen' };
    return next;
  }

  if (choice.dimension === 'domain') {
    next.domain = { value: choice.value, source: 'chosen' };
    return next;
  }

  // depth — recorded as a refinement so the next Level 1 pass sees the reader's intent in their
  // own vocabulary, and mapped to a lens only where the mapping is declared above.
  const mapped = DEPTH_LEXICON.find(d => d.depth === (choice.value as DepthChoice));
  if (mapped?.lens && !next.lens) next.lens = { value: mapped.lens, source: 'chosen' };
  if (!next.refinements.includes(choice.label)) next.refinements.push(choice.label);
  return next;
}

/** Remove one element of inferred or chosen context. Nothing the Atlas infers is permanent. */
export function removeContext(
  context: ExplorationContext,
  kind: 'area' | 'aspect' | 'lens' | 'domain' | 'refinement',
  value?: string
): ExplorationContext {
  switch (kind) {
    case 'area':
      return {
        ...context,
        areas: context.areas.filter(a => a.area_id !== value),
        // An aspect cannot outlive the area that owns it.
        aspects: context.aspects.filter(a => a.area_id !== value)
      };
    case 'aspect':
      return { ...context, aspects: context.aspects.filter(a => a.aspect_id !== value) };
    case 'lens':
      return { ...context, lens: null };
    case 'domain':
      return { ...context, domain: null };
    case 'refinement':
      return { ...context, refinements: context.refinements.filter(r => r !== value) };
  }
}
