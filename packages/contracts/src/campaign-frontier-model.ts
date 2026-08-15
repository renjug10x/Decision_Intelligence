/**
 * CogniX CDI-06 — Multi-Objective Outcome Frontier & Competing Strategies
 *
 * Frozen in docs/reports/COGNIX_CDI_06_OUTCOME_FRONTIER_DESIGN_GATE.md.
 * Exactly two Pareto axes. No weights, utilities, or hidden ranking.
 * ARF-A (SIGNALS_EXCLUDED) is the only emitting ambient frame.
 */

import {
  ConfidenceBand,
  EvidenceStrength,
  EVIDENCE_STRENGTH_ORDER,
  ReadinessEvidenceRef,
  ReadinessVeto,
  ReadinessCondition,
  ReadinessState,
  CommercialToleranceAssessment,
  EconomicTolerance,
  weakestEvidenceStrength
} from './campaign-readiness-model';
import {
  DemandDecomposition,
  RequiredAuthoritativeInput,
  REVENUE_REQUIRED_INPUT
} from './campaign-timeline-model';
import { CampaignEvaluationResponse } from './campaign-counterfactual-model';

export type PlayKind = 'DO_NOTHING' | 'PROMOTION' | 'NON_PROMOTION';

export type PlayAdmissibility =
  | 'ADMISSIBLE'
  | 'INADMISSIBLE_UNSTATED_MECHANIC'
  | 'INADMISSIBLE_MODEL_INTEGRITY'
  | 'INADMISSIBLE_AMBIENT_FRAME'
  | 'INADMISSIBLE_VETOED'
  | 'EXCLUDED_ECONOMICS_INCOMPLETE';

export type EconomicsCompleteness =
  | 'COMPLETE_ON_ADMITTED_AXES'
  | 'DEMAND_MODELLED_COST_UNMODELLED';

export type AmbientFrameMode = 'SIGNALS_EXCLUDED' | 'SIGNALS_SHARED';

export type AxisAvailability = 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_ADMISSIBLE_AS_AXIS';
export type AxisDirection = 'MAXIMISE' | 'MINIMISE';

export type AxisId = 'attributable_volume_uplift_pp' | 'contribution_delta_gbp';

export type SelectionStatus = 'SELECTED' | 'CHOICE_REQUIRED' | 'NO_ADMISSIBLE_PLAY';

export type SelectionBasis =
  | 'UNIQUELY_ADMISSIBLE_UNDER_DECLARED_CONSTRAINTS'
  | 'BALANCED_UNDER_DECLARED_CONSTRAINTS';

export type FrontierStatus = 'EMITTED' | 'NOT_EMITTED';

export type NotEmittedReason =
  | 'ANCHOR_MODEL_INTEGRITY_FAILURE'
  | 'AMBIENT_FRAME_DIVERGENCE'
  | 'SCENARIO_ZERO_ABSENT';

export interface PlayIntentDelta {
  field_path: string;
  anchor_value: string | number | null;
  play_value: string | number | null;
}

export interface AmbientFrameStamp {
  mode: AmbientFrameMode;
  ambient_uplift_pp: number;
  expected_without_intervention_index_pct: number;
  signal_simulation_id?: string;
}

export interface OutcomeAxisValue {
  axis_id: AxisId;
  value: number;
  source_field_path: string;
  preferred_direction: AxisDirection;
  strength: EvidenceStrength;
}

/**
 * CDI-06 capabilities unlocked by an authoritative input. Additive and local: the CDI-05
 * `RequiredAuthoritativeInput.enables` union stays a `TimelineLens` and is not widened
 * (owner addendum R1).
 */
export type FrontierCapability = 'NON_PROMOTION_RANKING' | 'AVAILABILITY_OUTCOME_AXIS';

/**
 * Structurally identical to the CDI-05 `RequiredAuthoritativeInput` — same provenance
 * semantics, same field names, same `status` — but `enables` names a CDI-06 capability
 * rather than a timeline lens. Declared locally so no upstream contract is edited.
 */
export interface FrontierRequiredAuthoritativeInput {
  field: string;
  grain: string;
  why_required: string;
  inadmissible_substitutes: string[];
  enables: FrontierCapability;
  status: 'AWAITING_AUTHORITATIVE_SOURCE';
}

export interface UnavailableOutcomeDimension {
  dimension_id: 'revenue_delta_gbp' | 'availability_delta';
  availability: 'NOT_AVAILABLE';
  /** Revenue reuses the CDI-05 constant by reference; availability uses the CDI-06 local form. */
  required_authoritative_input: RequiredAuthoritativeInput | FrontierRequiredAuthoritativeInput;
}

export interface NonAxisOutcomeAnnotation {
  dimension_id: 'waste_delta_units' | 'predicted_confidence';
  availability: 'NOT_ADMISSIBLE_AS_AXIS';
  value: number | string;
  disclosure: string;
  /**
   * `INSUFFICIENT_CAUSAL_RESOLUTION` is the authoritative basis for waste (owner addendum
   * R5): the causal model does not calibrate waste finely enough to bear a Pareto
   * trade-off. It is NOT justified by any observed value set or global inertness claim.
   */
  reason_code: 'INSUFFICIENT_CAUSAL_RESOLUTION' | 'POSTURE_DERIVED';
  admissible_when?: string;
}

export interface PlayOutcomeVector {
  axes: OutcomeAxisValue[];
  unavailable: UnavailableOutcomeDimension[];
  annotations: NonAxisOutcomeAnnotation[];
}

export interface PlayReadinessReference {
  readiness_id: string;
  state: ReadinessState;
  headline: string;
  vetoes: ReadinessVeto[];
  conditions: ReadinessCondition[];
  state_caps_applied: string[];
  commercial_tolerance: CommercialToleranceAssessment;
}

export interface StrategyPlay {
  play_id: string;
  label: string;
  play_kind: PlayKind;
  generator_rule_id: 'G0' | 'G1' | 'G2' | 'G3';
  is_anchor: boolean;
  intent_delta: PlayIntentDelta[];
  evaluation_id: string;
  counterfactual_id: string;
  causal_id: string;
  outcomes: PlayOutcomeVector;
  decomposition: DemandDecomposition;
  ambient_frame: AmbientFrameStamp;
  admissibility: PlayAdmissibility;
  exclusion_reason?: string;
  readiness_reference?: PlayReadinessReference;
  economics_completeness: EconomicsCompleteness;
  confidence_band: ConfidenceBand;
  evidence_strength_floor: EvidenceStrength;
  evidence_refs: ReadinessEvidenceRef[];
  synthetic_demo: boolean;
  provenance: Record<string, string>;
}

export interface OutcomeAxisDeclaration {
  axis_id: AxisId;
  preferred_direction: AxisDirection;
  unit: string;
  epsilon: number;
  source_field_path: string;
}

/**
 * Raw Pareto mathematics only. `dominated_by` is meaningful ONLY when
 * `participation === 'ASSESSED'`. A play excluded from the dominance computation
 * (non-promotion, readiness veto, model integrity) carries an empty `dominated_by`
 * because it was never assessed — not because it is undominated. A readiness veto is
 * not Pareto domination, and this field keeps the two readable apart.
 */
export interface DominanceRelation {
  play_id: string;
  dominated_by: string[];
  participation: 'ASSESSED' | 'EXCLUDED_NOT_ASSESSED';
  exclusion_basis?: string;
}

/**
 * `HUMAN_DECLARED` — a named person or business owner declared this bound for this
 * decision. `DERIVED_FROM_STATED_OBJECTIVE` — read off the anchor's own
 * `baseline_objective`; it constrains, but nobody declared it here, so it carries
 * `derived_from` instead of `declared_by` and never counts toward the "Balanced"
 * uniqueness claim (owner addendum R4).
 */
export type ConstraintSource = 'HUMAN_DECLARED' | 'DERIVED_FROM_STATED_OBJECTIVE';

export interface DeclaredConstraint {
  constraint_id: string;
  source: ConstraintSource;
  /** Present only for HUMAN_DECLARED constraints. Never fabricated. */
  declared_by?: string;
  /** Present only for DERIVED_FROM_STATED_OBJECTIVE constraints — the field it was read from. */
  derived_from?: string;
  kind:
    | 'MAX_CONTRIBUTION_SACRIFICE'
    | 'OBJECTIVE_CLASS_VALUE_CREATION'
    | 'MINIMUM_ATTRIBUTABLE_UPLIFT';
  statement: string;
  /** Bound value when applicable (gbp or pp). */
  bound_value?: number;
  axis_bound?: 'contribution_delta_gbp' | 'attributable_volume_uplift_pp';
}

export interface ConstraintElimination {
  play_id: string;
  constraint_id: string;
  source: ConstraintSource;
  /** Attribution mirrors the constraint: declared_by for human, derived_from otherwise. */
  declared_by?: string;
  derived_from?: string;
  statement: string;
}

/** A generated play suppressed before evaluation because it duplicates a retained play (R2). */
export interface SuppressedDuplicate {
  suppressed_rule_id: 'G0' | 'G1' | 'G2' | 'G3';
  retained_play_id: string;
  retained_rule_id: 'G0' | 'G1' | 'G2' | 'G3';
  canonical_effective_intent: string;
  reason: string;
}

/** Fields frozen from the anchor across the whole comparison set (R6, gate §2.2). */
export interface ComparisonSetInvariants {
  category: string;
  sku_scope: string[];
  region: string;
  customer_segment: string;
  timing_mode: string;
  planned_start: string | null;
  planned_end: string | null;
  objective_type: string;
  primary_metric: string;
  target_direction: string;
  tenant_id: string;
  session_id: string;
}

/** Field paths a play delta is permitted to touch (gate §2.2). Closed set. */
export const MUTABLE_PLAY_DELTA_FIELDS: readonly string[] = [
  'campaign_intent.intervention_posture',
  'campaign_intent.provisional_mechanic',
  'campaign_intent.provisional_discount_depth',
  'resolved_temporal_uplift_pp',
  'opportunity_window_id'
];

export interface FrontierSelection {
  status: SelectionStatus;
  selected_play_id?: string;
  selection_basis?: SelectionBasis;
  constraints_in_force: DeclaredConstraint[];
  eliminations: ConstraintElimination[];
  open_trade_off?: string;
  resolving_constraint_hint?: string;
  binding_constraint_id?: string;
}

export interface PlayGenerationRule {
  rule_id: 'G0' | 'G1' | 'G2' | 'G3';
  play_kind: PlayKind;
  description: string;
  mandatory: boolean;
}

export interface PlayGenerationPolicy {
  policy_id: string;
  policy_version: string;
  provenance: 'synthetic_demonstration_policy';
  synthetic_demo: true;
  rules: PlayGenerationRule[];
  depth_grid_pct: number[];
  calibration_target: string;
}

export interface ScenarioZeroReference {
  play_id: string;
  dominated: boolean;
  dominated_by: string[];
  framing: string;
  axis_values: { attributable_volume_uplift_pp: number; contribution_delta_gbp: number };
}

export interface AmbientFrameDivergenceReport {
  play_id: string;
  ambient_uplift_pp: number;
  expected_without_intervention_index_pct: number;
}

export interface OutcomeFrontier {
  frontier_id: string;
  campaign_intent_id: string;
  tenant_id: string;
  session_id: string;
  frontier_status: FrontierStatus;
  not_emitted_reason?: NotEmittedReason;
  ambient_frame_divergences?: AmbientFrameDivergenceReport[];
  ambient_frame?: AmbientFrameStamp;
  axes: OutcomeAxisDeclaration[];
  dominance_epsilon: Record<string, number>;
  plays: StrategyPlay[];
  frontier_play_ids: string[];
  dominance: DominanceRelation[];
  tied_groups: string[][];
  scenario_zero?: ScenarioZeroReference;
  selection?: FrontierSelection;
  generation_policy: PlayGenerationPolicy;
  /** R2 — duplicates removed before evaluation, published so the omission is auditable. */
  suppressed_duplicates: SuppressedDuplicate[];
  /** R6 — the frozen comparison inputs every play shares. */
  comparison_invariants: ComparisonSetInvariants;
  arf_b_status: 'UNAVAILABLE';
  arf_b_unlock: string;
  calculation_mode: 'deterministic_demo_frontier';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
}

export interface FrontierEvaluationRequest {
  tenant_id: string;
  session_id: string;
  campaign_intent_id: string;
  /** Caller-supplied for deterministic readiness scoring. */
  evaluation_timestamp?: string;
  economic_tolerance?: EconomicTolerance;
  /** CDI-06 local declared floor; requires declared_by. */
  minimum_attributable_uplift_pp?: number;
  minimum_attributable_uplift_declared_by?: string;
  /** Optional CDI-03 temporal hook applied uniformly to all plays. */
  resolved_temporal_uplift_pp?: number;
  opportunity_window_id?: string;
  /** Forbidden — RJ-G1. */
  play_grid_override?: unknown;
  depth_grid_override?: unknown;
  policy_overrides?: unknown;
}

export interface FrontierEvaluationResponse {
  frontier: OutcomeFrontier;
}

export const DOMINANCE_EPSILON: Record<AxisId, number> = {
  attributable_volume_uplift_pp: 0.01,
  contribution_delta_gbp: 0.01
};

/**
 * Owner addendum R5. The basis is the causal model's resolution, not any observed value
 * set: waste is not calibrated finely enough across intervention depths to carry a
 * Pareto trade-off, so admitting it as an axis would imply a trade-off the model does
 * not support. Nothing here rests on waste taking particular values.
 */
export const WASTE_ANNOTATION_DISCLOSURE =
  'Waste is reported from the CDI-02 trajectory. The causal model does not resolve waste finely ' +
  'enough across intervention depths to support a Pareto trade-off, so it is disclosed rather than ' +
  'optimised, and is not used to determine frontier membership.';

export const WASTE_ADMISSIBLE_WHEN =
  'the causal waste model gains depth-resolved calibration sufficient for trade-off optimisation';

export const SCENARIO_ZERO_FRAMING =
  'Do Nothing means no intervention. It does not mean no change — ambient demand movement continues either way, and is shown here.';

export const NON_PROMOTION_DISCLOSURE =
  "This alternative's demand response is modelled. Its execution cost is not. Its contribution is " +
  'therefore incomplete in its own favour, and it is shown for comparison rather than ranked against ' +
  'the promotion strategies.';

export const NON_PROMOTION_REQUIRED_INPUT: FrontierRequiredAuthoritativeInput = {
  field: 'intervention_execution_cost_gbp',
  grain: 'per intervention per campaign period, fully loaded',
  why_required:
    'a non-promotion lever earns uplift with no modelled cost, so its contribution delta is ' +
    'incomplete in a direction that flatters it; without this term it cannot be ranked against ' +
    'promotion plays that do carry contribution erosion and portfolio drag',
  inadmissible_substitutes: [
    'assuming zero execution cost',
    'reusing promotional contribution erosion as a proxy',
    'any default or assumed cost rate'
  ],
  enables: 'NON_PROMOTION_RANKING',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};

export const AVAILABILITY_REQUIRED_INPUT: FrontierRequiredAuthoritativeInput = {
  field: 'availability_or_service_level_quantity',
  grain: 'per SKU per period on the CDI-02 trajectory',
  why_required:
    'no availability or service-level quantity exists on the CDI-02 trajectory; OperationalFeasibility.commitment_gap_units is a capacity quantity, not an outcome, and does not discriminate across plays',
  inadmissible_substitutes: [
    'OperationalFeasibility.commitment_gap_units',
    'assumed fill rate',
    'inventory cover days as a proxy for availability'
  ],
  enables: 'AVAILABILITY_OUTCOME_AXIS',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};

/** Declared build-time depth grid (U5 open constants; shape frozen). Spans contribution breakeven. */
export const DEFAULT_DEPTH_GRID_PCT = [5, 10, 15, 20, 30] as const;

export const PLAY_GENERATION_POLICY: PlayGenerationPolicy = {
  policy_id: 'cdi06_play_generation_v1',
  policy_version: '1.0.0',
  provenance: 'synthetic_demonstration_policy',
  synthetic_demo: true,
  depth_grid_pct: [...DEFAULT_DEPTH_GRID_PCT],
  calibration_target:
    'Depth grid spans both sides of the contribution breakeven (~13–15%) so the frontier shows a real trade-off',
  rules: [
    {
      rule_id: 'G0',
      play_kind: 'DO_NOTHING',
      description: 'Scenario 0 — Do Nothing (mandatory)',
      mandatory: true
    },
    {
      rule_id: 'G1',
      play_kind: 'PROMOTION',
      description: 'Promotion plays across the declared depth grid',
      mandatory: true
    },
    {
      rule_id: 'G2',
      play_kind: 'NON_PROMOTION',
      description: 'Non-promotion alternative (PRESENTED_NOT_RANKED)',
      mandatory: true
    },
    {
      rule_id: 'G3',
      play_kind: 'PROMOTION',
      description: "Anchor as stated — the user's own plan",
      mandatory: true
    }
  ]
};

export const ADMITTED_AXES: OutcomeAxisDeclaration[] = [
  {
    axis_id: 'attributable_volume_uplift_pp',
    preferred_direction: 'MAXIMISE',
    unit: 'pp',
    epsilon: DOMINANCE_EPSILON.attributable_volume_uplift_pp,
    source_field_path: 'counterfactual.campaign_delta.attributable_uplift_pp'
  },
  {
    axis_id: 'contribution_delta_gbp',
    preferred_direction: 'MAXIMISE',
    unit: 'gbp',
    epsilon: DOMINANCE_EPSILON.contribution_delta_gbp,
    source_field_path: 'counterfactual.campaign_delta.contribution_delta_gbp'
  }
];

export const CONTROLLED_PLAY_LABELS = [
  'Do Nothing',
  'Your Stated Plan',
  'Shallow Depth Promotion',
  'Moderate Depth Promotion',
  'Deep Discount Promotion',
  'Non-Promotion Alternative'
] as const;

const HIDDEN_AGGREGATE_RE =
  /^(score|weight|composite|utility|ranking|rank_index|priority_value)$/i;
const SYNTHETIC_OUTCOME_RE =
  /^(interpolat\w*|derived_from_plays|between_plays|fitted|smoothed|projected_play)$/i;
const PROHIBITED_RANK_LANGUAGE_RE =
  /\boptimal\b|\bbest\b|\brecommended\b|\bwinner\b|\btop choice\b|\bideal\b|\bsweet spot\b/i;

/**
 * Numeric key paths permitted on a StrategyPlay (R7). Anything numeric outside this set
 * is an unauthorised scalar: it could order plays, and a denylist of suggestive names
 * would not catch it. Every entry here is evidence carried from an upstream package, and
 * none participates in dominance — `assertWasteNotInDominance` and the dominance
 * recomputation tests are what hold that second claim up.
 */
export const ALLOWED_PLAY_NUMERIC_PATHS: readonly string[] = [
  'play.outcomes.axes[].value',
  'play.outcomes.annotations[].value',
  'play.decomposition.ambient_group.subtotal_pp',
  'play.decomposition.ambient_group.rows[].contribution_pp',
  'play.decomposition.intervention_group.subtotal_pp',
  'play.decomposition.intervention_group.rows[].contribution_pp',
  'play.decomposition.reconciliation.reconciled_sum_pp',
  'play.decomposition.residual_row.contribution_pp',
  'play.decomposition.excluded_drivers[].contribution_pp',
  'play.ambient_frame.ambient_uplift_pp',
  'play.ambient_frame.expected_without_intervention_index_pct',
  'play.evidence_refs[].value',
  'play.intent_delta[].play_value',
  'play.intent_delta[].anchor_value',
  'play.readiness_reference.commercial_tolerance.contribution_delta_gbp',
  'play.readiness_reference.commercial_tolerance.headroom_gbp',
  'play.readiness_reference.commercial_tolerance.tolerance.max_contribution_sacrifice_gbp',
  'play.readiness_reference.vetoes[].triggering_value',
  'play.readiness_reference.conditions[].triggering_value'
];

export function numericPathsOf(obj: unknown, root: string): string[] {
  const found: string[] = [];
  const walk = (o: unknown, path: string): void => {
    if (o === null || o === undefined) return;
    if (typeof o === 'number') {
      found.push(path);
      return;
    }
    if (Array.isArray(o)) {
      for (const v of o) walk(v, `${path}[]`);
      return;
    }
    if (typeof o === 'object') {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(obj, root);
  return [...new Set(found)];
}

/**
 * R7 — allowlist, not denylist. Any numeric leaf on a play outside
 * `ALLOWED_PLAY_NUMERIC_PATHS` is reported, whatever it is called.
 */
export function assertNoUnauthorisedNumericScalar(
  frontier: OutcomeFrontier
): { ok: boolean; violations: string[] } {
  const allowed = new Set(ALLOWED_PLAY_NUMERIC_PATHS);
  const violations: string[] = [];
  for (const play of frontier.plays) {
    for (const p of numericPathsOf(play, 'play')) {
      if (!allowed.has(p)) violations.push(`${play.play_id}: ${p}`);
    }
  }
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}

function collectKeys(obj: unknown, out: string[] = []): string[] {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) collectKeys(item, out);
    } else {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out.push(k);
        collectKeys(v, out);
      }
    }
  }
  return out;
}

export function validateFrontierRequest(
  r: Partial<FrontierEvaluationRequest>
): { valid: boolean; errors: string[]; rejection_id?: string } {
  const errors: string[] = [];
  if (!r.tenant_id) errors.push('tenant_id is required');
  if (!r.session_id) errors.push('session_id is required');
  if (!r.campaign_intent_id) errors.push('campaign_intent_id is required');
  if (
    r.play_grid_override !== undefined ||
    r.depth_grid_override !== undefined ||
    r.policy_overrides !== undefined
  ) {
    return {
      valid: false,
      errors: ['RJ-G1: play_grid_override / depth_grid_override / policy_overrides are forbidden'],
      rejection_id: 'RJ-G1'
    };
  }
  if (
    typeof r.minimum_attributable_uplift_pp === 'number' &&
    !r.minimum_attributable_uplift_declared_by
  ) {
    errors.push('minimum_attributable_uplift_pp requires minimum_attributable_uplift_declared_by');
  }
  return { valid: errors.length === 0, errors };
}

export function validateOutcomeFrontier(
  frontier: OutcomeFrontier
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const keys = collectKeys(frontier);
  const raw = JSON.stringify(frontier);

  if (keys.some(k => HIDDEN_AGGREGATE_RE.test(k))) {
    errors.push('Hidden aggregate / ranking vocabulary present in payload keys');
  }
  if (keys.some(k => SYNTHETIC_OUTCOME_RE.test(k))) {
    errors.push('Interpolation / synthesised-outcome vocabulary present in payload keys');
  }
  if (PROHIBITED_RANK_LANGUAGE_RE.test(raw)) {
    errors.push('Prohibited ranking language present in payload');
  }

  if (frontier.frontier_status === 'EMITTED') {
    const zeros = frontier.plays.filter(p => p.play_kind === 'DO_NOTHING');
    if (zeros.length === 0) {
      errors.push('Scenario 0 absent from emitted frontier');
    }
    if (zeros.length > 1) {
      // §6.1 — exactly one. A second Do Nothing splits Scenario 0's identity and can
      // manufacture a tie that blocks a unique survivor.
      errors.push(`Exactly one DO_NOTHING play required; found ${zeros.length}`);
    }
    if (frontier.axes.length !== 2) {
      errors.push('Emitted frontier must declare exactly two admitted axes');
    }
    for (const play of frontier.plays) {
      if (!play.evaluation_id || !play.counterfactual_id || !play.causal_id) {
        errors.push(`Play ${play.play_id} missing evaluation binding`);
      }
      if (play.outcomes.axes.length !== 2) {
        errors.push(`Play ${play.play_id} must carry exactly two axis values`);
      }
      if (!play.synthetic_demo) {
        errors.push(`Play ${play.play_id} must carry synthetic_demo=true`);
      }
    }
    if (/\bbalanced\b/i.test(raw)) {
      const sel = frontier.selection;
      if (
        !sel ||
        sel.selection_basis !== 'BALANCED_UNDER_DECLARED_CONSTRAINTS' ||
        !sel.selected_play_id
      ) {
        errors.push('balanced appears without BALANCED_UNDER_DECLARED_CONSTRAINTS selection');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertAmbientFrameShared(
  plays: StrategyPlay[],
  expected?: AmbientFrameStamp
): { ok: boolean; divergences: AmbientFrameDivergenceReport[] } {
  if (plays.length === 0) return { ok: false, divergences: [] };
  const ref = expected || plays[0].ambient_frame;
  const divergences: AmbientFrameDivergenceReport[] = [];
  for (const p of plays) {
    if (
      Math.abs(p.ambient_frame.ambient_uplift_pp - ref.ambient_uplift_pp) > 1e-9 ||
      Math.abs(
        p.ambient_frame.expected_without_intervention_index_pct -
          ref.expected_without_intervention_index_pct
      ) > 1e-9 ||
      p.ambient_frame.mode !== ref.mode
    ) {
      divergences.push({
        play_id: p.play_id,
        ambient_uplift_pp: p.ambient_frame.ambient_uplift_pp,
        expected_without_intervention_index_pct:
          p.ambient_frame.expected_without_intervention_index_pct
      });
    }
  }
  return { ok: divergences.length === 0, divergences };
}

export function assertNoSyntheticOutcome(
  play: StrategyPlay,
  evaluation: CampaignEvaluationResponse
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const uplift = evaluation.counterfactual.campaign_delta.attributable_uplift_pp;
  const contrib = evaluation.counterfactual.campaign_delta.contribution_delta_gbp;
  const a0 = play.outcomes.axes.find(a => a.axis_id === 'attributable_volume_uplift_pp');
  const a1 = play.outcomes.axes.find(a => a.axis_id === 'contribution_delta_gbp');
  if (!a0 || a0.value !== uplift) {
    errors.push(`attributable_volume_uplift_pp ${a0?.value} !== evaluation ${uplift}`);
  }
  if (!a1 || a1.value !== contrib) {
    errors.push(`contribution_delta_gbp ${a1?.value} !== evaluation ${contrib}`);
  }
  if (play.evaluation_id !== evaluation.evaluation_id) {
    errors.push('evaluation_id mismatch');
  }
  if (play.counterfactual_id !== evaluation.counterfactual.counterfactual_id) {
    errors.push('counterfactual_id mismatch');
  }
  if (play.causal_id !== evaluation.causal.causal_id) {
    errors.push('causal_id mismatch');
  }
  return { ok: errors.length === 0, errors };
}

export function assertNoHiddenAggregate(frontier: OutcomeFrontier): boolean {
  return !collectKeys(frontier).some(k => HIDDEN_AGGREGATE_RE.test(k));
}

export function assertScenarioZeroPresent(frontier: OutcomeFrontier): boolean {
  return frontier.plays.some(p => p.play_kind === 'DO_NOTHING');
}

export function assertDominatedScenarioZeroStillShown(frontier: OutcomeFrontier): boolean {
  const z = frontier.plays.find(p => p.play_kind === 'DO_NOTHING');
  if (!z) return false;
  const rel = frontier.dominance.find(d => d.play_id === z.play_id);
  if (!rel) return false;
  if (rel.dominated_by.length === 0) return true; // not dominated — still shown
  return (
    frontier.plays.some(p => p.play_id === z.play_id) &&
    !frontier.frontier_play_ids.includes(z.play_id) &&
    Boolean(frontier.scenario_zero)
  );
}

export function assertNonPromotionNotRanked(frontier: OutcomeFrontier): boolean {
  const nps = frontier.plays.filter(p => p.play_kind === 'NON_PROMOTION');
  if (nps.length === 0) return true;
  for (const np of nps) {
    if (np.admissibility !== 'EXCLUDED_ECONOMICS_INCOMPLETE') return false;
    if (frontier.frontier_play_ids.includes(np.play_id)) return false;
    if (frontier.selection?.selected_play_id === np.play_id) return false;
    // Excluded in both directions, and absent from tied groups — a tie is a dominance
    // statement too, and a play outside the computation may not make one.
    if (frontier.tied_groups.some(g => g.includes(np.play_id))) return false;
    for (const d of frontier.dominance) {
      if (d.play_id === np.play_id && d.dominated_by.length > 0) return false;
      if (d.dominated_by.includes(np.play_id)) return false;
    }
  }
  return true;
}

export function assertReadinessDidNotRewriteEconomics(
  play: StrategyPlay,
  evaluation: CampaignEvaluationResponse
): boolean {
  return assertNoSyntheticOutcome(play, evaluation).ok;
}

export function assertSelectionRefusesWhenAmbiguous(selection: FrontierSelection): boolean {
  if (selection.status !== 'SELECTED') {
    // No survivor named, and no basis asserted, when CogniX has not selected.
    return !selection.selected_play_id && !selection.selection_basis;
  }
  return Boolean(selection.selected_play_id);
}

/**
 * R4 — only genuinely human-declared constraints count toward the uniqueness claim.
 * A `DERIVED_FROM_STATED_OBJECTIVE` constraint still removes plays and still appears in
 * `constraints_in_force`; it simply cannot be one of the two opposing declarations that
 * make "Balanced" a statement about what a human asked for.
 */
export function assertBalancedLabelLegitimate(
  frontier: OutcomeFrontier
): { ok: boolean; reason?: string } {
  const sel = frontier.selection;
  if (!sel || sel.selection_basis !== 'BALANCED_UNDER_DECLARED_CONSTRAINTS') {
    return { ok: true };
  }
  if (sel.status !== 'SELECTED' || !sel.selected_play_id) {
    return { ok: false, reason: 'Balanced requires SELECTED unique survivor' };
  }
  if (!frontier.frontier_play_ids.includes(sel.selected_play_id)) {
    return { ok: false, reason: 'Balanced survivor must be Pareto-efficient' };
  }
  const human = (sel.constraints_in_force || []).filter(c => c.source === 'HUMAN_DECLARED');
  if (human.some(c => !c.declared_by)) {
    return { ok: false, reason: 'HUMAN_DECLARED constraint without declared_by' };
  }
  if (human.length < 2) {
    return {
      ok: false,
      reason: `Balanced requires at least two HUMAN_DECLARED constraints; found ${human.length}`
    };
  }
  const axes = new Set(human.map(c => c.axis_bound).filter(Boolean));
  if (!axes.has('contribution_delta_gbp') || !axes.has('attributable_volume_uplift_pp')) {
    return { ok: false, reason: 'Balanced requires human-declared constraints on opposing axes' };
  }
  return { ok: true };
}

/** R4 — a derived constraint must never carry a fabricated human attribution. */
export function assertNoFabricatedDeclaration(
  frontier: OutcomeFrontier
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const c of frontier.selection?.constraints_in_force || []) {
    if (c.source === 'DERIVED_FROM_STATED_OBJECTIVE' && c.declared_by) {
      violations.push(`${c.constraint_id} is derived but carries declared_by="${c.declared_by}"`);
    }
    if (c.source === 'HUMAN_DECLARED' && !c.declared_by) {
      violations.push(`${c.constraint_id} is human-declared but carries no declared_by`);
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * R3 — a tie is canonical equality of the two published axis values, never transitive
 * epsilon-nearness. Groups must be disjoint, and no tied pair may stand in a dominance
 * relation.
 */
export function assertTieSemantics(
  frontier: OutcomeFrontier
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const byId = new Map(frontier.plays.map(p => [p.play_id, p]));
  const seen = new Set<string>();
  const axisOf = (id: string, axis: AxisId): number | undefined =>
    byId.get(id)?.outcomes.axes.find(a => a.axis_id === axis)?.value;

  for (const group of frontier.tied_groups) {
    if (group.length < 2) violations.push(`tied_group with fewer than two members: ${group}`);
    for (const id of group) {
      if (seen.has(id)) violations.push(`play ${id} appears in more than one tied_group`);
      seen.add(id);
    }
    const [head, ...rest] = group;
    for (const other of rest) {
      if (
        axisOf(head, 'attributable_volume_uplift_pp') !==
          axisOf(other, 'attributable_volume_uplift_pp') ||
        axisOf(head, 'contribution_delta_gbp') !== axisOf(other, 'contribution_delta_gbp')
      ) {
        violations.push(`tied_group members ${head} and ${other} are not exactly equal on both axes`);
      }
    }
    for (const a of group) {
      for (const b of group) {
        if (a === b) continue;
        const rel = frontier.dominance.find(d => d.play_id === a);
        if (rel?.dominated_by.includes(b)) {
          violations.push(`${a} is both tied with and dominated by ${b}`);
        }
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * R6 — ambient-frame equality is necessary but not sufficient. Every play must confine
 * its delta to the declared mutable set, and every comparison input outside that set
 * must be identical across the comparison set.
 */
export function assertComparisonSetIntegrity(
  frontier: OutcomeFrontier
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const mutable = new Set(MUTABLE_PLAY_DELTA_FIELDS);
  for (const play of frontier.plays) {
    for (const d of play.intent_delta) {
      if (!mutable.has(d.field_path)) {
        violations.push(`${play.play_id} mutates non-mutable field ${d.field_path}`);
      }
    }
  }
  const inv = frontier.comparison_invariants;
  if (!inv) {
    violations.push('comparison_invariants absent — mutation set cannot be reconstructed');
  } else {
    if (inv.tenant_id !== frontier.tenant_id) violations.push('comparison_invariants tenant mismatch');
    if (inv.session_id !== frontier.session_id) violations.push('comparison_invariants session mismatch');
  }
  return { ok: violations.length === 0, violations };
}

/** Every play's artefact ids must identify that play, not merely the anchor. */
export function assertPlayArtefactsDistinct(
  frontier: OutcomeFrontier
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const seenCf = new Map<string, string>();
  const seenCausal = new Map<string, string>();
  for (const p of frontier.plays) {
    const priorCf = seenCf.get(p.counterfactual_id);
    if (priorCf) violations.push(`${p.play_id} shares counterfactual_id with ${priorCf}`);
    seenCf.set(p.counterfactual_id, p.play_id);
    const priorCausal = seenCausal.get(p.causal_id);
    if (priorCausal) violations.push(`${p.play_id} shares causal_id with ${priorCausal}`);
    seenCausal.set(p.causal_id, p.play_id);
  }
  return { ok: violations.length === 0, violations };
}

/** Waste is disclosed, never optimised: it may not appear as an admitted axis (R5). */
export function assertWasteNotInDominance(
  frontier: OutcomeFrontier
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (frontier.axes.some(a => String(a.axis_id).includes('waste'))) {
    violations.push('waste declared as an admitted axis');
  }
  for (const p of frontier.plays) {
    if (p.outcomes.axes.some(a => String(a.axis_id).includes('waste'))) {
      violations.push(`${p.play_id} carries waste as an axis value`);
    }
    const ann = p.outcomes.annotations.find(a => a.dimension_id === 'waste_delta_units');
    if (!ann) violations.push(`${p.play_id} missing waste annotation`);
    else if (ann.reason_code !== 'INSUFFICIENT_CAUSAL_RESOLUTION') {
      violations.push(`${p.play_id} waste reason_code is ${ann.reason_code}, not INSUFFICIENT_CAUSAL_RESOLUTION`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function promotionDepthLabel(depth: number): string {
  if (depth <= 10) return 'Shallow Depth Promotion';
  if (depth <= 15) return 'Moderate Depth Promotion';
  return 'Deep Discount Promotion';
}

export { REVENUE_REQUIRED_INPUT, weakestEvidenceStrength, EVIDENCE_STRENGTH_ORDER };
