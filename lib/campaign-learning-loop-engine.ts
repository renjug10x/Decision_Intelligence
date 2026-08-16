/**
 * CogniX CDI-07B — Campaign Learning Loop Engine
 *
 * Pure, deterministic pre-mortem, prediction comparison and learning eligibility.
 * Zero React. Zero LLM. Never mutates contracts.
 * Frozen in docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_DESIGN_GATE.md §§3–11.
 */

import {
  DecisionContract,
  DecisionDerivedImpacts,
  EnterpriseMemoryCase,
  EnterpriseSignal,
  ATTRIBUTION_UNAVAILABLE_DISCLOSURE,
  SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE,
  computeContractDigest,
  assertTenantSessionCoherent,
  isObservationIndependentSourceType
} from '../packages/contracts/src/index';
import {
  CampaignPreMortem,
  FailureMode,
  ResilienceEvidence,
  OutcomeObservation,
  ObservationAuthorityEvaluationContext,
  PredictionOutcomeComparison,
  QuantityComparison,
  QuantityBasis,
  ComparabilityVerdict,
  ComparisonVerdict,
  PredictionError,
  OutcomeAttribution,
  ObservationCompleteness,
  LearningCandidate,
  LearningCase,
  LearningEligibility,
  LearningEligibilityCondition,
  LearningPatternReference,
  DERIVED_IMPACT_SCOPE_DISCLOSURE,
  NOT_A_DECISION_VERDICT_DISCLOSURE,
  SINGLE_CASE_DISCLOSURE,
  SYNTHETIC_OBSERVATION_DISCLOSURE,
  PATTERN_TELEMETRY_DISCLOSURE,
  PATTERN_PROMOTION_REQUIRED_INPUT,
  OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
  QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT,
  PREDICTION_ENVELOPE_REQUIRED_INPUT,
  COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT,
  METRIC_CORRESPONDENT_SIGNAL_TYPES,
  canonicalJson,
  sha256Hex,
  assertNoInventedRiskPrecision,
  assertNoPatternWrite,
  assertNoWp10dTelemetryCopied,
  assertNoSuccessFailureVerdict,
  assertErrorOnlyWhenLikeForLike,
  determineObservationAuthority,
  assertGrainResolves,
  requiredGrainDimensions,
  validateCampaignPreMortem,
  validatePredictionOutcomeComparison,
  validateLearningCandidate
} from '../packages/contracts/src/campaign-learning-loop-model';
import { PrimaryObjectiveMetric } from '../packages/contracts/src/campaign-intent-model';
import {
  ConfidenceBand,
  EvidenceStrength,
  EVIDENCE_STRENGTH_ORDER,
  ReadinessDimensionId
} from '../packages/contracts/src/campaign-readiness-model';
import { ComparisonSetInvariants } from '../packages/contracts/src/campaign-frontier-model';
import {
  ExternalSignalCategory,
  mapCategoryToSourceType
} from '../packages/contracts/src/external-signal-connector-model';
import { decisionContractStore } from './decision-contract-store';
import { preMortemStore } from './pre-mortem-store';
import { learningCandidateStore } from './learning-candidate-store';
import { getExternalSignalConnector } from '../services/world/src/external-signal-connector';
import { memoryRepository } from '../services/learning/src/memory-store';
import { learningPatternRepository } from '../services/learning/src/learning-pattern-store';

const SCHEMA_VERSION = '1.0';
const ENGINE_VERSION = 'cdi07b_learning_loop_engine_v1';
const ATTRIBUTABLE_FIELD = 'counterfactual.campaign_delta.attributable_uplift_pp';
const GROSS_FIELD = 'play.decomposition.reconciliation.reconciled_sum_pp';

export interface CreatePreMortemArgs {
  contract: DecisionContract;
  as_of: string;
  decision_state_derived_impacts?: DecisionDerivedImpacts;
}

export interface ComparePredictionArgs {
  contract: DecisionContract;
  as_of: string;
  observations: OutcomeObservation[];
  decision_state?: { decision_state_id: string; state_version: number };
}

export interface BuildLearningCandidateArgs {
  contract: DecisionContract;
  comparison: PredictionOutcomeComparison;
  as_of: string;
  register_memory?: boolean;
  pattern_refs?: string[];
  /** Carried into the RB-1 re-derivation so attribution reproduces identically. */
  decision_state?: { decision_state_id: string; state_version: number };
}

function reject(rejection_id: string, message: string): never {
  throw Object.assign(new Error(message), { rejection_id });
}

function contentId(parts: unknown[]): string {
  return sha256Hex(canonicalJson(parts));
}

function confidenceFromFloor(floor: EvidenceStrength): ConfidenceBand {
  if (floor === 'OBSERVED' || floor === 'DERIVED') return 'HIGH';
  if (floor === 'DERIVED_KNOWN_DISCONTINUITY' || floor === 'DECLARED_INPUT') return 'MODERATE';
  if (floor === 'SEEDED_ASSUMPTION' || floor === 'PROXY') return 'LOW';
  return 'INSUFFICIENT';
}

function snapshotByPath(
  contract: DecisionContract,
  path: string
): { value: number; unit: string; package: QuantityComparison['predicted_source_package']; strength: EvidenceStrength } | null {
  const all = [
    ...contract.basis.outcome_snapshot,
    ...contract.basis.decomposition_snapshot,
    ...(contract.basis.readiness_snapshot || [])
  ];
  const row = all.find(s => s.source_field_path === path);
  if (!row || typeof row.value !== 'number') return null;
  return {
    value: row.value,
    unit: row.unit || 'pp',
    package: (row.source_package || 'CDI-06') as QuantityComparison['predicted_source_package'],
    strength: row.strength
  };
}

export function resolveContractOrReject(
  contractId: string,
  tenantId: string,
  sessionId: string,
  expectedDigest?: string
): DecisionContract {
  const contract = decisionContractStore.getById(contractId, tenantId, sessionId);
  if (!contract) reject('RJ-P1', 'RJ-P1: Contract not found under tenant/session');
  const digest = computeContractDigest(contract);
  if (expectedDigest && expectedDigest !== digest) reject('RJ-P2', 'RJ-P2: contract_digest mismatch');
  if (contract.status === 'WITHDRAWN') reject('RJ-P3', 'RJ-P3: Contract is WITHDRAWN');
  return contract;
}

function failureModeId(parts: unknown[]): string {
  return contentId(['failure_mode', ...parts]);
}

function enumerateFailureModes(
  contract: DecisionContract,
  derived?: DecisionDerivedImpacts
): FailureMode[] {
  const modes: FailureMode[] = [];

  for (const assumption of contract.assumptions) {
    if (!assumption.load_bearing) continue;
    modes.push({
      failure_mode_id: failureModeId(['ASSUMPTION_FALSIFIED', assumption.assumption_id]),
      failure_mode_class: 'ASSUMPTION_FALSIFIED',
      statement: assumption.statement,
      grounding: 'DECLARED_EVIDENCE',
      consequence_order: 'FIRST_ORDER',
      source_package: 'CDI-07A',
      source_field_path: assumption.basis_field_path,
      contracted_value: assumption.held_at_resolution,
      assumption_ref: { assumption_id: assumption.assumption_id, load_bearing: true },
      strength: assumption.strength,
      disclosure:
        'This mode names a load-bearing assumption declared at resolution. It does not assert that the assumption has already failed.'
    });
  }

  for (const alt of contract.basis.rejected_alternatives) {
    if (!alt.veto) continue;
    modes.push({
      failure_mode_id: failureModeId(['READINESS_VETO_LATENT', alt.veto.veto_id, alt.play_id]),
      failure_mode_class: 'READINESS_VETO_LATENT',
      statement: alt.veto.statement,
      grounding: 'DECLARED_EVIDENCE',
      consequence_order: 'FIRST_ORDER',
      source_package: 'CDI-04',
      source_field_path: alt.veto.triggering_field,
      contracted_value: alt.veto.triggering_value,
      readiness_veto_ref: { veto_id: alt.veto.veto_id },
      strength: contract.evidence_strength_floor,
      disclosure:
        'This veto applied to a rejected alternative, not the selected play. It remains latent if similar conditions arise on the selected play.'
    });
  }

  for (const constraint of contract.resolution.constraints_in_force || []) {
    modes.push({
      failure_mode_id: failureModeId(['CONSTRAINT_BREACH', constraint.constraint_id]),
      failure_mode_class: 'CONSTRAINT_BREACH',
      statement: constraint.statement,
      grounding: 'DECLARED_EVIDENCE',
      consequence_order: 'FIRST_ORDER',
      source_package: 'CDI-06',
      source_field_path: `resolution.constraints_in_force.${constraint.constraint_id}`,
      contracted_value: constraint.bound_value ?? constraint.statement,
      constraint_ref: { constraint_id: constraint.constraint_id },
      strength: contract.evidence_strength_floor,
      disclosure:
        'This mode names a declared constraint that was in force at resolution. It does not assert the constraint was breached.'
    });
  }

  for (const dim of contract.basis.unavailable_at_decision) {
    modes.push({
      failure_mode_id: failureModeId(['CHOICE_SET_INCOMPLETE', dim.dimension_id]),
      failure_mode_class: 'CHOICE_SET_INCOMPLETE',
      statement: dim.required_authoritative_input?.why_required || dim.dimension_id,
      grounding: 'STRUCTURAL',
      consequence_order: 'FIRST_ORDER',
      source_package: 'CDI-06',
      source_field_path: `unavailable_at_decision.${dim.dimension_id}`,
      contracted_value: dim.dimension_id,
      strength: contract.evidence_strength_floor,
      disclosure:
        'This economics dimension was unavailable at decision time. If it later matters, the contracted choice set may have been incomplete.'
    });
  }

  const readinessAssumption = contract.assumptions.find(a => a.assumption_class === 'READINESS_CONDITION');
  if (readinessAssumption) {
    modes.push({
      failure_mode_id: failureModeId(['READINESS_CONDITION_UNMET', readinessAssumption.assumption_id]),
      failure_mode_class: 'READINESS_CONDITION_UNMET',
      statement: readinessAssumption.statement,
      grounding: 'DECLARED_EVIDENCE',
      consequence_order: 'FIRST_ORDER',
      source_package: 'CDI-04',
      source_field_path: readinessAssumption.basis_field_path,
      contracted_value: readinessAssumption.held_at_resolution,
      readiness_condition_ref: {
        dimension: 'OPERATIONAL' as ReadinessDimensionId,
        condition_id: readinessAssumption.assumption_id
      },
      strength: readinessAssumption.strength,
      disclosure:
        'This mode names a readiness condition recorded at resolution. It does not assert the condition is currently unmet.'
    });
  }

  if (derived) {
    const gapId = failureModeId(['EXECUTION_CAPACITY', 'commitment_gap_units']);
    if (derived.commitment_gap_units > 0) {
      modes.push({
        failure_mode_id: gapId,
        failure_mode_class: 'EXECUTION_CAPACITY',
        statement: `Shared scenario parameters imply a commitment gap of ${derived.commitment_gap_units} units`,
        grounding: 'STRUCTURAL',
        consequence_order: 'FIRST_ORDER',
        source_package: 'WP10-C',
        source_field_path: 'derived_impacts.commitment_gap_units',
        contracted_value: derived.commitment_gap_units,
        derived_impact_ref: { field: 'commitment_gap_units', scope_disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE },
        strength: contract.evidence_strength_floor,
        disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE
      });

      const overtimeId = failureModeId(['EXECUTION_CAPACITY', 'dc_overtime_hours']);
      modes.push({
        failure_mode_id: overtimeId,
        failure_mode_class: 'EXECUTION_CAPACITY',
        statement: `Shared scenario parameters imply ${derived.dc_overtime_hours} DC overtime hours`,
        grounding: 'STRUCTURAL',
        consequence_order: 'SECOND_ORDER',
        source_package: 'WP10-C',
        source_field_path: 'derived_impacts.dc_overtime_hours',
        contracted_value: derived.dc_overtime_hours,
        derived_impact_ref: { field: 'dc_overtime_hours', scope_disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE },
        follows_from_failure_mode_id: gapId,
        strength: contract.evidence_strength_floor,
        disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE
      });

      modes.push({
        failure_mode_id: failureModeId(['EXECUTION_CAPACITY', 'margin_erosion_pct']),
        failure_mode_class: 'EXECUTION_CAPACITY',
        statement: `Shared scenario parameters imply ${derived.margin_erosion_pct}% margin erosion`,
        grounding: 'STRUCTURAL',
        consequence_order: 'THIRD_ORDER',
        source_package: 'WP10-C',
        source_field_path: 'derived_impacts.margin_erosion_pct',
        contracted_value: derived.margin_erosion_pct,
        derived_impact_ref: { field: 'margin_erosion_pct', scope_disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE },
        follows_from_failure_mode_id: overtimeId,
        strength: contract.evidence_strength_floor,
        disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE
      });
    }
  }

  modes.push({
    failure_mode_id: failureModeId(['OBSERVABILITY_GAP', 'attributable_outcome']),
    failure_mode_class: 'OBSERVABILITY_GAP',
    statement:
      'Attributable outcome verification requires an observed counterfactual series that this estate does not supply at this baseline',
    grounding: 'UNASSESSED',
    consequence_order: 'FIRST_ORDER',
    source_package: 'CDI-05',
    source_field_path: ATTRIBUTABLE_FIELD,
    contracted_value: null,
    strength: contract.evidence_strength_floor,
    disclosure:
      'This names an observability gap for attributable verification. It does not assert the decision cannot be verified in gross terms.'
  });

  return modes.sort((a, b) => a.failure_mode_id.localeCompare(b.failure_mode_id));
}

function buildResilience(failureModes: FailureMode[], contract: DecisionContract): ResilienceEvidence[] {
  const rows: ResilienceEvidence[] = [];
  for (const mode of failureModes) {
    let mitigated = false;
    if (mode.constraint_ref) {
      rows.push({
        resilience_id: contentId(['resilience', mode.failure_mode_id, 'constraint']),
        failure_mode_id: mode.failure_mode_id,
        statement: 'A declared constraint was recorded in force at resolution',
        source_package: 'CDI-06',
        source_field_path: `resolution.constraints_in_force.${mode.constraint_ref.constraint_id}`,
        strength: contract.evidence_strength_floor,
        no_known_mitigation: false
      });
      mitigated = true;
    }
    if (mode.readiness_veto_ref || mode.readiness_condition_ref) {
      rows.push({
        resilience_id: contentId(['resilience', mode.failure_mode_id, 'readiness']),
        failure_mode_id: mode.failure_mode_id,
        statement: 'Readiness discharge tests were declared upstream',
        source_package: 'CDI-04',
        source_field_path: mode.source_field_path,
        discharge_test_ref: mode.readiness_condition_ref
          ? {
              dimension: mode.readiness_condition_ref.dimension,
              condition_id: mode.readiness_condition_ref.condition_id
            }
          : undefined,
        strength: contract.evidence_strength_floor,
        no_known_mitigation: false
      });
      mitigated = true;
    }
    if (!mitigated) {
      rows.push({
        resilience_id: contentId(['resilience', mode.failure_mode_id, 'none']),
        failure_mode_id: mode.failure_mode_id,
        statement: 'No declared mitigation was found in the contracted estate for this failure mode',
        source_package: 'CDI-07A',
        source_field_path: mode.source_field_path,
        strength: contract.evidence_strength_floor,
        no_known_mitigation: true
      });
    }
  }
  return rows;
}

export function createPreMortem(args: CreatePreMortemArgs): CampaignPreMortem {
  const { contract, as_of, decision_state_derived_impacts } = args;
  if (!as_of?.trim()) reject('RJ-R1', 'RJ-R1: as_of is required');
  if (contract.status === 'WITHDRAWN') reject('RJ-P3', 'RJ-P3: Contract is WITHDRAWN');

  const contractDigest = computeContractDigest(contract);
  const prior = preMortemStore
    .listForSession(contract.tenant_id, contract.session_id)
    .filter(p => p.contract_id === contract.contract_id);
  const version = prior.length + 1;
  const failureModes = enumerateFailureModes(contract, decision_state_derived_impacts);

  for (const mode of failureModes) {
    if (
      (mode.consequence_order === 'SECOND_ORDER' || mode.consequence_order === 'THIRD_ORDER') &&
      !mode.follows_from_failure_mode_id
    ) {
      reject('RJ-P4', `RJ-P4: ${mode.failure_mode_id} missing follows_from_failure_mode_id`);
    }
  }

  const hasDerivedImpact = failureModes.some(f => f.derived_impact_ref !== undefined);
  const preMortem: CampaignPreMortem = {
    pre_mortem_id: contentId([contract.contract_id, contractDigest, contract.decision_basis_digest, as_of, version]),
    pre_mortem_version: version,
    status: 'ACTIVE',
    tenant_id: contract.tenant_id,
    session_id: contract.session_id,
    contract_id: contract.contract_id,
    contract_digest: contractDigest,
    decision_basis_digest: contract.decision_basis_digest,
    failure_modes: failureModes,
    resilience: buildResilience(failureModes, contract),
    unexamined: contract.basis.unavailable_at_decision.map(dim => ({
      dimension_id: dim.dimension_id,
      statement: dim.required_authoritative_input?.why_required || dim.dimension_id,
      reason: 'Economics dimension was unavailable at decision time',
      source_package: 'CDI-06'
    })),
    unavailable_capabilities: [
      PATTERN_PROMOTION_REQUIRED_INPUT,
      OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
      QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT
    ],
    ...(hasDerivedImpact ? { derived_impact_scope_disclosure: DERIVED_IMPACT_SCOPE_DISCLOSURE } : {}),
    evidence_strength_floor: contract.evidence_strength_floor,
    confidence_band: confidenceFromFloor(contract.evidence_strength_floor),
    calculation_mode: 'deterministic_pre_mortem',
    synthetic_demo: contract.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    provenance: { engine: ENGINE_VERSION, contract_id: contract.contract_id, contract_digest: contractDigest },
    created_as_of: as_of
  };

  if (!assertNoInventedRiskPrecision(preMortem)) reject('RJ-P5', 'RJ-P5: invented risk precision detected');
  const validation = validateCampaignPreMortem(preMortem);
  if (!validation.valid) reject('RJ-P5', validation.errors.join('; '));
  return preMortemStore.create(preMortem);
}

function observationContext(
  observation: OutcomeObservation,
  contract: DecisionContract
): ObservationAuthorityEvaluationContext {
  const connector = getExternalSignalConnector(observation.connector_id);
  return {
    connector_synthetic_demo: connector?.synthetic_demo ?? true,
    connector_status: connector?.status,
    connector_resolves: !!connector,
    scenario_derived_lineage:
      observation.provenance.origin === 'ESF-1_SIMULATION' ||
      observation.provenance.origin === 'WP10-C_SCENARIO',
    planned_start: contract.basis.comparison_invariants.planned_start,
    comparison_invariants: contract.basis.comparison_invariants
  };
}

export function deriveObservedBasis(
  observation: OutcomeObservation
): QuantityBasis | 'CONTROLLED_DIFFERENCE_REJECTED' | undefined {
  if (!observation.measurement_design) return undefined;
  if (observation.measurement_design === 'DIRECT_MEASUREMENT') return 'GROSS';
  if (observation.measurement_design === 'MODELLED') return 'MODELLED_MONETARY';
  if (observation.measurement_design === 'CONTROLLED_DIFFERENCE') return 'CONTROLLED_DIFFERENCE_REJECTED';
  return undefined;
}



export function evaluateComparability(
  predictedUnit: string,
  predictedBasis: QuantityBasis,
  observation: OutcomeObservation | undefined,
  context: ObservationAuthorityEvaluationContext,
  invariants: ComparisonSetInvariants,
  contractTenancy?: { tenant_id: string; session_id: string }
): ComparabilityVerdict {
  if (!observation) return 'OBSERVATION_ABSENT';

  // C0 — Isolation
  if (contractTenancy && !assertTenantSessionCoherent(contractTenancy, observation)) {
    return 'TENANT_SESSION_MISMATCH';
  }

  // C1 — Authority
  if (determineObservationAuthority(observation, context) !== 'AUTHORITATIVE_EXTERNAL') {
    return 'OBSERVATION_NOT_AUTHORITATIVE';
  }

  // C2 — Grain declared (empty grain fails closed)
  const required = requiredGrainDimensions(invariants);
  if (required.length === 0) {
    return 'GRAIN_UNDECLARED';
  }

  // C3 — Window declared (null or invalid window fails closed)
  const { planned_start, planned_end } = invariants;
  if (!planned_start || !planned_end) {
    return 'WINDOW_UNDECLARED';
  }
  const cStart = Date.parse(planned_start);
  const cEnd = Date.parse(planned_end);
  if (Number.isNaN(cStart) || Number.isNaN(cEnd) || cStart > cEnd) {
    return 'WINDOW_UNDECLARED';
  }

  // C4 — Grain correspondence (Z4)
  if (!assertGrainResolves(observation, invariants)) {
    return 'GRAIN_MISMATCH';
  }

  // C5 — Window correspondence (exact coverage)
  let mStartStr = observation.measurement_window_start;
  let mEndStr = observation.measurement_window_end;
  if (!mStartStr && !mEndStr) {
    mStartStr = observation.effective_at;
    mEndStr = observation.effective_at;
  }
  if (!mStartStr || !mEndStr) {
    return 'WINDOW_MISMATCH';
  }
  const mStart = Date.parse(mStartStr);
  const mEnd = Date.parse(mEndStr);
  if (Number.isNaN(mStart) || Number.isNaN(mEnd) || mStart !== cStart || mEnd !== cEnd) {
    return 'WINDOW_MISMATCH';
  }

  // C6 — Metric correspondence
  const primaryMetric = (invariants.primary_metric || '') as PrimaryObjectiveMetric;
  const correspondents = METRIC_CORRESPONDENT_SIGNAL_TYPES[primaryMetric];
  if (!correspondents || correspondents.length === 0) {
    return 'METRIC_CORRESPONDENCE_UNDECLARED';
  }
  if (!correspondents.includes(observation.signal_type)) {
    return 'METRIC_MISMATCH';
  }

  // C7 — Unit
  const observedUnit = observation.unit === 'percent' ? 'pp' : observation.unit;
  const predictedNorm = predictedUnit === 'percent' ? 'pp' : predictedUnit;
  if (observedUnit !== predictedNorm) {
    return 'UNIT_MISMATCH';
  }

  // C8 — Quantity basis (R1 derived-or-refuse)
  const derivedObservedBasis = deriveObservedBasis(observation);
  if (!derivedObservedBasis) {
    return 'QUANTITY_BASIS_UNDECLARED';
  }
  if (derivedObservedBasis === 'CONTROLLED_DIFFERENCE_REJECTED') {
    return 'NO_OBSERVED_COUNTERFACTUAL';
  }
  if (predictedBasis === 'ATTRIBUTABLE') {
    return 'NO_OBSERVED_COUNTERFACTUAL';
  }
  if (derivedObservedBasis !== predictedBasis) {
    return 'QUANTITY_BASIS_MISMATCH';
  }

  return 'LIKE_FOR_LIKE';
}

function bindObservation(
  observations: OutcomeObservation[],
  contract: DecisionContract
): { observation: OutcomeObservation | undefined; candidateVerdict?: ComparabilityVerdict } {
  const invariants = contract.basis.comparison_invariants;
  const coherent = observations.filter(o => assertTenantSessionCoherent(contract, o));

  if (coherent.length === 0) {
    return {
      observation: undefined,
      candidateVerdict: observations.length > 0 ? 'TENANT_SESSION_MISMATCH' : 'OBSERVATION_ABSENT'
    };
  }

  // C2 / C3 — declaration failures. The contract itself declared no grain or no window, so there
  // is nothing for an observation to correspond to and NO observation is a binding candidate.
  // Returning a candidate here would publish observed_value / observed_basis against a quantity
  // whose grain or window was never declared — misleading hindsight, which is the primary risk
  // this work package exists to refuse.
  const required = requiredGrainDimensions(invariants);
  if (required.length === 0) {
    return { observation: undefined, candidateVerdict: 'GRAIN_UNDECLARED' };
  }

  const { planned_start, planned_end } = invariants;
  if (!planned_start || !planned_end) {
    return { observation: undefined, candidateVerdict: 'WINDOW_UNDECLARED' };
  }
  const cStart = Date.parse(planned_start);
  const cEnd = Date.parse(planned_end);
  if (Number.isNaN(cStart) || Number.isNaN(cEnd) || cStart > cEnd) {
    return { observation: undefined, candidateVerdict: 'WINDOW_UNDECLARED' };
  }

  // C4 — Find observation that resolves grain
  const grainResolving = coherent.find(o => assertGrainResolves(o, invariants));
  if (grainResolving) {
    return { observation: grainResolving };
  }

  // No grain-resolving observation: no observation binds
  return { observation: undefined, candidateVerdict: 'GRAIN_MISMATCH' };
}

function buildQuantityComparison(
  contract: DecisionContract,
  fieldPath: string,
  predictedBasis: QuantityBasis,
  observations: OutcomeObservation[]
): QuantityComparison {
  const snap = snapshotByPath(contract, fieldPath);
  const invariants = contract.basis.comparison_invariants;
  const { observation, candidateVerdict } = bindObservation(observations, contract);

  if (!snap) {
    return {
      predicted_source_field_path: fieldPath,
      predicted_source_package: predictedBasis === 'ATTRIBUTABLE' ? 'CDI-02' : 'CDI-05',
      predicted_value: 0,
      predicted_basis: predictedBasis,
      predicted_unit: 'pp',
      comparability: 'OBSERVATION_ABSENT',
      incomparable_reason: 'Contract did not publish this quantity in its basis snapshot'
    };
  }

  let comparability: ComparabilityVerdict;
  if (predictedBasis === 'ATTRIBUTABLE') {
    comparability = 'NO_OBSERVED_COUNTERFACTUAL';
  } else if (candidateVerdict && candidateVerdict !== 'GRAIN_MISMATCH') {
    comparability = candidateVerdict;
  } else if (!observation) {
    comparability = candidateVerdict || 'OBSERVATION_ABSENT';
  } else {
    const ctx = observationContext(observation, contract);
    comparability = evaluateComparability(
      snap.unit,
      predictedBasis,
      observation,
      ctx,
      invariants,
      { tenant_id: contract.tenant_id, session_id: contract.session_id }
    );
  }

  const row: QuantityComparison = {
    predicted_source_field_path: fieldPath,
    predicted_source_package: snap.package,
    predicted_value: snap.value,
    predicted_basis: predictedBasis,
    predicted_unit: snap.unit,
    comparability
  };

  if (
    observation &&
    comparability !== 'TENANT_SESSION_MISMATCH' &&
    comparability !== 'OBSERVATION_ABSENT' &&
    comparability !== 'GRAIN_MISMATCH'
  ) {
    row.observed_observation_id = observation.observation_id;
    row.observed_value = observation.delta_pct;
    const derivedBasis = deriveObservedBasis(observation);
    if (derivedBasis && derivedBasis !== 'CONTROLLED_DIFFERENCE_REJECTED') {
      row.observed_basis = derivedBasis;
    }
    row.observed_unit = observation.unit === 'percent' ? 'pp' : observation.unit;
  }

  if (comparability === 'LIKE_FOR_LIKE' && observation) {
    const signedDelta = observation.delta_pct - snap.value;
    const matchingEnvelope = contract.prediction_envelopes?.find(
      e => e.applies_to_field_path === fieldPath
    );

    if (matchingEnvelope) {
      const errorObj: PredictionError = {
        signed_delta: signedDelta,
        unit: snap.unit,
        statement: `Observed ${observation.delta_pct}${snap.unit} against predicted ${snap.value}${snap.unit}`,
        declared_envelope: {
          lower: matchingEnvelope.lower,
          upper: matchingEnvelope.upper,
          source_field_path: matchingEnvelope.applies_to_field_path,
          envelope_id: matchingEnvelope.envelope_id,
          declared_by: matchingEnvelope.declared_by,
          pre_declaration_witness: matchingEnvelope.pre_declaration_witness
        }
      };

      const isOutside = signedDelta < matchingEnvelope.lower || signedDelta > matchingEnvelope.upper;
      if (isOutside) {
        errorObj.within_declared_envelope = false;
      } else {
        if (matchingEnvelope.pre_declaration_witness !== 'NONE') {
          errorObj.within_declared_envelope = true;
        } else {
          errorObj.within_withheld_reason =
            'Pre-declaration witness is NONE; WITHIN verdict is structurally unreachable without server-side registration receipt';
        }
      }
      row.error = errorObj;
    } else {
      row.error = {
        signed_delta: signedDelta,
        unit: snap.unit,
        statement: `Observed ${observation.delta_pct}${snap.unit} against predicted ${snap.value}${snap.unit}`
      };
    }
  } else {
    row.incomparable_reason =
      comparability === 'TENANT_SESSION_MISMATCH'
        ? 'Observation tenant_id or session_id does not match the contract'
        : comparability === 'OBSERVATION_NOT_AUTHORITATIVE'
          ? `Observation authority is ${observation ? determineObservationAuthority(observation, observationContext(observation, contract)) : 'unknown'}`
          : comparability === 'GRAIN_UNDECLARED'
            ? 'Contract comparison_invariants declared no grain dimensions'
            : comparability === 'WINDOW_UNDECLARED'
              ? 'Contract comparison_invariants declared an absent or invalid planned window'
              : comparability === 'GRAIN_MISMATCH'
                ? 'Observation entity does not resolve to the contracted decision grain'
                : comparability === 'WINDOW_MISMATCH'
                  ? 'Observation measurement window does not correspond exactly to the contracted window'
                  : comparability === 'METRIC_CORRESPONDENCE_UNDECLARED'
                    ? 'Estate declares no correspondent observable signal types for this objective metric'
                    : comparability === 'METRIC_MISMATCH'
                      ? 'Observation signal_type does not correspond to the contracted primary objective metric'
                      : comparability === 'UNIT_MISMATCH'
                        ? 'Predicted and observed units differ with no declared lossless conversion'
                        : comparability === 'QUANTITY_BASIS_UNDECLARED'
                          ? 'Observation does not declare an admissible measurement_design'
                          : comparability === 'NO_OBSERVED_COUNTERFACTUAL'
                            ? 'Attributable prediction requires an observed counterfactual series; none was declared'
                            : comparability === 'QUANTITY_BASIS_MISMATCH'
                              ? 'Derived observation quantity basis does not match the predicted basis'
                              : comparability === 'OBSERVATION_ABSENT'
                                ? 'No admissible observation was bound for this quantity'
                                : 'Comparison is not like-for-like';
  }
  return row;
}

function buildCompleteness(
  contract: DecisionContract,
  comparisons: QuantityComparison[],
  observations: OutcomeObservation[]
): ObservationCompleteness {
  const predictedPaths = [
    ATTRIBUTABLE_FIELD,
    ...(snapshotByPath(contract, GROSS_FIELD) ? [GROSS_FIELD] : [])
  ];
  const covered: string[] = [];
  const missing: string[] = [];
  for (const path of predictedPaths) {
    const row = comparisons.find(c => c.predicted_source_field_path === path);
    if (row && row.comparability !== 'OBSERVATION_ABSENT') covered.push(path);
    else missing.push(path);
  }

  const invariants = contract.basis.comparison_invariants;
  let windowStartObserved = !invariants.planned_start;
  let windowEndObserved = !invariants.planned_end;
  for (const o of observations) {
    if (invariants.planned_start) {
      const t = Date.parse(o.observed_at);
      const s = Date.parse(invariants.planned_start);
      if (!Number.isNaN(t) && !Number.isNaN(s) && t >= s) windowStartObserved = true;
    }
    if (invariants.planned_end) {
      const t = Date.parse(o.observed_at);
      const e = Date.parse(invariants.planned_end);
      if (!Number.isNaN(t) && !Number.isNaN(e) && t <= e) windowEndObserved = true;
    }
  }

  const adapterGap = comparisons.some(
    c => c.comparability === 'OBSERVATION_ABSENT' && !!snapshotByPath(contract, c.predicted_source_field_path)
  );

  return {
    covered_quantities: covered,
    missing_quantities: missing,
    window_start_observed: windowStartObserved,
    window_end_observed: windowEndObserved,
    adapter_capability_gap: adapterGap,
    gap_reasons: adapterGap
      ? ['Connector could not supply an admissible observation for every contracted quantity']
      : [],
    complete: missing.length === 0 && windowStartObserved && windowEndObserved && !adapterGap
  };
}

function classifyAttribution(
  observations: OutcomeObservation[],
  contract: DecisionContract,
  decisionState?: { decision_state_id: string; state_version: number }
): OutcomeAttribution {
  // Declared synthetic provenance is ATTRIBUTION_UNAVAILABLE. A synthetic *connector* is not
  // folded in here: doing so collapses SCENARIO_DRIVEN into ATTRIBUTION_UNAVAILABLE across the
  // whole estate and erases a distinction the gate keeps. WORLD_DRIVEN stays unreachable for
  // synthetic-connector observations because `worldEligible` re-derives authority below.
  if (observations.some(o => o.synthetic_demo || o.provenance.synthetic_demo)) {
    return {
      attribution: 'ATTRIBUTION_UNAVAILABLE',
      statement: ATTRIBUTION_UNAVAILABLE_DISCLOSURE,
      disclosure: ATTRIBUTION_UNAVAILABLE_DISCLOSURE
    };
  }
  const hasScenario =
    observations.some(
      o =>
        o.provenance.origin === 'ESF-1_SIMULATION' ||
        o.provenance.origin === 'WP10-C_SCENARIO' ||
        !isObservationIndependentSourceType(o.source_type)
    ) ||
    (decisionState &&
      contract.provenance?.decision_state_version &&
      decisionState.state_version !== Number(contract.provenance.decision_state_version));
  if (hasScenario) {
    return {
      attribution: 'SCENARIO_DRIVEN',
      statement: SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE,
      disclosure: SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE,
      observed_decision_state_version: decisionState?.state_version
    };
  }
  const worldEligible = observations.every(
    o =>
      !o.synthetic_demo &&
      determineObservationAuthority(o, observationContext(o, contract)) === 'AUTHORITATIVE_EXTERNAL'
  );
  if (worldEligible && observations.length > 0) {
    return {
      attribution: 'WORLD_DRIVEN',
      statement: 'Observed movement is attributed to world-driven external lineage under the declared rules'
    };
  }
  return {
    attribution: 'ATTRIBUTION_UNAVAILABLE',
    statement: ATTRIBUTION_UNAVAILABLE_DISCLOSURE,
    disclosure: ATTRIBUTION_UNAVAILABLE_DISCLOSURE
  };
}

function deriveComparisonVerdict(
  comparisons: QuantityComparison[],
  completeness: ObservationCompleteness
): ComparisonVerdict {
  const likeForLike = comparisons.filter(c => c.comparability === 'LIKE_FOR_LIKE' && c.error);
  let anyOutside = false;
  let anyWithin = false;
  for (const row of likeForLike) {
    if (row.error?.within_declared_envelope === false) anyOutside = true;
    if (row.error?.within_declared_envelope === true) anyWithin = true;
  }
  if (anyOutside) return 'OUTSIDE_DECLARED_ENVELOPE';
  if (anyWithin && completeness.complete) return 'WITHIN_DECLARED_ENVELOPE';
  return 'INDETERMINATE';
}

export function comparePredictionToReality(args: ComparePredictionArgs): PredictionOutcomeComparison {
  const { contract, as_of, observations, decision_state } = args;
  if (!as_of?.trim()) reject('RJ-R1', 'RJ-R1: as_of is required');
  if (contract.status === 'WITHDRAWN') reject('RJ-P3', 'RJ-P3: Contract is WITHDRAWN');
  for (const o of observations) {
    if (!getExternalSignalConnector(o.connector_id) && o.authority !== 'UNATTRIBUTED') {
      reject('RJ-R2', `RJ-R2: connector ${o.connector_id} failed ESF-3 lineage resolution`);
    }
  }

  const contractDigest = computeContractDigest(contract);

  // RB-2 — an OutcomeObservation arrives from the caller with an `authority` field already
  // stamped on it. That field is a claim, not evidence. Re-derive it from the ESF-3 registry and
  // the contract before it is published, compared, or read by LE-4; otherwise a caller can assert
  // AUTHORITATIVE_EXTERNAL over a synthetic reference connector and have the estate repeat it.
  const coherentObservations = observations.filter(o => assertTenantSessionCoherent(contract, o));
  const authoredObservations: OutcomeObservation[] = coherentObservations.map(o => {
    const derived = determineObservationAuthority(o, observationContext(o, contract));
    return derived === o.authority ? o : { ...o, authority: derived };
  });

  const comparisons: QuantityComparison[] = [
    buildQuantityComparison(contract, ATTRIBUTABLE_FIELD, 'ATTRIBUTABLE', authoredObservations)
  ];
  if (snapshotByPath(contract, GROSS_FIELD)) {
    comparisons.push(buildQuantityComparison(contract, GROSS_FIELD, 'GROSS', authoredObservations));
  }

  const completeness = buildCompleteness(contract, comparisons, authoredObservations);
  const comparison: PredictionOutcomeComparison = {
    comparison_id: contentId([contract.contract_id, contractDigest, authoredObservations.map(o => o.observation_id).sort(), as_of]),
    tenant_id: contract.tenant_id,
    session_id: contract.session_id,
    contract_id: contract.contract_id,
    contract_digest: contractDigest,
    decision_basis_digest: contract.decision_basis_digest,
    as_of,
    observations: authoredObservations,
    comparisons,
    verdict: deriveComparisonVerdict(comparisons, completeness),
    attribution: classifyAttribution(authoredObservations, contract, decision_state),
    completeness,
    unavailable_capabilities: [
      OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
      PATTERN_PROMOTION_REQUIRED_INPUT,
      QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT,
      PREDICTION_ENVELOPE_REQUIRED_INPUT,
      COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT
    ],
    not_a_decision_verdict_disclosure: NOT_A_DECISION_VERDICT_DISCLOSURE,
    ...(authoredObservations.some(
      o =>
        o.synthetic_demo ||
        o.provenance.synthetic_demo ||
        o.authority === 'SYNTHETIC_DEMONSTRATION'
    )
      ? { synthetic_disclosure: SYNTHETIC_OBSERVATION_DISCLOSURE }
      : {}),
    evidence_strength_floor: contract.evidence_strength_floor,
    calculation_mode: 'deterministic_prediction_comparison',
    // RB-2 — a re-derived SYNTHETIC_DEMONSTRATION authority is a synthetic comparison even when
    // the caller declared synthetic_demo=false on the observation body.
    synthetic_demo:
      contract.synthetic_demo ||
      authoredObservations.some(
        o => o.synthetic_demo || o.authority === 'SYNTHETIC_DEMONSTRATION'
      ),
    schema_version: SCHEMA_VERSION,
    provenance: { engine: ENGINE_VERSION, contract_id: contract.contract_id, contract_digest: contractDigest }
  };

  if (!assertNoSuccessFailureVerdict(comparison)) reject('RJ-R4', 'RJ-R4: SUCCESS/FAILURE vocabulary detected');
  if (!assertErrorOnlyWhenLikeForLike(comparisons)) reject('RJ-R3', 'RJ-R3: PredictionError on non-LIKE_FOR_LIKE comparison');
  const validation = validatePredictionOutcomeComparison(comparison);
  if (!validation.valid) reject('RJ-R3', validation.errors.join('; '));
  return comparison;
}

function evidenceStrengthStrongerThanPlaceholder(floor: EvidenceStrength): boolean {
  const idx = EVIDENCE_STRENGTH_ORDER.indexOf(floor);
  const placeholderIdx = EVIDENCE_STRENGTH_ORDER.indexOf('PLACEHOLDER_EXCLUDED');
  return idx >= 0 && idx < placeholderIdx;
}

/**
 * The LE-1…LE-8 conjunction, exported so each condition can be attacked independently of the
 * RB-1 trust boundary. Pure: reads the supplied objects and decides nothing else.
 */
export function evaluateLearningEligibility(
  contract: DecisionContract,
  comparison: PredictionOutcomeComparison
): LearningEligibility {
  return evaluateEligibility(contract, comparison);
}

function evaluateEligibility(contract: DecisionContract, comparison: PredictionOutcomeComparison): LearningEligibility {
  const contractDigest = computeContractDigest(contract);
  const likeForLike = comparison.comparisons.filter(c => c.comparability === 'LIKE_FOR_LIKE');
  const boundObservations = comparison.comparisons
    .map(c => c.observed_observation_id)
    .filter((id): id is string => !!id)
    .map(id => comparison.observations.find(o => o.observation_id === id))
    .filter((o): o is OutcomeObservation => !!o);
  // RB-8 — LE-4 ranges over every observation offered, not only the bound ones. Restricting it to
  // bound observations made it vacuously true whenever nothing bound, so a comparison built
  // entirely from synthetic evidence was blocked by LE-3 alone and never named its evidence
  // problem. LE-4 can only ever add a block; it cannot make a candidate eligible.
  const le4Scope = boundObservations.length > 0 ? boundObservations : comparison.observations;
  const le4Met =
    le4Scope.length === 0 || le4Scope.every(o => o.authority === 'AUTHORITATIVE_EXTERNAL');
  const adapterGapOnCompared =
    comparison.completeness.adapter_capability_gap &&
    comparison.comparisons.some(c => c.comparability !== 'OBSERVATION_ABSENT');

  const conditions: LearningEligibilityCondition[] = [
    {
      condition_id: 'LE-1',
      statement: 'Contract resolves under tenant/session and contract_digest matches',
      met: contractDigest === comparison.contract_digest,
      ...(contractDigest !== comparison.contract_digest ? { unmet_reason: 'contract_digest mismatch' } : {})
    },
    {
      condition_id: 'LE-2',
      statement: 'Contract status is ACTIVE or SUPERSEDED',
      met: contract.status === 'ACTIVE' || contract.status === 'SUPERSEDED',
      ...(contract.status === 'WITHDRAWN' ? { unmet_reason: 'Contract is WITHDRAWN' } : {})
    },
    {
      condition_id: 'LE-3',
      statement: 'At least one QuantityComparison is LIKE_FOR_LIKE',
      met: likeForLike.length > 0,
      ...(likeForLike.length === 0 ? { unmet_reason: 'No quantity was comparable on a like-for-like basis' } : {})
    },
    {
      condition_id: 'LE-4',
      statement: 'Every observation backing a LIKE_FOR_LIKE comparison is AUTHORITATIVE_EXTERNAL',
      met: le4Met,
      ...(!le4Met
        ? {
            unmet_reason: `Observation authority is ${
              le4Scope.find(o => o.authority !== 'AUTHORITATIVE_EXTERNAL')?.authority
            }`
          }
        : {})
    },
    {
      condition_id: 'LE-5',
      statement: 'ObservationCompleteness.complete is true',
      met: comparison.completeness.complete,
      ...(!comparison.completeness.complete
        ? { unmet_reason: 'Observation completeness conjunction is not satisfied' }
        : {})
    },
    {
      condition_id: 'LE-6',
      statement: 'Contract evidence_strength_floor is strictly stronger than PLACEHOLDER_EXCLUDED',
      met: evidenceStrengthStrongerThanPlaceholder(contract.evidence_strength_floor),
      ...(!evidenceStrengthStrongerThanPlaceholder(contract.evidence_strength_floor)
        ? { unmet_reason: `evidence_strength_floor is ${contract.evidence_strength_floor}` }
        : {})
    },
    {
      condition_id: 'LE-7',
      statement: 'ComparisonVerdict is not INDETERMINATE',
      met: comparison.verdict !== 'INDETERMINATE',
      // RB-6 — name what is missing, not merely the state. A verdict leaves INDETERMINATE only
      // when a LIKE_FOR_LIKE row carries `within_declared_envelope`, and that requires a
      // prediction envelope declared on the contract's basis snapshot. None is declared at this
      // baseline, so the honest block is the absent envelope, not an unexplained verdict word.
      ...(comparison.verdict === 'INDETERMINATE'
        ? {
            unmet_reason:
              'Comparison verdict is INDETERMINATE. No LIKE_FOR_LIKE quantity carries a ' +
              'declared prediction envelope, so neither WITHIN_DECLARED_ENVELOPE nor ' +
              'OUTSIDE_DECLARED_ENVELOPE is establishable. An envelope is never inferred from ' +
              'the observed value.'
          }
        : {})
    },
    {
      condition_id: 'LE-8',
      statement: 'No unresolved adapter_capability_gap on a compared quantity',
      met: !adapterGapOnCompared,
      ...(adapterGapOnCompared ? { unmet_reason: 'adapter_capability_gap remains on a compared quantity' } : {})
    }
  ];

  return { eligible: conditions.every(c => c.met), conditions, determined_by: 'deterministic_conjunction' };
}

function resolvePatternRefs(patternIds: string[] | undefined): LearningPatternReference[] {
  if (!patternIds?.length) return [];
  return patternIds
    .map(id => learningPatternRepository.getLearningPatternById(id))
    .filter(Boolean)
    .map(pattern => ({
      pattern_id: pattern!.pattern_id,
      pattern_name: pattern!.pattern_name,
      pattern_scope: pattern!.pattern_scope,
      relevance_basis: 'Referenced read-only as organisational context for this candidate',
      telemetry_disclosure: PATTERN_TELEMETRY_DISCLOSURE,
      source_classification: pattern!.source_classification,
      synthetic_demo: pattern!.synthetic_demo
    }));
}

function buildLearningCase(
  contract: DecisionContract,
  comparison: PredictionOutcomeComparison,
  eligibility: LearningEligibility,
  as_of: string,
  patternRefs: LearningPatternReference[]
): LearningCase {
  const likeForLike = comparison.comparisons.filter(c => c.comparability === 'LIKE_FOR_LIKE');
  const invariants = contract.basis.comparison_invariants;
  const grainParts = [
    invariants.category ? `category=${invariants.category}` : null,
    invariants.region ? `region=${invariants.region}` : null
  ].filter(Boolean);

  return {
    learning_case_id: contentId([contract.contract_id, comparison.contract_digest, comparison.comparison_id]),
    tenant_id: contract.tenant_id,
    contract_id: contract.contract_id,
    contract_digest: comparison.contract_digest,
    decision_basis_digest: contract.decision_basis_digest,
    comparison_id: comparison.comparison_id,
    predicted: likeForLike.map(c => ({
      source_field_path: c.predicted_source_field_path,
      source_package: c.predicted_source_package,
      value: c.predicted_value,
      basis: c.predicted_basis,
      unit: c.predicted_unit
    })),
    observed: likeForLike
      .map(c => {
        const obs = comparison.observations.find(o => o.observation_id === c.observed_observation_id);
        if (!obs) return null;
        return {
          observation_id: obs.observation_id,
          signal_id: obs.signal_id,
          value: obs.delta_pct,
          basis: c.observed_basis || 'GROSS',
          unit: c.observed_unit || obs.unit
        };
      })
      .filter(Boolean) as LearningCase['observed'],
    validity_basis: {
      comparability: 'LIKE_FOR_LIKE',
      grain_statement: grainParts.join('; ') || 'Contract comparison_invariants grain',
      quantity_basis: likeForLike[0]?.predicted_basis || 'GROSS',
      observation_authority: 'AUTHORITATIVE_EXTERNAL',
      eligibility
    },
    comparison_invariants: { ...invariants },
    selected_play_id: contract.resolution.selected_play_id,
    resolution_route: contract.resolution.route,
    pattern_refs: patternRefs,
    applicability_constraints: [
      `Contracted grain: ${grainParts.join(', ') || 'as declared in comparison_invariants'}`,
      `Resolution route: ${contract.resolution.route}`,
      `Evidence strength floor at decision: ${contract.evidence_strength_floor}`
    ],
    single_case_disclosure: SINGLE_CASE_DISCLOSURE,
    evidence_strength_floor: contract.evidence_strength_floor,
    synthetic_demo: comparison.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    created_as_of: as_of
  };
}

function registerMemoryFromLearningCase(
  learningCase: LearningCase,
  contract: DecisionContract,
  comparison: PredictionOutcomeComparison
): string {
  const memoryId = contentId(['memory', learningCase.learning_case_id]);
  const memoryCase: EnterpriseMemoryCase = {
    memory_id: memoryId,
    tenant_id: learningCase.tenant_id,
    title: `Learning case for contract ${contract.contract_id.slice(0, 12)}`,
    category: contract.basis.comparison_invariants.category || 'Campaign',
    situation_summary: `Structured learning case at comparison ${comparison.comparison_id.slice(0, 12)}`,
    decision_taken: `${contract.resolution.route} selected ${contract.resolution.selected_play_id}`,
    selected_interventions: [contract.resolution.selected_play_id],
    expected_outcome: learningCase.predicted.map(p => `${p.source_field_path}: ${p.value}${p.unit}`).join('; '),
    actual_outcome: learningCase.observed.map(o => `${o.signal_id}: ${o.value}${o.unit}`).join('; '),
    business_result: 'Structured CDI-07B learning case — not a rate or general effect claim',
    lessons_learned: learningCase.single_case_disclosure,
    confidence: 0,
    pattern_id: learningCase.pattern_refs[0]?.pattern_id,
    decision_contract_ref: contract.contract_id,
    signal_refs: learningCase.observed.map(o => o.signal_id),
    provenance: {
      source: 'CDI-07B Learning Loop',
      period: comparison.as_of,
      data_classification: 'Structured learning case',
      is_synthetic_demo: comparison.synthetic_demo,
      generator: ENGINE_VERSION,
      decision_contract_digest: learningCase.contract_digest
    },
    synthetic_demo: comparison.synthetic_demo,
    created_at: learningCase.created_as_of,
    schema_version: SCHEMA_VERSION
  };
  memoryRepository.registerMemoryCase(memoryCase);
  return memoryId;
}

/**
 * RB-1 — the eligibility-bearing surface of a comparison.
 *
 * Every LE-* condition except LE-1/LE-2/LE-6 is read off the comparison object. If that object is
 * accepted as supplied, a caller decides its own learning eligibility: assert LIKE_FOR_LIKE,
 * AUTHORITATIVE_EXTERNAL, complete=true and a non-INDETERMINATE verdict, and a LearningCase — and,
 * with register_memory, a WP10-D EnterpriseMemoryCase marked is_synthetic_demo=false — follows from
 * evidence the estate never observed. The comparison is therefore re-derived from the contract and
 * the observations, and the supplied object must agree with that re-derivation on every field that
 * can move eligibility.
 */
function eligibilityBearingProjection(c: PredictionOutcomeComparison): unknown {
  return {
    contract_id: c.contract_id,
    contract_digest: c.contract_digest,
    decision_basis_digest: c.decision_basis_digest,
    verdict: c.verdict,
    completeness: c.completeness,
    attribution: c.attribution.attribution,
    observation_authority: c.observations
      .map(o => `${o.observation_id}:${o.authority}`)
      .sort(),
    comparisons: c.comparisons
      .map(q => ({
        predicted_source_field_path: q.predicted_source_field_path,
        predicted_value: q.predicted_value,
        predicted_basis: q.predicted_basis,
        predicted_unit: q.predicted_unit,
        observed_observation_id: q.observed_observation_id ?? null,
        observed_value: q.observed_value ?? null,
        observed_basis: q.observed_basis ?? null,
        observed_unit: q.observed_unit ?? null,
        comparability: q.comparability,
        within_declared_envelope: q.error?.within_declared_envelope ?? null
      }))
      .sort((a, b) => a.predicted_source_field_path.localeCompare(b.predicted_source_field_path))
  };
}

export function buildLearningCandidate(args: BuildLearningCandidateArgs): LearningCandidate {
  const { contract, comparison: suppliedComparison, as_of, register_memory, pattern_refs } = args;
  if (!as_of?.trim()) reject('RJ-R1', 'RJ-R1: as_of is required');
  if (contract.status === 'WITHDRAWN') reject('RJ-P3', 'RJ-P3: Contract is WITHDRAWN');
  const contractDigest = computeContractDigest(contract);
  if (suppliedComparison.contract_digest !== contractDigest) {
    reject('RJ-P2', 'RJ-P2: comparison contract_digest mismatch');
  }

  // RB-1 — re-derive, then require agreement. No reconstruction, no repair: a comparison that does
  // not reproduce is refused rather than corrected, so the caller cannot learn what to fabricate.
  const comparison = comparePredictionToReality({
    contract,
    as_of: suppliedComparison.as_of,
    observations: suppliedComparison.observations,
    decision_state: args.decision_state
  });
  if (
    canonicalJson(eligibilityBearingProjection(suppliedComparison)) !==
    canonicalJson(eligibilityBearingProjection(comparison))
  ) {
    reject(
      'RJ-L1',
      'RJ-L1: supplied comparison does not reproduce from the contract and its observations; ' +
        'learning eligibility is never taken on a caller assertion'
    );
  }

  const eligibility = evaluateEligibility(contract, comparison);
  const blockedBy = eligibility.conditions.filter(c => !c.met).map(c => c.condition_id);
  const patternRefObjs = resolvePatternRefs(pattern_refs);

  let learningCase: LearningCase | undefined;
  if (eligibility.eligible) {
    learningCase = buildLearningCase(contract, comparison, eligibility, as_of, patternRefObjs);
    if (register_memory) {
      const memoryRef = registerMemoryFromLearningCase(learningCase, contract, comparison);
      learningCase = { ...learningCase, memory_case_ref: memoryRef };
    }
  } else if (register_memory) {
    reject('RJ-L1', 'RJ-L1: cannot register memory for ineligible candidate');
  }

  const candidate: LearningCandidate = {
    candidate_id: contentId([contract.contract_id, contractDigest, comparison.comparison_id, as_of, eligibility.eligible]),
    tenant_id: contract.tenant_id,
    session_id: contract.session_id,
    contract_id: contract.contract_id,
    contract_digest: contractDigest,
    comparison_id: comparison.comparison_id,
    eligibility,
    blocked_by: blockedBy,
    completeness: comparison.completeness,
    provenance: comparison.observations.map(o => o.provenance),
    ...(learningCase ? { learning_case: learningCase } : {}),
    synthetic_demo: comparison.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    created_as_of: as_of
  };

  if (!eligibility.eligible && candidate.learning_case) reject('RJ-L1', 'RJ-L1: ineligible candidate must not carry learning_case');
  if (!assertNoPatternWrite(candidate)) reject('RJ-L2', 'RJ-L2: pattern write vocabulary detected');
  const validation = validateLearningCandidate(candidate);
  if (!validation.valid) reject('RJ-L1', validation.errors.join('; '));
  return learningCandidateStore.create(candidate);
}

export function adaptEnterpriseSignalToOutcomeObservation(input: {
  signal: EnterpriseSignal;
  tenant_id: string;
  session_id: string;
  connector_id: string;
  external_category: ExternalSignalCategory;
  envelope_id?: string;
  metrics_supplied?: boolean;
}): OutcomeObservation {
  const connector = getExternalSignalConnector(input.connector_id);
  const sourceType = mapCategoryToSourceType(input.external_category);
  const synthetic = input.signal.synthetic_demo || connector?.synthetic_demo || true;
  const provenance = {
    origin: 'ESF-3_CONNECTOR' as const,
    connector_id: input.connector_id,
    envelope_id: input.envelope_id,
    adapter_version: connector?.adapter_version,
    source_system: input.signal.source_system,
    metrics_supplied: input.metrics_supplied ?? true,
    confidence: input.signal.confidence,
    quality: input.signal.quality,
    synthetic_demo: synthetic,
    ...(synthetic ? { synthetic_disclosure: SYNTHETIC_OBSERVATION_DISCLOSURE } : {})
  };

  const draft: OutcomeObservation = {
    observation_id: contentId([input.signal.signal_id, input.tenant_id, input.session_id, input.connector_id]),
    tenant_id: input.tenant_id,
    session_id: input.session_id,
    signal_id: input.signal.signal_id,
    connector_id: input.connector_id,
    external_category: input.external_category,
    signal_type: input.signal.signal_type,
    source_type: sourceType,
    entity_type: input.signal.entity_type,
    entity_id: input.signal.entity_id,
    baseline_value: input.signal.baseline_value,
    observed_value: input.signal.observed_value,
    delta_pct: input.signal.delta_pct,
    unit: input.signal.unit === 'percent' ? 'pp' : input.signal.unit,
    observed_at: input.signal.observed_at,
    effective_at: input.signal.effective_at,
    authority: 'UNATTRIBUTED',
    provenance,
    completeness: {
      covered_quantities: [],
      missing_quantities: [],
      window_start_observed: true,
      window_end_observed: true,
      adapter_capability_gap: false,
      gap_reasons: [],
      complete: true
    },
    synthetic_demo: synthetic,
    schema_version: SCHEMA_VERSION
  };

  draft.authority = determineObservationAuthority(draft, {
    connector_synthetic_demo: connector?.synthetic_demo ?? true,
    connector_status: connector?.status,
    connector_resolves: !!connector,
    scenario_derived_lineage: false,
    planned_start: null,
    comparison_invariants: {
      category: '',
      sku_scope: [],
      region: '',
      customer_segment: '',
      timing_mode: 'KNOWN_DATES',
      planned_start: null,
      planned_end: null,
      objective_type: 'OTHER',
      primary_metric: 'VOLUME',
      target_direction: 'INCREASE',
      tenant_id: input.tenant_id,
      session_id: input.session_id
    }
  });

  return draft;
}
