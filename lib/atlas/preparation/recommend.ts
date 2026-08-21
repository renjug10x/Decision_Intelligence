/**
 * Capability recommendation for a client conversation (ATL-06D §11, §12).
 *
 * ── Two failures this module is built to make impossible ────────────────────
 *
 *   1. THE BARE LIST. *"Recommended: Decision Gap, Intent Fusion, Forecast Stability."* §11 forbids
 *      it, and the shape of the code enforces it: a capability enters the pack by ACCUMULATING
 *      RATIONALE, and a capability that accumulates none is not recommendable. There is no code
 *      path that produces a recommendation with an empty rationale, so rule `P1` is a check on a
 *      property the construction already guarantees rather than a filter doing real work.
 *
 *   2. KEYWORD OVERLOAD. §12 forbids recommending fifteen capabilities because fifteen matched a
 *      word. Selection is therefore two-stage: score, then take a SEPARATED lead set. The
 *      separation test is what stops a flat field of near-identical scores from being presented as
 *      a confident top five — if the sixth is as relevant as the fifth, the pack says so instead of
 *      drawing an arbitrary line.
 *
 * ── Where the score comes from, and where it never goes ─────────────────────
 * Scoring reuses the ADR-050 search — the same deterministic Level 1 retrieval, the same field
 * weights, the same ADR-059 vocabulary — and adds governed context bonuses on top. It does not
 * invent a second relevance model. The resulting number orders a list and is then DISCARDED: it is
 * not returned by the API, not rendered, and not convertible into a confidence percentage. The
 * reader is given the rationale in words, which is the thing they can actually check.
 */

import type {
  ResolvedCapability, AudienceLens, CapabilityId
} from '../../../packages/contracts/src/capability-atlas-model';
import {
  LEAD_RECOMMENDATION_TARGET, LEAD_RECOMMENDATION_FLOOR, SUPPORTING_RECOMMENDATION_MAX,
  type CapabilityRecommendation, type ClientContext, type RecommendationRationale
} from '../../../packages/contracts/src/atlas-preparation-model';
import { businessProblemLabel } from '../../../content/atlas/business-problems';
import { getDomainById } from '../../../config/domains';
import { lensSignals, LENS_PROFILES } from '../lens';
import { searchCapabilities } from '../capability-search';
import type { SearchContext } from '../capability-search';
import type { CapabilityIndex } from '../capability-index';

/**
 * Relative weights for the context bonuses.
 *
 * These sit alongside the ADR-050 search score, which is itself weighted by field. The numbers are
 * declared here rather than scattered so that changing the balance is one visible edit, and so a
 * reviewer can argue with the ordering rather than reverse-engineer it.
 */
export const CONTEXT_WEIGHTS = {
  /** The client's stated problem matching the capability's declared `bp-*`. The strongest signal. */
  business_problem: 30,
  /** The capability declares the client's domain. */
  domain: 12,
  /** The capability is reusable and the client's domain has been assessed for it. */
  assessed_domain: 8,
  /** The objective is to demonstrate, and this capability can actually be demonstrated. */
  demonstrable_for_demo: 14,
  /** The room is technical and the capability publishes a contract to talk about. */
  technical_surface: 10,
  /** The room is executive and the capability carries an innovation thesis. */
  executive_thesis: 8,
  /** The reader's lens signals, scaled so a lens tilts the ordering without dominating it. */
  lens_signal: 2
} as const;

/**
 * How much clear water the last lead capability needs over the first supporting one.
 *
 * Below this the field is flat, the cut would be arbitrary, and the pack widens the lead set to the
 * floor and says the field is close rather than manufacturing a ranking it cannot defend. This is
 * the `AMBIGUITY_SEPARATION_RATIO` idea from ATL-05 applied to selection instead of interpretation.
 */
export const LEAD_SEPARATION_RATIO = 1.12;

interface Scored {
  capability: ResolvedCapability;
  score: number;
  rationale: RecommendationRationale[];
}

function severityOf(s: 'low' | 'medium' | 'high'): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

/**
 * Build the rationale for one capability against one client context.
 *
 * Returns an empty array where nothing governed connects the capability to the conversation, and
 * the caller drops it. That is the admission gate: no rationale, no recommendation.
 */
export function rationaleFor(
  c: ResolvedCapability,
  context: ClientContext,
  lens: AudienceLens | null,
  searchMatchFields: string[]
): { rationale: RecommendationRationale[]; bonus: number } {
  const rationale: RecommendationRationale[] = [];
  let bonus = 0;
  const { identity, knowledge } = c;

  // ── The client's problem, matched against the capability's declared business problems ──
  for (const problem of context.business_problems) {
    if (identity.business_problems.includes(problem.value)) {
      rationale.push({
        basis: 'business-problem',
        detail: `The conversation is about ${businessProblemLabel(problem.value).toLowerCase()}, which this capability declares as one of the problems it addresses.`,
        evidence: problem.value
      });
      bonus += CONTEXT_WEIGHTS.business_problem;
    }
  }

  // ── Domain ────────────────────────────────────────────────────────────────
  if (context.domain) {
    const domainId = context.domain.value;
    const domainName = getDomainById(domainId)?.name ?? domainId.replace(/_/g, ' ');
    if (identity.domains.includes(domainId)) {
      rationale.push({
        basis: 'domain',
        detail: `The capability is registered in ${domainName}, the client's own domain.`,
        evidence: domainId
      });
      bonus += CONTEXT_WEIGHTS.domain;
    } else {
      const assessed = (knowledge?.cross_domain_applicability ?? [])
        .find(a => a.domain_id === domainId && a.applicability !== 'not-assessed');
      if (assessed) {
        rationale.push({
          basis: 'domain',
          detail: `Reuse into ${domainName} is assessed as ${assessed.applicability}: ${assessed.rationale}`,
          evidence: `${domainId}:${assessed.applicability}`
        });
        bonus += CONTEXT_WEIGHTS.assessed_domain;
      }
    }
  }

  // ── The objective of the meeting ──────────────────────────────────────────
  const objective = context.objective?.value;
  const demonstrable = c.demo_maturity !== null && (knowledge?.demo_scenarios.length ?? 0) > 0;
  if (objective === 'demonstrate' && demonstrable) {
    rationale.push({
      basis: 'demo-readiness',
      detail: `The objective is to demonstrate CogniX, and this capability has a governed demonstration path carried by a ${c.demo_maturity} surface.`,
      evidence: `demo_maturity:${c.demo_maturity}`
    });
    bonus += CONTEXT_WEIGHTS.demonstrable_for_demo;
  }
  if (objective === 'architecture' && ((knowledge?.contracts.length ?? 0) > 0 || (knowledge?.apis.length ?? 0) > 0)) {
    rationale.push({
      basis: 'objective',
      detail: 'The conversation is about integration, and this capability publishes a contract or API that can be discussed concretely.',
      evidence: `contracts:${knowledge?.contracts.length ?? 0}`
    });
    bonus += CONTEXT_WEIGHTS.technical_surface;
  }
  if (objective === 'executive-innovation' && knowledge?.innovation_thesis) {
    rationale.push({
      basis: 'objective',
      detail: 'The conversation is an innovation discussion, and this capability carries a written innovation thesis rather than only a feature description.',
      evidence: 'knowledge.innovation_thesis'
    });
    bonus += CONTEXT_WEIGHTS.executive_thesis;
  }

  // ── Who is across the table ───────────────────────────────────────────────
  const orientation = context.orientation?.value;
  const role = context.client_role?.value;
  if (role && orientation === 'technical' && ((knowledge?.contracts.length ?? 0) > 0 || (knowledge?.apis.length ?? 0) > 0)) {
    rationale.push({
      basis: 'client-role',
      detail: `${role} will ask how this connects to what they already run; this capability has a declared integration surface to answer with.`,
      evidence: `apis:${knowledge?.apis.length ?? 0}`
    });
    bonus += CONTEXT_WEIGHTS.technical_surface;
  }
  if (role && orientation === 'executive' && knowledge?.innovation_thesis) {
    rationale.push({
      basis: 'client-role',
      detail: `${role} is being asked to judge whether this is genuinely different, which is what the capability's innovation thesis addresses.`,
      evidence: 'knowledge.innovation_thesis'
    });
    bonus += CONTEXT_WEIGHTS.executive_thesis;
  }

  // ── What the brief actually said ──────────────────────────────────────────
  if (searchMatchFields.length) {
    const fields = [...new Set(searchMatchFields)].map(f => f.replace(/_/g, ' ')).slice(0, 3);
    rationale.push({
      basis: 'query-term',
      detail: `The brief's own words reach this capability through its ${fields.join(', ')}.`,
      evidence: fields.join(',')
    });
  }

  // ── The reader's lens ─────────────────────────────────────────────────────
  if (lens) {
    const signals = lensSignals(c, lens);
    if (signals.length) {
      rationale.push({
        basis: 'lens',
        detail: `Reading as ${LENS_PROFILES[lens].name}: ${signals[0].rationale}`,
        evidence: `lens:${lens}:${signals[0].id}`
      });
      bonus += signals.length * CONTEXT_WEIGHTS.lens_signal;
    }
  }

  return { rationale, bonus };
}

export interface RecommendInput {
  context: ClientContext;
  lens: AudienceLens | null;
  resolved: ResolvedCapability[];
  searchContext: SearchContext;
  /** The ATL-05 knowledge index, so the brief reaches authored text and not only identity fields. */
  index?: CapabilityIndex;
}

export interface RecommendResult {
  recommendations: CapabilityRecommendation[];
  /** True where the lead set was widened because the field was too flat to cut confidently. */
  field_is_flat: boolean;
  /** Capabilities that matched words but produced no governed rationale. Counted, never shown as recommendations. */
  rejected_for_no_rationale: number;
}

function toRecommendation(s: Scored, tier: 'lead' | 'supporting'): CapabilityRecommendation {
  const { capability: c } = s;
  const limitations = (c.knowledge?.known_limitations ?? [])
    .slice()
    .sort((a, b) => severityOf(b.severity) - severityOf(a.severity))
    .map(l => ({ limitation: l.limitation, severity: l.severity }));

  return {
    capability_id: c.identity.capability_id,
    name: c.identity.name,
    summary: c.identity.summary,
    tier,
    rationale: s.rationale,
    maturity: {
      lifecycle_state: c.identity.lifecycle_state,
      demo_maturity: c.demo_maturity,
      implementation_status: c.identity.implementation_status
    },
    // NEVER trimmed, and never filtered by lens or by tier. A supporting capability's limitations
    // are as binding as a lead one's, and a Sales pack carries the same set a Developer pack does.
    limitations,
    demonstrable: c.demo_maturity !== null && (c.knowledge?.demo_scenarios.length ?? 0) > 0
  };
}

export function recommend(input: RecommendInput): RecommendResult {
  const { context, lens, resolved, searchContext } = input;

  // Level 1 retrieval over the brief, reusing the governed search rather than a second matcher.
  const identities = resolved.map(r => r.identity);
  const search = context.brief.trim()
    ? searchCapabilities(identities, context.brief, {}, searchContext, { index: input.index })
    : { results: [] };
  const searchByCap = new Map(search.results.map(r => [r.capability_id, r]));
  const maxSearchScore = Math.max(1, ...search.results.map(r => r.score));

  const scored: Scored[] = [];
  let rejected = 0;

  for (const c of resolved) {
    const hit = searchByCap.get(c.identity.capability_id);
    const matchFields = hit ? hit.matches.map(m => m.field) : [];
    const { rationale, bonus } = rationaleFor(c, context, lens, matchFields);

    // The admission gate. A capability the brief brushed against but which connects to nothing
    // governed in this conversation is not recommended — it is counted and dropped (§12).
    if (rationale.length === 0) { rejected++; continue; }

    // A lens signal alone is not a reason to bring a capability into a client conversation: it
    // says something about the reader, nothing about the client. Require at least one basis that
    // argues from the conversation itself.
    const aboutTheConversation = rationale.some(r => r.basis !== 'lens');
    if (!aboutTheConversation) { rejected++; continue; }

    // Normalise the search contribution so a long brief cannot swamp the governed context bonuses.
    const searchScore = (hit?.score ?? 0) / maxSearchScore * 25;
    scored.push({ capability: c, score: searchScore + bonus, rationale });
  }

  scored.sort((a, b) =>
    (b.score - a.score) ||
    // Stable and meaningful ties: prefer the capability that can actually be shown, then by name.
    (Number(b.capability.demo_maturity !== null) - Number(a.capability.demo_maturity !== null)) ||
    a.capability.identity.name.localeCompare(b.capability.identity.name)
  );

  if (scored.length === 0) {
    return { recommendations: [], field_is_flat: false, rejected_for_no_rationale: rejected };
  }

  // ── The lead cut ──────────────────────────────────────────────────────────
  // Take up to the target, then check the cut is defensible. A flat field widens to the floor and
  // reports itself rather than presenting an arbitrary top five as a considered selection.
  let leadCount = Math.min(LEAD_RECOMMENDATION_TARGET, scored.length);
  let flat = false;

  for (let n = LEAD_RECOMMENDATION_FLOOR; n < leadCount; n++) {
    const inside = scored[n - 1].score;
    const outside = scored[n]?.score ?? 0;
    if (outside > 0 && inside / outside < LEAD_SEPARATION_RATIO) continue;
    leadCount = n;
    break;
  }
  if (leadCount === Math.min(LEAD_RECOMMENDATION_TARGET, scored.length) && scored.length > leadCount) {
    const inside = scored[leadCount - 1].score;
    const outside = scored[leadCount].score;
    if (outside > 0 && inside / outside < LEAD_SEPARATION_RATIO) flat = true;
  }

  const recommendations = [
    ...scored.slice(0, leadCount).map(s => toRecommendation(s, 'lead')),
    ...scored.slice(leadCount, leadCount + SUPPORTING_RECOMMENDATION_MAX).map(s => toRecommendation(s, 'supporting'))
  ];

  return { recommendations, field_is_flat: flat, rejected_for_no_rationale: rejected };
}

/** Lead recommendations, in pack order. Used by sequencing and question selection. */
export function leadIds(recs: CapabilityRecommendation[]): CapabilityId[] {
  return recs.filter(r => r.tier === 'lead').map(r => r.capability_id);
}
