/**
 * Promotion candidate intervention & semantic decision intelligence helpers.
 *
 * Lens CTAs build an `ActiveIntervention` candidate. Only human Accept writes that candidate
 * into the planner configuration so live CDI-02/03/04/05 recompute and Approve & Activate
 * contracts the accepted configuration while retaining the committed baseline.
 */

import type {
  CampaignArchetype,
  ElasticityPoint,
  FrontierPlay,
  InverseCondition,
  OpportunityCell
} from './campaign-archetypes';
import { estimateInterventionEconomics } from './campaign-archetypes';
import { inScopeStoreCount } from '../packages/contracts/src/scenario-scope';

export type CandidateLensSource =
  | 'OPPORTUNITY'
  | 'FRONTIER'
  | 'INVERSE'
  | 'DEMAND'
  | 'SIGNAL_HYPOTHESIS';

export interface InterventionProvenance {
  source_lens: CandidateLensSource;
  source_id?: string;
  source_label?: string;
  factors?: Array<{ label: string; points?: number; rationale?: string }>;
  notes?: string[];
  funding_overlay_gbp?: number;
  elasticity_flip_discount_pct?: number;
  recommended_discount_pct?: number;
  comparison_basis?: 'SCENARIO_ELASTICITY_CURVE' | 'CDI06_OUTCOME_FRONTIER';
}

export interface ActiveIntervention {
  title: string;
  type: string;
  description: string;
  proposed_discount: number;
  proposed_scope: number;
  proposed_duration: number;
  proposed_region: string;
  expected_demand: number;
  expected_contribution: number;
  provenance?: InterventionProvenance;
}

export interface PlannerCampaignConfig {
  discount_pct: number;
  region: string;
  duration_days: number;
}

export const PLANNER_DURATION_OPTIONS = [7, 14, 21, 28] as const;

export function resolvePlannerRegion(
  proposedRegion: string,
  availableRegions: readonly string[],
  fallback: string
): string {
  if (!proposedRegion) return fallback;
  if (availableRegions.includes(proposedRegion)) return proposedRegion;

  const ranked = [...availableRegions].sort((a, b) => b.length - a.length);
  for (const region of ranked) {
    if (region === 'National') continue;
    if (proposedRegion.includes(region) || region.includes(proposedRegion)) return region;
  }
  if (availableRegions.includes('National') && /national/i.test(proposedRegion)) {
    return 'National';
  }
  return availableRegions.includes(fallback) ? fallback : availableRegions[0] || fallback;
}

export function plannerConfigurationSignature(parts: {
  archetypeId: string;
  skuId: string;
  mechanic: string;
  discountPct: number;
  region: string;
  durationDays: number;
}): string {
  return [
    parts.archetypeId,
    parts.skuId,
    parts.mechanic,
    String(parts.discountPct),
    parts.region,
    String(parts.durationDays)
  ].join('|');
}

/**
 * Accept writes the candidate into planner controls and snapshots the committed plan
 * the first time, so Current Plan remains comparable across repeated candidate exploration.
 */
export function applyAcceptedIntervention(args: {
  current: PlannerCampaignConfig;
  committed: PlannerCampaignConfig | null;
  candidate: ActiveIntervention;
  availableRegions: readonly string[];
}): {
  next: PlannerCampaignConfig;
  committed: PlannerCampaignConfig;
} {
  const region = resolvePlannerRegion(
    args.candidate.proposed_region,
    args.availableRegions,
    args.current.region
  );
  return {
    committed: args.committed ?? { ...args.current },
    next: {
      discount_pct: args.candidate.proposed_discount,
      region,
      duration_days: args.candidate.proposed_duration
    }
  };
}

export function durationFromInclusiveWindow(startIso?: string, endIso?: string): number | null {
  if (!startIso || !endIso) return null;
  const start = Date.parse(startIso.slice(0, 10));
  const end = Date.parse(endIso.slice(0, 10));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

export function configFromCampaignIntent(
  intent: {
    campaign_intent?: { provisional_discount_depth?: number };
    audience_market?: { region?: string; planned_start?: string; planned_end?: string };
  },
  fallback: PlannerCampaignConfig
): PlannerCampaignConfig {
  const duration =
    durationFromInclusiveWindow(
      intent.audience_market?.planned_start,
      intent.audience_market?.planned_end
    ) ?? fallback.duration_days;
  return {
    discount_pct:
      typeof intent.campaign_intent?.provisional_discount_depth === 'number'
        ? intent.campaign_intent.provisional_discount_depth
        : fallback.discount_pct,
    region: intent.audience_market?.region || fallback.region,
    duration_days: duration
  };
}

/**
 * Guard that prevents an ACTIVE contract from one scenario or campaign intent
 * from hydrating into a different scenario after a scenario switch or reload.
 */
export function canHydrateContractForScenario(args: {
  contract:
    | {
        contract_id?: string;
        status?: string;
        basis?: { campaign_intent_ref?: { id?: string } };
      }
    | null
    | undefined;
  intent:
    | {
        campaign_intent_id?: string;
        intent_id?: string;
        decision_context?: { scenario_id?: string; archetype_id?: string };
      }
    | null
    | undefined;
  activeScenarioId: string;
}): boolean {
  const { contract, intent, activeScenarioId } = args;
  if (!contract || contract.status !== 'ACTIVE') return false;
  if (!intent) return false;
  const intentId = intent.campaign_intent_id || intent.intent_id;
  const boundIntentId = contract.basis?.campaign_intent_ref?.id;
  if (boundIntentId && intentId && boundIntentId !== intentId) return false;
  const intentScenarioId = intent.decision_context?.scenario_id;
  if (!intentScenarioId || intentScenarioId !== activeScenarioId) return false;
  return true;
}

export function findRecommendedElasticityPoint(
  curve: readonly ElasticityPoint[]
): ElasticityPoint | undefined {
  return curve.find(p => p.is_cognix_recommended) ?? curve.find(p => p.is_current);
}

/**
 * Walk the declared curve from the committed depth and name the first point where
 * contribution sign differs — the decision-flip threshold, not a fitted sensitivity model.
 */
export function findContributionFlipPoint(
  curve: readonly ElasticityPoint[],
  fromDiscountPct: number
): ElasticityPoint | undefined {
  if (curve.length === 0) return undefined;
  const ordered = [...curve].sort((a, b) => a.discount_pct - b.discount_pct);
  const origin =
    ordered.reduce((best, pt) =>
      Math.abs(pt.discount_pct - fromDiscountPct) < Math.abs(best.discount_pct - fromDiscountPct)
        ? pt
        : best
    ) ?? ordered[0];
  const originSign = Math.sign(origin.net_contribution_delta_gbp) || 1;
  const after = ordered.filter(p => p.discount_pct > origin.discount_pct);
  return after.find(p => Math.sign(p.net_contribution_delta_gbp) !== originSign);
}

export function elasticitySensitivityProposal(
  archetype: CampaignArchetype,
  currentDiscountPct: number
): {
  discount_pct: number;
  recommended_discount_pct: number | undefined;
  flip_discount_pct: number | undefined;
  notes: string[];
} {
  const recommended = findRecommendedElasticityPoint(archetype.elasticity_curve);
  const flip = findContributionFlipPoint(archetype.elasticity_curve, currentDiscountPct);
  const discount =
    recommended?.discount_pct ??
    flip?.discount_pct ??
    currentDiscountPct;
  const notes: string[] = [];
  if (recommended) {
    notes.push(
      `The scenario curve's recommended depth is ${recommended.discount_pct}% (contribution ${recommended.net_contribution_delta_gbp}).`
    );
  }
  if (flip) {
    notes.push(
      `Contribution sign flips at ${flip.discount_pct}% relative to the ${currentDiscountPct}% configuration.`
    );
  } else {
    notes.push(
      `No contribution sign-flip exists on the declared curve beyond ${currentDiscountPct}%.`
    );
  }
  return {
    discount_pct: discount,
    recommended_discount_pct: recommended?.discount_pct,
    flip_discount_pct: flip?.discount_pct,
    notes
  };
}

export function highestYieldOpportunityRegion(archetype: CampaignArchetype): string {
  const cells = archetype.opportunity_matrix;
  if (!cells.length) return archetype.default_region;
  return [...cells].sort((a, b) => b.opportunity_index - a.opportunity_index)[0].region;
}

export function frontierPlayRegion(archetype: CampaignArchetype, play: { stores_count: number }): string {
  const estate = inScopeStoreCount(archetype.default_region);
  if (play.stores_count < estate) return highestYieldOpportunityRegion(archetype);
  return archetype.default_region;
}

export interface InverseConditionDecisionSummary {
  parameter_kind: InverseCondition['target_parameter'];
  condition_label: string;
  decision_question: string;
  current_assumption: string;
  tested_condition: string;
  economic_effect_gbp: number;
  economic_delta_vs_current_gbp: number;
  expected_uplift_pct: number;
  decision_boundary: string;
  recommendation_changes: boolean;
  recommendation_implication: string;
  recommended_discount_pct?: number;
  flip_discount_pct?: number;
  funding_gap_gbp?: number;
  proposed_discount_pct: number;
  proposed_region: string;
  proposed_scope_stores: number;
  proposed_duration_days: number;
}

/**
 * Deterministic decision-question breakdown for each What-If / Inverse condition.
 * Uses only existing scenario elasticity curve, store scope, and derived contribution gap.
 */
export function describeInverseConditionDecision(args: {
  archetype: CampaignArchetype;
  condition: InverseCondition;
  currentDiscountPct?: number;
  currentRegion?: string;
  currentDurationDays?: number;
}): InverseConditionDecisionSummary {
  const { archetype, condition } = args;
  const activeDiscount = args.currentDiscountPct ?? archetype.default_discount_pct;
  const activeRegion = args.currentRegion ?? archetype.default_region;
  const activeDuration = args.currentDurationDays ?? archetype.default_duration_days;
  const activeStores = inScopeStoreCount(activeRegion);

  const curve = archetype.elasticity_curve;
  const nearestCurrent = curve.reduce((best, pt) =>
    Math.abs(pt.discount_pct - activeDiscount) < Math.abs(best.discount_pct - activeDiscount)
      ? pt
      : best
  );
  const recommended = findRecommendedElasticityPoint(curve) ?? nearestCurrent;
  const flip = findContributionFlipPoint(curve, activeDiscount);
  const currentEcon = estimateInterventionEconomics(archetype, {
    discount_pct: activeDiscount,
    stores: activeStores,
    duration_days: activeDuration
  });

  if (condition.target_parameter === 'DISCOUNT_DEPTH') {
    const targetDepth = condition.target_value;
    const testedEcon = estimateInterventionEconomics(archetype, {
      discount_pct: targetDepth,
      stores: activeStores,
      duration_days: activeDuration
    });
    const deltaGbp = testedEcon.net_contribution_delta_gbp - currentEcon.net_contribution_delta_gbp;
    const changes = targetDepth !== activeDiscount;
    return {
      parameter_kind: 'DISCOUNT_DEPTH',
      condition_label: 'Promotional Discount Depth',
      decision_question: 'Does moderating promotional depth improve net contribution without sacrificing viable volume?',
      current_assumption: `${activeDiscount}% cut across ${activeRegion} (+${currentEcon.expected_demand_uplift_pct.toFixed(1)}% uplift)`,
      tested_condition: `${targetDepth}% cut across ${activeRegion} (+${testedEcon.expected_demand_uplift_pct.toFixed(1)}% uplift)`,
      economic_effect_gbp: testedEcon.net_contribution_delta_gbp,
      economic_delta_vs_current_gbp: deltaGbp,
      expected_uplift_pct: testedEcon.expected_demand_uplift_pct,
      decision_boundary: flip
        ? `Curve peak is ${recommended.discount_pct}%; contribution sign flips negative at ${flip.discount_pct}%`
        : `Curve optimum is ${recommended.discount_pct}% across declared tiers`,
      recommendation_changes: changes,
      recommendation_implication: changes
        ? `Shifts depth from ${activeDiscount}% to ${targetDepth}% to capture higher unit margin retention.`
        : `Planner is already positioned at the ${targetDepth}% depth.`,
      recommended_discount_pct: recommended.discount_pct,
      flip_discount_pct: flip?.discount_pct,
      proposed_discount_pct: targetDepth,
      proposed_region: activeRegion,
      proposed_scope_stores: activeStores,
      proposed_duration_days: activeDuration
    };
  }

  if (condition.target_parameter === 'STORE_SCOPE') {
    const bestRegion = highestYieldOpportunityRegion(archetype);
    const bestCell = archetype.opportunity_matrix.find(c => c.region === bestRegion);
    const targetStores = inScopeStoreCount(bestRegion);
    const testedEcon = estimateInterventionEconomics(archetype, {
      discount_pct: activeDiscount,
      stores: targetStores,
      duration_days: activeDuration
    });
    const deltaGbp = testedEcon.net_contribution_delta_gbp - currentEcon.net_contribution_delta_gbp;
    const changes = bestRegion !== activeRegion;
    return {
      parameter_kind: 'STORE_SCOPE',
      condition_label: 'High-Yield Store Scope',
      decision_question: 'What happens if we restrict the promotion to the highest-propensity regional store cluster?',
      current_assumption: `${activeRegion} (${activeStores.toLocaleString('en-GB')} stores) at ${activeDiscount}% cut`,
      tested_condition: `${bestRegion} cluster (${targetStores.toLocaleString('en-GB')} stores · Opportunity Index ${bestCell?.opportunity_index ?? '—'})`,
      economic_effect_gbp: testedEcon.net_contribution_delta_gbp,
      economic_delta_vs_current_gbp: deltaGbp,
      expected_uplift_pct: testedEcon.expected_demand_uplift_pct,
      decision_boundary: `Concentrates execution in ${bestRegion} (${bestCell?.tier ?? 'PREFERRED'} tier) to avoid low-yield store margin leakage`,
      recommendation_changes: changes,
      recommendation_implication: changes
        ? `Re-scopes campaign from ${activeRegion} to ${bestRegion} (${targetStores.toLocaleString('en-GB')} stores).`
        : `Planner is already scoped to ${bestRegion}.`,
      recommended_discount_pct: recommended.discount_pct,
      flip_discount_pct: flip?.discount_pct,
      proposed_discount_pct: activeDiscount,
      proposed_region: bestRegion,
      proposed_scope_stores: targetStores,
      proposed_duration_days: activeDuration
    };
  }

  if (condition.target_parameter === 'SUPPLIER_FUNDING') {
    const gapGbp = Math.max(
      0,
      Math.round(recommended.net_contribution_delta_gbp - currentEcon.net_contribution_delta_gbp)
    );
    const requiredFunding = condition.target_value > 0 ? condition.target_value : gapGbp;
    const fundedNet = currentEcon.net_contribution_delta_gbp + requiredFunding;
    return {
      parameter_kind: 'SUPPLIER_FUNDING',
      condition_label: 'Funding Required to Close Contribution Gap',
      decision_question: 'How much supplier co-funding is required before the committed depth matches the curve-recommended depth?',
      current_assumption: `${activeDiscount}% cut with declared supplier funding share`,
      tested_condition:
        requiredFunding > 0
          ? `${condition.target_display} co-funding overlay applied to ${activeDiscount}% depth`
          : 'No additional supplier co-funding required at this depth',
      economic_effect_gbp: fundedNet,
      economic_delta_vs_current_gbp: requiredFunding,
      expected_uplift_pct: currentEcon.expected_demand_uplift_pct,
      decision_boundary:
        requiredFunding > 0
          ? `Decision flips in favour of keeping ${activeDiscount}% only if supplier commits ≥ ${condition.target_display}`
          : `At ${activeDiscount}%, no contribution gap exists against the curve optimum`,
      recommendation_changes: requiredFunding > 0,
      recommendation_implication:
        requiredFunding > 0
          ? `Without ${condition.target_display} co-funding, reducing depth to ${recommended.discount_pct}% remains the stronger commercial decision.`
          : `Current depth already sits at the contribution optimum; co-funding is not a decision blocker.`,
      recommended_discount_pct: recommended.discount_pct,
      flip_discount_pct: flip?.discount_pct,
      funding_gap_gbp: requiredFunding,
      proposed_discount_pct: activeDiscount,
      proposed_region: activeRegion,
      proposed_scope_stores: activeStores,
      proposed_duration_days: activeDuration
    };
  }

  // DEMAND_UPLIFT — Elasticity / Demand Uplift sensitivity
  const sensitivity = elasticitySensitivityProposal(archetype, activeDiscount);
  const targetDepth = sensitivity.discount_pct;
  const testedEcon = estimateInterventionEconomics(archetype, {
    discount_pct: targetDepth,
    stores: activeStores,
    duration_days: activeDuration
  });
  const deltaGbp = testedEcon.net_contribution_delta_gbp - currentEcon.net_contribution_delta_gbp;
  const referenceDepth =
    activeDiscount === recommended.discount_pct &&
    archetype.default_discount_pct !== recommended.discount_pct
      ? archetype.default_discount_pct
      : activeDiscount;
  const nearestRef = curve.reduce((best, pt) =>
    Math.abs(pt.discount_pct - referenceDepth) < Math.abs(best.discount_pct - referenceDepth)
      ? pt
      : best
  );
  const upliftGapPp = Number((condition.target_value - nearestRef.expected_demand_uplift_pct).toFixed(1));
  const changes = targetDepth !== activeDiscount;

  return {
    parameter_kind: 'DEMAND_UPLIFT',
    condition_label: 'Elasticity & Demand-Flip Threshold',
    decision_question: 'What has to change on the demand response curve before we should make a different depth decision?',
    current_assumption: `At ${activeDiscount}% cut, declared elasticity (ε = ${archetype.price_elasticity}) delivers +${nearestCurrent.expected_demand_uplift_pct.toFixed(1)}% uplift`,
    tested_condition: `Requires +${condition.target_value.toFixed(1)}% uplift at ${referenceDepth}% (${upliftGapPp >= 0 ? '+' : ''}${upliftGapPp}pp above the curve) to justify ${referenceDepth}% over ${recommended.discount_pct}%`,
    economic_effect_gbp: testedEcon.net_contribution_delta_gbp,
    economic_delta_vs_current_gbp: deltaGbp,
    expected_uplift_pct: testedEcon.expected_demand_uplift_pct,
    decision_boundary: flip
      ? `Recommended point: ${recommended.discount_pct}% (+${recommended.expected_demand_uplift_pct.toFixed(1)}%) · Contribution sign flips negative at ${flip.discount_pct}%`
      : `Recommended point: ${recommended.discount_pct}% (+${recommended.expected_demand_uplift_pct.toFixed(1)}%) · No negative sign-flip beyond ${activeDiscount}%`,
    recommendation_changes: changes,
    recommendation_implication: changes
      ? `Because +${condition.target_value.toFixed(1)}% uplift exceeds the declared ε = ${archetype.price_elasticity} curve (+${nearestCurrent.expected_demand_uplift_pct.toFixed(1)}%), recommendation moves from ${activeDiscount}% to ${targetDepth}%.`
      : `Current ${activeDiscount}% depth already aligns with the curve's optimal point.`,
    recommended_discount_pct: recommended.discount_pct,
    flip_discount_pct: flip?.discount_pct,
    proposed_discount_pct: targetDepth,
    proposed_region: activeRegion,
    proposed_scope_stores: activeStores,
    proposed_duration_days: activeDuration
  };
}

export interface GraphInspectorFact {
  label: string;
  value: string;
  note?: string;
}

export type GraphSemanticVisual =
  | {
      kind: 'SIGNAL_COMPARISON';
      observed_metric: string;
      signal_headline: string;
      signal_source: string;
      boundary_condition: string;
      decision_shift: string;
      severity: 'VETO' | 'WARNING' | 'OPPORTUNITY';
      affected_scope: string;
    }
  | {
      kind: 'ELASTICITY_CURVE';
      points: Array<{
        discount_pct: number;
        expected_demand_uplift_pct: number;
        net_contribution_delta_gbp: number;
        unit_contribution_gbp: number;
        is_current?: boolean;
        is_cognix_recommended?: boolean;
      }>;
      current_discount_pct: number;
      recommended_discount_pct: number;
      flip_discount_pct: number | null;
    }
  | {
      kind: 'HYPOTHESIS_TEST';
      signal_headline: string;
      observed_metric: string;
      hypothesis_statement: string;
      verdict: string;
      proposed_discount: number;
      proposed_region: string;
      proposed_scope: number;
      proposed_duration: number;
      expected_demand_pct: number;
      expected_contribution_gbp: number;
    }
  | {
      kind: 'OPPORTUNITY_RANKING';
      cells: Array<{
        region: string;
        window_label: string;
        opportunity_index: number;
        tier: string;
        store_count: number;
        target_discount: number;
        target_duration: number;
      }>;
      top_region_factors: Array<{ label: string; points: number; rationale: string }>;
    }
  | {
      kind: 'ECONOMICS_WATERFALL';
      committed_discount_pct: number;
      committed_uplift_pct: number;
      committed_contribution_gbp: number;
      recommended_discount_pct: number;
      recommended_uplift_pct: number;
      recommended_contribution_gbp: number;
      flip_discount_pct: number | null;
      funding_gap_gbp: number | null;
      funding_gap_display: string | null;
      live_contribution_gbp: number | null;
      live_uplift_pct: number | null;
    }
  | {
      kind: 'FRONTIER_COMPARISON';
      plays: Array<{
        id: string;
        name: string;
        badge: string;
        discount_pct: number;
        stores_count: number;
        duration_days: number;
        expected_demand_uplift_pct: number;
        net_contribution_delta_gbp: number;
        supply_exposure: 'LOW' | 'MODERATE' | 'HIGH';
        is_current?: boolean;
        is_recommended?: boolean;
      }>;
    }
  | {
      kind: 'INTERVENTION_COMPARISON';
      current_discount_pct: number;
      current_region: string;
      current_stores: number;
      current_duration_days: number;
      current_uplift_pct: number;
      current_contribution_gbp: number;
      target_discount_pct: number;
      target_region: string;
      target_stores: number;
      target_duration_days: number;
      target_uplift_pct: number;
      target_contribution_gbp: number;
      intervention_label: string;
    };

export interface GraphInspectorPanel {
  heading: string;
  source: string;
  provenance_tier: 'SEEDED_WORLD_MODEL' | 'DERIVED_SCENARIO_CURVE' | 'LIVE_CDI_ASSESSMENT';
  provenance_badge: 'SEEDED WORLD MODEL' | 'DERIVED FROM SCENARIO CURVE' | 'LIVE CDI ASSESSMENT';
  what_this_tells_us: string;
  why_it_matters: string;
  threshold_comparison: string;
  facts: GraphInspectorFact[];
  visual: GraphSemanticVisual;
  caveat?: string;
}

/**
 * Join a graph node to artefacts already on the archetype (and optional live evaluation / planner state).
 * Returns structured semantic intelligence and a category-specific visual model without inventing data.
 */
export function inspectDecisionGraphNode(args: {
  archetype: CampaignArchetype;
  node: CampaignArchetype['decision_graph']['nodes'][number];
  liveContributionGbp?: number | null;
  liveDemandUpliftPct?: number | null;
  currentDiscountPct?: number;
  currentRegion?: string;
  currentDurationDays?: number;
  currentConfig?: PlannerCampaignConfig;
  committedConfig?: PlannerCampaignConfig | null;
  candidateIntervention?: ActiveIntervention | null;
  acceptedIntervention?: ActiveIntervention | null;
}): GraphInspectorPanel {
  const { archetype, node } = args;
  const curve = archetype.elasticity_curve;
  const recommended = findRecommendedElasticityPoint(curve) ?? curve[0];
  const current = curve.find(p => p.is_current) ?? curve[0];
  const activeDiscount =
    args.currentDiscountPct ?? args.currentConfig?.discount_pct ?? archetype.default_discount_pct;
  const activeRegion =
    args.currentRegion ?? args.currentConfig?.region ?? archetype.default_region;
  const activeDuration =
    args.currentDurationDays ?? args.currentConfig?.duration_days ?? archetype.default_duration_days;
  const flip = findContributionFlipPoint(curve, activeDiscount);

  switch (node.category) {
    case 'SIGNAL': {
      const match =
        archetype.signal_hypotheses.find(
          h =>
            node.label.toLowerCase().includes(h.signal_id.toLowerCase()) ||
            h.signal_headline.toLowerCase().includes(node.summary.toLowerCase().slice(0, 24)) ||
            node.summary.toLowerCase().includes(h.observed_metric.toLowerCase().slice(0, 12))
        ) ||
        archetype.signal_hypotheses.find(h =>
          node.label.toLowerCase().includes('competitor')
            ? /rival|competitor/i.test(h.signal_headline)
            : /depot|stock|dc /i.test(h.signal_headline)
        ) ||
        archetype.signal_hypotheses[0];

      const trigger =
        archetype.change_triggers.find(t =>
          node.label.toLowerCase().includes('competitor')
            ? /competitor|rival|price/i.test(t.monitored_signal + ' ' + t.boundary_condition)
            : /stock|depot|cover|supply|waste/i.test(t.monitored_signal + ' ' + t.boundary_condition)
        ) || archetype.change_triggers[0];

      const scopeRegion =
        match?.test_result?.proposed_intervention?.region ?? archetype.default_region;
      const scopeStores =
        match?.test_result?.proposed_intervention?.scope ?? inScopeStoreCount(scopeRegion);

      return {
        heading: 'Signal observation',
        source: 'archetype.signal_hypotheses',
        provenance_tier: 'SEEDED_WORLD_MODEL',
        provenance_badge: 'SEEDED WORLD MODEL',
        what_this_tells_us: match
          ? `${match.signal_headline} (${match.observed_metric} via ${match.signal_source}).`
          : `${node.label}: ${node.summary}.`,
        why_it_matters: trigger
          ? `Directly tests the declared boundary (${trigger.boundary_condition}); breaching this threshold triggers "${trigger.decision_shift}".`
          : `Shapes where promotional depth can be absorbed without margin or supply degradation.`,
        threshold_comparison: trigger
          ? `Observed: ${match?.observed_metric ?? node.summary} vs Boundary: ${trigger.boundary_condition} (${trigger.severity})`
          : `Observed: ${match?.observed_metric ?? node.summary} across ${scopeRegion}`,
        facts: match
          ? [
              { label: 'Observed metric', value: match.observed_metric, note: match.signal_headline },
              { label: 'Signal source', value: match.signal_source },
              { label: 'Derived hypothesis', value: match.hypothesis_statement }
            ]
          : [{ label: 'Node summary', value: node.summary }],
        visual: {
          kind: 'SIGNAL_COMPARISON',
          observed_metric: match?.observed_metric ?? node.summary,
          signal_headline: match?.signal_headline ?? node.detail,
          signal_source: match?.signal_source ?? 'Scenario World Model',
          boundary_condition: trigger?.boundary_condition ?? 'Standard baseline operating corridor',
          decision_shift: trigger?.decision_shift ?? 'Maintain governed configuration',
          severity: trigger?.severity ?? 'WARNING',
          affected_scope: `${scopeRegion} (${scopeStores} stores)`
        },
        caveat: 'Point-in-time seeded observation; no time-series is stored on this node.'
      };
    }

    case 'EVIDENCE': {
      return {
        heading: 'Elasticity curve evidence',
        source: 'archetype.elasticity_curve (derived from scenario price, cost, funding and ε)',
        provenance_tier: 'DERIVED_SCENARIO_CURVE',
        provenance_badge: 'DERIVED FROM SCENARIO CURVE',
        what_this_tells_us: `${archetype.sku_name} responds with price elasticity ε = ${archetype.price_elasticity} and ${Math.round(archetype.cannibalisation_rate * 100)}% sister-SKU cannibalisation across ${curve.length} evaluated discount tiers.`,
        why_it_matters:
          recommended.discount_pct !== current.discount_pct
            ? `Peak net contribution occurs at ${recommended.discount_pct}% (${recommended.net_contribution_delta_gbp >= 0 ? '+' : ''}£${recommended.net_contribution_delta_gbp.toLocaleString('en-GB')}), whereas ${current.discount_pct}% erodes unit margin to £${current.unit_contribution_gbp.toFixed(2)}.`
            : `The ${current.discount_pct}% depth sits at the contribution-maximising point on the scenario elasticity curve.`,
        threshold_comparison: flip
          ? `Recommended: ${recommended.discount_pct}% · Current: ${current.discount_pct}% · Contribution sign-flip: ${flip.discount_pct}%`
          : `Recommended: ${recommended.discount_pct}% · Current: ${current.discount_pct}% · No negative sign-flip on curve`,
        facts: [
          {
            label: 'Current depth',
            value: `${current.discount_pct}% · +${current.expected_demand_uplift_pct}% uplift`,
            note: `Unit contribution ${current.unit_contribution_gbp}`
          },
          {
            label: 'Recommended depth',
            value: `${recommended.discount_pct}% · contribution ${recommended.net_contribution_delta_gbp}`,
            note: `Unit contribution ${recommended.unit_contribution_gbp}`
          },
          {
            label: 'Contribution flip',
            value: flip ? `${flip.discount_pct}%` : 'No sign-flip on declared curve'
          }
        ],
        visual: {
          kind: 'ELASTICITY_CURVE',
          points: curve.map(p => ({
            discount_pct: p.discount_pct,
            expected_demand_uplift_pct: p.expected_demand_uplift_pct,
            net_contribution_delta_gbp: p.net_contribution_delta_gbp,
            unit_contribution_gbp: p.unit_contribution_gbp,
            is_current: p.is_current,
            is_cognix_recommended: p.is_cognix_recommended
          })),
          current_discount_pct: current.discount_pct,
          recommended_discount_pct: recommended.discount_pct,
          flip_discount_pct: flip ? flip.discount_pct : null
        }
      };
    }

    case 'HYPOTHESIS': {
      const hypo =
        archetype.signal_hypotheses.find(
          h =>
            h.hypothesis_statement.toLowerCase().includes('regional') &&
            node.summary.toLowerCase().includes('regional')
        ) || archetype.signal_hypotheses[0];
      const p = hypo?.test_result.proposed_intervention ?? {
        discount: recommended.discount_pct,
        region: highestYieldOpportunityRegion(archetype),
        duration: archetype.default_duration_days,
        scope: inScopeStoreCount(highestYieldOpportunityRegion(archetype))
      };
      const hypoEcon = estimateInterventionEconomics(archetype, {
        discount_pct: p.discount,
        stores: p.scope,
        duration_days: p.duration
      });

      return {
        heading: 'Hypothesis test record',
        source: 'archetype.signal_hypotheses.test_result',
        provenance_tier: 'SEEDED_WORLD_MODEL',
        provenance_badge: 'SEEDED WORLD MODEL',
        what_this_tells_us: hypo ? hypo.hypothesis_statement : node.detail,
        why_it_matters: hypo
          ? hypo.test_result.explanation
          : 'Tests whether a targeted regional intervention outperforms an uncalibrated estate-wide promotion.',
        threshold_comparison: hypo
          ? `Verdict: ${hypo.test_result.verdict.replace(/_/g, ' ')} · Counterfactual: ${p.discount}% in ${p.region} (${p.scope} stores, ${p.duration}d)`
          : `Counterfactual: ${p.discount}% in ${p.region}`,
        facts: hypo
          ? [
              { label: 'Statement', value: hypo.hypothesis_statement },
              { label: 'Seeded verdict', value: hypo.test_result.verdict.replace(/_/g, ' ') },
              { label: 'Explanation', value: hypo.test_result.explanation },
              {
                label: 'Proposed candidate',
                value: `${p.discount}% · ${p.region} · ${p.duration} days`
              }
            ]
          : [{ label: 'Node detail', value: node.detail }],
        visual: {
          kind: 'HYPOTHESIS_TEST',
          signal_headline: hypo?.signal_headline ?? node.summary,
          observed_metric: hypo?.observed_metric ?? node.label,
          hypothesis_statement: hypo?.hypothesis_statement ?? node.detail,
          verdict: hypo ? hypo.test_result.verdict.replace(/_/g, ' ') : 'SUPPORTED',
          proposed_discount: p.discount,
          proposed_region: p.region,
          proposed_scope: p.scope,
          proposed_duration: p.duration,
          expected_demand_pct: hypoEcon.expected_demand_uplift_pct,
          expected_contribution_gbp: hypoEcon.net_contribution_delta_gbp
        }
      };
    }

    case 'DEMAND': {
      const cells = [...archetype.opportunity_matrix].sort(
        (a, b) => b.opportunity_index - a.opportunity_index
      );
      const top = cells[0];
      return {
        heading: 'Regional opportunity index',
        source: 'archetype.opportunity_matrix (seeded factors)',
        provenance_tier: 'SEEDED_WORLD_MODEL',
        provenance_badge: 'SEEDED WORLD MODEL',
        what_this_tells_us: top
          ? `${top.region} leads regional demand propensity at index ${top.opportunity_index}/100 (${top.tier}, ${top.store_count} stores in ${top.window_label}).`
          : node.detail,
        why_it_matters:
          'Identifies which store clusters have both high price-response propensity and sufficient depot stock headroom to absorb promotional uplift.',
        threshold_comparison: top
          ? `Top region: ${top.region} (${top.opportunity_index}/100) vs Preferred threshold (80/100) · Target: ${top.recommended_action.target_discount}% for ${top.recommended_action.target_duration}d`
          : 'Preferred tier threshold: 80/100',
        facts: cells.slice(0, 4).map((cell: OpportunityCell) => ({
          label: cell.region,
          value: String(cell.opportunity_index),
          note: `${cell.tier} · ${cell.store_count} stores`
        })),
        visual: {
          kind: 'OPPORTUNITY_RANKING',
          cells: cells.slice(0, 4).map(c => ({
            region: c.region,
            window_label: c.window_label,
            opportunity_index: c.opportunity_index,
            tier: c.tier,
            store_count: c.store_count,
            target_discount: c.recommended_action.target_discount,
            target_duration: c.recommended_action.target_duration
          })),
          top_region_factors: top
            ? top.factors.map(f => ({
                label: f.label,
                points: f.points,
                rationale: f.rationale
              }))
            : []
        },
        caveat: 'Index values are authored factor sums, not live CDI-03 yield scores.'
      };
    }

    case 'ECONOMICS': {
      const hasLive = typeof args.liveContributionGbp === 'number';
      const fundingCond = archetype.inverse_conditions.find(
        c => c.target_parameter === 'SUPPLIER_FUNDING'
      );
      const facts: GraphInspectorFact[] = [
        {
          label: 'Committed contribution',
          value: String(archetype.discovery.net_contribution_delta_gbp),
          note: `At ${current.discount_pct}% committed depth`
        },
        {
          label: 'Recommended contribution',
          value: String(recommended.net_contribution_delta_gbp),
          note: `At ${recommended.discount_pct}% recommended depth`
        },
        {
          label: 'Committed demand uplift',
          value: `${archetype.discovery.expected_demand_uplift_pct}%`
        }
      ];
      if (hasLive) {
        facts.push({
          label: 'Live CDI-02 contribution',
          value: String(args.liveContributionGbp),
          note: 'Current planner configuration'
        });
      }
      if (typeof args.liveDemandUpliftPct === 'number') {
        facts.push({
          label: 'Live CDI-02 demand uplift',
          value: `${args.liveDemandUpliftPct}%`
        });
      }
      return {
        heading: 'Contribution & trade-off summary',
        source: hasLive
          ? 'scenario curve + live CDI-02 evaluation'
          : 'scenario elasticity curve',
        provenance_tier: hasLive ? 'LIVE_CDI_ASSESSMENT' : 'DERIVED_SCENARIO_CURVE',
        provenance_badge: hasLive ? 'LIVE CDI ASSESSMENT' : 'DERIVED FROM SCENARIO CURVE',
        what_this_tells_us: `Committed ${current.discount_pct}% depth yields ${current.net_contribution_delta_gbp >= 0 ? '+' : ''}£${current.net_contribution_delta_gbp.toLocaleString('en-GB')} (+${current.expected_demand_uplift_pct.toFixed(1)}% uplift), whereas ${recommended.discount_pct}% yields ${recommended.net_contribution_delta_gbp >= 0 ? '+' : ''}£${recommended.net_contribution_delta_gbp.toLocaleString('en-GB')} (+${recommended.expected_demand_uplift_pct.toFixed(1)}% uplift).`,
        why_it_matters:
          recommended.net_contribution_delta_gbp > current.net_contribution_delta_gbp
            ? `Moving from ${current.discount_pct}% to ${recommended.discount_pct}% improves net contribution by +£${(recommended.net_contribution_delta_gbp - current.net_contribution_delta_gbp).toLocaleString('en-GB')} by avoiding subsidy on baseline shoppers.`
            : `Confirms whether incremental volume covers the promotional margin investment across the estate.`,
        threshold_comparison: [
          flip ? `Break-even flip at ${flip.discount_pct}%` : 'No negative flip on curve',
          fundingCond && fundingCond.target_value > 0
            ? `Supplier funding gap: ${fundingCond.target_display}`
            : null,
          hasLive ? `Live CDI-02: £${args.liveContributionGbp!.toLocaleString('en-GB')}` : null
        ]
          .filter(Boolean)
          .join(' · '),
        facts,
        visual: {
          kind: 'ECONOMICS_WATERFALL',
          committed_discount_pct: current.discount_pct,
          committed_uplift_pct: current.expected_demand_uplift_pct,
          committed_contribution_gbp: current.net_contribution_delta_gbp,
          recommended_discount_pct: recommended.discount_pct,
          recommended_uplift_pct: recommended.expected_demand_uplift_pct,
          recommended_contribution_gbp: recommended.net_contribution_delta_gbp,
          flip_discount_pct: flip ? flip.discount_pct : null,
          funding_gap_gbp: fundingCond ? fundingCond.target_value : null,
          funding_gap_display: fundingCond ? fundingCond.target_display : null,
          live_contribution_gbp: typeof args.liveContributionGbp === 'number' ? args.liveContributionGbp : null,
          live_uplift_pct: typeof args.liveDemandUpliftPct === 'number' ? args.liveDemandUpliftPct : null
        }
      };
    }

    case 'DECISION': {
      const recPlay = archetype.frontier_plays.find(p => p.is_recommended) ?? archetype.frontier_plays[0];
      const curPlay = archetype.frontier_plays.find(p => p.is_current) ?? archetype.frontier_plays[0];
      return {
        heading: 'Scenario curve alternatives',
        source: 'archetype.frontier_plays (scenario elasticity, not CDI-06 Pareto)',
        provenance_tier: 'DERIVED_SCENARIO_CURVE',
        provenance_badge: 'DERIVED FROM SCENARIO CURVE',
        what_this_tells_us: `Evaluates ${archetype.frontier_plays.length} commercial options on the scenario curve; verdict is ${archetype.discovery.decision_verdict.replace(/_/g, ' ')}.`,
        why_it_matters: `${recPlay.name} (${recPlay.discount_pct}% cut, ${recPlay.supply_exposure} supply exposure) balances demand uplift (+${recPlay.expected_demand_uplift_pct.toFixed(1)}%) and net contribution (£${recPlay.net_contribution_delta_gbp.toLocaleString('en-GB')}) better than ${curPlay.name}.`,
        threshold_comparison: `${recPlay.name} (£${recPlay.net_contribution_delta_gbp.toLocaleString('en-GB')}) vs ${curPlay.name} (£${curPlay.net_contribution_delta_gbp.toLocaleString('en-GB')}) · Governed CDI-06 frontier runs on Approve & Activate`,
        facts: archetype.frontier_plays.map(play => ({
          label: play.name,
          value: `${play.discount_pct}% · ${play.expected_demand_uplift_pct}% · ${play.net_contribution_delta_gbp}`,
          note: play.is_recommended ? 'Recommended trade-off' : play.is_current ? 'Committed plan' : undefined
        })),
        visual: {
          kind: 'FRONTIER_COMPARISON',
          plays: archetype.frontier_plays.map(p => ({
            id: p.id,
            name: p.name,
            badge: p.is_recommended ? 'Recommended trade-off' : p.badge || (p.is_current ? 'Current Plan' : 'Alternative'),
            discount_pct: p.discount_pct,
            stores_count: p.stores_count,
            duration_days: p.duration_days,
            expected_demand_uplift_pct: p.expected_demand_uplift_pct,
            net_contribution_delta_gbp: p.net_contribution_delta_gbp,
            supply_exposure: p.supply_exposure === 'CRITICAL' ? 'HIGH' : p.supply_exposure,
            is_current: p.is_current,
            is_recommended: p.is_recommended
          }))
        },
        caveat: 'Governed Pareto comparison runs at Approve & Activate (CDI-06), after intent registration.'
      };
    }

    case 'INTERVENTION': {
      const committedDiscount = archetype.default_discount_pct;
      const committedRegion = archetype.default_region;
      const committedDuration = archetype.default_duration_days;
      const committedStores = inScopeStoreCount(committedRegion);
      const committedEcon = estimateInterventionEconomics(archetype, {
        discount_pct: committedDiscount,
        stores: committedStores,
        duration_days: committedDuration
      });
      const recPlay = archetype.frontier_plays.find(p => p.is_recommended);
      const targetDiscount =
        archetype.curve_summary?.recommended_discount_pct ?? recommended.discount_pct;
      const targetRegion = recPlay
        ? frontierPlayRegion(archetype, recPlay)
        : archetype.default_region;
      const targetStores = recPlay ? recPlay.stores_count : inScopeStoreCount(targetRegion);
      const targetDuration = recPlay ? recPlay.duration_days : archetype.default_duration_days;
      const targetEcon = estimateInterventionEconomics(archetype, {
        discount_pct: targetDiscount,
        stores: targetStores,
        duration_days: targetDuration
      });

      const alreadyApplied =
        activeDiscount === targetDiscount &&
        activeRegion === targetRegion &&
        activeDuration === targetDuration;

      return {
        heading: 'Recommended planner intervention',
        source: 'archetype.curve_summary / discovery',
        provenance_tier: 'DERIVED_SCENARIO_CURVE',
        provenance_badge: 'DERIVED FROM SCENARIO CURVE',
        what_this_tells_us: `Recommends shifting from the committed ${committedDiscount}% (${committedRegion}, ${committedDuration}d) baseline to ${targetDiscount}% (${targetRegion}, ${targetDuration}d).`,
        why_it_matters: alreadyApplied
          ? `This recommended configuration (${targetDiscount}% · ${targetRegion} · ${targetDuration}d) is currently applied in the active planner controls.`
          : `Accepting this intervention into the planner updates the governed configuration and triggers a live CDI-02/03/04/05 recalculation before contract activation.`,
        threshold_comparison: `Committed: ${committedDiscount}% (£${committedEcon.net_contribution_delta_gbp.toLocaleString('en-GB')}) → Recommended: ${targetDiscount}% (£${targetEcon.net_contribution_delta_gbp.toLocaleString('en-GB')})`,
        facts: [
          {
            label: 'Recommended discount',
            value: `${targetDiscount}%`
          },
          {
            label: 'Committed discount',
            value: `${archetype.default_discount_pct}%`
          },
          {
            label: 'Verdict',
            value: archetype.discovery.decision_verdict
          }
        ],
        visual: {
          kind: 'INTERVENTION_COMPARISON',
          current_discount_pct: committedDiscount,
          current_region: committedRegion,
          current_stores: committedStores,
          current_duration_days: committedDuration,
          current_uplift_pct: committedEcon.expected_demand_uplift_pct,
          current_contribution_gbp: committedEcon.net_contribution_delta_gbp,
          target_discount_pct: targetDiscount,
          target_region: targetRegion,
          target_stores: targetStores,
          target_duration_days: targetDuration,
          target_uplift_pct: targetEcon.expected_demand_uplift_pct,
          target_contribution_gbp: targetEcon.net_contribution_delta_gbp,
          intervention_label: recPlay?.name ?? 'CogniX Recommended'
        }
      };
    }

    default:
      return {
        heading: `${node.category} node`,
        source: 'decision_graph.nodes',
        provenance_tier: 'SEEDED_WORLD_MODEL',
        provenance_badge: 'SEEDED WORLD MODEL',
        what_this_tells_us: node.summary,
        why_it_matters: node.detail,
        threshold_comparison: node.label,
        facts: [{ label: 'Detail', value: node.detail }],
        visual: {
          kind: 'FRONTIER_COMPARISON',
          plays: []
        }
      };
  }
}

export function validityStateToTwinLabel(
  state: 'STABLE' | 'WATCH' | 'DEGRADED' | 'REASSESS_REQUIRED' | 'INDETERMINATE' | string
): 'STILL VALID' | 'RECONSIDER' | 'CONDITION BREACHED' {
  if (state === 'REASSESS_REQUIRED') return 'CONDITION BREACHED';
  if (state === 'DEGRADED') return 'RECONSIDER';
  return 'STILL VALID';
}
