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
export type ReadinessDimensionId = 'COMMERCIAL' | 'DEMAND' | 'OPERATIONAL' | 'CONTEXT' | 'CUSTOMER' | 'STRATEGIC';
export type DimensionState = 'CLEAR' | 'WATCH' | 'CONSTRAINED' | 'BLOCKING' | 'INSUFFICIENT_EVIDENCE' | 'NOT_EVALUATED';
export type ReadinessState = 'GO' | 'CONDITIONAL_GO' | 'REVIEW' | 'DO_NOT_PROCEED';
export type EvidenceStrength = 'OBSERVED' | 'DERIVED' | 'DERIVED_KNOWN_DISCONTINUITY' | 'DECLARED_INPUT' | 'SEEDED_ASSUMPTION' | 'PROXY' | 'PLACEHOLDER_EXCLUDED' | 'MISSING';
/** Fixed ordering, strongest first. Exported so "weakest strength" is never ambiguous. */
export declare const EVIDENCE_STRENGTH_ORDER: EvidenceStrength[];
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
export declare const WP10C_RECOVERY_LEVER_HEADROOM: Readonly<Record<string, number>>;
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
    veto_basis: 'CONTRACT_INTEGRITY' | 'STATED_OBJECTIVE_CONTRADICTION' | 'DECLARED_TOLERANCE_EXCEEDED' | 'OPERATIONAL_INFEASIBILITY' | 'NO_ADDRESSABLE_ESTATE';
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
    evidence_coverage: {
        required: string[];
        present: string[];
        missing: string[];
    };
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
export declare const READINESS_DIMENSION_ORDER: ReadinessDimensionId[];
/** Centralised synthetic demonstration policy — build-time constant; not caller-configurable. */
export declare const READINESS_THRESHOLD_POLICY: ReadinessThresholdPolicy;
export declare function getThreshold(thresholdId: string): ReadinessThreshold;
export declare function weakestEvidenceStrength(strengths: EvidenceStrength[]): EvidenceStrength;
export declare function worseDimensionState(a: DimensionState, b: DimensionState): DimensionState;
export declare function deriveCommercialObjectiveClass(intent: CampaignIntent): CommercialObjectiveClass;
export declare function validateDecisionReadinessAssessment(a: Partial<DecisionReadinessAssessment>): {
    valid: boolean;
    errors: string[];
};
export declare function validateReadinessEvaluationRequest(r: Partial<ReadinessEvaluationRequest>): {
    valid: boolean;
    errors: string[];
    rejection_id?: string;
};
export declare function assertNoCompensation(a: DecisionReadinessAssessment): {
    ok: boolean;
    violations: string[];
};
export declare function assertNoThresholdDerivedVeto(a: DecisionReadinessAssessment): {
    ok: boolean;
    violations: string[];
};
export declare function assertNegativeContributionNeverGo(a: DecisionReadinessAssessment): {
    ok: boolean;
    violations: string[];
};
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
export declare function assertRecoveryLeverParity(): {
    ok: boolean;
    violations: string[];
};
