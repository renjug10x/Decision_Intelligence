/**
 * CogniX CDI-02 — Deterministic Counterfactual Baseline & Causal Campaign Engine
 *
 * Pure calculative functions. Zero React dependency.
 *
 * Critical provenance rule:
 *   Fields marked `cdi01_placeholder_default` are compatibility placeholders only.
 *   They must NEVER be treated as stated commercial intent or causal campaign inputs.
 */

import {
  CampaignIntent,
  projectCampaignIntentToCommercialIntent
} from '../packages/contracts/src/campaign-intent-model';
import {
  CampaignDeltaSummary,
  CampaignEvaluationRequest,
  CampaignEvaluationResponse,
  CausalDemandContribution,
  CausalDriverContribution,
  CounterfactualBaseline,
  DemandTrajectoryPoint,
  validateCampaignEvaluationRequest,
  validateCausalDemandContribution,
  validateCounterfactualBaseline
} from '../packages/contracts/src/campaign-counterfactual-model';
import { getCampaignIntentById } from './campaign-intent-store';
import { getDecisionState } from './decision-state-store';
import { simulateEnterpriseSignalTimelines } from '../services/world/src/dynamic-signal-simulator';
import { SignalSimulationContext } from '../packages/contracts/src/enterprise-signal-model';

const ENGINE_VERSION = 'cdi02_causal_engine_v1.1.0';
const SCHEMA_VERSION = '1.0';
const BASE_WEEKLY_UNITS = 10000;
const UNIT_CONTRIBUTION_GBP = 1.85;
const WASTE_BASELINE_UNITS = 420;

/**
 * Deterministic demo economics: each point of discount depth removes 0.7% of the unit
 * contribution earned on promoted volume. Without this, contribution is a pure function
 * of volume, so "discount harder" would always look better and the engine could never
 * return a negative campaign case. Breakeven lands around 13–15% depth: shallow promos
 * are accretive, deep promos destroy contribution.
 *
 * Calibration target for later ML work — not a learned elasticity.
 */
const PROMO_CONTRIBUTION_EROSION_PER_DEPTH_POINT = 0.007;

/**
 * Drivers that act on the world whether or not we intervene. They belong to the
 * without-intervention path as well as the predicted path, so they cancel out of the
 * Campaign Delta instead of being credited to the campaign.
 */
const AMBIENT_DRIVERS: ReadonlySet<string> = new Set([
  'intrinsic_demand',
  'external_signal_response'
]);

export interface ResolvedMechanicInput {
  mechanic_attributed: boolean;
  discount_depth: number;
  promotion_type?: string;
  excluded_placeholders: string[];
  provenance_notes: Record<string, string>;
}

/**
 * Resolve whether a promotion mechanic may be attributed as a causal input.
 * Placeholders from CDI-01 projection are explicitly excluded.
 */
export function resolveStatedMechanic(campaign: CampaignIntent): ResolvedMechanicInput {
  const excluded: string[] = [];
  const notes: Record<string, string> = {};

  if (campaign.campaign_intent.intervention_posture !== 'CONSIDER_PROMOTION') {
    notes.mechanic_status = 'not_applicable_for_posture';
    return {
      mechanic_attributed: false,
      discount_depth: 0,
      excluded_placeholders: excluded,
      provenance_notes: notes
    };
  }

  const projected = projectCampaignIntentToCommercialIntent(campaign);
  const typeSource = projected?.provenance.promotion_type_source;
  const depthSource = projected?.provenance.discount_depth_source;
  const timingSource = projected?.provenance.timing_source;

  const mechanicStated =
    typeof campaign.campaign_intent.provisional_mechanic === 'string' &&
    typeSource === 'canvas_stated';
  const depthStated =
    typeof campaign.campaign_intent.provisional_discount_depth === 'number' &&
    depthSource === 'canvas_stated';

  if (typeSource === 'cdi01_placeholder_default' || !mechanicStated) {
    excluded.push('promotion_type');
    notes.promotion_type_source = typeSource || 'unstated';
  }
  if (depthSource === 'cdi01_placeholder_default' || !depthStated) {
    excluded.push('discount_depth');
    notes.discount_depth_source = depthSource || 'unstated';
  }
  if (timingSource === 'cdi01_placeholder_default') {
    excluded.push('timing');
    notes.timing_source = timingSource;
  }

  // Attribution requires BOTH mechanic and depth to be canvas-stated — never placeholders
  const attributed = mechanicStated && depthStated;
  notes.mechanic_attribution = attributed ? 'canvas_stated' : 'excluded_placeholder_or_incomplete';

  return {
    mechanic_attributed: attributed,
    discount_depth: attributed ? (campaign.campaign_intent.provisional_discount_depth as number) : 0,
    promotion_type: attributed ? campaign.campaign_intent.provisional_mechanic : undefined,
    excluded_placeholders: excluded,
    provenance_notes: notes
  };
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function skuContextFactor(campaign: CampaignIntent): number {
  const skuKey = campaign.campaign_intent.sku_scope.join('|') || 'none';
  const regionKey = campaign.audience_market.region || 'unknown';
  const seed = hashSeed(`${campaign.campaign_intent.category}::${skuKey}::${regionKey}`);
  // Deterministic ±6% differentiation band for SKU/context
  return 0.94 + ((seed % 13) / 100);
}

function intrinsicDriftPp(campaign: CampaignIntent): number {
  // Mild forward drift without intervention (seasonality / run-rate)
  const factor = skuContextFactor(campaign);
  return Number((1.5 * factor).toFixed(2));
}

function nonPromotionResponsePp(campaign: CampaignIntent): number {
  if (campaign.campaign_intent.intervention_posture !== 'CONSIDER_NON_PROMOTION') return 0;
  // Stock reallocation / assortment-style lever — independent of promo placeholders
  const factor = skuContextFactor(campaign);
  return Number((4.2 * factor).toFixed(2));
}

function mechanicResponsePp(depth: number, campaign: CampaignIntent): number {
  if (depth <= 0) return 0;
  const factor = skuContextFactor(campaign);
  // ~0.55pp uplift per discount point, moderated by SKU/context
  return Number((depth * 0.55 * factor).toFixed(2));
}

function audienceResponsePp(campaign: CampaignIntent): number {
  if (!campaign.audience_market.customer_segment) return 0.8;
  return campaign.audience_market.customer_segment.toLowerCase().includes('family') ? 2.1 : 1.4;
}

function placeResponsePp(campaign: CampaignIntent): number {
  const region = (campaign.audience_market.region || '').toLowerCase();
  if (region.includes('north west')) return 1.6;
  if (region.includes('london') || region.includes('south')) return 1.2;
  return 1.0;
}

function temporalResponsePp(
  campaign: CampaignIntent,
  timingPlaceholderExcluded: boolean,
  resolvedTemporalUpliftPp?: number
): number {
  // CDI-03 additive hook first: a resolved opportunity window replaces both the
  // FIND_BEST_WINDOW dampener AND the timing-placeholder neutral (0.5). That is the
  // point of window discovery — dates become known through evaluation, not canvas statement.
  if (typeof resolvedTemporalUpliftPp === 'number' && Number.isFinite(resolvedTemporalUpliftPp)) {
    return Number(resolvedTemporalUpliftPp.toFixed(2));
  }
  if (timingPlaceholderExcluded) return 0.5; // neutral calendar effect only
  if (campaign.audience_market.timing_mode === 'KNOWN_DATES' && campaign.audience_market.planned_start) {
    return 1.3;
  }
  // FIND_BEST_WINDOW without CDI-03 resolution — modest uncertainty dampener
  return 0.7;
}

function extractSignalUpliftPp(
  campaign: CampaignIntent,
  includeSignals: boolean,
  statedPromoDepth: number
): { uplift_pp: number; simulation_id?: string; refs: string[] } {
  if (!includeSignals) {
    return { uplift_pp: 0, refs: [] };
  }

  const decisionState = getDecisionState(campaign.tenant_id, campaign.session_id);
  const context: SignalSimulationContext = {
    session_id: campaign.session_id,
    decision_state_id: decisionState.decision_state_id,
    decision_state_version: decisionState.state_version,
    tenant_id: campaign.tenant_id,
    scenario_id: campaign.decision_context.scenario_id || decisionState.scenario_id || 'SCN-PROMO-01',
    scenario_family: campaign.decision_context.scenario_family || decisionState.scenario_family || 'promotion_surge',
    // Critical: never feed placeholder discount depth into ESF-2 as promotion_lift
    promotion_lift: statedPromoDepth,
    supplier_capacity_cap: decisionState.scenario_parameters.supplier_capacity_cap,
    forecast_horizon_days: decisionState.scenario_parameters.forecast_horizon_days,
    promotion_method: statedPromoDepth > 0 ? (campaign.campaign_intent.provisional_mechanic || 'none') : 'none',
    campaign_scope: decisionState.scenario_parameters.campaign_scope,
    cannibalisation_factor: decisionState.scenario_parameters.cannibalisation_factor,
    event_boost: decisionState.scenario_parameters.event_boost,
    selected_interventions: []
  };

  const sim = simulateEnterpriseSignalTimelines({ context });
  const todayObs = sim.timelines
    .flatMap(t => t.observations.map(o => ({ type: t.signal_type, o })))
    .filter(x => x.o.period === 'Today');

  const avgDelta =
    todayObs.length === 0
      ? 0
      : todayObs.reduce((sum, x) => sum + x.o.delta_pct, 0) / todayObs.length;

  // Map observed signal pressure into a bounded causal contribution (0–6pp)
  const uplift = Math.max(0, Math.min(6, Number((avgDelta * 0.08).toFixed(2))));
  return {
    uplift_pp: uplift,
    simulation_id: sim.simulation_id,
    refs: sim.timelines.slice(0, 3).map(t => t.timeline_id)
  };
}

/**
 * Unit contribution earned on a trajectory. Only promoted volume is eroded, and only
 * when a canvas-stated mechanic was actually attributed — a placeholder depth must never
 * move the economics any more than it moves demand.
 */
function unitContributionFor(depth: number, mechanicAttributed: boolean): number {
  if (!mechanicAttributed || depth <= 0) return UNIT_CONTRIBUTION_GBP;
  const retained = Math.max(0, 1 - depth * PROMO_CONTRIBUTION_EROSION_PER_DEPTH_POINT);
  return Number((UNIT_CONTRIBUTION_GBP * retained).toFixed(4));
}

function buildTrajectory(
  label: DemandTrajectoryPoint['label'],
  indexPct: number,
  confidence: number,
  unitContributionGbp: number = UNIT_CONTRIBUTION_GBP,
  /**
   * Intervention clearance applies only when the causal model attributes positive
   * intervention uplift — never because the trajectory *label* says PREDICTED_*.
   * Do Nothing at the same index as the counterfactual must share the same waste.
   */
  applyInterventionClearance: boolean = false
): DemandTrajectoryPoint {
  const volume = Math.round(BASE_WEEKLY_UNITS * (indexPct / 100));
  const wasteFactor = applyInterventionClearance && indexPct > 100 ? 0.92 : 1;
  return {
    label,
    volume_units: volume,
    volume_index_pct: Number(indexPct.toFixed(2)),
    contribution_gbp: Number((volume * unitContributionGbp).toFixed(2)),
    unit_contribution_gbp: unitContributionGbp,
    waste_units: Math.round(WASTE_BASELINE_UNITS * wasteFactor * (indexPct > 105 ? 1.05 : 1)),
    confidence
  };
}

function campaignDelta(
  without: DemandTrajectoryPoint,
  predicted: DemandTrajectoryPoint,
  attributableUpliftPp: number
): CampaignDeltaSummary {
  const volumeDelta = predicted.volume_units - without.volume_units;
  const volumeDeltaPct =
    without.volume_units === 0 ? 0 : Number(((volumeDelta / without.volume_units) * 100).toFixed(2));
  return {
    volume_delta_units: volumeDelta,
    volume_delta_pct: volumeDeltaPct,
    contribution_delta_gbp: Number((predicted.contribution_gbp - without.contribution_gbp).toFixed(2)),
    waste_delta_units: predicted.waste_units - without.waste_units,
    attributable_uplift_pp: attributableUpliftPp,
    intervention_indistinguishable_from_do_nothing: Math.abs(attributableUpliftPp) < 0.005
  };
}

export function evaluateCausalDemandContribution(
  campaign: CampaignIntent,
  options?: {
    include_signals?: boolean;
    resolved_temporal_uplift_pp?: number;
    opportunity_window_id?: string;
  }
): CausalDemandContribution {
  const mechanic = resolveStatedMechanic(campaign);
  const timingExcluded = mechanic.excluded_placeholders.includes('timing');
  const includeSignals = options?.include_signals !== false;

  const signal = extractSignalUpliftPp(campaign, includeSignals, mechanic.discount_depth);

  const drivers: CausalDriverContribution[] = [
    {
      driver_id: 'intrinsic_demand',
      driver_class: 'ambient',
      label: 'Intrinsic demand / run-rate drift',
      contribution_pp: intrinsicDriftPp(campaign),
      attributed: true,
      rationale: 'Deterministic seasonal run-rate drift independent of intervention posture.',
      evidence_refs: ['WORLD_RUNRATE_V1']
    },
    {
      driver_id: 'mechanic_response',
      driver_class: 'intervention',
      label: 'Promotional mechanic response',
      contribution_pp: mechanic.mechanic_attributed
        ? mechanicResponsePp(mechanic.discount_depth, campaign)
        : 0,
      attributed: mechanic.mechanic_attributed,
      rationale: mechanic.mechanic_attributed
        ? `Canvas-stated mechanic ${mechanic.promotion_type} @ ${mechanic.discount_depth}% depth.`
        : 'Excluded: mechanic/depth not canvas-stated or marked cdi01_placeholder_default.',
      evidence_refs: mechanic.mechanic_attributed ? ['CDI01_CANVAS_STATED_MECHANIC'] : ['CDI01_PLACEHOLDER_EXCLUDED']
    },
    {
      driver_id: 'non_promotion_response',
      driver_class: 'intervention',
      label: 'Non-promotion intervention response',
      contribution_pp: nonPromotionResponsePp(campaign),
      attributed: campaign.campaign_intent.intervention_posture === 'CONSIDER_NON_PROMOTION',
      rationale:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_NON_PROMOTION'
          ? 'Stock reallocation / assortment-style lever (promotion not assumed).'
          : 'Not applicable for current intervention posture.',
      evidence_refs: ['CDI02_NON_PROMO_LEVER_V1']
    },
    {
      driver_id: 'audience_response',
      driver_class: 'intervention',
      label: 'Audience / segment response',
      contribution_pp:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' ||
        campaign.campaign_intent.intervention_posture === 'CONSIDER_NON_PROMOTION'
          ? audienceResponsePp(campaign)
          : 0,
      attributed:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' ||
        campaign.campaign_intent.intervention_posture === 'CONSIDER_NON_PROMOTION',
      rationale: 'Segment affinity contribution when an active intervention posture is selected.',
      evidence_refs: ['CDI01_AUDIENCE_SCOPE']
    },
    {
      driver_id: 'place_response',
      driver_class: 'intervention',
      label: 'Place / region response',
      contribution_pp:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' ||
        campaign.campaign_intent.intervention_posture === 'CONSIDER_NON_PROMOTION'
          ? placeResponsePp(campaign)
          : 0,
      attributed:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' ||
        campaign.campaign_intent.intervention_posture === 'CONSIDER_NON_PROMOTION',
      rationale: 'Regional demand sensitivity from Audience & Market scope.',
      evidence_refs: ['CDI01_REGION_SCOPE']
    },
    {
      driver_id: 'temporal_response',
      driver_class: 'intervention',
      label: 'Temporal / calendar response',
      contribution_pp:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_DO_NOTHING' ||
        campaign.campaign_intent.intervention_posture === 'UNDECIDED'
          ? 0
          : temporalResponsePp(campaign, timingExcluded, options?.resolved_temporal_uplift_pp),
      attributed:
        campaign.campaign_intent.intervention_posture !== 'CONSIDER_DO_NOTHING' &&
        campaign.campaign_intent.intervention_posture !== 'UNDECIDED',
      rationale:
        typeof options?.resolved_temporal_uplift_pp === 'number'
          ? `CDI-03 resolved opportunity window${options.opportunity_window_id ? ` (${options.opportunity_window_id})` : ''} temporal uplift.`
          : timingExcluded
            ? 'Timing placeholder excluded from causal calendar uplift; neutral dampener only.'
            : 'Timing mode contribution (KNOWN_DATES vs FIND_BEST_WINDOW).',
      evidence_refs:
        typeof options?.resolved_temporal_uplift_pp === 'number'
          ? ['CDI03_RESOLVED_OPPORTUNITY_WINDOW']
          : timingExcluded
            ? ['CDI01_TIMING_PLACEHOLDER_EXCLUDED']
            : ['CDI01_TIMING_MODE']
    },
    {
      driver_id: 'external_signal_response',
      driver_class: 'ambient',
      label: 'External / observed enterprise signals (ESF-2)',
      contribution_pp: signal.uplift_pp,
      attributed: includeSignals && signal.uplift_pp !== 0,
      rationale: includeSignals
        ? 'Deterministic ESF-2 Today-period signal pressure mapped to bounded causal pp.'
        : 'Signal consumption disabled for this evaluation.',
      evidence_refs: signal.refs
    },
    {
      driver_id: 'portfolio_effects',
      driver_class: 'intervention',
      label: 'Portfolio / cannibalisation effects',
      contribution_pp:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' && mechanic.mechanic_attributed
          ? -1.2
          : 0,
      attributed:
        campaign.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' && mechanic.mechanic_attributed,
      rationale: 'Deterministic cannibalisation drag when a stated promotion mechanic is attributed.',
      evidence_refs: ['CDI02_PORTFOLIO_DRAG_V1']
    },
    {
      driver_id: 'interaction_residual',
      driver_class: 'intervention',
      label: 'Interaction residual',
      contribution_pp: 0,
      attributed: true,
      rationale: 'Reserved residual; held at 0 for deterministic demo reconciliation.',
      evidence_refs: ['CDI02_RESIDUAL_ZERO']
    }
  ];

  const posture = campaign.campaign_intent.intervention_posture;
  const noIntervention = posture === 'CONSIDER_DO_NOTHING' || posture === 'UNDECIDED';

  // "Do nothing" means we take no action — it does NOT mean the world stops moving.
  // Only intervention-class drivers are suppressed; ambient drivers (intrinsic drift and
  // observed external signals) keep contributing, because they occur regardless.
  if (noIntervention) {
    for (const d of drivers) {
      if (d.driver_class !== 'intervention') continue;
      d.contribution_pp = 0;
      d.attributed = false;
      d.rationale = `${d.rationale} (zeroed: no intervention under posture ${posture})`;
    }
  }

  // An unattributed driver must not move demand — otherwise it would be applied to the
  // trajectory while being displayed to the user as excluded.
  for (const d of drivers) {
    if (!d.attributed && d.contribution_pp !== 0) {
      d.contribution_pp = 0;
    }
  }

  const sumWhere = (pred: (d: CausalDriverContribution) => boolean) =>
    Number(drivers.filter(pred).reduce((s, d) => s + d.contribution_pp, 0).toFixed(2));

  const ambient = sumWhere(d => d.driver_class === 'ambient');
  const intervention = sumWhere(d => d.driver_class === 'intervention');
  const total = Number((ambient + intervention).toFixed(2));

  // Reconciles across ALL drivers, not just attributed ones, so a driver that is both
  // non-zero and unattributed fails the check instead of disappearing from both sides.
  const reconciled = sumWhere(() => true);

  const causal: CausalDemandContribution = {
    causal_id: `causal_${campaign.campaign_intent_id}`,
    campaign_intent_id: campaign.campaign_intent_id,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    intervention_posture: campaign.campaign_intent.intervention_posture,
    total_predicted_uplift_pp: total,
    ambient_uplift_pp: ambient,
    intervention_uplift_pp: intervention,
    drivers,
    reconciled_sum_pp: reconciled,
    reconciliation_ok: Math.abs(reconciled - total) < 0.005,
    signal_simulation_id: signal.simulation_id,
    placeholder_fields_excluded: mechanic.excluded_placeholders,
    calculation_mode: 'deterministic_demo_causal',
    synthetic_demo: campaign.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-02',
      ...mechanic.provenance_notes,
      sku_context_factor: String(skuContextFactor(campaign))
    },
    timestamp: new Date().toISOString()
  };

  const validation = validateCausalDemandContribution(causal);
  if (!validation.valid) {
    throw new Error(`Invalid CausalDemandContribution: ${validation.errors.join('; ')}`);
  }
  return causal;
}

export function evaluateCounterfactualBaseline(
  campaign: CampaignIntent,
  causal?: CausalDemandContribution,
  options?: { include_signals?: boolean }
): CounterfactualBaseline {
  const causalResult = causal || evaluateCausalDemandContribution(campaign, options);
  const posture = campaign.campaign_intent.intervention_posture;

  // Current baseline = observed run-rate index 100
  const current = buildTrajectory('CURRENT_BASELINE', 100, 94);

  // Expected without intervention = current + every ambient driver (intrinsic run-rate drift
  // AND observed external signals). Ambient movement happens whether or not we act, so it
  // belongs to this path too — omitting it would silently credit the campaign for it.
  const withoutIndex = 100 + causalResult.ambient_uplift_pp;
  const without = buildTrajectory('EXPECTED_WITHOUT_INTERVENTION', withoutIndex, 90);

  // Predicted with intervention = the same ambient path plus what the intervention causes.
  // For DO_NOTHING / UNDECIDED intervention_uplift_pp is 0, so predicted collapses onto
  // without — without discarding the ambient movement.
  const predictedIndex = withoutIndex + causalResult.intervention_uplift_pp;
  const mechanic = resolveStatedMechanic(campaign);
  // Waste clearance is causal, not label-derived: only positive intervention uplift may
  // apply the 0.92 factor. Identical indices (Do Nothing) ⇒ identical waste.
  const applyInterventionClearance = causalResult.intervention_uplift_pp > 0;
  const predicted = buildTrajectory(
    'PREDICTED_WITH_INTERVENTION',
    predictedIndex,
    posture === 'UNDECIDED' ? 72 : 88,
    unitContributionFor(mechanic.discount_depth, mechanic.mechanic_attributed),
    applyInterventionClearance
  );

  const baseline: CounterfactualBaseline = {
    counterfactual_id: `cf_${campaign.campaign_intent_id}`,
    campaign_intent_id: campaign.campaign_intent_id,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    intervention_posture: posture,
    category: campaign.campaign_intent.category,
    sku_scope: [...campaign.campaign_intent.sku_scope],
    region: campaign.audience_market.region,
    current_baseline: current,
    expected_without_intervention: without,
    predicted_with_intervention: predicted,
    campaign_delta: campaignDelta(without, predicted, causalResult.intervention_uplift_pp),
    horizon_days: 14,
    calculation_mode: 'deterministic_demo_counterfactual',
    synthetic_demo: campaign.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-02',
      causal_id: causalResult.causal_id,
      placeholders_excluded: causalResult.placeholder_fields_excluded.join(',') || 'none'
    },
    timestamp: new Date().toISOString()
  };

  const validation = validateCounterfactualBaseline(baseline);
  if (!validation.valid) {
    throw new Error(`Invalid CounterfactualBaseline: ${validation.errors.join('; ')}`);
  }
  return baseline;
}

export function evaluateCampaignDecision(request: CampaignEvaluationRequest): CampaignEvaluationResponse {
  const reqVal = validateCampaignEvaluationRequest(request);
  if (!reqVal.valid) {
    throw new Error(reqVal.errors.join('; '));
  }

  let campaign = request.campaign_intent;
  if (!campaign && request.campaign_intent_id) {
    // A by-id request must be answered with that campaign or not at all. Falling back to
    // the caller's current intent would answer a question about campaign X with an
    // evaluation of campaign Y, and would quietly mask a tenant/session isolation failure
    // as a successful 200.
    campaign =
      getCampaignIntentById(request.campaign_intent_id, request.tenant_id, request.session_id) ||
      undefined;
    if (!campaign) {
      throw new Error(
        `CampaignIntentNotFound: ${request.campaign_intent_id} is not visible to the supplied tenant/session`
      );
    }
  }
  if (!campaign) {
    // Unreachable: validateCampaignEvaluationRequest already requires an id or an inline
    // intent. Kept as an explicit failure so no future edit can reintroduce a silent
    // "evaluate whatever the caller currently has" fallback.
    throw new Error('Provide campaign_intent_id or campaign_intent');
  }

  if (campaign.tenant_id !== request.tenant_id) {
    throw new Error('Tenant boundary violation: campaign intent tenant_id mismatch');
  }
  if (campaign.session_id !== request.session_id) {
    throw new Error('Session boundary violation: campaign intent session_id mismatch');
  }

  const includeSignals = request.include_signals !== false;
  const causal = evaluateCausalDemandContribution(campaign, {
    include_signals: includeSignals,
    resolved_temporal_uplift_pp: request.resolved_temporal_uplift_pp,
    opportunity_window_id: request.opportunity_window_id
  });
  const counterfactual = evaluateCounterfactualBaseline(campaign, causal, {
    include_signals: includeSignals
  });

  return {
    evaluation_id: `cdeval_${campaign.campaign_intent_id}_${Date.now()}`,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    campaign_intent_id: campaign.campaign_intent_id,
    counterfactual,
    causal,
    timestamp: new Date().toISOString(),
    schema_version: SCHEMA_VERSION
  };
}
