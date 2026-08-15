/**
 * CogniX CDI-06 — Outcome Frontier Engine
 *
 * Deterministic strategy generation, real CDI-02 evaluation per play,
 * two-axis Pareto frontier, declared-constraint selection.
 * ARF-A only. Zero React. Zero LLM.
 */

import { createHash } from 'crypto';
import {
  CampaignIntent,
  CampaignEvaluationResponse,
  FrontierEvaluationRequest,
  FrontierEvaluationResponse,
  OutcomeFrontier,
  StrategyPlay,
  PlayIntentDelta,
  PlayOutcomeVector,
  AmbientFrameStamp,
  DominanceRelation,
  FrontierSelection,
  DeclaredConstraint,
  ConstraintElimination,
  ScenarioZeroReference,
  PlayAdmissibility,
  EconomicsCompleteness,
  SuppressedDuplicate,
  ComparisonSetInvariants,
  PLAY_GENERATION_POLICY,
  ADMITTED_AXES,
  DOMINANCE_EPSILON,
  WASTE_ANNOTATION_DISCLOSURE,
  WASTE_ADMISSIBLE_WHEN,
  SCENARIO_ZERO_FRAMING,
  NON_PROMOTION_DISCLOSURE,
  NON_PROMOTION_REQUIRED_INPUT,
  AVAILABILITY_REQUIRED_INPUT,
  REVENUE_REQUIRED_INPUT,
  promotionDepthLabel,
  validateFrontierRequest,
  validateOutcomeFrontier,
  assertAmbientFrameShared,
  assertNoSyntheticOutcome,
  assertScenarioZeroPresent,
  assertNonPromotionNotRanked,
  assertBalancedLabelLegitimate,
  assertNoFabricatedDeclaration,
  assertTieSemantics,
  assertComparisonSetIntegrity,
  assertPlayArtefactsDistinct,
  assertWasteNotInDominance,
  assertNoUnauthorisedNumericScalar,
  deriveCommercialObjectiveClass,
  ConfidenceBand,
  EvidenceStrength,
  weakestEvidenceStrength,
  ReadinessEvidenceRef
} from '../packages/contracts/src/index';
import { getCampaignIntentById } from './campaign-intent-store';
import { evaluateCampaignDecision } from './campaign-causal-engine';
import { evaluateCampaignReadiness } from './campaign-readiness-engine';
import { buildDemandDecompositionFromEvaluation } from './campaign-timeline-engine';

const SCHEMA_VERSION = '1.0.0';
const ENGINE_VERSION = 'cdi06_frontier_v1';
const PROMO_MECHANIC = '20_percent_off';

interface BuiltPlay {
  play: StrategyPlay;
  evaluation: CampaignEvaluationResponse;
  intent: CampaignIntent;
}

function canonicalDelta(deltas: PlayIntentDelta[]): string {
  const sorted = [...deltas].sort((a, b) => a.field_path.localeCompare(b.field_path));
  return JSON.stringify(
    sorted.map(d => ({
      field_path: d.field_path,
      anchor_value: d.anchor_value ?? null,
      play_value: d.play_value ?? null
    }))
  );
}

function contentPlayId(anchorId: string, ruleId: string, deltas: PlayIntentDelta[]): string {
  const h = createHash('sha256')
    .update(`${anchorId}|${ruleId}|${canonicalDelta(deltas)}`)
    .digest('hex')
    .slice(0, 24);
  return `play_${ruleId}_${h}`;
}

/**
 * The intervention state a play actually presents to CDI-02, normalised.
 *
 * `UNDECIDED` and `CONSIDER_DO_NOTHING` are one causal state upstream
 * (campaign-causal-engine zeroes every intervention driver for both), so they canonicalise
 * together — otherwise the anchor's UNDECIDED plan and Scenario 0 are emitted as two
 * distinct plays that are the same campaign at (0.00, £0.00). Depth is normalised
 * numerically so 10 and 10.0 are one value.
 */
function canonicalEffectiveIntent(
  intent: CampaignIntent,
  request: FrontierEvaluationRequest
): string {
  const ci = intent.campaign_intent;
  const posture =
    ci.intervention_posture === 'UNDECIDED' || ci.intervention_posture === 'CONSIDER_DO_NOTHING'
      ? 'NO_INTERVENTION'
      : ci.intervention_posture;
  const mechanic = posture === 'CONSIDER_PROMOTION' ? ci.provisional_mechanic ?? null : null;
  const depth =
    posture === 'CONSIDER_PROMOTION' && typeof ci.provisional_discount_depth === 'number'
      ? Number(ci.provisional_discount_depth)
      : null;
  return JSON.stringify({
    posture,
    mechanic,
    depth,
    resolved_temporal_uplift_pp: request.resolved_temporal_uplift_pp ?? null,
    opportunity_window_id: request.opportunity_window_id ?? null
  });
}

/**
 * Play-scoped intent id. CDI-02 derives `counterfactual_id` and `causal_id` from
 * `campaign_intent_id`, so variants that reuse the anchor's id all produce the same
 * artefact ids — and the evaluation binding stops being able to tell one play's
 * artefacts from another's. This id is content-derived (never time-derived), never
 * registered in the CDI-01 store, and feeds no numeric seed: `skuContextFactor` is keyed
 * on category, sku_scope and region, all comparison-set invariants.
 */
function playScopedIntentId(anchorId: string, playId: string): string {
  return `${anchorId}__${playId}`;
}

function cloneIntent(anchor: CampaignIntent): CampaignIntent {
  return JSON.parse(JSON.stringify(anchor)) as CampaignIntent;
}

function axisDirections(anchor: CampaignIntent): {
  volume: 'MAXIMISE' | 'MINIMISE';
  contribution: 'MAXIMISE' | 'MINIMISE';
} {
  const dir = anchor.baseline_objective.target_direction;
  const volume = dir === 'DECREASE' ? 'MINIMISE' : 'MAXIMISE';
  const contribution = dir === 'DECREASE' ? 'MINIMISE' : 'MAXIMISE';
  return { volume, contribution };
}

function buildOutcomes(
  evaluation: CampaignEvaluationResponse,
  directions: { volume: 'MAXIMISE' | 'MINIMISE'; contribution: 'MAXIMISE' | 'MINIMISE' }
): PlayOutcomeVector {
  const delta = evaluation.counterfactual.campaign_delta;
  return {
    axes: [
      {
        axis_id: 'attributable_volume_uplift_pp',
        value: delta.attributable_uplift_pp,
        source_field_path: 'counterfactual.campaign_delta.attributable_uplift_pp',
        preferred_direction: directions.volume,
        strength: 'DERIVED'
      },
      {
        axis_id: 'contribution_delta_gbp',
        value: delta.contribution_delta_gbp,
        source_field_path: 'counterfactual.campaign_delta.contribution_delta_gbp',
        preferred_direction: directions.contribution,
        strength: 'DERIVED'
      }
    ],
    unavailable: [
      {
        dimension_id: 'revenue_delta_gbp',
        availability: 'NOT_AVAILABLE',
        required_authoritative_input: REVENUE_REQUIRED_INPUT
      },
      {
        dimension_id: 'availability_delta',
        availability: 'NOT_AVAILABLE',
        required_authoritative_input: AVAILABILITY_REQUIRED_INPUT
      }
    ],
    annotations: [
      {
        dimension_id: 'waste_delta_units',
        availability: 'NOT_ADMISSIBLE_AS_AXIS',
        value: delta.waste_delta_units,
        disclosure: WASTE_ANNOTATION_DISCLOSURE,
        reason_code: 'INSUFFICIENT_CAUSAL_RESOLUTION',
        admissible_when: WASTE_ADMISSIBLE_WHEN
      },
      {
        dimension_id: 'predicted_confidence',
        availability: 'NOT_ADMISSIBLE_AS_AXIS',
        value: evaluation.counterfactual.predicted_with_intervention.confidence,
        disclosure:
          'Predicted confidence is posture-derived on the CDI-02 trajectory, not strategy-derived across the frontier.',
        reason_code: 'POSTURE_DERIVED'
      }
    ]
  };
}

function ambientStamp(evaluation: CampaignEvaluationResponse): AmbientFrameStamp {
  return {
    mode: 'SIGNALS_EXCLUDED',
    ambient_uplift_pp: evaluation.causal.ambient_uplift_pp,
    expected_without_intervention_index_pct:
      evaluation.counterfactual.expected_without_intervention.volume_index_pct,
    signal_simulation_id: evaluation.causal.signal_simulation_id
  };
}

function evaluateVariant(
  intent: CampaignIntent,
  request: FrontierEvaluationRequest
): CampaignEvaluationResponse {
  return evaluateCampaignDecision({
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    campaign_intent: intent,
    include_signals: false,
    resolved_temporal_uplift_pp: request.resolved_temporal_uplift_pp,
    opportunity_window_id: request.opportunity_window_id
  });
}

function tryReadiness(
  intent: CampaignIntent,
  evaluation: CampaignEvaluationResponse,
  request: FrontierEvaluationRequest
): { reference: StrategyPlay['readiness_reference']; confidence_band: ConfidenceBand } | undefined {
  try {
    const res = evaluateCampaignReadiness({
      tenant_id: request.tenant_id,
      session_id: request.session_id,
      campaign_intent: intent,
      campaign_evaluation: evaluation,
      include_signals: false,
      economic_tolerance: request.economic_tolerance,
      evaluation_timestamp: request.evaluation_timestamp || '2026-08-15T12:00:00.000Z'
    });
    const r = res.readiness;
    return {
      reference: {
        readiness_id: r.readiness_id,
        state: r.state,
        headline: r.headline,
        vetoes: r.vetoes,
        conditions: r.conditions,
        state_caps_applied: r.state_caps_applied,
        commercial_tolerance: r.commercial_tolerance
      },
      confidence_band: r.confidence.band
    };
  } catch {
    return undefined;
  }
}

function classifyAdmissibility(
  playKind: StrategyPlay['play_kind'],
  evaluation: CampaignEvaluationResponse,
  readiness: StrategyPlay['readiness_reference'] | undefined,
  frameOk: boolean,
  mechanicOk: boolean
): { admissibility: PlayAdmissibility; exclusion_reason?: string; economics: EconomicsCompleteness } {
  if (playKind === 'NON_PROMOTION') {
    return {
      admissibility: 'EXCLUDED_ECONOMICS_INCOMPLETE',
      exclusion_reason: NON_PROMOTION_DISCLOSURE,
      economics: 'DEMAND_MODELLED_COST_UNMODELLED'
    };
  }
  if (!mechanicOk) {
    return {
      admissibility: 'INADMISSIBLE_UNSTATED_MECHANIC',
      exclusion_reason: 'Promotion play lacks canvas_stated mechanic and depth (A3)',
      economics: 'COMPLETE_ON_ADMITTED_AXES'
    };
  }
  if (!evaluation.causal.reconciliation_ok) {
    return {
      admissibility: 'INADMISSIBLE_MODEL_INTEGRITY',
      exclusion_reason: 'CDI-02 reconciliation or validation failed (B1)',
      economics: 'COMPLETE_ON_ADMITTED_AXES'
    };
  }
  if (!frameOk) {
    return {
      admissibility: 'INADMISSIBLE_AMBIENT_FRAME',
      exclusion_reason: 'Ambient frame diverges from comparison-set frame (B2)',
      economics: 'COMPLETE_ON_ADMITTED_AXES'
    };
  }
  if (readiness?.state === 'DO_NOT_PROCEED' && playKind !== 'DO_NOTHING') {
    return {
      admissibility: 'INADMISSIBLE_VETOED',
      exclusion_reason: `CDI-04 veto: ${readiness.vetoes.map(v => v.veto_id).join(',') || 'DO_NOT_PROCEED'}`,
      economics: 'COMPLETE_ON_ADMITTED_AXES'
    };
  }
  if (readiness?.state === 'DO_NOT_PROCEED' && playKind === 'DO_NOTHING') {
    return {
      admissibility: 'ADMISSIBLE',
      exclusion_reason: 'Scenario 0 displayed despite readiness DO_NOT_PROCEED',
      economics: 'COMPLETE_ON_ADMITTED_AXES'
    };
  }
  return { admissibility: 'ADMISSIBLE', economics: 'COMPLETE_ON_ADMITTED_AXES' };
}

function dominanceEligible(play: StrategyPlay): boolean {
  return (
    play.admissibility === 'ADMISSIBLE' &&
    play.play_kind !== 'NON_PROMOTION' &&
    play.economics_completeness === 'COMPLETE_ON_ADMITTED_AXES'
  );
}

function normalisedValue(value: number, direction: 'MAXIMISE' | 'MINIMISE'): number {
  return direction === 'MAXIMISE' ? value : -value;
}

function dominates(
  a: StrategyPlay,
  b: StrategyPlay,
  directions: { volume: 'MAXIMISE' | 'MINIMISE'; contribution: 'MAXIMISE' | 'MINIMISE' }
): boolean {
  const aVol = a.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
  const bVol = b.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
  const aCon = a.outcomes.axes.find(x => x.axis_id === 'contribution_delta_gbp')!.value;
  const bCon = b.outcomes.axes.find(x => x.axis_id === 'contribution_delta_gbp')!.value;
  const eVol = DOMINANCE_EPSILON.attributable_volume_uplift_pp;
  const eCon = DOMINANCE_EPSILON.contribution_delta_gbp;
  const naVol = normalisedValue(aVol, directions.volume);
  const nbVol = normalisedValue(bVol, directions.volume);
  const naCon = normalisedValue(aCon, directions.contribution);
  const nbCon = normalisedValue(bCon, directions.contribution);
  return (
    naVol >= nbVol - eVol &&
    naCon >= nbCon - eCon &&
    (naVol > nbVol + eVol || naCon > nbCon + eCon)
  );
}

/**
 * R3 — a tie is exact equality of the two published axis values. Epsilon governs
 * dominance only. Epsilon-nearness is not transitive, so grouping by it produces
 * order-dependent, overlapping groups and can place a dominated play in a tied group.
 * Canonical equality is transitive, so the groups it induces are well defined.
 */
function canonicalAxisKey(p: StrategyPlay): string {
  const vol = p.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
  const con = p.outcomes.axes.find(x => x.axis_id === 'contribution_delta_gbp')!.value;
  return `${vol}|${con}`;
}

function computeDominance(
  plays: StrategyPlay[],
  directions: { volume: 'MAXIMISE' | 'MINIMISE'; contribution: 'MAXIMISE' | 'MINIMISE' }
): { dominance: DominanceRelation[]; frontier_play_ids: string[]; tied_groups: string[][] } {
  const eligible = plays.filter(dominanceEligible);
  const eligibleIds = new Set(eligible.map(p => p.play_id));

  // Raw Pareto mathematics — economic dominance among rankable plays only. A play that
  // is not assessed is marked as such, so an empty dominated_by is never misread as
  // "survived the comparison".
  const dominance: DominanceRelation[] = plays.map(p => ({
    play_id: p.play_id,
    dominated_by: [] as string[],
    participation: eligibleIds.has(p.play_id)
      ? ('ASSESSED' as const)
      : ('EXCLUDED_NOT_ASSESSED' as const),
    exclusion_basis: eligibleIds.has(p.play_id)
      ? undefined
      : p.play_kind === 'NON_PROMOTION'
        ? 'PRESENTED_NOT_RANKED — execution economics unmodelled; excluded from dominance in both directions'
        : `admissibility=${p.admissibility}`
  }));

  for (const a of eligible) {
    for (const b of eligible) {
      if (a.play_id === b.play_id) continue;
      if (dominates(a, b, directions)) {
        dominance.find(d => d.play_id === b.play_id)!.dominated_by.push(a.play_id);
      }
    }
  }
  for (const d of dominance) d.dominated_by.sort();

  const frontier_play_ids = eligible
    .filter(p => dominance.find(d => d.play_id === p.play_id)!.dominated_by.length === 0)
    .map(p => p.play_id);

  frontier_play_ids.sort((idA, idB) => {
    const a = plays.find(p => p.play_id === idA)!;
    const b = plays.find(p => p.play_id === idB)!;
    const aVol = a.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
    const bVol = b.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
    if (aVol !== bVol) return aVol - bVol;
    return idA.localeCompare(idB);
  });

  const byKey = new Map<string, string[]>();
  for (const id of frontier_play_ids) {
    const key = canonicalAxisKey(plays.find(p => p.play_id === id)!);
    byKey.set(key, [...(byKey.get(key) || []), id]);
  }
  const tied_groups = [...byKey.values()]
    .filter(g => g.length > 1)
    .map(g => [...g].sort())
    .sort((x, y) => x[0].localeCompare(y[0]));

  return { dominance, frontier_play_ids, tied_groups };
}

function buildConstraints(request: FrontierEvaluationRequest, anchor: CampaignIntent): DeclaredConstraint[] {
  const out: DeclaredConstraint[] = [];
  if (deriveCommercialObjectiveClass(anchor) === 'VALUE_CREATION') {
    // Read off the anchor's own baseline_objective. It constrains, but nobody declared it
    // for this decision, so it carries derived_from rather than a manufactured
    // declared_by, and it cannot underwrite the "Balanced" claim (R4).
    out.push({
      constraint_id: 'OBJECTIVE_CLASS_VALUE_CREATION',
      source: 'DERIVED_FROM_STATED_OBJECTIVE',
      derived_from: 'baseline_objective.primary_metric + baseline_objective.target_direction',
      kind: 'OBJECTIVE_CLASS_VALUE_CREATION',
      statement:
        'VALUE_CREATION objective: contribution must not be sacrificed (negative contribution contradicts the stated objective).',
      axis_bound: 'contribution_delta_gbp',
      bound_value: 0
    });
  }
  if (request.economic_tolerance) {
    out.push({
      constraint_id: 'MAX_CONTRIBUTION_SACRIFICE',
      source: 'HUMAN_DECLARED',
      declared_by: request.economic_tolerance.declared_by,
      kind: 'MAX_CONTRIBUTION_SACRIFICE',
      statement: `Maximum contribution sacrifice £${request.economic_tolerance.max_contribution_sacrifice_gbp} (${request.economic_tolerance.rationale})`,
      axis_bound: 'contribution_delta_gbp',
      bound_value: request.economic_tolerance.max_contribution_sacrifice_gbp
    });
  }
  if (typeof request.minimum_attributable_uplift_pp === 'number') {
    // validateFrontierRequest rejects the floor without a declarer, so this is a real
    // attribution rather than a placeholder.
    out.push({
      constraint_id: 'MINIMUM_ATTRIBUTABLE_UPLIFT',
      source: 'HUMAN_DECLARED',
      declared_by: request.minimum_attributable_uplift_declared_by,
      kind: 'MINIMUM_ATTRIBUTABLE_UPLIFT',
      statement: `Minimum attributable uplift ${request.minimum_attributable_uplift_pp} pp`,
      axis_bound: 'attributable_volume_uplift_pp',
      bound_value: request.minimum_attributable_uplift_pp
    });
  }
  return out;
}

function applySelection(
  plays: StrategyPlay[],
  frontierPlayIds: string[],
  constraints: DeclaredConstraint[]
): FrontierSelection {
  const survivors = new Set(frontierPlayIds);
  const eliminations: ConstraintElimination[] = [];
  const axisVal = (playId: string, axis: string) =>
    plays.find(x => x.play_id === playId)!.outcomes.axes.find(a => a.axis_id === axis)!.value;

  for (const c of constraints) {
    for (const id of [...survivors]) {
      const uplift = axisVal(id, 'attributable_volume_uplift_pp');
      const contrib = axisVal(id, 'contribution_delta_gbp');
      let remove = false;
      let statement = c.statement;
      if (c.kind === 'OBJECTIVE_CLASS_VALUE_CREATION' && contrib < -DOMINANCE_EPSILON.contribution_delta_gbp) {
        remove = true;
        statement = `V3a / VALUE_CREATION: contribution_delta_gbp=${contrib} contradicts stated objective`;
      }
      if (
        c.kind === 'MAX_CONTRIBUTION_SACRIFICE' &&
        typeof c.bound_value === 'number' &&
        contrib < 0 &&
        Math.abs(contrib) > c.bound_value + DOMINANCE_EPSILON.contribution_delta_gbp
      ) {
        remove = true;
        statement = `V3b / declared tolerance exceeded: headroom_gbp=${(c.bound_value + contrib).toFixed(2)}`;
      }
      if (
        c.kind === 'MINIMUM_ATTRIBUTABLE_UPLIFT' &&
        typeof c.bound_value === 'number' &&
        uplift < c.bound_value - DOMINANCE_EPSILON.attributable_volume_uplift_pp
      ) {
        remove = true;
        statement = `Below declared minimum attributable uplift (${uplift} < ${c.bound_value} pp)`;
      }
      if (remove) {
        survivors.delete(id);
        eliminations.push({
          play_id: id,
          constraint_id: c.constraint_id,
          source: c.source,
          declared_by: c.declared_by,
          derived_from: c.derived_from,
          statement
        });
      }
    }
  }

  const remaining = [...survivors];
  if (remaining.length === 0) {
    return {
      status: 'NO_ADMISSIBLE_PLAY',
      constraints_in_force: constraints,
      eliminations,
      binding_constraint_id: eliminations[eliminations.length - 1]?.constraint_id
    };
  }
  if (remaining.length > 1) {
    // Name every survivor. "More than one remains" is not an answer unless the reader can
    // see which ones and on what they differ.
    const named = remaining
      .map(id => {
        const p = plays.find(x => x.play_id === id)!;
        return `${p.label} (${axisVal(id, 'attributable_volume_uplift_pp')} pp, £${axisVal(id, 'contribution_delta_gbp')})`;
      })
      .sort();
    // The smallest additional declaration that resolves the choice: the uplift floor just
    // above the second-highest survivor leaves exactly the highest. Derived from the
    // published values, not proposed by a narrative layer.
    const byUplift = [...remaining].sort(
      (a, b) => axisVal(a, 'attributable_volume_uplift_pp') - axisVal(b, 'attributable_volume_uplift_pp')
    );
    const runnerUp = axisVal(byUplift[byUplift.length - 2], 'attributable_volume_uplift_pp');
    // The elimination predicate removes a play when `uplift < bound − ε`, so a bound must
    // clear the runner-up by more than ε to actually remove it. One ε leaves the
    // runner-up standing and the hint would not resolve anything.
    const resolvingFloor = Number(
      (runnerUp + 2 * DOMINANCE_EPSILON.attributable_volume_uplift_pp).toFixed(2)
    );
    return {
      status: 'CHOICE_REQUIRED',
      constraints_in_force: constraints,
      eliminations,
      open_trade_off:
        `${remaining.length} Pareto-efficient plays survive the declared constraints and differ only in ` +
        `volume uplift against contribution: ${named.join('; ')}. No declared constraint separates them, ` +
        'and CogniX will not pick among them.',
      resolving_constraint_hint:
        `Declaring a minimum attributable uplift of ${resolvingFloor} pp would leave exactly one; ` +
        'a maximum contribution sacrifice may be declared instead to resolve it from the contribution side.'
    };
  }

  const selected = remaining[0];
  // R4 — only genuinely human-declared constraints on opposing axes can support the
  // uniqueness claim "Balanced" makes. A derived objective class still removes plays, but
  // it is not something a human asked for in this decision.
  const human = constraints.filter(c => c.source === 'HUMAN_DECLARED');
  const opposing =
    human.some(c => c.axis_bound === 'contribution_delta_gbp') &&
    human.some(c => c.axis_bound === 'attributable_volume_uplift_pp');
  const balanced = human.length >= 2 && opposing && frontierPlayIds.includes(selected);

  return {
    status: 'SELECTED',
    selected_play_id: selected,
    selection_basis: balanced
      ? 'BALANCED_UNDER_DECLARED_CONSTRAINTS'
      : 'UNIQUELY_ADMISSIBLE_UNDER_DECLARED_CONSTRAINTS',
    constraints_in_force: constraints,
    eliminations
  };
}

function framesMatch(a: AmbientFrameStamp, b: AmbientFrameStamp): boolean {
  return (
    a.mode === b.mode &&
    Math.abs(a.ambient_uplift_pp - b.ambient_uplift_pp) < 1e-9 &&
    Math.abs(a.expected_without_intervention_index_pct - b.expected_without_intervention_index_pct) <
      1e-9
  );
}

function buildPlay(
  anchor: CampaignIntent,
  variant: CampaignIntent,
  ruleId: 'G0' | 'G1' | 'G2' | 'G3',
  playKind: StrategyPlay['play_kind'],
  label: string,
  deltas: PlayIntentDelta[],
  isAnchor: boolean,
  request: FrontierEvaluationRequest,
  directions: { volume: 'MAXIMISE' | 'MINIMISE'; contribution: 'MAXIMISE' | 'MINIMISE' },
  comparisonFrame?: AmbientFrameStamp,
  precomputed?: CampaignEvaluationResponse
): BuiltPlay {
  variant.status = 'REGISTERED';
  variant.registered_at = request.evaluation_timestamp || '2026-08-15T12:00:00.000Z';
  variant.updated_at = variant.registered_at;

  const play_id = contentPlayId(anchor.campaign_intent_id, ruleId, deltas);
  // Give the variant its own identity before evaluation so CDI-02's derived
  // counterfactual_id / causal_id identify this play rather than the anchor.
  variant.campaign_intent_id = playScopedIntentId(anchor.campaign_intent_id, play_id);

  const evaluation = precomputed || evaluateVariant(variant, request);
  const decomposition = buildDemandDecompositionFromEvaluation(evaluation);
  const readinessResult = tryReadiness(variant, evaluation, request);
  const readiness = readinessResult?.reference;
  const readinessConfidence = readinessResult?.confidence_band;
  const frame = ambientStamp(evaluation);
  const frameOk = !comparisonFrame || framesMatch(frame, comparisonFrame);
  const mechanicOk =
    playKind !== 'PROMOTION' ||
    (typeof variant.campaign_intent.provisional_mechanic === 'string' &&
      typeof variant.campaign_intent.provisional_discount_depth === 'number');

  const { admissibility, exclusion_reason, economics } = classifyAdmissibility(
    playKind,
    evaluation,
    readiness,
    frameOk,
    mechanicOk
  );

  const outcomes = buildOutcomes(evaluation, directions);

  // Floor across axis values, the decomposition and the readiness reference (§8.4), so a
  // weaker upstream input actually lowers it rather than being averaged away.
  const strengths: EvidenceStrength[] = outcomes.axes.map(a => a.strength);
  if (decomposition.excluded_drivers.length > 0) strengths.push('PLACEHOLDER_EXCLUDED');
  if (!decomposition.reconciliation.reconciliation_ok) strengths.push('MISSING');
  if (readiness) strengths.push('DECLARED_INPUT');

  const evidence_refs: ReadinessEvidenceRef[] = [
    {
      source_package: 'CDI-02',
      field_path: 'counterfactual.campaign_delta',
      value: evaluation.counterfactual.campaign_delta.attributable_uplift_pp,
      strength: 'DERIVED',
      synthetic_demo: true
    }
  ];

  const play: StrategyPlay = {
    play_id,
    label,
    play_kind: playKind,
    generator_rule_id: ruleId,
    is_anchor: isAnchor,
    intent_delta: deltas,
    evaluation_id: evaluation.evaluation_id,
    counterfactual_id: evaluation.counterfactual.counterfactual_id,
    causal_id: evaluation.causal.causal_id,
    outcomes,
    decomposition,
    ambient_frame: frame,
    admissibility,
    exclusion_reason,
    readiness_reference: readiness,
    economics_completeness: economics,
    // From CDI-04 when readiness resolved; INSUFFICIENT when it did not, rather than a
    // flattering constant.
    confidence_band: readinessConfidence ?? ('INSUFFICIENT' as ConfidenceBand),
    evidence_strength_floor: weakestEvidenceStrength(strengths),
    evidence_refs,
    synthetic_demo: true,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-06',
      ambient_frame_mode: 'SIGNALS_EXCLUDED',
      generator_rule_id: ruleId,
      ...(playKind === 'NON_PROMOTION'
        ? {
            non_promotion_required_input: NON_PROMOTION_REQUIRED_INPUT.field,
            non_promotion_disclosure: NON_PROMOTION_DISCLOSURE
          }
        : {})
    }
  };

  const check = assertNoSyntheticOutcome(play, evaluation);
  if (!check.ok) {
    throw new Error(`assertNoSyntheticOutcome failed: ${check.errors.join('; ')}`);
  }

  return { play, evaluation, intent: variant };
}

function comparisonInvariants(anchor: CampaignIntent): ComparisonSetInvariants {
  return {
    category: anchor.campaign_intent.category,
    sku_scope: [...anchor.campaign_intent.sku_scope],
    region: anchor.audience_market.region,
    customer_segment: anchor.audience_market.customer_segment || '',
    timing_mode: anchor.audience_market.timing_mode,
    planned_start: anchor.audience_market.planned_start || null,
    planned_end: anchor.audience_market.planned_end || null,
    objective_type: anchor.campaign_intent.objective_type,
    primary_metric: anchor.baseline_objective.primary_metric,
    target_direction: anchor.baseline_objective.target_direction,
    tenant_id: anchor.tenant_id,
    session_id: anchor.session_id
  };
}

function notEmitted(
  request: FrontierEvaluationRequest,
  reason: OutcomeFrontier['not_emitted_reason'],
  plays: StrategyPlay[],
  divergences: OutcomeFrontier['ambient_frame_divergences'],
  suppressed: SuppressedDuplicate[],
  invariants: ComparisonSetInvariants
): OutcomeFrontier {
  return {
    frontier_id: `frontier_${request.campaign_intent_id}_not_emitted`,
    campaign_intent_id: request.campaign_intent_id,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    frontier_status: 'NOT_EMITTED',
    not_emitted_reason: reason,
    ambient_frame_divergences: divergences,
    axes: ADMITTED_AXES.map(a => ({ ...a })),
    dominance_epsilon: { ...DOMINANCE_EPSILON },
    plays,
    frontier_play_ids: [],
    dominance: [],
    tied_groups: [],
    generation_policy: PLAY_GENERATION_POLICY,
    suppressed_duplicates: suppressed,
    comparison_invariants: invariants,
    arf_b_status: 'UNAVAILABLE',
    arf_b_unlock:
      'a shared ambient signal capability that guarantees identical counterfactual context across every play in a comparison set',
    calculation_mode: 'deterministic_demo_frontier',
    synthetic_demo: true,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-06',
      not_emitted_reason: reason || 'unknown'
    },
    timestamp: request.evaluation_timestamp || '2026-08-15T12:00:00.000Z'
  };
}

export function evaluateOutcomeFrontier(
  request: FrontierEvaluationRequest
): FrontierEvaluationResponse {
  const reqVal = validateFrontierRequest(request);
  if (!reqVal.valid) {
    throw Object.assign(new Error(reqVal.errors.join('; ')), {
      rejection_id: reqVal.rejection_id || 'RJ_VALIDATION'
    });
  }

  const anchor = getCampaignIntentById(
    request.campaign_intent_id,
    request.tenant_id,
    request.session_id
  );
  if (!anchor) {
    throw Object.assign(
      new Error(
        `CampaignIntentNotFound: ${request.campaign_intent_id} is not visible to the supplied tenant/session`
      ),
      { rejection_id: 'NOT_FOUND' }
    );
  }
  if (anchor.status !== 'REGISTERED') {
    throw Object.assign(new Error('Anchor CampaignIntent.status must be REGISTERED'), {
      rejection_id: 'RJ_ANCHOR_STATUS'
    });
  }

  const directions = axisDirections(anchor);

  // ---- Generation plan, resolved BEFORE any evaluation (R2) --------------------------
  // Each candidate is reduced to its canonical effective intent; duplicates are dropped
  // rather than evaluated, so an equivalent strategy can never appear twice, inflate the
  // frontier, or manufacture a tie that blocks a unique survivor.
  interface Candidate {
    rule_id: 'G0' | 'G1' | 'G2' | 'G3';
    kind: StrategyPlay['play_kind'];
    label: string;
    intent: CampaignIntent;
    deltas: PlayIntentDelta[];
    is_anchor: boolean;
  }

  const anchorPosture = anchor.campaign_intent.intervention_posture;

  const g0Intent = cloneIntent(anchor);
  g0Intent.campaign_intent.intervention_posture = 'CONSIDER_DO_NOTHING';
  g0Intent.campaign_intent.provisional_mechanic = undefined;
  g0Intent.campaign_intent.provisional_discount_depth = undefined;

  const g3Kind: StrategyPlay['play_kind'] =
    anchorPosture === 'CONSIDER_DO_NOTHING' || anchorPosture === 'UNDECIDED'
      ? 'DO_NOTHING'
      : anchorPosture === 'CONSIDER_NON_PROMOTION'
        ? 'NON_PROMOTION'
        : 'PROMOTION';

  const candidates: Candidate[] = [
    {
      rule_id: 'G0',
      kind: 'DO_NOTHING',
      label: 'Do Nothing',
      intent: g0Intent,
      deltas: [
        {
          field_path: 'campaign_intent.intervention_posture',
          anchor_value: anchorPosture,
          play_value: 'CONSIDER_DO_NOTHING'
        }
      ],
      is_anchor: false
    },
    {
      rule_id: 'G3',
      kind: g3Kind,
      label: 'Your Stated Plan',
      intent: cloneIntent(anchor),
      deltas: [],
      is_anchor: true
    },
    ...PLAY_GENERATION_POLICY.depth_grid_pct.map((depth): Candidate => {
      const v = cloneIntent(anchor);
      v.campaign_intent.intervention_posture = 'CONSIDER_PROMOTION';
      v.campaign_intent.provisional_mechanic = PROMO_MECHANIC;
      v.campaign_intent.provisional_discount_depth = depth;
      return {
        rule_id: 'G1',
        kind: 'PROMOTION',
        label: promotionDepthLabel(depth),
        intent: v,
        deltas: [
          {
            field_path: 'campaign_intent.intervention_posture',
            anchor_value: anchorPosture,
            play_value: 'CONSIDER_PROMOTION'
          },
          {
            field_path: 'campaign_intent.provisional_mechanic',
            anchor_value: anchor.campaign_intent.provisional_mechanic ?? null,
            play_value: PROMO_MECHANIC
          },
          {
            field_path: 'campaign_intent.provisional_discount_depth',
            anchor_value: anchor.campaign_intent.provisional_discount_depth ?? null,
            play_value: depth
          }
        ],
        is_anchor: false
      };
    }),
    (() => {
      const v = cloneIntent(anchor);
      v.campaign_intent.intervention_posture = 'CONSIDER_NON_PROMOTION';
      v.campaign_intent.provisional_mechanic = undefined;
      v.campaign_intent.provisional_discount_depth = undefined;
      return {
        rule_id: 'G2' as const,
        kind: 'NON_PROMOTION' as const,
        label: 'Non-Promotion Alternative',
        intent: v,
        deltas: [
          {
            field_path: 'campaign_intent.intervention_posture',
            anchor_value: anchorPosture,
            play_value: 'CONSIDER_NON_PROMOTION'
          }
        ],
        is_anchor: false
      };
    })()
  ];

  // Precedence: G0 is mandatory (§6.1 — exactly one Scenario 0) and always retained;
  // otherwise the user's own plan wins over a generated equivalent (R2).
  const precedence: Record<string, number> = { G0: 0, G3: 1, G1: 2, G2: 3 };
  const ordered = [...candidates].sort((a, b) => precedence[a.rule_id] - precedence[b.rule_id]);

  const retainedByIntent = new Map<string, Candidate>();
  const suppressed_duplicates: SuppressedDuplicate[] = [];
  const retained: Candidate[] = [];
  for (const cand of ordered) {
    const key = canonicalEffectiveIntent(cand.intent, request);
    const prior = retainedByIntent.get(key);
    if (prior) {
      suppressed_duplicates.push({
        suppressed_rule_id: cand.rule_id,
        retained_play_id: contentPlayId(anchor.campaign_intent_id, prior.rule_id, prior.deltas),
        retained_rule_id: prior.rule_id,
        canonical_effective_intent: key,
        reason: `${cand.rule_id} is the same campaign as ${prior.rule_id} once reduced to its effective intervention state; evaluated once and shown once.`
      });
      // The user's plan does not disappear when it coincides with Scenario 0 — the
      // retained play inherits the anchor flag and says so.
      if (cand.is_anchor) prior.is_anchor = true;
      continue;
    }
    retainedByIntent.set(key, cand);
    retained.push(cand);
  }

  const built: BuiltPlay[] = [];
  let comparisonFrame: AmbientFrameStamp | undefined;
  for (const cand of retained) {
    const bp = buildPlay(
      anchor,
      cand.intent,
      cand.rule_id,
      cand.kind,
      cand.label,
      cand.deltas,
      cand.is_anchor,
      request,
      directions,
      comparisonFrame
    );
    if (!comparisonFrame) comparisonFrame = bp.play.ambient_frame;
    built.push(bp);
    // B1 on the anchor is decisive for the whole frontier (§3.2). The anchor is
    // evaluated once, here, rather than a second time for the integrity check.
    if (cand.is_anchor && !bp.evaluation.causal.reconciliation_ok) {
      return {
        frontier: notEmitted(
          request,
          'ANCHOR_MODEL_INTEGRITY_FAILURE',
          built.map(b => b.play),
          undefined,
          suppressed_duplicates,
          comparisonInvariants(anchor)
        )
      };
    }
  }

  let plays = built.map(b => b.play);

  const invariants = comparisonInvariants(anchor);

  const frameCheck = assertAmbientFrameShared(plays, comparisonFrame);
  if (!frameCheck.ok) {
    return {
      frontier: notEmitted(
        request,
        'AMBIENT_FRAME_DIVERGENCE',
        plays,
        frameCheck.divergences,
        suppressed_duplicates,
        invariants
      )
    };
  }

  if (!assertScenarioZeroPresent({ plays } as OutcomeFrontier)) {
    return {
      frontier: notEmitted(
        request,
        'SCENARIO_ZERO_ABSENT',
        plays,
        undefined,
        suppressed_duplicates,
        invariants
      )
    };
  }

  // Non-promotion is excluded for unmodelled execution economics — but only when nothing
  // worse is already true of it. Overwriting unconditionally would relabel a genuine
  // model-integrity or unstated-mechanic failure as a mere economics gap and hide it.
  plays = plays.map(p => {
    if (p.play_kind === 'NON_PROMOTION' && p.admissibility === 'ADMISSIBLE') {
      return {
        ...p,
        admissibility: 'EXCLUDED_ECONOMICS_INCOMPLETE' as PlayAdmissibility,
        exclusion_reason: NON_PROMOTION_DISCLOSURE,
        economics_completeness: 'DEMAND_MODELLED_COST_UNMODELLED' as EconomicsCompleteness
      };
    }
    return p;
  });

  const { dominance, frontier_play_ids, tied_groups } = computeDominance(plays, directions);
  const constraints = buildConstraints(request, anchor);
  const selection = applySelection(plays, frontier_play_ids, constraints);

  const zero = plays.find(p => p.play_kind === 'DO_NOTHING' && p.generator_rule_id === 'G0')!;
  const zeroRel = dominance.find(d => d.play_id === zero.play_id)!;
  const scenario_zero: ScenarioZeroReference = {
    play_id: zero.play_id,
    dominated: zeroRel.dominated_by.length > 0,
    dominated_by: [...zeroRel.dominated_by],
    framing: SCENARIO_ZERO_FRAMING,
    axis_values: {
      attributable_volume_uplift_pp: zero.outcomes.axes.find(
        a => a.axis_id === 'attributable_volume_uplift_pp'
      )!.value,
      contribution_delta_gbp: zero.outcomes.axes.find(a => a.axis_id === 'contribution_delta_gbp')!
        .value
    }
  };

  const orderedPlays = [...plays].sort((a, b) => {
    if (a.generator_rule_id === 'G0' && b.generator_rule_id !== 'G0') return -1;
    if (b.generator_rule_id === 'G0' && a.generator_rule_id !== 'G0') return 1;
    const aVol = a.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
    const bVol = b.outcomes.axes.find(x => x.axis_id === 'attributable_volume_uplift_pp')!.value;
    if (aVol !== bVol) return aVol - bVol;
    return a.play_id.localeCompare(b.play_id);
  });

  const frontier: OutcomeFrontier = {
    frontier_id: `frontier_${anchor.campaign_intent_id}_${PLAY_GENERATION_POLICY.policy_version}`,
    campaign_intent_id: anchor.campaign_intent_id,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    frontier_status: 'EMITTED',
    ambient_frame: comparisonFrame,
    axes: ADMITTED_AXES.map(a => ({
      ...a,
      preferred_direction:
        a.axis_id === 'attributable_volume_uplift_pp' ? directions.volume : directions.contribution
    })),
    dominance_epsilon: { ...DOMINANCE_EPSILON },
    plays: orderedPlays,
    frontier_play_ids,
    dominance,
    tied_groups,
    scenario_zero,
    selection,
    generation_policy: PLAY_GENERATION_POLICY,
    suppressed_duplicates,
    comparison_invariants: invariants,
    arf_b_status: 'UNAVAILABLE',
    arf_b_unlock:
      'a shared ambient signal capability that guarantees identical counterfactual context across every play in a comparison set',
    calculation_mode: 'deterministic_demo_frontier',
    synthetic_demo: true,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-06',
      ambient_frame_mode: 'SIGNALS_EXCLUDED',
      arf_b: 'UNAVAILABLE',
      policy_version: PLAY_GENERATION_POLICY.policy_version,
      display_order: 'primary_axis_ascending_play_id_tiebreak_rendering_only_not_a_recommendation_sequence'
    },
    timestamp: request.evaluation_timestamp || '2026-08-15T12:00:00.000Z'
  };

  // Fail closed. Every one of these has an acceptance criterion behind it; a frontier
  // that trips one is not emitted in a degraded form.
  if (!assertNonPromotionNotRanked(frontier)) {
    throw new Error('Non-promotion rank creep detected');
  }
  const balanced = assertBalancedLabelLegitimate(frontier);
  if (!balanced.ok) {
    throw new Error(`Balanced label illegitimate: ${balanced.reason}`);
  }
  const fabricated = assertNoFabricatedDeclaration(frontier);
  if (!fabricated.ok) {
    throw new Error(`Fabricated constraint declaration: ${fabricated.violations.join('; ')}`);
  }
  const ties = assertTieSemantics(frontier);
  if (!ties.ok) {
    throw new Error(`Tie semantics violated: ${ties.violations.join('; ')}`);
  }
  const comparison = assertComparisonSetIntegrity(frontier);
  if (!comparison.ok) {
    throw new Error(`Comparison-set integrity violated: ${comparison.violations.join('; ')}`);
  }
  const distinct = assertPlayArtefactsDistinct(frontier);
  if (!distinct.ok) {
    throw new Error(`Play artefact binding not distinct: ${distinct.violations.join('; ')}`);
  }
  const waste = assertWasteNotInDominance(frontier);
  if (!waste.ok) {
    throw new Error(`Waste admissibility violated: ${waste.violations.join('; ')}`);
  }
  const scalars = assertNoUnauthorisedNumericScalar(frontier);
  if (!scalars.ok) {
    throw new Error(`Unauthorised numeric scalar: ${scalars.violations.join('; ')}`);
  }
  const val = validateOutcomeFrontier(frontier);
  if (!val.valid) {
    throw new Error(`Invalid OutcomeFrontier: ${val.errors.join('; ')}`);
  }

  return { frontier };
}
