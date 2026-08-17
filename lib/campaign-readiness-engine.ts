/**
 * CogniX CDI-04 — Campaign Decision Readiness & Resilience Engine
 *
 * Pure, deterministic. Aggregation is a floor over six dimensions — never a weighted score.
 * Thresholds are synthetic demonstration policy and never fire vetoes.
 * Decision Ripple: read-only DecisionDerivedImpacts references only — no ripple arithmetic.
 */

import {
  CampaignIntent,
  CampaignEvaluationResponse,
  OpportunityDiscoveryResponse,
  DecisionState,
  DecisionReadinessAssessment,
  ReadinessEvaluationRequest,
  ReadinessEvaluationResponse,
  DimensionAssessment,
  DimensionState,
  ReadinessState,
  ReadinessFinding,
  ReadinessVeto,
  ReadinessCondition,
  ReadinessChangeTrigger,
  ReadinessEvidenceRef,
  EvidenceStrength,
  ResilienceEvidenceRef,
  CapacityBasis,
  OperationalFeasibility,
  CommercialToleranceAssessment,
  CommercialObjectiveClass,
  ConfidenceBand,
  READINESS_THRESHOLD_POLICY,
  READINESS_DIMENSION_ORDER,
  WP10C_RECOVERY_LEVER_HEADROOM,
  EVIDENCE_STRENGTH_ORDER,
  getThreshold,
  weakestEvidenceStrength,
  deriveCommercialObjectiveClass,
  validateDecisionReadinessAssessment,
  validateReadinessEvaluationRequest,
  validateCounterfactualBaseline,
  validateCausalDemandContribution
} from '../packages/contracts/src/index';
import { getCampaignIntentById } from './campaign-intent-store';
import { evaluateCampaignDecision } from './campaign-causal-engine';
import { discoverCampaignOpportunity } from './campaign-opportunity-engine';
import { decisionStateStore } from './decision-state-store';

const SCHEMA_VERSION = '1.0.0';
const ENGINE_VERSION = 'cdi04_readiness_v1';
const DC_OVERTIME_BASELINE_HOURS = 12;

type EvalBundle = {
  campaign: CampaignIntent;
  evaluation: CampaignEvaluationResponse;
  discovery?: OpportunityDiscoveryResponse;
  decisionState?: DecisionState;
  includeSignals: boolean;
  economicTolerance?: ReadinessEvaluationRequest['economic_tolerance'];
  timestamp: string;
};

function ev(
  source_package: ReadinessEvidenceRef['source_package'],
  field_path: string,
  value: string | number | boolean,
  strength: EvidenceStrength,
  synthetic_demo: boolean,
  disclosure?: string
): ReadinessEvidenceRef {
  return { source_package, field_path, value, strength, synthetic_demo, disclosure };
}

function finding(
  finding_id: string,
  rule_id: string,
  dimension: DimensionAssessment['dimension'],
  severity: ReadinessFinding['severity'],
  statement: string,
  decisive: boolean,
  evidence: ReadinessEvidenceRef[]
): ReadinessFinding {
  return { finding_id, rule_id, dimension, severity, statement, decisive, evidence };
}

function raiseState(current: DimensionState, next: DimensionState): DimensionState {
  const rank: Record<DimensionState, number> = {
    CLEAR: 0,
    WATCH: 1,
    NOT_EVALUATED: 1,
    CONSTRAINED: 2,
    BLOCKING: 3,
    INSUFFICIENT_EVIDENCE: 4
  };
  return rank[next] > rank[current] ? next : current;
}

function emptyDimension(
  dimension: DimensionAssessment['dimension'],
  state: DimensionState,
  reason?: string
): DimensionAssessment {
  return {
    dimension,
    state,
    evidence_strength_floor: state === 'NOT_EVALUATED' || state === 'INSUFFICIENT_EVIDENCE' ? 'MISSING' : 'DERIVED',
    findings: [],
    required_inputs_present: [],
    missing_inputs: state === 'INSUFFICIENT_EVIDENCE' ? ['required_inputs'] : [],
    not_evaluated_reason: reason
  };
}

function finalizeDimension(
  dimension: DimensionAssessment['dimension'],
  state: DimensionState,
  findings: ReadinessFinding[],
  present: string[],
  missing: string[],
  reason?: string
): DimensionAssessment {
  const decisive = findings.filter(f => f.decisive);
  const strengths = decisive.flatMap(f => f.evidence.map(e => e.strength));
  return {
    dimension,
    state,
    evidence_strength_floor: weakestEvidenceStrength(strengths.length ? strengths : ['DERIVED']),
    findings,
    required_inputs_present: present,
    missing_inputs: missing,
    not_evaluated_reason: reason
  };
}

export function evaluateCommercial(
  bundle: EvalBundle,
  objectiveClass: CommercialObjectiveClass
): { assessment: DimensionAssessment; vetoes: ReadinessVeto[]; conditions: ReadinessCondition[]; tolerance: CommercialToleranceAssessment; triggers: ReadinessChangeTrigger[] } {
  const delta = bundle.evaluation.counterfactual.campaign_delta;
  const predicted = bundle.evaluation.counterfactual.predicted_with_intervention;
  const current = bundle.evaluation.counterfactual.current_baseline;
  const contribution = delta.contribution_delta_gbp;
  const findings: ReadinessFinding[] = [];
  const vetoes: ReadinessVeto[] = [];
  const conditions: ReadinessCondition[] = [];
  const triggers: ReadinessChangeTrigger[] = [];
  let state: DimensionState = 'CLEAR';
  const present = [
    'campaign_delta.contribution_delta_gbp',
    'campaign_delta.attributable_uplift_pp',
    'campaign_delta.intervention_indistinguishable_from_do_nothing',
    'predicted_with_intervention.unit_contribution_gbp'
  ];

  const tolerance = bundle.economicTolerance;
  const toleranceAssessment: CommercialToleranceAssessment = {
    objective_class: objectiveClass,
    contribution_delta_gbp: contribution,
    tolerance_declared: !!tolerance,
    tolerance: tolerance || undefined
  };
  if (tolerance && contribution < 0) {
    const headroom = tolerance.max_contribution_sacrifice_gbp - Math.abs(contribution);
    toleranceAssessment.headroom_gbp = Number(headroom.toFixed(2));
    toleranceAssessment.within_tolerance = headroom >= 0;
  }

  // C1 — VALUE_CREATION + negative contribution ⇒ V3a
  if (objectiveClass === 'VALUE_CREATION' && contribution < 0) {
    state = 'BLOCKING';
    findings.push(
      finding(
        'C1_value_destruction',
        'C1',
        'COMMERCIAL',
        'VETO',
        `VALUE_CREATION objective with contribution_delta_gbp ${contribution} < 0 — intervention moves the stated value metric against its direction.`,
        true,
        [ev('CDI-02', 'counterfactual.campaign_delta.contribution_delta_gbp', contribution, 'DERIVED', bundle.evaluation.counterfactual.synthetic_demo)]
      )
    );
    vetoes.push({
      veto_id: 'V3a',
      dimension: 'COMMERCIAL',
      statement: 'Stated value metric destroyed by the intervention.',
      triggering_field: 'counterfactual.campaign_delta.contribution_delta_gbp',
      triggering_value: contribution,
      veto_basis: 'STATED_OBJECTIVE_CONTRADICTION'
    });
  }

  // C2 / C3 / C4 — VALUE_TRADE / UNCLASSIFIED negative contribution
  if (
    (objectiveClass === 'VALUE_TRADE' || objectiveClass === 'UNCLASSIFIED') &&
    contribution < 0 &&
    state !== 'BLOCKING'
  ) {
    if (!tolerance) {
      state = raiseState(state, 'CONSTRAINED');
      findings.push(
        finding(
          'C2_unauthorised_trade',
          'C2',
          'COMMERCIAL',
          'CONSTRAINT',
          `Negative contribution £${contribution} without declared economic tolerance — trade is real but unauthorised.`,
          true,
          [ev('CDI-02', 'counterfactual.campaign_delta.contribution_delta_gbp', contribution, 'DERIVED', true)]
        )
      );
      conditions.push({
        condition_id: 'C2_declare_tolerance_or_restore',
        dimension: 'COMMERCIAL',
        statement: 'Declare an economic tolerance covering the contribution sacrifice, or restore contribution_delta_gbp ≥ 0.',
        discharge_test:
          'economic_tolerance.max_contribution_sacrifice_gbp >= abs(contribution_delta_gbp) OR contribution_delta_gbp >= 0',
        evidence_gap: 'No economic_tolerance on request',
        blocking_if_unmet: 'REVIEW'
      });
    } else if (Math.abs(contribution) <= tolerance.max_contribution_sacrifice_gbp) {
      state = raiseState(state, 'CONSTRAINED');
      findings.push(
        finding(
          'C3_within_tolerance',
          'C3',
          'COMMERCIAL',
          'CONSTRAINT',
          `Negative contribution £${contribution} within declared tolerance £${tolerance.max_contribution_sacrifice_gbp} (headroom £${toleranceAssessment.headroom_gbp}). Tolerance never buys CLEAR.`,
          true,
          [
            ev('CDI-02', 'counterfactual.campaign_delta.contribution_delta_gbp', contribution, 'DERIVED', true),
            ev(
              'CDI-01',
              'economic_tolerance.max_contribution_sacrifice_gbp',
              tolerance.max_contribution_sacrifice_gbp,
              'DECLARED_INPUT',
              false,
              tolerance.rationale
            )
          ]
        )
      );
      conditions.push({
        condition_id: 'C3_remain_within_tolerance',
        dimension: 'COMMERCIAL',
        statement: 'Keep contribution sacrifice within the declared economic tolerance.',
        discharge_test: `abs(contribution_delta_gbp) <= ${tolerance.max_contribution_sacrifice_gbp}`,
        evidence_gap: 'Tolerance is declared input, not observed economics',
        blocking_if_unmet: 'DO_NOT_PROCEED'
      });
    } else {
      state = 'BLOCKING';
      findings.push(
        finding(
          'C4_tolerance_breached',
          'C4',
          'COMMERCIAL',
          'VETO',
          `Contribution sacrifice £${Math.abs(contribution)} exceeds declared tolerance £${tolerance.max_contribution_sacrifice_gbp}.`,
          true,
          [
            ev('CDI-02', 'counterfactual.campaign_delta.contribution_delta_gbp', contribution, 'DERIVED', true),
            ev(
              'CDI-01',
              'economic_tolerance.max_contribution_sacrifice_gbp',
              tolerance.max_contribution_sacrifice_gbp,
              'DECLARED_INPUT',
              false,
              tolerance.rationale
            )
          ]
        )
      );
      vetoes.push({
        veto_id: 'V3b',
        dimension: 'COMMERCIAL',
        statement: 'Declared economic tolerance exceeded.',
        triggering_field: 'counterfactual.campaign_delta.contribution_delta_gbp',
        triggering_value: contribution,
        veto_basis: 'DECLARED_TOLERANCE_EXCEEDED'
      });
    }
  }

  // C5 — indistinguishable from do-nothing while claiming intervention
  const posture = bundle.campaign.campaign_intent.intervention_posture;
  if (
    delta.intervention_indistinguishable_from_do_nothing &&
    (posture === 'CONSIDER_PROMOTION' || posture === 'CONSIDER_NON_PROMOTION')
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'C5_indistinguishable',
        'C5',
        'COMMERCIAL',
        'CONSTRAINT',
        'Campaign claims an intervention the model cannot distinguish from inaction.',
        true,
        [
          ev(
            'CDI-02',
            'counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing',
            true,
            'DERIVED',
            true
          )
        ]
      )
    );
    conditions.push({
      condition_id: 'C5_produce_attributable_uplift',
      dimension: 'COMMERCIAL',
      statement: 'Produce attributable intervention uplift distinguishable from do-nothing.',
      discharge_test: 'campaign_delta.intervention_indistinguishable_from_do_nothing === false',
      evidence_gap: 'No attributable intervention effect',
      blocking_if_unmet: 'REVIEW'
    });
  }

  // C6 — unit contribution erosion
  const thC1 = getThreshold('TH-C1');
  const baselineUnit = current.unit_contribution_gbp;
  const predictedUnit = predicted.unit_contribution_gbp;
  if (baselineUnit > 0 && contribution > 0) {
    const erosion = (baselineUnit - predictedUnit) / baselineUnit;
    if (erosion >= thC1.value) {
      state = raiseState(state, 'WATCH');
      findings.push(
        finding(
          'C6_unit_erosion',
          'C6',
          'COMMERCIAL',
          'WATCH',
          `Unit contribution eroded ${(erosion * 100).toFixed(1)}% vs baseline (≥ TH-C1 ${(thC1.value * 100).toFixed(0)}%). Value survives on volume.`,
          true,
          [
            ev('CDI-02', 'predicted_with_intervention.unit_contribution_gbp', predictedUnit, 'DERIVED', true),
            ev('CDI-02', 'current_baseline.unit_contribution_gbp', baselineUnit, 'DERIVED', true)
          ]
        )
      );
      triggers.push({
        dimension: 'COMMERCIAL',
        field_path: 'predicted_with_intervention.unit_contribution_gbp',
        current_value: predictedUnit,
        threshold: baselineUnit * (1 - thC1.value),
        direction: 'INCREASE',
        would_change_dimension_to: 'CLEAR',
        would_change_state_to: 'GO',
        threshold_id: 'TH-C1'
      });
    }
  }

  // C7 — target shortfall
  const thC2 = getThreshold('TH-C2');
  const targetValue = bundle.campaign.baseline_objective.target_value;
  if (typeof targetValue === 'number' && targetValue > 0) {
    const metric = bundle.campaign.baseline_objective.primary_metric;
    let predictedMovement = delta.attributable_uplift_pp;
    if (metric === 'VOLUME') predictedMovement = delta.volume_delta_pct;
    if (metric === 'CONTRIBUTION' || metric === 'REVENUE') {
      predictedMovement = contribution;
    }
    const shortfallRatio =
      predictedMovement < targetValue ? (targetValue - predictedMovement) / targetValue : 0;
    if (shortfallRatio > 0) {
      const next: DimensionState = shortfallRatio >= thC2.value ? 'CONSTRAINED' : 'WATCH';
      state = raiseState(state, next);
      findings.push(
        finding(
          'C7_target_shortfall',
          'C7',
          'COMMERCIAL',
          next === 'CONSTRAINED' ? 'CONSTRAINT' : 'WATCH',
          `Predicted movement on ${metric} shortfalls target by ${(shortfallRatio * 100).toFixed(1)}% (TH-C2 ${(thC2.value * 100).toFixed(0)}%).`,
          true,
          [ev('CDI-01', 'baseline_objective.target_value', targetValue, 'DECLARED_INPUT', false)]
        )
      );
      if (next === 'CONSTRAINED') {
        conditions.push({
          condition_id: 'C7_meet_target',
          dimension: 'COMMERCIAL',
          statement: `Close shortfall vs target_value ${targetValue} on ${metric}.`,
          discharge_test: `primary_metric_predicted_movement >= ${targetValue}`,
          evidence_gap: 'Predicted movement below stated target',
          blocking_if_unmet: 'REVIEW'
        });
      }
    }
  }

  // Waste — DERIVED_KNOWN_DISCONTINUITY; never sole decisive for CLEAR
  findings.push(
    finding(
      'C_waste_discontinuity',
      'C-waste',
      'COMMERCIAL',
      'INFO',
      `waste_delta_units=${delta.waste_delta_units} admitted at DERIVED_KNOWN_DISCONTINUITY (CDI-02 residual risk 6) — never sole decisive for CLEAR.`,
      false,
      [
        ev(
          'CDI-02',
          'counterfactual.campaign_delta.waste_delta_units',
          delta.waste_delta_units,
          'DERIVED_KNOWN_DISCONTINUITY',
          true,
          'CDI-02 waste modelling is asymmetric/discontinuous; not corrected by CDI-04.'
        )
      ]
    )
  );

  // C8 — all clear and positive contribution
  if (state === 'CLEAR' && contribution > 0) {
    findings.push(
      finding(
        'C8_clear',
        'C8',
        'COMMERCIAL',
        'INFO',
        `Positive contribution_delta_gbp £${contribution} with no commercial constraints.`,
        true,
        [ev('CDI-02', 'counterfactual.campaign_delta.contribution_delta_gbp', contribution, 'DERIVED', true)]
      )
    );
  } else if (state === 'CLEAR' && contribution <= 0) {
    // Structural: negative/zero cannot be CLEAR — force WATCH at minimum for zero; negative handled above
    state = contribution < 0 ? raiseState(state, 'CONSTRAINED') : 'WATCH';
  }

  // Cap: negative contribution never CLEAR (structural)
  if (contribution < 0 && state === 'CLEAR') {
    state = 'CONSTRAINED';
  }

  return {
    assessment: finalizeDimension('COMMERCIAL', state, findings, present, []),
    vetoes,
    conditions,
    tolerance: toleranceAssessment,
    triggers
  };
}

export function evaluateDemand(bundle: EvalBundle): {
  assessment: DimensionAssessment;
  vetoes: ReadinessVeto[];
  conditions: ReadinessCondition[];
  triggers: ReadinessChangeTrigger[];
  modelIntegrity: { counterfactual_valid: boolean; causal_valid: boolean; reconciliation_ok: boolean };
} {
  const causal = bundle.evaluation.causal;
  const cf = bundle.evaluation.counterfactual;
  const findings: ReadinessFinding[] = [];
  const vetoes: ReadinessVeto[] = [];
  const conditions: ReadinessCondition[] = [];
  const triggers: ReadinessChangeTrigger[] = [];
  let state: DimensionState = 'CLEAR';

  const cfVal = validateCounterfactualBaseline(cf);
  const causalVal = validateCausalDemandContribution(causal);
  const modelIntegrity = {
    counterfactual_valid: cfVal.valid,
    causal_valid: causalVal.valid,
    reconciliation_ok: causal.reconciliation_ok
  };

  // D1 / V1 / V2
  if (!causal.reconciliation_ok) {
    state = 'BLOCKING';
    findings.push(
      finding(
        'D1_reconciliation_fail',
        'D1',
        'DEMAND',
        'VETO',
        'Causal reconciliation_ok is false — evidence is untrustworthy.',
        true,
        [ev('CDI-02', 'causal.reconciliation_ok', false, 'DERIVED', true)]
      )
    );
    vetoes.push({
      veto_id: 'V1',
      dimension: 'DEMAND',
      statement: 'Causal decomposition does not reconcile.',
      triggering_field: 'causal.reconciliation_ok',
      triggering_value: false,
      veto_basis: 'CONTRACT_INTEGRITY'
    });
  }
  if (!cfVal.valid || !causalVal.valid) {
    state = 'BLOCKING';
    findings.push(
      finding(
        'D1_validator_fail',
        'D1',
        'DEMAND',
        'VETO',
        `CDI-02 validator errors: ${(cfVal.errors || []).concat(causalVal.errors || []).join('; ')}`,
        true,
        [ev('CDI-02', 'validators', false, 'DERIVED', true)]
      )
    );
    vetoes.push({
      veto_id: 'V2',
      dimension: 'DEMAND',
      statement: 'CDI-02 contract validators returned errors.',
      triggering_field: 'validateCounterfactualBaseline|validateCausalDemandContribution',
      triggering_value: false,
      veto_basis: 'CONTRACT_INTEGRITY'
    });
  }

  const posture = bundle.campaign.campaign_intent.intervention_posture;
  if (
    state !== 'BLOCKING' &&
    causal.intervention_uplift_pp <= 0 &&
    (posture === 'CONSIDER_PROMOTION' || posture === 'CONSIDER_NON_PROMOTION')
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'D2_ambient_only',
        'D2',
        'DEMAND',
        'CONSTRAINT',
        'intervention_uplift_pp ≤ 0 while posture claims an intervention — all movement is ambient.',
        true,
        [ev('CDI-02', 'causal.intervention_uplift_pp', causal.intervention_uplift_pp, 'DERIVED', true)]
      )
    );
    conditions.push({
      condition_id: 'D2_attributable_intervention',
      dimension: 'DEMAND',
      statement: 'Produce positive attributable intervention uplift.',
      discharge_test: 'causal.intervention_uplift_pp > 0',
      evidence_gap: 'No intervention-attributed demand',
      blocking_if_unmet: 'REVIEW'
    });
  }

  if (state !== 'BLOCKING' && causal.ambient_uplift_pp > causal.intervention_uplift_pp) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'D3_riding_world',
        'D3',
        'DEMAND',
        'WATCH',
        `Ambient uplift ${causal.ambient_uplift_pp} pp exceeds intervention uplift ${causal.intervention_uplift_pp} pp — campaign is riding the world.`,
        true,
        [
          ev('CDI-02', 'causal.ambient_uplift_pp', causal.ambient_uplift_pp, 'DERIVED', true),
          ev('CDI-02', 'causal.intervention_uplift_pp', causal.intervention_uplift_pp, 'DERIVED', true)
        ]
      )
    );
  }

  const thD1 = getThreshold('TH-D1');
  const residual = causal.drivers.find(d => d.driver_id === 'interaction_residual');
  if (
    residual &&
    causal.intervention_uplift_pp > 0 &&
    Math.abs(residual.contribution_pp) > thD1.value * causal.intervention_uplift_pp
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'D4_residual',
        'D4',
        'DEMAND',
        'CONSTRAINT',
        `interaction_residual |${residual.contribution_pp}| pp exceeds TH-D1 share of intervention uplift.`,
        true,
        [ev('CDI-02', 'causal.drivers[interaction_residual].contribution_pp', residual.contribution_pp, 'DERIVED', true)]
      )
    );
    conditions.push({
      condition_id: 'D4_explain_residual',
      dimension: 'DEMAND',
      statement: 'Reduce unexplained interaction residual below TH-D1 of intervention uplift.',
      discharge_test: `abs(interaction_residual.contribution_pp) <= ${thD1.value} * intervention_uplift_pp`,
      evidence_gap: 'Decomposition residual too large',
      blocking_if_unmet: 'REVIEW'
    });
  }

  const thD2 = getThreshold('TH-D2');
  const interventionDrivers = causal.drivers.filter(
    d => d.driver_class === 'intervention' && d.attributed && d.contribution_pp > 0
  );
  if (causal.intervention_uplift_pp > 0) {
    for (const d of interventionDrivers) {
      if (d.contribution_pp >= thD2.value * causal.intervention_uplift_pp) {
        state = raiseState(state, 'WATCH');
        findings.push(
          finding(
            `D5_concentration_${d.driver_id}`,
            'D5',
            'DEMAND',
            'WATCH',
            `Single intervention driver ${d.driver_id} contributes ${d.contribution_pp} pp (≥ TH-D2 ${(thD2.value * 100).toFixed(0)}% of intervention uplift).`,
            true,
            [ev('CDI-02', `causal.drivers[${d.driver_id}].contribution_pp`, d.contribution_pp, 'DERIVED', true)]
          )
        );
      }
    }
  }

  if (causal.placeholder_fields_excluded.length > 0) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'D6_placeholders',
        'D6',
        'DEMAND',
        'WATCH',
        `Placeholder fields excluded from attribution: ${causal.placeholder_fields_excluded.join(', ')}.`,
        true,
        [
          ev(
            'CDI-02',
            'causal.placeholder_fields_excluded',
            causal.placeholder_fields_excluded.join(','),
            'PLACEHOLDER_EXCLUDED',
            true
          )
        ]
      )
    );
  }

  if (!bundle.includeSignals) {
    if (state === 'CLEAR') state = 'WATCH';
    findings.push(
      finding(
        'D7_signals_off',
        'D7',
        'DEMAND',
        'WATCH',
        'include_signals=false — ambient evidence strength degraded; Demand cannot be CLEAR at OBSERVED strength.',
        true,
        [ev('CDI-02', 'include_signals', false, 'DERIVED', true)]
      )
    );
  }

  if (state === 'CLEAR' && causal.intervention_uplift_pp > 0) {
    findings.push(
      finding(
        'D8_clear',
        'D8',
        'DEMAND',
        'INFO',
        'Causal demand reconciled with positive intervention uplift.',
        true,
        [ev('CDI-02', 'causal.intervention_uplift_pp', causal.intervention_uplift_pp, 'DERIVED', true)]
      )
    );
  }

  return {
    assessment: finalizeDimension(
      'DEMAND',
      state,
      findings,
      ['causal.reconciliation_ok', 'causal.drivers', 'causal.intervention_uplift_pp'],
      []
    ),
    vetoes,
    conditions,
    triggers,
    modelIntegrity
  };
}

export function evaluateOperational(bundle: EvalBundle): {
  assessment: DimensionAssessment;
  vetoes: ReadinessVeto[];
  conditions: ReadinessCondition[];
  triggers: ReadinessChangeTrigger[];
  feasibility?: OperationalFeasibility;
  capacity: CapacityBasis;
  resilience: ResilienceEvidenceRef[];
  modelDivergence: boolean;
  caps: string[];
} {
  const caps: string[] = [];
  const findings: ReadinessFinding[] = [];
  const vetoes: ReadinessVeto[] = [];
  const conditions: ReadinessCondition[] = [];
  const triggers: ReadinessChangeTrigger[] = [];
  const resilience: ResilienceEvidenceRef[] = [];
  let modelDivergence = false;

  const demandUnits = bundle.evaluation.counterfactual.predicted_with_intervention.volume_units;

  if (!bundle.decisionState) {
    caps.push('K3');
    return {
      assessment: emptyDimension(
        'OPERATIONAL',
        'NOT_EVALUATED',
        'Shared Decision State absent for tenant/session — Operational not evaluated (cap K3).'
      ),
      vetoes,
      conditions,
      triggers,
      capacity: {
        demand_source: 'cdi02_predicted_with_intervention',
        demand_units: demandUnits,
        capacity_source: 'wp10c_derived_impacts',
        capacity_units: 0,
        note: 'Decision State absent — capacity side unavailable'
      },
      resilience,
      modelDivergence,
      caps
    };
  }

  const di = bundle.decisionState.derived_impacts;
  const interventions = bundle.decisionState.selected_interventions || [];
  const levers = Object.entries(WP10C_RECOVERY_LEVER_HEADROOM).map(([id, headroom]) => ({
    intervention_id: id,
    headroom_units: headroom,
    applied: interventions.includes(id),
    source: 'wp10c_calculate_derived_impacts' as const
  }));
  const recoverable = levers.filter(l => !l.applied).reduce((s, l) => s + l.headroom_units, 0);
  const gap = di.commitment_gap_units;
  const structurally_infeasible = gap > recoverable;
  // closing_levers is the minimal set of unapplied levers whose combined headroom actually
  // closes the gap — not merely every unapplied lever. Naming a lever that cannot close the
  // gap on its own would publish a discharge test that can never be satisfied.
  const unappliedByHeadroom = levers
    .filter(l => !l.applied && l.headroom_units > 0)
    .sort((a, b) => b.headroom_units - a.headroom_units || a.intervention_id.localeCompare(b.intervention_id));
  const closingSet: string[] = [];
  let cumulative = 0;
  for (const l of unappliedByHeadroom) {
    if (cumulative >= gap) break;
    closingSet.push(l.intervention_id);
    cumulative += l.headroom_units;
  }
  const closing = gap > 0 && cumulative >= gap ? closingSet : [];
  const feasibility: OperationalFeasibility = {
    commitment_gap_units: gap,
    recovery_levers: levers,
    recoverable_headroom_units: recoverable,
    structurally_infeasible,
    closing_levers: closing
  };

  resilience.push(
    { order: 1, field_path: 'commitment_gap_units', value: di.commitment_gap_units, unit: 'units', source: 'wp10c_derived_impacts' },
    { order: 1, field_path: 'delivery_risk_pct', value: di.delivery_risk_pct, unit: 'pct', source: 'wp10c_derived_impacts' },
    { order: 2, field_path: 'dc_overtime_hours', value: di.dc_overtime_hours, unit: 'hours', source: 'wp10c_derived_impacts' },
    { order: 3, field_path: 'margin_erosion_pct', value: di.margin_erosion_pct, unit: 'pct', source: 'wp10c_derived_impacts' }
  );

  // Model divergence — Decision State promotion_lift vs causal total uplift
  const thO5 = getThreshold('TH-O5');
  const dsLift = bundle.decisionState.scenario_parameters.promotion_lift;
  const cdi02Lift = bundle.evaluation.causal.total_predicted_uplift_pp;
  const divergencePp = Math.abs(dsLift - cdi02Lift);
  if (divergencePp > thO5.value) {
    modelDivergence = true;
    findings.push(
      finding(
        'O_model_divergence',
        'O4',
        'OPERATIONAL',
        'WATCH',
        `Model divergence ${divergencePp.toFixed(1)} pp between Decision State promotion_lift (${dsLift}) and CDI-02 total_predicted_uplift_pp (${cdi02Lift}) exceeds TH-O5 (${thO5.value} pp). Published, not silently reconciled.`,
        true,
        [
          ev('WP10-C', 'scenario_parameters.promotion_lift', dsLift, 'DERIVED', true),
          ev('CDI-02', 'causal.total_predicted_uplift_pp', cdi02Lift, 'DERIVED', true)
        ]
      )
    );
  }

  const capacity: CapacityBasis = {
    demand_source: 'cdi02_predicted_with_intervention',
    demand_units: demandUnits,
    capacity_source: 'wp10c_derived_impacts',
    capacity_units: di.supplier_capacity_units,
    model_divergence_pp: modelDivergence ? Number(divergencePp.toFixed(2)) : undefined,
    note:
      'Demand from CDI-02 predicted_with_intervention.volume_units; capacity from WP10-C derived_impacts.supplier_capacity_units. Bases are independent models sharing a 10,000-unit demo base.'
  };

  let state: DimensionState = 'CLEAR';

  // O1 / V4 — structural infeasibility
  if (structurally_infeasible) {
    state = 'BLOCKING';
    findings.push(
      finding(
        'O1_infeasible',
        'O1',
        'OPERATIONAL',
        'VETO',
        `commitment_gap_units ${gap} exceeds recoverable_headroom_units ${recoverable} — structurally unservable even with all unapplied WP10-C levers.`,
        true,
        [
          ev('WP10-C', 'derived_impacts.commitment_gap_units', gap, 'DERIVED', true),
          ev('WP10-C', 'recoverable_headroom_units', recoverable, 'DERIVED', true)
        ]
      )
    );
    vetoes.push({
      veto_id: 'V4',
      dimension: 'OPERATIONAL',
      statement: 'Predicted demand unservable even with every available recovery lever applied.',
      triggering_field: 'derived_impacts.commitment_gap_units',
      triggering_value: gap,
      veto_basis: 'OPERATIONAL_INFEASIBILITY'
    });
  } else if (gap > 0) {
    // O2 — recoverable
    state = raiseState(state, 'CONSTRAINED');
    caps.push('K8');
    const primaryLever = closing.join(' + ') || 'NONE';
    if (closing.length === 0) {
      findings.push(
        finding(
          'O2_no_lever',
          'O2',
          'OPERATIONAL',
          'CONSTRAINT',
          `commitment_gap_units ${gap} within theoretical headroom but no expressible unapplied lever — degrades to REVIEW path.`,
          true,
          [ev('WP10-C', 'derived_impacts.commitment_gap_units', gap, 'DERIVED', true)]
        )
      );
      // no discharge test ⇒ REVIEW at aggregation
    } else {
      findings.push(
        finding(
          'O2_recoverable',
          'O2',
          'OPERATIONAL',
          'CONSTRAINT',
          `commitment_gap_units ${gap} ≤ recoverable_headroom_units ${recoverable}. Apply ${primaryLever} to close the gap (exposure £${di.financial_exposure_gbp}).`,
          true,
          [
            ev('WP10-C', 'derived_impacts.commitment_gap_units', gap, 'DERIVED', true),
            ev('WP10-C', 'derived_impacts.financial_exposure_gbp', di.financial_exposure_gbp, 'DERIVED', true)
          ]
        )
      );
      conditions.push({
        condition_id: 'O2_apply_recovery_lever',
        dimension: 'OPERATIONAL',
        statement: `Apply recovery lever(s) ${primaryLever} (combined headroom ${cumulative} units ≥ gap ${gap}) so commitment_gap_units becomes 0.`,
        discharge_test: `selected_interventions includes [${closing.join(', ')}] AND commitment_gap_units === 0`,
        evidence_gap: `Lever(s) ${primaryLever} not yet applied`,
        blocking_if_unmet: 'REVIEW'
      });
      triggers.push({
        dimension: 'OPERATIONAL',
        field_path: 'derived_impacts.commitment_gap_units',
        current_value: gap,
        threshold: 0,
        direction: 'DECREASE',
        would_change_dimension_to: 'CLEAR',
        would_change_state_to: 'GO'
      });
    }
  }

  // O3 — service-risk thresholds (never veto)
  const thO1 = getThreshold('TH-O1');
  const thO2 = getThreshold('TH-O2');
  if (
    di.stockout_probability_pct >= thO1.value ||
    (di.delivery_risk_pct >= thO2.value && gap > 0)
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'O3_service_risk',
        'O3',
        'OPERATIONAL',
        'CONSTRAINT',
        `Service-risk pressure: stockout ${di.stockout_probability_pct}% (TH-O1 ${thO1.value}) / delivery risk ${di.delivery_risk_pct}% (TH-O2 ${thO2.value}). Never a veto — synthetic demonstration thresholds.`,
        true,
        [
          ev('WP10-C', 'derived_impacts.stockout_probability_pct', di.stockout_probability_pct, 'DERIVED', true),
          ev('WP10-C', 'derived_impacts.delivery_risk_pct', di.delivery_risk_pct, 'DERIVED', true)
        ]
      )
    );
    if (!conditions.some(c => c.condition_id === 'O2_apply_recovery_lever')) {
      conditions.push({
        condition_id: 'O3_reduce_service_risk',
        dimension: 'OPERATIONAL',
        statement: 'Reduce stockout/delivery risk below TH-O1/TH-O2 via capacity actions.',
        discharge_test: `stockout_probability_pct < ${thO1.value} AND (delivery_risk_pct < ${thO2.value} OR commitment_gap_units === 0)`,
        evidence_gap: 'Service-risk thresholds breached',
        blocking_if_unmet: 'REVIEW'
      });
    }
  }

  // O4 — CDI-02 volume > capacity while gap=0 ⇒ model disagreement
  if (demandUnits > di.supplier_capacity_units && gap === 0) {
    state = raiseState(state, 'CONSTRAINED');
    modelDivergence = true;
    findings.push(
      finding(
        'O4_capacity_disagreement',
        'O4',
        'OPERATIONAL',
        'CONSTRAINT',
        `CDI-02 predicted volume ${demandUnits} > WP10-C capacity ${di.supplier_capacity_units} while commitment_gap_units=0 — models disagree about feasibility.`,
        true,
        [
          ev('CDI-02', 'predicted_with_intervention.volume_units', demandUnits, 'DERIVED', true),
          ev('WP10-C', 'derived_impacts.supplier_capacity_units', di.supplier_capacity_units, 'DERIVED', true)
        ]
      )
    );
    conditions.push({
      condition_id: 'O4_reconcile_models',
      dimension: 'OPERATIONAL',
      statement: 'Reconcile CDI-02 demand and WP10-C capacity bases before unconditional proceed.',
      discharge_test: 'predicted_with_intervention.volume_units <= supplier_capacity_units OR commitment_gap_units reflects the shortfall',
      evidence_gap: 'Independent demand/capacity models disagree',
      blocking_if_unmet: 'REVIEW'
    });
  }

  // O5 — second/third order cost
  const thO3 = getThreshold('TH-O3');
  const thO4 = getThreshold('TH-O4');
  const overtimeRatio = (di.dc_overtime_hours - DC_OVERTIME_BASELINE_HOURS) / DC_OVERTIME_BASELINE_HOURS;
  if (overtimeRatio >= thO3.value || di.margin_erosion_pct >= thO4.value) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'O5_ripple_cost',
        'O5',
        'OPERATIONAL',
        'WATCH',
        `Second/third-order cost: DC overtime ${di.dc_overtime_hours}h / margin erosion ${di.margin_erosion_pct}% (TH-O3/TH-O4).`,
        true,
        [
          ev('WP10-C', 'derived_impacts.dc_overtime_hours', di.dc_overtime_hours, 'DERIVED', true),
          ev('WP10-C', 'derived_impacts.margin_erosion_pct', di.margin_erosion_pct, 'DERIVED', true)
        ]
      )
    );
  }

  // O6 depends on ESF-2 supply signals that CDI-04 does not consume. Published, not silent.
  findings.push(
    finding(
      'O6_not_evaluated',
      'O6',
      'OPERATIONAL',
      'INFO',
      'O6 (SUPPLIER_CAPACITY_PRESSURE / SUPPLIER_LEAD_TIME_DRIFT escalation) not evaluated — CDI-04 consumes no ESF-2 supply signal channel. Absence of an adverse supply signal is not evidence of supply health.',
      false,
      [ev('ESF-2', 'supply_signal_observations', 'unavailable', 'MISSING', true)]
    )
  );

  if (state === 'CLEAR' && gap === 0) {
    findings.push(
      finding(
        'O8_clear',
        'O8',
        'OPERATIONAL',
        'INFO',
        'No commitment gap and no adverse supply-pressure findings.',
        true,
        [ev('WP10-C', 'derived_impacts.commitment_gap_units', 0, 'DERIVED', true)]
      )
    );
  }

  return {
    assessment: finalizeDimension(
      'OPERATIONAL',
      state,
      findings,
      ['derived_impacts.commitment_gap_units', 'derived_impacts.supplier_capacity_units'],
      []
    ),
    vetoes,
    conditions,
    triggers,
    feasibility,
    capacity,
    resilience,
    modelDivergence,
    caps
  };
}

export function evaluateContext(bundle: EvalBundle): {
  assessment: DimensionAssessment;
  conditions: ReadinessCondition[];
  caps: string[];
} {
  const caps: string[] = [];
  const findings: ReadinessFinding[] = [];
  const conditions: ReadinessCondition[] = [];

  if (!bundle.discovery) {
    caps.push('K2');
    return {
      assessment: emptyDimension(
        'CONTEXT',
        'NOT_EVALUATED',
        'CDI-03 opportunity discovery not supplied — Context not evaluated (cap K2).'
      ),
      conditions,
      caps
    };
  }

  const windows = bundle.discovery.opportunity_windows;
  const rec = windows.recommended_window;
  const anchor = windows.discovery_anchor;
  let state: DimensionState = 'CLEAR';

  const anchorEv = ev(
    'CDI-03',
    'opportunity_windows.discovery_anchor',
    anchor.anchor_date,
    'SEEDED_ASSUMPTION',
    true,
    anchor.disclosure
  );

  if (rec.tier === 'AVOID' && rec.is_stated_dates) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'X1_stated_hostile',
        'X1',
        'CONTEXT',
        'CONSTRAINT',
        'Stated dates land in an AVOID window tier — campaign dates are hostile.',
        true,
        [anchorEv, ev('CDI-03', 'recommended_window.tier', rec.tier, 'SEEDED_ASSUMPTION', true, anchor.disclosure)]
      )
    );
    conditions.push({
      condition_id: 'X1_revise_dates',
      dimension: 'CONTEXT',
      statement: 'Revise planned dates away from AVOID tier or accept explicit executive override rationale.',
      discharge_test: "recommended_window.tier !== 'AVOID' OR executive_override_declared",
      evidence_gap: 'Stated window is hostile',
      blocking_if_unmet: 'REVIEW'
    });
  } else if (rec.tier === 'AVOID') {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'X2_best_still_poor',
        'X2',
        'CONTEXT',
        'CONSTRAINT',
        'Best discoverable window is still AVOID.',
        true,
        [anchorEv, ev('CDI-03', 'recommended_window.tier', rec.tier, 'SEEDED_ASSUMPTION', true, anchor.disclosure)]
      )
    );
    conditions.push({
      condition_id: 'X2_improve_window',
      dimension: 'CONTEXT',
      statement: 'Identify a non-AVOID opportunity window before unconditional proceed.',
      discharge_test: "recommended_window.tier !== 'AVOID'",
      evidence_gap: 'No acceptable window discovered',
      blocking_if_unmet: 'REVIEW'
    });
  }

  if (rec.tier === 'SUBOPTIMAL') {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'X3_suboptimal',
        'X3',
        'CONTEXT',
        'WATCH',
        'Recommended window tier is SUBOPTIMAL.',
        true,
        [anchorEv, ev('CDI-03', 'recommended_window.tier', rec.tier, 'SEEDED_ASSUMPTION', true, anchor.disclosure)]
      )
    );
  }

  if (
    windows.timing_mode === 'FIND_BEST_WINDOW' &&
    !bundle.evaluation.causal.drivers
      .find(d => d.driver_id === 'temporal_response')
      ?.evidence_refs.includes('CDI03_RESOLVED_OPPORTUNITY_WINDOW')
  ) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'X4_unresolved_timing',
        'X4',
        'CONTEXT',
        'WATCH',
        'FIND_BEST_WINDOW evaluated without resolved_temporal_uplift_pp — causal still carries timing placeholder dampener.',
        true,
        [ev('CDI-02', 'temporal_response.evidence_refs', 'unresolved', 'PLACEHOLDER_EXCLUDED', true)]
      )
    );
  }

  // X6 — preferred/acceptable with seeded strength
  if ((rec.tier === 'PREFERRED' || rec.tier === 'ACCEPTABLE') && state === 'CLEAR') {
    findings.push(
      finding(
        'X6_clear_seeded',
        'X6',
        'CONTEXT',
        'INFO',
        `Window tier ${rec.tier} with no adverse contextual signal — CLEAR at SEEDED_ASSUMPTION strength (demo anchor ${anchor.anchor_date}).`,
        true,
        [anchorEv, ev('CDI-03', 'recommended_window.tier', rec.tier, 'SEEDED_ASSUMPTION', true, anchor.disclosure)]
      )
    );
  }

  // X5 depends on an ESF-2 contextual-signal channel that CDI-04 does not consume. Publish
  // the gap rather than letting an unevaluated rule read as a silent pass: TH-X1 is declared
  // in the threshold policy, so a reader must be able to see that no rule consumed it here.
  findings.push(
    finding(
      'X5_not_evaluated',
      'X5',
      'CONTEXT',
      'INFO',
      'X5 (concurrent adverse contextual signals, TH-X1) not evaluated — CDI-04 consumes no ESF-2 contextual signal channel. Absence of adverse-signal evidence is not evidence of a supportive context.',
      false,
      [ev('ESF-2', 'contextual_signal_observations', 'unavailable', 'MISSING', true)]
    )
  );

  // Anchor rule: decisive seeded findings ⇒ cannot be OBSERVED CLEAR; cap K1
  caps.push('K1');

  return {
    assessment: finalizeDimension(
      'CONTEXT',
      state,
      findings,
      ['opportunity_windows.recommended_window', 'opportunity_windows.discovery_anchor'],
      []
    ),
    conditions,
    caps
  };
}

export function evaluateCustomer(bundle: EvalBundle): {
  assessment: DimensionAssessment;
  vetoes: ReadinessVeto[];
  conditions: ReadinessCondition[];
  caps: string[];
} {
  const caps: string[] = [];
  const findings: ReadinessFinding[] = [];
  const vetoes: ReadinessVeto[] = [];
  const conditions: ReadinessCondition[] = [];

  if (!bundle.discovery) {
    caps.push('K2');
    return {
      assessment: emptyDimension(
        'CUSTOMER',
        'NOT_EVALUATED',
        'CDI-03 micro-market discovery not supplied — Customer not evaluated (cap K2).'
      ),
      vetoes,
      conditions,
      caps
    };
  }

  const mm = bundle.discovery.micro_markets;
  let state: DimensionState = 'CLEAR';

  // U1 / V5
  if (mm.stores_included === 0) {
    state = 'BLOCKING';
    findings.push(
      finding(
        'U1_no_estate',
        'U1',
        'CUSTOMER',
        'VETO',
        'stores_included = 0 — no addressable estate.',
        true,
        [ev('CDI-03', 'micro_markets.stores_included', 0, 'DERIVED', true)]
      )
    );
    vetoes.push({
      veto_id: 'V5',
      dimension: 'CUSTOMER',
      statement: 'No addressable estate.',
      triggering_field: 'micro_markets.stores_included',
      triggering_value: 0,
      veto_basis: 'NO_ADDRESSABLE_ESTATE'
    });
  } else if (mm.stores_included <= 2) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'U2_thin_estate',
        'U2',
        'CUSTOMER',
        'CONSTRAINT',
        `Only ${mm.stores_included} stores included — estate too thin to carry predicted volume.`,
        true,
        [ev('CDI-03', 'micro_markets.stores_included', mm.stores_included, 'DERIVED', true)]
      )
    );
    conditions.push({
      condition_id: 'U2_broaden_estate',
      dimension: 'CUSTOMER',
      statement: 'Include more than 2 stores in the addressable cohort.',
      discharge_test: 'micro_markets.stores_included > 2',
      evidence_gap: 'Addressable estate too thin',
      blocking_if_unmet: 'REVIEW'
    });
  }

  const thU1 = getThreshold('TH-U1');
  const selectivity = mm.stores_evaluated > 0 ? mm.stores_included / mm.stores_evaluated : 0;
  if (state !== 'BLOCKING' && selectivity >= thU1.value) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'U3_low_selectivity',
        'U3',
        'CUSTOMER',
        'WATCH',
        `Selectivity ${(selectivity * 100).toFixed(0)}% ≥ TH-U1 ${(thU1.value * 100).toFixed(0)}% — national campaign wearing a targeting label (CDI-03 residual risk 6). Tiers inherited verbatim.`,
        true,
        [ev('CDI-03', 'micro_markets.stores_included/stores_evaluated', Number(selectivity.toFixed(3)), 'DERIVED', true)]
      )
    );
  }

  if (bundle.campaign.audience_market.customer_segment) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'U4_segment_assumption',
        'U4',
        'CUSTOMER',
        'WATCH',
        `customer_segment "${bundle.campaign.audience_market.customer_segment}" stated without supporting customer signal — assumption, not evidence.`,
        true,
        [
          ev(
            'CDI-01',
            'audience_market.customer_segment',
            bundle.campaign.audience_market.customer_segment,
            'DECLARED_INPUT',
            false
          )
        ]
      )
    );
  }

  const thU2 = getThreshold('TH-U2');
  const availExcluded = mm.stores.filter(
    s => !s.included && s.exclusion_reasons.some(r => /availability/i.test(r))
  ).length;
  const availShare = mm.stores_evaluated > 0 ? availExcluded / mm.stores_evaluated : 0;
  if (availShare >= thU2.value) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'U5_availability_proxy',
        'U5',
        'CUSTOMER',
        'CONSTRAINT',
        `${(availShare * 100).toFixed(0)}% of stores excluded for availability reasons (TH-U2 ${(thU2.value * 100).toFixed(0)}%). CDI-03 availability is a hash PROXY — not live inventory.`,
        true,
        [ev('CDI-03', 'availability_exclusion_share', Number(availShare.toFixed(3)), 'PROXY', true, 'Hash-based availability proxy')]
      )
    );
    conditions.push({
      condition_id: 'U5_confirm_availability',
      dimension: 'CUSTOMER',
      statement: 'Confirm real availability for excluded stores or narrow the campaign scope.',
      discharge_test: `availability_exclusion_share < ${thU2.value}`,
      evidence_gap: 'Availability is PROXY strength',
      blocking_if_unmet: 'REVIEW'
    });
  }

  if (state === 'CLEAR') {
    findings.push(
      finding(
        'U6_clear',
        'U6',
        'CUSTOMER',
        'INFO',
        `Selectivity in range with ${mm.stores_included} included stores — CDI-03 tiers inherited.`,
        true,
        [ev('CDI-03', 'micro_markets.stores_included', mm.stores_included, 'DERIVED', true)]
      )
    );
  }

  return {
    assessment: finalizeDimension(
      'CUSTOMER',
      state,
      findings,
      ['micro_markets.stores_included', 'micro_markets.stores_evaluated'],
      []
    ),
    vetoes,
    conditions,
    caps
  };
}

export function evaluateStrategic(bundle: EvalBundle): {
  assessment: DimensionAssessment;
  conditions: ReadinessCondition[];
} {
  const findings: ReadinessFinding[] = [];
  const conditions: ReadinessCondition[] = [];
  let state: DimensionState = 'CLEAR';
  const intent = bundle.campaign;
  const delta = bundle.evaluation.counterfactual.campaign_delta;
  const causal = bundle.evaluation.causal;
  const posture = intent.campaign_intent.intervention_posture;

  if (
    intent.campaign_intent.objective_type === 'INVENTORY_CLEARANCE' &&
    delta.waste_delta_units >= 0
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'S1_clearance_miss',
        'S1',
        'STRATEGIC',
        'CONSTRAINT',
        'INVENTORY_CLEARANCE objective but waste_delta_units ≥ 0 — intervention does not serve stated objective.',
        true,
        [
          ev('CDI-02', 'campaign_delta.waste_delta_units', delta.waste_delta_units, 'DERIVED_KNOWN_DISCONTINUITY', true),
          ev('CDI-01', 'campaign_intent.objective_type', 'INVENTORY_CLEARANCE', 'DECLARED_INPUT', false)
        ]
      )
    );
    conditions.push({
      condition_id: 'S1_serve_clearance',
      dimension: 'STRATEGIC',
      statement: 'Produce waste reduction (waste_delta_units < 0) or revise objective.',
      discharge_test: 'waste_delta_units < 0 OR objective_type !== INVENTORY_CLEARANCE',
      evidence_gap: 'Clearance objective unmet',
      blocking_if_unmet: 'REVIEW'
    });
  }

  const metric = intent.baseline_objective.primary_metric;
  if (
    metric === 'CONTRIBUTION' &&
    delta.contribution_delta_gbp <= 0 &&
    delta.volume_delta_units > 0
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'S2_objective_drift',
        'S2',
        'STRATEGIC',
        'CONSTRAINT',
        'primary_metric is CONTRIBUTION but value lands only as volume — objective drift.',
        true,
        [
          ev('CDI-01', 'baseline_objective.primary_metric', metric, 'DECLARED_INPUT', false),
          ev('CDI-02', 'campaign_delta.contribution_delta_gbp', delta.contribution_delta_gbp, 'DERIVED', true)
        ]
      )
    );
    conditions.push({
      condition_id: 'S2_align_metric',
      dimension: 'STRATEGIC',
      statement: 'Align delivered value with stated primary_metric or revise the metric.',
      discharge_test: 'contribution_delta_gbp > 0 OR primary_metric !== CONTRIBUTION',
      evidence_gap: 'Metric/value mismatch',
      blocking_if_unmet: 'REVIEW'
    });
  }

  if (posture === 'UNDECIDED') {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'S3_undecided',
        'S3',
        'STRATEGIC',
        'CONSTRAINT',
        'intervention_posture is UNDECIDED — readiness for what?',
        true,
        [ev('CDI-01', 'campaign_intent.intervention_posture', 'UNDECIDED', 'DECLARED_INPUT', false)]
      )
    );
    conditions.push({
      condition_id: 'S3_decide_posture',
      dimension: 'STRATEGIC',
      statement: 'Select an intervention posture.',
      discharge_test: "intervention_posture !== 'UNDECIDED'",
      evidence_gap: 'No intervention specified',
      blocking_if_unmet: 'REVIEW'
    });
  }

  if (posture === 'CONSIDER_DO_NOTHING') {
    findings.push(
      finding(
        'S4_do_nothing',
        'S4',
        'STRATEGIC',
        'INFO',
        'Posture is CONSIDER_DO_NOTHING — assessment is readiness about inaction; dimensions labelled accordingly.',
        true,
        [ev('CDI-01', 'campaign_intent.intervention_posture', 'CONSIDER_DO_NOTHING', 'DECLARED_INPUT', false)]
      )
    );
  }

  if (
    posture === 'CONSIDER_PROMOTION' &&
    causal.placeholder_fields_excluded.length > 0
  ) {
    state = raiseState(state, 'CONSTRAINED');
    findings.push(
      finding(
        'S5_unspecified_promo',
        'S5',
        'STRATEGIC',
        'CONSTRAINT',
        `CONSIDER_PROMOTION with placeholder exclusions [${causal.placeholder_fields_excluded.join(', ')}] — promotion not fully specified.`,
        true,
        [
          ev(
            'CDI-02',
            'causal.placeholder_fields_excluded',
            causal.placeholder_fields_excluded.join(','),
            'PLACEHOLDER_EXCLUDED',
            true
          )
        ]
      )
    );
    conditions.push({
      condition_id: 'S5_state_mechanic',
      dimension: 'STRATEGIC',
      statement: 'State canvas promotion mechanic and discount depth.',
      discharge_test: 'placeholder_fields_excluded does not include promotion_type or discount_depth',
      evidence_gap: 'Promotion unspecified',
      blocking_if_unmet: 'REVIEW'
    });
  }

  const openQ = intent.decision_context.open_questions || [];
  if (openQ.length > 0) {
    state = raiseState(state, 'WATCH');
    findings.push(
      finding(
        'S6_open_questions',
        'S6',
        'STRATEGIC',
        'WATCH',
        `Open questions: ${openQ.join(' | ')}`,
        true,
        [ev('CDI-01', 'decision_context.open_questions', openQ.join(' | '), 'DECLARED_INPUT', false)]
      )
    );
  }

  if (state === 'CLEAR') {
    findings.push(
      finding(
        'S7_clear',
        'S7',
        'STRATEGIC',
        'INFO',
        'Objective, metric, posture and mechanic are mutually coherent.',
        true,
        [ev('CDI-01', 'campaign_intent.objective_type', intent.campaign_intent.objective_type, 'DECLARED_INPUT', false)]
      )
    );
  }

  return {
    assessment: finalizeDimension(
      'STRATEGIC',
      state,
      findings,
      ['campaign_intent.objective_type', 'intervention_posture'],
      []
    ),
    conditions
  };
}

function applyCaps(
  caps: Set<string>,
  dimensions: DimensionAssessment[],
  contribution: number,
  confidenceBand: ConfidenceBand,
  includeSignals: boolean,
  modelDivergence: boolean
): string[] {
  const applied: string[] = [];
  for (const d of dimensions) {
    const decisiveStrengths = d.findings.filter(f => f.decisive).flatMap(f => f.evidence.map(e => e.strength));
    if (
      decisiveStrengths.some(s => s === 'SEEDED_ASSUMPTION' || s === 'PROXY') ||
      d.evidence_strength_floor === 'SEEDED_ASSUMPTION' ||
      d.evidence_strength_floor === 'PROXY'
    ) {
      caps.add('K1');
    }
  }
  if (!includeSignals) caps.add('K4');
  if (contribution < 0) caps.add('K7');
  if (confidenceBand === 'LOW') caps.add('K5');
  if (confidenceBand === 'INSUFFICIENT') caps.add('K6');
  if (modelDivergence && confidenceBand === 'HIGH') {
    // divergence caps confidence at MODERATE — handled in confidence derivation
  }
  return [...caps];
}

const CONFIDENCE_BAND_ORDER: ConfidenceBand[] = ['HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT'];

/** Lowers a band to a ceiling. Never raises — mirrors the cap discipline of §3.4. */
function capBand(band: ConfidenceBand, ceiling: ConfidenceBand): ConfidenceBand {
  return CONFIDENCE_BAND_ORDER.indexOf(ceiling) > CONFIDENCE_BAND_ORDER.indexOf(band) ? ceiling : band;
}

/**
 * Confidence per design gate §4.2, reconciled at implementation review:
 *  - LOW is reserved for a missing REQUIRED input (CDI-01/CDI-02 HARD) or a PROXY strength floor.
 *  - An absent OPTIONAL integration (CDI-03, Decision State, signals) lowers the band to
 *    MODERATE and is handled at aggregation by caps K2/K3/K4 — owner ruling U6 is "cap, not
 *    forced REVIEW", so optional absence must not reach LOW (which would trip cap K5 ⇒ REVIEW).
 *  - model_divergence caps the band at MODERATE (§2.5 rule 4, acceptance criterion 18); it is
 *    published and consequential, but never demotes to LOW on divergence alone.
 */
function deriveConfidence(
  dimensions: DimensionAssessment[],
  modelIntegrity: {
    counterfactual_valid: boolean;
    causal_valid: boolean;
    reconciliation_ok: boolean;
    model_divergence: boolean;
  },
  missingRequired: string[],
  missingOptional: string[]
): { band: ConfidenceBand; floor: EvidenceStrength; index: number } {
  const allDecisive = dimensions.flatMap(d => d.findings.filter(f => f.decisive).flatMap(f => f.evidence.map(e => e.strength)));
  const floor = weakestEvidenceStrength(allDecisive.length ? allDecisive : ['MISSING']);
  const insufficientDims = dimensions.filter(d => d.state === 'INSUFFICIENT_EVIDENCE').length;
  const integrityFailed =
    !modelIntegrity.counterfactual_valid ||
    !modelIntegrity.causal_valid ||
    !modelIntegrity.reconciliation_ok;

  let band: ConfidenceBand;
  if (integrityFailed || insufficientDims >= 2) {
    band = 'INSUFFICIENT';
  } else if (missingRequired.length > 0 || floor === 'PROXY' || floor === 'MISSING') {
    // §4.2 enumerates LOW: a missing REQUIRED input, or a PROXY floor. MISSING is added as
    // the strictly weaker case of the same kind (a decisive finding resting on no evidence).
    // PROXY is a stand-in *used as if* it were a measurement, which is why it lands here.
    band = 'LOW';
  } else if (EVIDENCE_STRENGTH_ORDER.indexOf(floor) <= EVIDENCE_STRENGTH_ORDER.indexOf('DERIVED')) {
    band = 'HIGH';
  } else {
    // DECLARED_INPUT / SEEDED_ASSUMPTION / PLACEHOLDER_EXCLUDED floors.
    //
    // PLACEHOLDER_EXCLUDED is NOT a LOW trigger under §4.2. It marks a CDI-01 compatibility
    // field deliberately *excluded* from attribution — a record of evidence not used, not weak
    // evidence relied upon. Banding it LOW would trip cap K5 and force REVIEW on the default
    // demo path, contradicting the §2.5 demo-path consequence (CONDITIONAL_GO) and §3.2's
    // definition of REVIEW as genuine indeterminacy. The placeholder stays fully consequential:
    // it still raises D6/S5, is still listed verbatim, is still published as the strength
    // floor, and under §4.1(2) can never raise a dimension state.
    band = 'MODERATE';
  }

  // Ceilings — lower only, never raise.
  if (modelIntegrity.model_divergence) band = capBand(band, 'MODERATE');
  if (missingOptional.length > 0) band = capBand(band, 'MODERATE');

  const indexMap: Record<ConfidenceBand, number> = {
    HIGH: 85,
    MODERATE: 65,
    LOW: 40,
    INSUFFICIENT: 15
  };
  return { band, floor, index: indexMap[band] };
}

function aggregateState(
  dimensions: DimensionAssessment[],
  conditions: ReadinessCondition[],
  caps: string[]
): ReadinessState {
  const states = dimensions.map(d => d.state);
  if (states.includes('BLOCKING')) return 'DO_NOT_PROCEED';
  if (states.includes('INSUFFICIENT_EVIDENCE')) return 'REVIEW';

  const constrainedDims = dimensions.filter(d => d.state === 'CONSTRAINED');
  if (constrainedDims.length > 0) {
    const allDischargeable = constrainedDims.every(d =>
      conditions.some(c => c.dimension === d.dimension && !!c.discharge_test)
    );
    if (!allDischargeable) return 'REVIEW';
    // Apply caps after CONDITIONAL_GO base
    let state: ReadinessState = 'CONDITIONAL_GO';
    return applyCeilingCaps(state, caps);
  }

  if (states.includes('WATCH') || states.includes('NOT_EVALUATED')) {
    return applyCeilingCaps('CONDITIONAL_GO', caps);
  }

  // All CLEAR
  return applyCeilingCaps('GO', caps);
}

function applyCeilingCaps(state: ReadinessState, caps: string[]): ReadinessState {
  const order: ReadinessState[] = ['GO', 'CONDITIONAL_GO', 'REVIEW', 'DO_NOT_PROCEED'];
  let idx = order.indexOf(state);
  for (const cap of caps) {
    let ceiling: ReadinessState = 'GO';
    if (cap === 'K5' || cap === 'K6') ceiling = 'REVIEW';
    else if (['K1', 'K2', 'K3', 'K4', 'K7', 'K8'].includes(cap)) ceiling = 'CONDITIONAL_GO';
    idx = Math.max(idx, order.indexOf(ceiling));
  }
  return order[idx];
}

function headlineFor(state: ReadinessState, vetoes: ReadinessVeto[], conditions: ReadinessCondition[]): string {
  if (state === 'DO_NOT_PROCEED') {
    return `Do not proceed — ${vetoes.map(v => v.veto_id).join(', ') || 'hard veto'} fired for this intervention as specified.`;
  }
  if (state === 'REVIEW') {
    return 'Review required — the model cannot responsibly distinguish GO from a veto, or a constraint lacks a discharge test.';
  }
  if (state === 'CONDITIONAL_GO') {
    return `Conditional go — ${conditions.length} testable condition(s) must be discharged before unconditional proceed.`;
  }
  return 'Go — all six dimensions CLEAR with sufficient evidence strength and confidence.';
}

function resolveCampaign(request: ReadinessEvaluationRequest): CampaignIntent {
  let campaign = request.campaign_intent;
  if (!campaign && request.campaign_intent_id) {
    campaign =
      getCampaignIntentById(request.campaign_intent_id, request.tenant_id, request.session_id) ||
      undefined;
    if (!campaign) {
      throw Object.assign(
        new Error(`CampaignIntentNotFound: ${request.campaign_intent_id}`),
        { rejection_id: 'R3' }
      );
    }
  }
  if (!campaign) throw new Error('Provide campaign_intent_id or campaign_intent');
  if (campaign.tenant_id !== request.tenant_id) {
    throw Object.assign(new Error('Tenant boundary violation'), { rejection_id: 'R3' });
  }
  if (campaign.session_id !== request.session_id) {
    throw Object.assign(new Error('Session boundary violation'), { rejection_id: 'R3' });
  }
  return campaign;
}

export function evaluateCampaignReadiness(
  request: ReadinessEvaluationRequest
): ReadinessEvaluationResponse {
  const reqVal = validateReadinessEvaluationRequest(request);
  if (!reqVal.valid) {
    throw Object.assign(new Error(reqVal.errors.join('; ')), {
      rejection_id: reqVal.rejection_id || 'R_VALIDATION'
    });
  }

  const campaign = resolveCampaign(request);

  // R1 — must be REGISTERED
  if (campaign.status !== 'REGISTERED') {
    throw Object.assign(new Error('R1: CampaignIntent.status must be REGISTERED'), {
      rejection_id: 'R1'
    });
  }

  // R2 — KNOWN_DATES requires stated range
  if (campaign.audience_market.timing_mode === 'KNOWN_DATES') {
    if (!campaign.audience_market.planned_start || !campaign.audience_market.planned_end) {
      throw Object.assign(
        new Error('R2: KNOWN_DATES requires valid planned_start and planned_end'),
        { rejection_id: 'R2' }
      );
    }
  }

  const includeSignals = request.include_signals !== false;
  const timestamp = request.evaluation_timestamp || campaign.updated_at;

  // Objective class + R5 before scoring
  const objectiveClass = deriveCommercialObjectiveClass(campaign);
  if (request.economic_tolerance && objectiveClass === 'VALUE_CREATION') {
    throw Object.assign(
      new Error(
        'R5: economic_tolerance illegal alongside VALUE_CREATION objective — cannot pre-authorise destroying the metric committed to increase/protect'
      ),
      { rejection_id: 'R5' }
    );
  }

  let evaluation = request.campaign_evaluation;
  if (evaluation) {
    if (evaluation.campaign_intent_id !== campaign.campaign_intent_id) {
      throw Object.assign(new Error('R4: campaign_evaluation references a different campaign_intent_id'), {
        rejection_id: 'R4'
      });
    }
    if (evaluation.tenant_id !== request.tenant_id || evaluation.session_id !== request.session_id) {
      throw Object.assign(new Error('R3: campaign_evaluation tenant/session mismatch'), {
        rejection_id: 'R3'
      });
    }
  } else {
    evaluation = evaluateCampaignDecision({
      tenant_id: request.tenant_id,
      session_id: request.session_id,
      campaign_intent: campaign,
      include_signals: includeSignals
    });
  }

  let discovery = request.opportunity_discovery;
  if (discovery) {
    if (
      discovery.tenant_id !== request.tenant_id ||
      discovery.session_id !== request.session_id ||
      discovery.campaign_intent_id !== campaign.campaign_intent_id
    ) {
      throw Object.assign(new Error('R3: opportunity_discovery tenant/session/campaign mismatch'), {
        rejection_id: 'R3'
      });
    }
  }

  let decisionState: DecisionState | undefined;
  // Strictly read-only (design gate §5.3 / AC-17). peekCurrentStateBySession never
  // initialises state: when a tenant/session has no Decision State, Operational is
  // NOT_EVALUATED under rule O7 and cap K3 applies. Using the auto-creating
  // getCurrentStateBySession here would make CDI-04 a writer to WP10-C and would make
  // O7/K3 unreachable.
  try {
    const existing = decisionStateStore.peekCurrentStateBySession(request.session_id, request.tenant_id);
    decisionState = existing || undefined;
  } catch {
    decisionState = undefined;
  }

  const bundle: EvalBundle = {
    campaign,
    evaluation,
    discovery,
    decisionState,
    includeSignals,
    economicTolerance: request.economic_tolerance,
    timestamp
  };

  const commercial = evaluateCommercial(bundle, objectiveClass);
  const demand = evaluateDemand(bundle);
  const operational = evaluateOperational(bundle);
  const context = evaluateContext(bundle);
  const customer = evaluateCustomer(bundle);
  const strategic = evaluateStrategic(bundle);

  const dimensionsMap: Record<string, DimensionAssessment> = {
    COMMERCIAL: commercial.assessment,
    DEMAND: demand.assessment,
    OPERATIONAL: operational.assessment,
    CONTEXT: context.assessment,
    CUSTOMER: customer.assessment,
    STRATEGIC: strategic.assessment
  };
  const dimensions = READINESS_DIMENSION_ORDER.map(id => dimensionsMap[id]);

  const vetoes = [
    ...commercial.vetoes,
    ...demand.vetoes,
    ...operational.vetoes,
    ...customer.vetoes
  ];
  const conditions = [
    ...commercial.conditions,
    ...demand.conditions,
    ...operational.conditions,
    ...context.conditions,
    ...customer.conditions,
    ...strategic.conditions
  ];
  const triggers = [
    ...commercial.triggers,
    ...demand.triggers,
    ...operational.triggers
  ];

  // A WATCH dimension is observational: §3.3 puts WATCH-only at CONDITIONAL_GO, and the
  // validator requires a condition row for it, so a monitoring condition is synthesised.
  //
  // A CONSTRAINED dimension is NOT synthesised for. Per §3.7 a constraint is only a condition
  // when the rule that produced it authored a real, re-runnable discharge test over named
  // contract fields; synthesising "DIMENSION.state === 'CLEAR'" would restate the finding
  // rather than test it, and would turn CONDITIONAL_GO into the wastebasket the gate forbids.
  // A CONSTRAINED dimension with no rule-authored discharge test therefore degrades to REVIEW
  // in aggregateState — which is what makes acceptance criterion 10f reachable.
  for (const d of dimensions) {
    if (d.state === 'WATCH' && !conditions.some(c => c.dimension === d.dimension && c.discharge_test)) {
      const decisiveFinding = d.findings.find(f => f.decisive);
      conditions.push({
        condition_id: `${d.dimension}_monitor_watch`,
        dimension: d.dimension,
        statement: `Monitor ${d.dimension} watch finding before unconditional proceed.`,
        discharge_test: `no ${d.dimension} finding with severity WATCH remains (currently ${
          d.findings.filter(f => f.severity === 'WATCH').map(f => f.rule_id).join(', ') || 'none'
        })`,
        evidence_gap: decisiveFinding?.statement || `${d.dimension} not CLEAR`,
        blocking_if_unmet: 'REVIEW'
      });
    }
  }

  const capsSet = new Set<string>([
    ...operational.caps,
    ...context.caps,
    ...customer.caps
  ]);

  // HARD inputs (CDI-01 intent + CDI-02 counterfactual/causal). Absence here is a missing
  // REQUIRED input and drives confidence to LOW (§4.2).
  const requiredInputs = ['campaign_intent', 'counterfactual', 'causal'];
  // INTEGRATION inputs. Absence is a cap (K2/K3/K4) and a MODERATE confidence ceiling —
  // never a silent pass, and never LOW/REVIEW by absence alone (owner ruling U6).
  const optionalIntegrations = ['derived_impacts', 'opportunity_windows', 'micro_markets', 'signals'];
  const presentInputs = [
    'campaign_intent',
    'counterfactual',
    'causal',
    ...(decisionState ? ['derived_impacts'] : []),
    ...(discovery ? ['opportunity_windows', 'micro_markets'] : []),
    ...(includeSignals ? ['signals'] : [])
  ];
  const missingRequired = requiredInputs.filter(r => !presentInputs.includes(r));
  const missingOptional = optionalIntegrations.filter(o => !presentInputs.includes(o));

  const confidence = deriveConfidence(
    dimensions,
    {
      ...demand.modelIntegrity,
      model_divergence: operational.modelDivergence
    },
    missingRequired,
    missingOptional
  );

  const appliedCaps = applyCaps(
    capsSet,
    dimensions,
    commercial.tolerance.contribution_delta_gbp,
    confidence.band,
    includeSignals,
    operational.modelDivergence
  );

  // No special-casing: a CONSTRAINED dimension without a rule-authored discharge test
  // degrades to REVIEW generically inside aggregateState (§3.3 / §3.7).
  const effectiveConditions = conditions;

  let state = aggregateState(dimensions, effectiveConditions, appliedCaps);

  // Structural backstops K7/K8 already in caps
  if (commercial.tolerance.contribution_delta_gbp < 0 && state === 'GO') {
    state = 'CONDITIONAL_GO';
    if (!appliedCaps.includes('K7')) appliedCaps.push('K7');
  }

  const readiness: DecisionReadinessAssessment = {
    readiness_id: `rdy_${campaign.campaign_intent_id}_${timestamp.replace(/[:.]/g, '')}`,
    campaign_intent_id: campaign.campaign_intent_id,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    state,
    headline: headlineFor(state, vetoes, effectiveConditions),
    dimensions,
    vetoes,
    conditions: effectiveConditions,
    change_triggers: triggers,
    resilience_evidence: operational.resilience,
    confidence: {
      band: confidence.band,
      evidence_coverage: {
        required: [...requiredInputs, ...optionalIntegrations],
        present: presentInputs,
        // Published set is exactly the set the band was derived from — no hidden inputs.
        missing: [...missingRequired, ...missingOptional]
      },
      evidence_strength_floor: confidence.floor,
      model_integrity: {
        ...demand.modelIntegrity,
        model_divergence: operational.modelDivergence
      },
      confidence_index: confidence.index
    },
    capacity_basis: operational.capacity,
    threshold_policy: READINESS_THRESHOLD_POLICY,
    operational_feasibility: operational.feasibility,
    commercial_tolerance: commercial.tolerance,
    state_caps_applied: appliedCaps.sort(),
    counterfactual_id: evaluation.counterfactual.counterfactual_id,
    causal_id: evaluation.causal.causal_id,
    opportunity_evaluation_id: discovery?.opportunity_windows.evaluation_id,
    micro_market_evaluation_id: discovery?.micro_markets.evaluation_id,
    decision_state_id: decisionState?.decision_state_id,
    decision_state_version: decisionState?.state_version,
    calculation_mode: 'deterministic_demo_readiness',
    synthetic_demo: true,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-04',
      threshold_policy: READINESS_THRESHOLD_POLICY.policy_id,
      commercial_objective_class: objectiveClass,
      decision_ripple: 'wp10c_derived_impacts_readonly',
      caps: appliedCaps.join(',')
    },
    timestamp
  };

  const validation = validateDecisionReadinessAssessment(readiness);
  if (!validation.valid) {
    throw new Error(`Invalid DecisionReadinessAssessment: ${validation.errors.join('; ')}`);
  }

  return {
    evaluation_id: `reval_${campaign.campaign_intent_id}_${timestamp.replace(/[:.]/g, '')}`,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    campaign_intent_id: campaign.campaign_intent_id,
    readiness,
    timestamp,
    schema_version: SCHEMA_VERSION
  };
}

/** Test helper — invoke discovery when caller wants CDI-03 integrated. */
export function evaluateCampaignReadinessWithDiscovery(
  request: ReadinessEvaluationRequest
): ReadinessEvaluationResponse {
  if (!request.opportunity_discovery) {
    const campaign = resolveCampaign(request);
    if (campaign.status === 'REGISTERED') {
      try {
        request = {
          ...request,
          opportunity_discovery: discoverCampaignOpportunity({
            tenant_id: request.tenant_id,
            session_id: request.session_id,
            campaign_intent_id: campaign.campaign_intent_id,
            campaign_intent: campaign
          })
        };
      } catch {
        // leave absent — K2
      }
    }
  }
  return evaluateCampaignReadiness(request);
}
