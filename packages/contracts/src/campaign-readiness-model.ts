/**
 * CogniX Campaign Decision Intelligence — Decision Readiness & Resilience (CDI-04)
 *
 * Six-dimension non-compensatory readiness lattice. Aggregation is a floor, never a sum.
 * Thresholds are synthetic demonstration policy and can never fire a veto.
 * Contract frozen in docs/reports/COGNIX_CDI_04_DECISION_READINESS_DESIGN_GATE.md §6.
 */

import { CampaignObjectiveType, CampaignIntent } from './campaign-intent-model';
import { CampaignEvaluationResponse } from './campaign-counterfactual-model';
import { OpportunityDiscoveryResponse } from './campaign-opportunity-model';
import { DecisionScenarioParameters, calculateDerivedImpacts } from './decision-state-model';

export type ReadinessDimensionId =
  | 'COMMERCIAL'
  | 'DEMAND'
  | 'OPERATIONAL'
  | 'CONTEXT'
  | 'CUSTOMER'
  | 'STRATEGIC';

export type DimensionState =
  | 'CLEAR'
  | 'WATCH'
  | 'CONSTRAINED'
  | 'BLOCKING'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NOT_EVALUATED';

export type ReadinessState = 'GO' | 'CONDITIONAL_GO' | 'REVIEW' | 'DO_NOT_PROCEED';

export type EvidenceStrength =
  | 'OBSERVED'
  | 'DERIVED'
  | 'DERIVED_KNOWN_DISCONTINUITY'
  | 'DECLARED_INPUT'
  | 'SEEDED_ASSUMPTION'
  | 'PROXY'
  | 'PLACEHOLDER_EXCLUDED'
  | 'MISSING';

/** Fixed ordering, strongest first. Exported so "weakest strength" is never ambiguous. */
export const EVIDENCE_STRENGTH_ORDER: EvidenceStrength[] = [
  'OBSERVED',
  'DERIVED',
  'DERIVED_KNOWN_DISCONTINUITY',
  'DECLARED_INPUT',
  'SEEDED_ASSUMPTION',
  'PROXY',
  'PLACEHOLDER_EXCLUDED',
  'MISSING'
];

export type CommercialObjectiveClass = 'VALUE_CREATION' | 'VALUE_TRADE' | 'UNCLASSIFIED';

export interface EconomicTolerance {
  max_contribution_sacrifice_gbp: number;
  rationale: string;
  declared_by: string;
  objective_basis: CampaignObjectiveType;
}

export interface CommercialToleranceAssessment {
  objective_class: CommercialObjectiveClass;
  contribution_delta_gbp: number;
  tolerance_declared: boolean;
  tolerance?: EconomicTolerance;
  headroom_gbp?: number;
  within_tolerance?: boolean;
}

export type ThresholdCalibrationStatus = 'UNCALIBRATED_LAB_DEFAULT' | 'CALIBRATED';

export interface ReadinessThreshold {
  threshold_id: string;
  applies_to: ReadinessDimensionId;
  rule_ids: string[];
  value: number;
  unit: string;
  effect_ceiling: 'WATCH' | 'CONSTRAINED';
  basis: string;
  calibration_status: ThresholdCalibrationStatus;
  calibration_target: string;
}

export interface ReadinessThresholdPolicy {
  policy_id: string;
  policy_version: string;
  provenance: 'synthetic_demonstration_policy';
  synthetic_demo: true;
  thresholds: ReadinessThreshold[];
}

/** Read-only mirror of WP10-C recovery levers; parity-guarded against decision-state-model.ts. */
export interface RecoveryLever {
  intervention_id: string;
  headroom_units: number;
  applied: boolean;
  source: 'wp10c_calculate_derived_impacts';
}

/** WP10-C lever headrooms mirrored from decision-state-model.ts calculateDerivedImpacts. */
export const WP10C_RECOVERY_LEVER_HEADROOM: Readonly<Record<string, number>> = {
  SLA_FLEX_RULE_4: 1200,
  BUFFER_OPTIMISATION_R002: 500
};

export interface OperationalFeasibility {
  commitment_gap_units: number;
  recovery_levers: RecoveryLever[];
  recoverable_headroom_units: number;
  structurally_infeasible: boolean;
  closing_levers: string[];
}

export type ConfidenceBand = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';

export type FindingSeverity = 'INFO' | 'WATCH' | 'CONSTRAINT' | 'VETO';

export interface ReadinessEvidenceRef {
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-03' | 'WP10-A' | 'WP10-C' | 'ESF-1' | 'ESF-2';
  field_path: string;
  value: string | number | boolean;
  strength: EvidenceStrength;
  synthetic_demo: boolean;
  disclosure?: string;
}

export interface ReadinessFinding {
  finding_id: string;
  rule_id: string;
  dimension: ReadinessDimensionId;
  severity: FindingSeverity;
  statement: string;
  decisive: boolean;
  evidence: ReadinessEvidenceRef[];
}

export interface DimensionAssessment {
  dimension: ReadinessDimensionId;
  state: DimensionState;
  evidence_strength_floor: EvidenceStrength;
  findings: ReadinessFinding[];
  required_inputs_present: string[];
  missing_inputs: string[];
  not_evaluated_reason?: string;
}

export interface ReadinessCondition {
  condition_id: string;
  dimension: ReadinessDimensionId;
  statement: string;
  discharge_test: string;
  evidence_gap: string;
  blocking_if_unmet: 'REVIEW' | 'DO_NOT_PROCEED';
}

export interface ReadinessVeto {
  veto_id: 'V1' | 'V2' | 'V3a' | 'V3b' | 'V4' | 'V5';
  dimension: ReadinessDimensionId;
  statement: string;
  triggering_field: string;
  triggering_value: string | number | boolean;
  veto_basis:
    | 'CONTRACT_INTEGRITY'
    | 'STATED_OBJECTIVE_CONTRADICTION'
    | 'DECLARED_TOLERANCE_EXCEEDED'
    | 'OPERATIONAL_INFEASIBILITY'
    | 'NO_ADDRESSABLE_ESTATE';
}

export interface ReadinessChangeTrigger {
  dimension: ReadinessDimensionId;
  field_path: string;
  current_value: string | number;
  threshold: string | number;
  direction: 'INCREASE' | 'DECREASE' | 'BECOMES_TRUE' | 'BECOMES_FALSE';
  would_change_dimension_to: DimensionState;
  would_change_state_to: ReadinessState;
  threshold_id?: string;
}

export interface ResilienceEvidenceRef {
  order: 1 | 2 | 3;
  field_path: string;
  value: number;
  unit: string;
  source: 'wp10c_derived_impacts';
}

export interface ReadinessConfidence {
  band: ConfidenceBand;
  evidence_coverage: { required: string[]; present: string[]; missing: string[] };
  evidence_strength_floor: EvidenceStrength;
  model_integrity: {
    counterfactual_valid: boolean;
    causal_valid: boolean;
    reconciliation_ok: boolean;
    model_divergence: boolean;
  };
  confidence_index?: number;
}

export interface CapacityBasis {
  demand_source: 'cdi02_predicted_with_intervention';
  demand_units: number;
  capacity_source: 'wp10c_derived_impacts';
  capacity_units: number;
  model_divergence_pp?: number;
  note: string;
}

export interface DecisionReadinessAssessment {
  readiness_id: string;
  campaign_intent_id: string;
  tenant_id: string;
  session_id: string;
  state: ReadinessState;
  headline: string;
  dimensions: DimensionAssessment[];
  vetoes: ReadinessVeto[];
  conditions: ReadinessCondition[];
  change_triggers: ReadinessChangeTrigger[];
  resilience_evidence: ResilienceEvidenceRef[];
  confidence: ReadinessConfidence;
  capacity_basis: CapacityBasis;
  threshold_policy: ReadinessThresholdPolicy;
  operational_feasibility?: OperationalFeasibility;
  commercial_tolerance: CommercialToleranceAssessment;
  state_caps_applied: string[];
  counterfactual_id: string;
  causal_id: string;
  opportunity_evaluation_id?: string;
  micro_market_evaluation_id?: string;
  decision_state_id?: string;
  decision_state_version?: number;
  calculation_mode: 'deterministic_demo_readiness';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
}

export interface ReadinessEvaluationRequest {
  tenant_id: string;
  session_id: string;
  campaign_intent_id?: string;
  campaign_intent?: CampaignIntent;
  include_signals?: boolean;
  economic_tolerance?: EconomicTolerance;
  campaign_evaluation?: CampaignEvaluationResponse;
  opportunity_discovery?: OpportunityDiscoveryResponse;
  /** Forbidden — presence triggers rejection R6. */
  threshold_overrides?: unknown;
  /** Optional fixed timestamp for deterministic output (no Date inside scoring). */
  evaluation_timestamp?: string;
}

export interface ReadinessEvaluationResponse {
  evaluation_id: string;
  tenant_id: string;
  session_id: string;
  campaign_intent_id: string;
  readiness: DecisionReadinessAssessment;
  timestamp: string;
  schema_version: string;
}

export const READINESS_DIMENSION_ORDER: ReadinessDimensionId[] = [
  'COMMERCIAL',
  'DEMAND',
  'OPERATIONAL',
  'CONTEXT',
  'CUSTOMER',
  'STRATEGIC'
];

/** Centralised synthetic demonstration policy — build-time constant; not caller-configurable. */
export const READINESS_THRESHOLD_POLICY: ReadinessThresholdPolicy = {
  policy_id: 'cdi04_threshold_policy_v1',
  policy_version: '1.0.0',
  provenance: 'synthetic_demonstration_policy',
  synthetic_demo: true,
  thresholds: [
    {
      threshold_id: 'TH-C1',
      applies_to: 'COMMERCIAL',
      rule_ids: ['C6'],
      value: 0.2,
      unit: 'unit_contribution_erosion_ratio',
      effect_ceiling: 'WATCH',
      basis: 'Demo convention: value surviving only on volume',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Realised margin history'
    },
    {
      threshold_id: 'TH-C2',
      applies_to: 'COMMERCIAL',
      rule_ids: ['C7'],
      value: 0.25,
      unit: 'target_shortfall_ratio',
      effect_ceiling: 'CONSTRAINED',
      basis: 'Demo convention',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Historical target attainment variance'
    },
    {
      threshold_id: 'TH-D1',
      applies_to: 'DEMAND',
      rule_ids: ['D4'],
      value: 0.25,
      unit: 'residual_share_of_intervention_uplift',
      effect_ceiling: 'CONSTRAINED',
      basis: 'Decomposition self-explanation limit',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Observed residual distribution'
    },
    {
      threshold_id: 'TH-D2',
      applies_to: 'DEMAND',
      rule_ids: ['D5'],
      value: 0.7,
      unit: 'single_driver_share_of_intervention_uplift',
      effect_ceiling: 'WATCH',
      basis: 'Concentration convention',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Driver-share distribution'
    },
    {
      threshold_id: 'TH-O1',
      applies_to: 'OPERATIONAL',
      rule_ids: ['O3'],
      value: 70,
      unit: 'stockout_probability_pct',
      effect_ceiling: 'CONSTRAINED',
      basis: 'Demo constant — demoted from veto by ruling U1',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Real stockout outcomes'
    },
    {
      threshold_id: 'TH-O2',
      applies_to: 'OPERATIONAL',
      rule_ids: ['O3'],
      value: 50,
      unit: 'delivery_risk_pct',
      effect_ceiling: 'CONSTRAINED',
      basis: 'Demo constant — demoted from veto by ruling U1',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Real OTIF breach data'
    },
    {
      threshold_id: 'TH-O3',
      applies_to: 'OPERATIONAL',
      rule_ids: ['O5'],
      value: 0.5,
      unit: 'dc_overtime_hours_over_12h_baseline_ratio',
      effect_ceiling: 'WATCH',
      basis: 'WP10-A baseline convention',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'DC labour actuals'
    },
    {
      threshold_id: 'TH-O4',
      applies_to: 'OPERATIONAL',
      rule_ids: ['O5'],
      value: 3.0,
      unit: 'margin_erosion_pct',
      effect_ceiling: 'WATCH',
      basis: 'Demo constant',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Realised margin erosion'
    },
    {
      threshold_id: 'TH-O5',
      applies_to: 'OPERATIONAL',
      rule_ids: ['O4', 'divergence'],
      value: 5,
      unit: 'pp_lift_divergence',
      effect_ceiling: 'WATCH',
      basis: 'Model-agreement convention',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Model reconciliation history'
    },
    {
      threshold_id: 'TH-U1',
      applies_to: 'CUSTOMER',
      rule_ids: ['U3'],
      value: 0.8,
      unit: 'stores_included_over_evaluated_ratio',
      effect_ceiling: 'WATCH',
      basis: 'CDI-03 residual risk 6',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Estate-targeting norms'
    },
    {
      threshold_id: 'TH-U2',
      applies_to: 'CUSTOMER',
      rule_ids: ['U5'],
      value: 0.3,
      unit: 'availability_exclusion_share',
      effect_ceiling: 'CONSTRAINED',
      basis: 'CDI-03 proxy convention',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Real availability data'
    },
    {
      threshold_id: 'TH-X1',
      applies_to: 'CONTEXT',
      rule_ids: ['X5'],
      value: 2,
      unit: 'concurrent_adverse_contextual_signals',
      effect_ceiling: 'CONSTRAINED',
      basis: 'Demo convention',
      calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
      calibration_target: 'Signal co-occurrence base rates'
    }
  ]
};

export function getThreshold(thresholdId: string): ReadinessThreshold {
  const t = READINESS_THRESHOLD_POLICY.thresholds.find(x => x.threshold_id === thresholdId);
  if (!t) throw new Error(`Unknown readiness threshold: ${thresholdId}`);
  return t;
}

export function weakestEvidenceStrength(strengths: EvidenceStrength[]): EvidenceStrength {
  if (strengths.length === 0) return 'MISSING';
  let weakest: EvidenceStrength = strengths[0];
  let weakestIdx = EVIDENCE_STRENGTH_ORDER.indexOf(weakest);
  for (const s of strengths) {
    const idx = EVIDENCE_STRENGTH_ORDER.indexOf(s);
    if (idx > weakestIdx) {
      weakest = s;
      weakestIdx = idx;
    }
  }
  return weakest;
}

const DIMENSION_STATE_RANK: Record<DimensionState, number> = {
  CLEAR: 0,
  WATCH: 1,
  CONSTRAINED: 2,
  BLOCKING: 3,
  INSUFFICIENT_EVIDENCE: 4,
  NOT_EVALUATED: 1 // treated as soft for floor display; caps handle overall
};

export function worseDimensionState(a: DimensionState, b: DimensionState): DimensionState {
  return DIMENSION_STATE_RANK[a] >= DIMENSION_STATE_RANK[b] ? a : b;
}

export function deriveCommercialObjectiveClass(intent: CampaignIntent): CommercialObjectiveClass {
  const metric = intent.baseline_objective.primary_metric;
  const direction = intent.baseline_objective.target_direction;
  const objective = intent.campaign_intent.objective_type;

  // Metric wins over objective label when they disagree
  if (
    (metric === 'CONTRIBUTION' || metric === 'REVENUE') &&
    (direction === 'INCREASE' || direction === 'PROTECT')
  ) {
    return 'VALUE_CREATION';
  }
  if (metric === 'WASTE_REDUCTION' || metric === 'AVAILABILITY' || metric === 'VOLUME') {
    return 'VALUE_TRADE';
  }
  if (objective === 'REVENUE_ACCELERATION') return 'VALUE_CREATION';
  if (
    objective === 'INVENTORY_CLEARANCE' ||
    objective === 'MARKET_DEFENSE' ||
    objective === 'LAUNCH'
  ) {
    return 'VALUE_TRADE';
  }
  if (objective === 'OTHER') return 'UNCLASSIFIED';
  return 'VALUE_TRADE';
}

const READINESS_STATE_ORDER: ReadinessState[] = ['GO', 'CONDITIONAL_GO', 'REVIEW', 'DO_NOT_PROCEED'];

/** Caps lower a ceiling and never raise a state (§3.4). Applied to every branch, not just all-CLEAR. */
function applyCapCeilings(state: ReadinessState, caps: string[]): ReadinessState {
  let idx = READINESS_STATE_ORDER.indexOf(state);
  for (const cap of caps) {
    if (cap === 'K5' || cap === 'K6') idx = Math.max(idx, READINESS_STATE_ORDER.indexOf('REVIEW'));
    else if (['K1', 'K2', 'K3', 'K4', 'K7', 'K8'].includes(cap)) {
      idx = Math.max(idx, READINESS_STATE_ORDER.indexOf('CONDITIONAL_GO'));
    }
  }
  return READINESS_STATE_ORDER[idx];
}

function recomputeFloorState(
  dimensions: DimensionAssessment[],
  caps: string[],
  hasDischargeableConstraints: boolean,
  hasUndischargeableConstraints: boolean
): ReadinessState {
  const states = dimensions.map(d => d.state);
  if (states.includes('BLOCKING')) return 'DO_NOT_PROCEED';
  if (states.includes('INSUFFICIENT_EVIDENCE')) return 'REVIEW';
  if (states.includes('CONSTRAINED')) {
    if (hasUndischargeableConstraints || !hasDischargeableConstraints) return 'REVIEW';
    return applyCapCeilings('CONDITIONAL_GO', caps);
  }
  if (states.includes('WATCH') || states.includes('NOT_EVALUATED')) {
    return applyCapCeilings('CONDITIONAL_GO', caps);
  }
  return applyCapCeilings('GO', caps);
}

export function validateDecisionReadinessAssessment(
  a: Partial<DecisionReadinessAssessment>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!a.readiness_id) errors.push('Missing readiness_id');
  if (!a.campaign_intent_id) errors.push('Missing campaign_intent_id');
  if (!a.tenant_id) errors.push('Missing tenant_id');
  if (!a.session_id) errors.push('Missing session_id');
  if (!a.state) errors.push('Missing state');
  if (!Array.isArray(a.dimensions) || a.dimensions.length !== 6) {
    errors.push('dimensions must contain exactly six assessments');
  } else {
    const ids = a.dimensions.map(d => d.dimension);
    for (const expected of READINESS_DIMENSION_ORDER) {
      if (!ids.includes(expected)) errors.push(`Missing dimension ${expected}`);
    }
    if (new Set(ids).size !== 6) errors.push('Duplicate dimensions');
  }

  if (!a.threshold_policy || a.threshold_policy.provenance !== 'synthetic_demonstration_policy') {
    errors.push('threshold_policy must be present with synthetic_demonstration_policy provenance');
  }
  for (const t of a.threshold_policy?.thresholds || []) {
    if (t.effect_ceiling !== 'WATCH' && t.effect_ceiling !== 'CONSTRAINED') {
      errors.push(`Threshold ${t.threshold_id} has illegal effect_ceiling`);
    }
    if (!t.calibration_target) errors.push(`Threshold ${t.threshold_id} missing calibration_target`);
  }

  if (!a.commercial_tolerance) errors.push('Missing commercial_tolerance');
  if (
    a.commercial_tolerance &&
    a.commercial_tolerance.contribution_delta_gbp < 0 &&
    (a.dimensions?.find(d => d.dimension === 'COMMERCIAL')?.state === 'CLEAR' || a.state === 'GO')
  ) {
    errors.push('Negative contribution cannot yield CLEAR Commercial or GO');
  }

  const blockingDims = (a.dimensions || []).filter(d => d.state === 'BLOCKING');
  for (const d of blockingDims) {
    if (!(a.vetoes || []).some(v => v.dimension === d.dimension)) {
      errors.push(`BLOCKING dimension ${d.dimension} missing matching veto`);
    }
  }
  for (const v of a.vetoes || []) {
    if (!(a.dimensions || []).some(d => d.dimension === v.dimension && d.state === 'BLOCKING')) {
      errors.push(`Veto ${v.veto_id} without BLOCKING dimension ${v.dimension}`);
    }
  }

  if (a.state === 'CONDITIONAL_GO') {
    const constrainedOrWatch = (a.dimensions || []).filter(
      d => d.state === 'CONSTRAINED' || d.state === 'WATCH'
    );
    for (const d of constrainedOrWatch) {
      if (!(a.conditions || []).some(c => c.dimension === d.dimension && c.discharge_test)) {
        errors.push(`CONDITIONAL_GO missing discharge_test condition for ${d.dimension}`);
      }
    }
  }

  if (a.state === 'GO') {
    if ((a.conditions || []).length > 0) errors.push('GO cannot have open conditions');
    if ((a.vetoes || []).length > 0) errors.push('GO cannot have vetoes');
    if ((a.state_caps_applied || []).length > 0) errors.push('GO cannot have state caps');
    if (a.confidence && a.confidence.band !== 'HIGH' && a.confidence.band !== 'MODERATE') {
      errors.push('GO requires confidence band ≥ MODERATE');
    }
  }

  for (const d of a.dimensions || []) {
    for (const f of d.findings) {
      for (const e of f.evidence) {
        if (e.strength === 'OBSERVED' && e.synthetic_demo) {
          errors.push(`Evidence ${e.field_path} cannot be OBSERVED with synthetic_demo`);
        }
      }
      if (
        d.state === 'CLEAR' &&
        f.severity === 'INFO' &&
        f.evidence.some(e => e.strength === 'PLACEHOLDER_EXCLUDED')
      ) {
        errors.push('PLACEHOLDER_EXCLUDED cannot appear on CLEAR INFO findings');
      }
    }
  }

  if (a.operational_feasibility?.structurally_infeasible) {
    if (!(a.vetoes || []).some(v => v.veto_id === 'V4' && v.veto_basis === 'OPERATIONAL_INFEASIBILITY')) {
      errors.push('structurally_infeasible requires V4 OPERATIONAL_INFEASIBILITY veto');
    }
  }

  // Independent floor recompute (approximate — trusts conditions flags from payload structure)
  if (a.dimensions && a.state && a.state_caps_applied) {
    const hasDischarge = (a.conditions || []).some(c => !!c.discharge_test);
    const constrained = a.dimensions.some(d => d.state === 'CONSTRAINED');
    const undischargeable = constrained && !hasDischarge;
    const recomputed = recomputeFloorState(
      a.dimensions,
      a.state_caps_applied,
      hasDischarge,
      undischargeable
    );
    // Allow REVIEW vs CONDITIONAL_GO ambiguity only when conditions empty with CONSTRAINED
    if (recomputed === 'DO_NOT_PROCEED' && a.state !== 'DO_NOT_PROCEED') {
      errors.push(`state ${a.state} exceeds floor DO_NOT_PROCEED`);
    }
    if (recomputed === 'GO' && a.state !== 'GO' && a.state === 'DO_NOT_PROCEED') {
      // impossible path
    }
    if (a.state === 'GO' && recomputed !== 'GO') {
      errors.push(`state GO exceeds recomputed floor ${recomputed}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateReadinessEvaluationRequest(
  r: Partial<ReadinessEvaluationRequest>
): { valid: boolean; errors: string[]; rejection_id?: string } {
  const errors: string[] = [];
  if (!r.tenant_id) errors.push('Missing tenant_id');
  if (!r.session_id) errors.push('Missing session_id');
  if (!r.campaign_intent_id && !r.campaign_intent) {
    errors.push('Provide campaign_intent_id or campaign_intent');
  }
  if (r.threshold_overrides !== undefined) {
    return {
      valid: false,
      errors: ['R6: threshold policy is a build-time constant and is not caller-configurable'],
      rejection_id: 'R6'
    };
  }
  if (r.economic_tolerance) {
    if (
      typeof r.economic_tolerance.max_contribution_sacrifice_gbp !== 'number' ||
      r.economic_tolerance.max_contribution_sacrifice_gbp < 0
    ) {
      errors.push('economic_tolerance.max_contribution_sacrifice_gbp must be ≥ 0');
    }
    if (!r.economic_tolerance.rationale || !r.economic_tolerance.declared_by) {
      errors.push('economic_tolerance requires rationale and declared_by');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertNoCompensation(
  a: DecisionReadinessAssessment
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const states = a.dimensions.map(d => d.state);
  if (states.includes('BLOCKING') && a.state !== 'DO_NOT_PROCEED') {
    violations.push('BLOCKING present but state is not DO_NOT_PROCEED');
  }
  if (states.includes('CONSTRAINED') && a.state === 'GO') {
    violations.push('CONSTRAINED present but state is GO — compensation leak');
  }
  if (states.includes('WATCH') && a.state === 'GO') {
    violations.push('WATCH present but state is GO — compensation leak');
  }
  if (states.includes('INSUFFICIENT_EVIDENCE') && (a.state === 'GO' || a.state === 'CONDITIONAL_GO')) {
    violations.push('INSUFFICIENT_EVIDENCE cannot yield GO/CONDITIONAL_GO without REVIEW floor');
  }
  // No weighted score field may exist
  const payload = JSON.stringify(a);
  if (/weighted_score|average_readiness|composite_score/i.test(payload)) {
    violations.push('Payload contains weighted/average cross-dimension score fields');
  }
  return { ok: violations.length === 0, violations };
}

export function assertNoThresholdDerivedVeto(
  a: DecisionReadinessAssessment
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const t of a.threshold_policy.thresholds) {
    if (t.effect_ceiling !== 'WATCH' && t.effect_ceiling !== 'CONSTRAINED') {
      violations.push(`Threshold ${t.threshold_id} has illegal effect_ceiling ${t.effect_ceiling}`);
    }
  }
  for (const v of a.vetoes) {
    if (/TH-[A-Z0-9]+/.test(v.statement) || /TH-[A-Z0-9]+/.test(v.triggering_field)) {
      // Allow mentioning threshold IDs only in non-veto findings; vetoes must not be threshold-derived
      if (v.veto_basis !== 'CONTRACT_INTEGRITY' &&
          v.veto_basis !== 'STATED_OBJECTIVE_CONTRADICTION' &&
          v.veto_basis !== 'DECLARED_TOLERANCE_EXCEEDED' &&
          v.veto_basis !== 'OPERATIONAL_INFEASIBILITY' &&
          v.veto_basis !== 'NO_ADDRESSABLE_ESTATE') {
        violations.push(`Veto ${v.veto_id} has invalid veto_basis`);
      }
    }
    // Hard rule: veto_basis must be one of the five non-threshold bases
    const allowed = [
      'CONTRACT_INTEGRITY',
      'STATED_OBJECTIVE_CONTRADICTION',
      'DECLARED_TOLERANCE_EXCEEDED',
      'OPERATIONAL_INFEASIBILITY',
      'NO_ADDRESSABLE_ESTATE'
    ];
    if (!allowed.includes(v.veto_basis)) {
      violations.push(`Veto ${v.veto_id} basis ${v.veto_basis} is not a permitted non-threshold basis`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertNegativeContributionNeverGo(
  a: DecisionReadinessAssessment
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (a.commercial_tolerance.contribution_delta_gbp < 0) {
    const commercial = a.dimensions.find(d => d.dimension === 'COMMERCIAL');
    if (commercial?.state === 'CLEAR') {
      violations.push('Negative contribution yielded CLEAR Commercial');
    }
    if (a.state === 'GO') {
      violations.push('Negative contribution yielded GO');
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Parity guard (design gate §2.5, acceptance criterion 10g).
 *
 * WP10-C's lever headrooms are inline literals inside calculateDerivedImpacts(), not exported
 * constants, so they cannot be compared by reference. Comparing the mirror against a second
 * copy of the same literal would be a tautology that no upstream drift could ever break.
 * Instead this probes calculateDerivedImpacts() behaviourally: it measures the capacity
 * delta each lever actually produces and asserts the mirror equals it. If WP10-C changes a
 * headroom, this fails.
 */
export function assertRecoveryLeverParity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const params: DecisionScenarioParameters = {
    promotion_lift: 20,
    supplier_capacity_cap: 10,
    forecast_horizon_days: 14,
    promotion_method: '20_percent_off',
    campaign_scope: 'national',
    cannibalisation_factor: 0,
    event_boost: 'none'
  };
  const baseline = calculateDerivedImpacts(params, []).supplier_capacity_units;
  for (const [leverId, mirrored] of Object.entries(WP10C_RECOVERY_LEVER_HEADROOM)) {
    const actual = calculateDerivedImpacts(params, [leverId]).supplier_capacity_units - baseline;
    if (actual !== mirrored) {
      violations.push(
        `${leverId} headroom drift: CDI-04 mirror ${mirrored} vs WP10-C calculateDerivedImpacts ${actual}`
      );
    }
  }
  return { ok: violations.length === 0, violations };
}
