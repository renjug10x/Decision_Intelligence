/**
 * CogniX CDI-07B — Campaign Pre-Mortem, Prediction vs Reality & Closed Learning Loop
 *
 * Three artefacts, three questions, three lifecycles. None re-decides; none writes to the
 * decision contract. Frozen in docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_DESIGN_GATE.md §§3–11.
 */
import { ConfidenceBand, EvidenceStrength, ThresholdCalibrationStatus, ReadinessDimensionId } from './campaign-readiness-model';
import { ComparisonSetInvariants } from './campaign-frontier-model';
import { SignalMovementAttribution, DecisionResolutionRoute } from './campaign-decision-contract-model';
import { PrimaryObjectiveMetric } from './campaign-intent-model';
import { CanonicalSignalType, SignalEntityType, SignalSourceType } from './enterprise-signal-model';
import { ExternalSignalCategory, ExternalSignalConnectorStatus, OBSERVATION_INDEPENDENT_SOURCE_TYPES, isObservationIndependentSourceType } from './external-signal-connector-model';
export { OBSERVATION_INDEPENDENT_SOURCE_TYPES, isObservationIndependentSourceType };
import { DecisionDerivedImpacts } from './decision-state-model';
import { PatternScope } from './learning-pattern-model';
export { assertTenantSessionCoherent, canonicalJson, sha256Hex } from './campaign-decision-contract-model';
export type PreMortemStatus = 'ACTIVE' | 'SUPERSEDED';
export type FailureModeClass = 'READINESS_CONDITION_UNMET' | 'READINESS_VETO_LATENT' | 'CONSTRAINT_BREACH' | 'ASSUMPTION_FALSIFIED' | 'CHOICE_SET_INCOMPLETE' | 'EXECUTION_CAPACITY' | 'OBSERVABILITY_GAP';
export type ConsequenceOrder = 'FIRST_ORDER' | 'SECOND_ORDER' | 'THIRD_ORDER';
export type FailureModeGrounding = 'DECLARED_EVIDENCE' | 'STRUCTURAL' | 'UNASSESSED';
export interface FailureMode {
    failure_mode_id: string;
    failure_mode_class: FailureModeClass;
    statement: string;
    grounding: FailureModeGrounding;
    consequence_order: ConsequenceOrder;
    source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06' | 'CDI-07A' | 'WP10-C';
    source_field_path: string;
    contracted_value: string | number | boolean | null;
    readiness_condition_ref?: {
        dimension: ReadinessDimensionId;
        condition_id: string;
    };
    readiness_veto_ref?: {
        veto_id: string;
    };
    constraint_ref?: {
        constraint_id: string;
    };
    assumption_ref?: {
        assumption_id: string;
        load_bearing: boolean;
    };
    derived_impact_ref?: {
        field: keyof DecisionDerivedImpacts;
        scope_disclosure: string;
    };
    follows_from_failure_mode_id?: string;
    strength: EvidenceStrength;
    disclosure: string;
}
export interface ResilienceEvidence {
    resilience_id: string;
    failure_mode_id: string;
    statement: string;
    source_package: 'CDI-04' | 'CDI-06' | 'CDI-07A' | 'WP10-C';
    source_field_path: string;
    discharge_test_ref?: {
        dimension: ReadinessDimensionId;
        condition_id: string;
    };
    strength: EvidenceStrength;
    no_known_mitigation: boolean;
}
/** Dimensions a pre-mortem could not examine, and why (gate §3.2). */
export interface PreMortemUnexaminedDimension {
    dimension_id: string;
    statement: string;
    reason: string;
    source_package?: 'CDI-04' | 'CDI-06' | 'CDI-07A' | 'ESF-3' | 'WP10-C';
}
export interface CampaignPreMortem {
    pre_mortem_id: string;
    pre_mortem_version: number;
    status: PreMortemStatus;
    tenant_id: string;
    session_id: string;
    contract_id: string;
    contract_digest: string;
    decision_basis_digest: string;
    failure_modes: FailureMode[];
    resilience: ResilienceEvidence[];
    unexamined: PreMortemUnexaminedDimension[];
    unavailable_capabilities: LearningRequiredAuthoritativeInput[];
    derived_impact_scope_disclosure?: string;
    evidence_strength_floor: EvidenceStrength;
    confidence_band: ConfidenceBand;
    calculation_mode: 'deterministic_pre_mortem';
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
    created_as_of: string;
}
export type ObservationAuthority = 'AUTHORITATIVE_EXTERNAL' | 'SYNTHETIC_DEMONSTRATION' | 'SCENARIO_DERIVED' | 'UNATTRIBUTED';
export interface EvidenceProvenance {
    origin: 'ESF-3_CONNECTOR' | 'ESF-1_SIMULATION' | 'WP10-C_SCENARIO' | 'ESF-6_ATTESTED_SOURCE' | 'UNKNOWN';
    connector_id?: string;
    envelope_id?: string;
    adapter_version?: string;
    source_system?: string;
    metrics_supplied: boolean;
    confidence?: number;
    quality?: number;
    /** R5 / E7 — never an authority input. */
    confidence_provenance?: 'SUPPLIED' | 'ADAPTER_DEFAULT';
    quality_provenance?: 'SUPPLIED' | 'ADAPTER_DEFAULT';
    attestation_id?: string;
    admission_receipt_id?: string;
    provider_payload_ref?: string;
    synthetic_demo: boolean;
    synthetic_disclosure?: string;
}
export interface ObservationCompleteness {
    covered_quantities: string[];
    missing_quantities: string[];
    window_start_observed: boolean;
    window_end_observed: boolean;
    adapter_capability_gap: boolean;
    gap_reasons: string[];
    complete: boolean;
}
export type GrainDimension = 'category' | 'region' | 'sku' | 'customer_segment';
export interface ObservationGrainKeyEntry {
    dimension: GrainDimension;
    token: string;
}
export interface ObservationGrainKey {
    dimensions: ObservationGrainKeyEntry[];
}
export type ObservationMeasurementDesign = 'DIRECT_MEASUREMENT' | 'MODELLED' | 'CONTROLLED_DIFFERENCE';
export interface OutcomeObservation {
    observation_id: string;
    tenant_id: string;
    session_id: string;
    signal_id: string;
    connector_id: string;
    external_category: ExternalSignalCategory;
    signal_type: CanonicalSignalType;
    source_type: SignalSourceType;
    entity_type: SignalEntityType;
    entity_id: string;
    baseline_value: number;
    observed_value: number;
    delta_pct: number;
    unit: string;
    observed_at: string;
    effective_at: string;
    authority: ObservationAuthority;
    provenance: EvidenceProvenance;
    completeness: ObservationCompleteness;
    synthetic_demo: boolean;
    schema_version: string;
    grain_key?: ObservationGrainKey;
    measurement_window_start?: string;
    measurement_window_end?: string;
    measurement_design?: ObservationMeasurementDesign;
    /** Present => this observation was admitted through the ESF-6 attested path. */
    admission_receipt_id?: string;
    source_id?: string;
}
export type QuantityBasis = 'ATTRIBUTABLE' | 'GROSS' | 'MODELLED_MONETARY';
export type ComparabilityVerdict = 'LIKE_FOR_LIKE' | 'GRAIN_MISMATCH' | 'QUANTITY_BASIS_MISMATCH' | 'NO_OBSERVED_COUNTERFACTUAL' | 'UNIT_MISMATCH' | 'OBSERVATION_ABSENT' | 'OBSERVATION_NOT_AUTHORITATIVE' | 'TENANT_SESSION_MISMATCH' | 'GRAIN_UNDECLARED' | 'WINDOW_UNDECLARED' | 'WINDOW_MISMATCH' | 'METRIC_MISMATCH' | 'METRIC_CORRESPONDENCE_UNDECLARED' | 'QUANTITY_BASIS_UNDECLARED';
export type ComparisonVerdict = 'WITHIN_DECLARED_ENVELOPE' | 'OUTSIDE_DECLARED_ENVELOPE' | 'INDETERMINATE';
export interface PredictionError {
    signed_delta: number;
    unit: string;
    declared_envelope?: {
        lower: number;
        upper: number;
        source_field_path: string;
        envelope_id: string;
        declared_by: string;
        pre_declaration_witness: 'NONE' | 'SERVER_REGISTRATION_RECEIPT';
    };
    /** Z2: set false when the signed error falls outside. Set true ONLY when witness !== 'NONE'. */
    within_declared_envelope?: boolean;
    /** Mandatory when the error falls inside the envelope but the witness is NONE. */
    within_withheld_reason?: string;
    statement: string;
}
export interface QuantityComparison {
    predicted_source_field_path: string;
    predicted_source_package: 'CDI-02' | 'CDI-05' | 'CDI-06';
    predicted_value: number;
    predicted_basis: QuantityBasis;
    predicted_unit: string;
    observed_observation_id?: string;
    observed_value?: number;
    observed_basis?: QuantityBasis;
    observed_unit?: string;
    comparability: ComparabilityVerdict;
    error?: PredictionError;
    incomparable_reason?: string;
}
export interface OutcomeAttribution {
    attribution: SignalMovementAttribution;
    statement: string;
    disclosure?: string;
    contracted_decision_state_version?: number;
    observed_decision_state_version?: number;
}
export interface PredictionOutcomeComparison {
    comparison_id: string;
    tenant_id: string;
    session_id: string;
    contract_id: string;
    contract_digest: string;
    decision_basis_digest: string;
    as_of: string;
    observations: OutcomeObservation[];
    comparisons: QuantityComparison[];
    verdict: ComparisonVerdict;
    attribution: OutcomeAttribution;
    completeness: ObservationCompleteness;
    unavailable_capabilities: LearningRequiredAuthoritativeInput[];
    not_a_decision_verdict_disclosure: string;
    synthetic_disclosure?: string;
    evidence_strength_floor: EvidenceStrength;
    calculation_mode: 'deterministic_prediction_comparison';
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
}
export interface LearningEligibilityCondition {
    condition_id: string;
    statement: string;
    met: boolean;
    unmet_reason?: string;
}
export interface LearningEligibility {
    eligible: boolean;
    conditions: LearningEligibilityCondition[];
    determined_by: 'deterministic_conjunction';
}
export interface PredictedQuantityRecord {
    source_field_path: string;
    source_package: QuantityComparison['predicted_source_package'];
    value: number;
    basis: QuantityBasis;
    unit: string;
}
export interface ObservedQuantityRecord {
    observation_id: string;
    signal_id: string;
    value: number;
    basis: QuantityBasis;
    unit: string;
}
export interface LearningCase {
    learning_case_id: string;
    tenant_id: string;
    contract_id: string;
    contract_digest: string;
    decision_basis_digest: string;
    comparison_id: string;
    predicted: PredictedQuantityRecord[];
    observed: ObservedQuantityRecord[];
    validity_basis: {
        comparability: ComparabilityVerdict;
        grain_statement: string;
        quantity_basis: QuantityBasis;
        observation_authority: ObservationAuthority;
        eligibility: LearningEligibility;
    };
    comparison_invariants: ComparisonSetInvariants;
    selected_play_id: string;
    resolution_route: DecisionResolutionRoute;
    memory_case_ref?: string;
    pattern_refs: LearningPatternReference[];
    applicability_constraints: string[];
    single_case_disclosure: string;
    evidence_strength_floor: EvidenceStrength;
    synthetic_demo: boolean;
    schema_version: string;
    created_as_of: string;
}
export interface LearningCandidate {
    candidate_id: string;
    tenant_id: string;
    session_id: string;
    contract_id: string;
    contract_digest: string;
    comparison_id: string;
    eligibility: LearningEligibility;
    blocked_by: string[];
    completeness: ObservationCompleteness;
    provenance: EvidenceProvenance[];
    learning_case?: LearningCase;
    synthetic_demo: boolean;
    schema_version: string;
    created_as_of: string;
}
export type LearningCapability = 'LEARNING_PATTERN_PROMOTION' | 'OBSERVED_COUNTERFACTUAL_COMPARISON' | 'QUANTITATIVE_DECISION_HALF_LIFE' | 'PRE_DECLARATION_WITNESSED_ENVELOPE';
/** Local structural twin — CDI-06 R1 / CDI-07A §8.2 precedent. No upstream widening. */
export interface LearningRequiredAuthoritativeInput {
    field: string;
    grain: string;
    why_required: string;
    inadmissible_substitutes: string[];
    enables: LearningCapability;
    status: 'AWAITING_AUTHORITATIVE_SOURCE';
}
export interface LearningPatternReference {
    pattern_id: string;
    pattern_name: string;
    pattern_scope: PatternScope;
    relevance_basis: string;
    telemetry_disclosure: string;
    source_classification: string;
    synthetic_demo: boolean;
}
/** §3.4 — mandatory on every derived-impact failure mode and once on the pre-mortem. */
export declare const DERIVED_IMPACT_SCOPE_DISCLOSURE: string;
/** §5.6 — mandatory wherever a comparison or prediction error is shown. */
export declare const NOT_A_DECISION_VERDICT_DISCLOSURE: string;
/** §6.4 — mandatory on every LearningCase. */
export declare const SINGLE_CASE_DISCLOSURE: string;
/** §7.2 — mandatory on every LearningPatternReference. */
export declare const PATTERN_TELEMETRY_DISCLOSURE: string;
/** §4.4 — mandatory when synthetic_demo is true on an observation. */
export declare const SYNTHETIC_OBSERVATION_DISCLOSURE: string;
/** Derived from mapCategoryToSourceType — re-exported from external-signal-connector-model (§8.3 / X1). */
export declare const PATTERN_PROMOTION_REQUIRED_INPUT: LearningRequiredAuthoritativeInput;
export declare const OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT: LearningRequiredAuthoritativeInput;
/** §9 — QUANTITATIVE_DECISION_HALF_LIFE remains AWAITING at this work package. */
export declare const QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT: LearningRequiredAuthoritativeInput;
export declare const PREDICTION_ENVELOPE_REQUIRED_INPUT: LearningRequiredAuthoritativeInput;
export declare const COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT: LearningRequiredAuthoritativeInput;
export declare const METRIC_CORRESPONDENT_SIGNAL_TYPES: Readonly<Record<PrimaryObjectiveMetric, readonly CanonicalSignalType[]>>;
/** Owner ruling X3 — frozen contract semantic is N > 1; initial policy value is 3. */
export declare const LEARNING_PATTERN_PROMOTION_THRESHOLD_N = 3;
export declare const LEARNING_PATTERN_PROMOTION_THRESHOLD_CALIBRATION: ThresholdCalibrationStatus;
/** Owner ruling X3 — three mandatory labels published alongside N. */
export declare const LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_UNCALIBRATED = "UNCALIBRATED \u2014 not fitted to any observed outcome series.";
export declare const LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_CONFIGURABLE = "CONFIGURABLE FUTURE POLICY \u2014 a governance setting, not a contract semantic.";
export declare const LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_NOT_SIGNIFICANCE: string;
export declare const LEARNING_PATTERN_PROMOTION_THRESHOLD_DISCLOSURE: string;
export declare const LEARNING_ELIGIBILITY_CONDITION_IDS: readonly ["LE-1", "LE-2", "LE-3", "LE-4", "LE-5", "LE-6", "LE-7", "LE-8"];
/** §3.3 — KEY and VALUE scan for invented risk precision. */
export declare function assertNoInventedRiskPrecision(payload: unknown): boolean;
/**
 * §9.4 — wraps CDI-07A assertNoDurationSemantics and extends with CDI-07B prohibited vocabulary.
 * Re-exported from campaign-decision-contract-model via a local wrapper so validators inherit
 * CDI-07A duration scans unchanged.
 */
export declare function assertNoDurationSemantics(payload: unknown): boolean;
/** §3.6 / AC-P8 — resilience never proposes an alternative play or contract change. */
export declare function assertPreMortemProposesNoAlternative(payload: unknown): boolean;
/** L-INV-5 / RJ-R3 — PredictionError only on LIKE_FOR_LIKE comparisons. */
export declare function assertErrorOnlyWhenLikeForLike(comparisons: QuantityComparison[]): boolean;
/** §5.5 / RJ-R4 — SUCCESS and FAILURE are refused as vocabulary. */
export declare function assertNoSuccessFailureVerdict(payload: unknown): boolean;
export interface ObservationAuthorityEvaluationContext {
    connector_synthetic_demo: boolean;
    connector_status?: ExternalSignalConnectorStatus;
    connector_resolves: boolean;
    scenario_derived_lineage: boolean;
    planned_start: string | null;
    comparison_invariants: ComparisonSetInvariants;
    /** Server-verified: the admission receipt resolves and belongs to this tenant. */
    admission_receipt_resolves?: boolean;
    /** Server-derived from the registered source's category. Overrides any payload source_type. */
    resolved_source_type?: SignalSourceType;
}
/**
 * §4.3 — seven-condition conjunction for AUTHORITATIVE_EXTERNAL.
 *
 * 1. synthetic_demo === false on the signal AND on the originating connector descriptor
 * 2. source_type ∈ OBSERVATION_INDEPENDENT_SOURCE_TYPES
 * 3. connector_id resolves in the ESF-3 registry with status AVAILABLE (or ESF-6 attested source with resolving receipt)
 * 4. provenance.envelope_id and provenance.connector_id both present (or valid attested source)
 * 5. observed_at parses and is not before contracted planned_start
 * 6. metrics_supplied === true
 * 7. entity resolves to the decision grain (assertGrainResolves)
 *
 * Failing 1 → SYNTHETIC_DEMONSTRATION.
 * Failing 2 with scenario-derived lineage → SCENARIO_DERIVED.
 * Failing 3 or 4 → UNATTRIBUTED.
 * Failing 5, 6 or 7 leaves authority class intact but blocks LIKE_FOR_LIKE.
 */
export declare function assertObservationAuthorityConjunction(observation: OutcomeObservation, context: ObservationAuthorityEvaluationContext): boolean;
export declare function determineObservationAuthority(observation: OutcomeObservation, context: ObservationAuthorityEvaluationContext): ObservationAuthority;
/** L-INV-3 — synthetic observations must carry disclosure and never AUTHORITATIVE_EXTERNAL. */
export declare function assertSyntheticNeverPresentedAsReal(observation: OutcomeObservation): boolean;
/** §6.3 — eligible is the conjunction of all eight LE-* conditions; never a score. */
export declare function assertEligibilityIsConjunction(eligibility: LearningEligibility): boolean;
/** RJ-L2 / L-INV-10 — no pattern write vocabulary on CDI-07B artefacts. */
export declare function assertNoPatternWrite(payload: unknown): boolean;
/** L-INV-9 / B8 — WP10-D telemetry must not be copied onto CDI-07B artefacts. */
export declare function assertNoWp10dTelemetryCopied(payload: unknown): boolean;
/**
 * §5.4.1 / CDI-08 Z4 — deterministic fail-closed grain resolution.
 * An observation resolves only when:
 * 1. Single dimension (no grain_key): entity_type/entity_id covers exactly the single required dimension.
 * 2. Composite grain (grain_key): exact set equality on dimensions + exact token identity on all dimensions.
 */
export declare function assertGrainResolves(observation: OutcomeObservation, comparison_invariants: ComparisonSetInvariants): boolean;
export declare function requiredGrainDimensions(invariants: ComparisonSetInvariants): GrainDimension[];
export declare function normalizeGrainToken(value: string): string;
export declare function entityCoversSingleDimension(observation: OutcomeObservation, dimension: GrainDimension, invariants: ComparisonSetInvariants): boolean;
export declare function observationAuthorityBlocksLikeForLike(observation: OutcomeObservation, context: ObservationAuthorityEvaluationContext): boolean;
export declare function validateCampaignPreMortem(p: CampaignPreMortem): {
    valid: boolean;
    errors: string[];
};
export declare function validatePredictionOutcomeComparison(c: PredictionOutcomeComparison): {
    valid: boolean;
    errors: string[];
};
export declare function validateLearningCandidate(candidate: LearningCandidate): {
    valid: boolean;
    errors: string[];
};
export declare function validateLearningCase(lc: LearningCase): {
    valid: boolean;
    errors: string[];
};
