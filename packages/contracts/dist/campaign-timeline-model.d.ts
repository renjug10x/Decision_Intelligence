/**
 * CogniX CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition
 *
 * Temporal rendering of a decision already computed by CDI-02.
 * FLAT_RATE_IDENTITY only — no fabricated curvature.
 * Contracts frozen in docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_DESIGN_GATE.md §8.
 */
import { CampaignIntent } from './campaign-intent-model';
import { CampaignEvaluationResponse, CausalDriverId, CausalDriverClass } from './campaign-counterfactual-model';
import { OpportunityDiscoveryResponse } from './campaign-opportunity-model';
import { ConfidenceBand, EvidenceStrength, ReadinessState, ReadinessEvidenceRef, DecisionReadinessAssessment, weakestEvidenceStrength } from './campaign-readiness-model';
import { SimulationPeriod } from './enterprise-signal-model';
export type TimelinePhase = 'PRE_CAMPAIGN' | 'CAMPAIGN' | 'POST_CAMPAIGN';
export type TimelineTrajectoryKind = 'COUNTERFACTUAL' | 'INTERVENTION';
export type TimelineLens = 'DEMAND' | 'REVENUE' | 'CONTRIBUTION' | 'INVENTORY';
export type TimelineLensAvailability = 'AVAILABLE' | 'NOT_AVAILABLE';
export type TimelinePointBasis = 'CDI02_CURRENT_BASELINE_RUN_RATE' | 'CDI02_ENDPOINT_ALLOCATED' | 'NOT_MODELLED_BY_CDI02';
export type TemporalAllocationProfile = 'FLAT_RATE_IDENTITY';
/** CDI-02 weekly rate constant mirrored for lens rendering — not a second demand model. */
export declare const CDI02_BASE_WEEKLY_UNITS = 10000;
export interface TimelineSeriesPoint {
    period_index: number;
    period_date: string;
    simulation_period?: SimulationPeriod;
    phase: TimelinePhase;
    ambient_component_pp: number | null;
    intervention_component_pp: number | null;
    index_pct: number | null;
    basis: TimelinePointBasis;
    strength: EvidenceStrength;
    synthetic_demo: boolean;
    not_modelled_reason?: string;
    disclosure?: string;
}
export interface TimelineConfidenceEnvelopePoint {
    period_index: number;
    horizon_days_out: number;
    lower_index_pct: number;
    upper_index_pct: number;
}
export interface TimelineConfidenceEnvelope {
    band: ConfidenceBand;
    evidence_strength_floor: EvidenceStrength;
    model_integrity: {
        counterfactual_valid: boolean;
        causal_valid: boolean;
        reconciliation_ok: boolean;
    };
    horizon_basis: 'declared_horizon_uncertainty_profile';
    synthetic_demo: true;
    points: TimelineConfidenceEnvelopePoint[];
    calibration_target: string;
}
export interface TimelineTrajectory {
    kind: TimelineTrajectoryKind;
    points: TimelineSeriesPoint[];
    envelope: TimelineConfidenceEnvelope;
    terminal_index_pct: number;
}
export interface RequiredAuthoritativeInput {
    field: string;
    grain: string;
    why_required: string;
    inadmissible_substitutes: string[];
    enables: TimelineLens;
    status: 'AWAITING_AUTHORITATIVE_SOURCE';
}
export interface TimelineLensValue {
    period_index: number;
    counterfactual: number | null;
    intervention: number | null;
}
export interface TimelineLensProjection {
    lens: TimelineLens;
    availability: TimelineLensAvailability;
    quantity_basis: 'cdi02_weekly_rate' | 'cdi02_unit_contribution' | 'cdi02_waste_units' | 'none';
    values: TimelineLensValue[];
    strength: EvidenceStrength;
    missing_inputs: string[];
    required_authoritative_input?: RequiredAuthoritativeInput;
    disclosure?: string;
    /** WP10-C scalars — never a series */
    scalar_annotations?: Array<{
        field_path: string;
        value: number;
        temporal_extent: 'NONE — scalar state, not a time series';
        source: 'wp10c_derived_impacts';
    }>;
}
export type TimelineMarkerType = 'CAMPAIGN_START' | 'CAMPAIGN_END' | 'WINDOW_START' | 'WINDOW_END' | 'WINDOW_TIER' | 'DISCOVERY_ANCHOR' | 'CONTEXT_SIGNAL' | 'READINESS_CONDITION' | 'CHANGE_TRIGGER';
export interface TimelineMarker {
    marker_id: string;
    marker_type: TimelineMarkerType;
    period_index: number;
    period_date: string;
    label: string;
    strength: EvidenceStrength;
    synthetic_demo: boolean;
    disclosure?: string;
    already_in_ambient?: boolean;
    ambient_driver_id?: CausalDriverId;
    source_package: 'CDI-01' | 'CDI-02' | 'CDI-03' | 'CDI-04' | 'ESF-2' | 'WP10-C';
}
export interface DecompositionRow {
    driver_id: CausalDriverId;
    driver_class: CausalDriverClass;
    label: string;
    contribution_pp: number;
    attributed: boolean;
    exclusion_reason?: string;
    rationale: string;
    evidence_refs: string[];
}
export interface DecompositionGroup {
    driver_class: CausalDriverClass;
    label: string;
    meaning: string;
    subtotal_pp: number;
    rows: DecompositionRow[];
}
export interface DemandDecomposition {
    ambient_group: DecompositionGroup;
    intervention_group: DecompositionGroup;
    residual_row: DecompositionRow;
    reconciliation: {
        reconciled_sum_pp: number;
        reconciliation_ok: boolean;
        validator_errors: string[];
    };
    excluded_drivers: DecompositionRow[];
}
export interface TimelineTier1Projection {
    attributable_uplift_pp: number;
    contribution_delta_gbp: number;
    confidence_band: ConfidenceBand;
    readiness_state?: ReadinessState;
    headline: string;
}
export interface DecisionTimelineProjection {
    projection_id: string;
    campaign_intent_id: string;
    tenant_id: string;
    session_id: string;
    grid: {
        points: number;
        start_date: string;
        end_date: string;
        campaign_start: string;
        campaign_end: string;
        grid_basis: string;
        pre_days: number;
        campaign_days: number;
        post_days: number;
    };
    trajectories: TimelineTrajectory[];
    lenses: TimelineLensProjection[];
    markers: TimelineMarker[];
    attributable_effect_envelope: TimelineConfidenceEnvelope;
    decomposition: DemandDecomposition;
    allocation_profile: TemporalAllocationProfile;
    allocation_provenance: 'information_preserving_identity';
    tier1: TimelineTier1Projection;
    readiness_reference?: {
        readiness_id: string;
        state: ReadinessState;
        headline: string;
    };
    evidence_refs?: ReadinessEvidenceRef[];
    counterfactual_id: string;
    causal_id: string;
    calculation_mode: 'deterministic_demo_timeline';
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
    timestamp: string;
    /** When band=INSUFFICIENT — no trajectories rendered */
    insufficient_reason?: string;
}
export interface TimelineProjectionRequest {
    tenant_id: string;
    session_id: string;
    campaign_intent_id?: string;
    campaign_intent?: CampaignIntent;
    include_signals?: boolean;
    campaign_evaluation?: CampaignEvaluationResponse;
    opportunity_discovery?: OpportunityDiscoveryResponse;
    readiness?: DecisionReadinessAssessment;
    /** Forbidden — RJ4 */
    allocation_profile_override?: unknown;
    envelope_profile_override?: unknown;
    evaluation_timestamp?: string;
}
export interface TimelineProjectionResponse {
    evaluation_id: string;
    tenant_id: string;
    session_id: string;
    campaign_intent_id: string;
    projection: DecisionTimelineProjection;
    timestamp: string;
    schema_version: string;
}
export declare const REVENUE_REQUIRED_INPUT: RequiredAuthoritativeInput;
export declare const POST_CAMPAIGN_NOT_MODELLED = "CogniX does not model what happens after this campaign \u2014 no persistence, decay or payback claim is asserted.";
export declare const PRE_CAMPAIGN_DISCLOSURE = "modelled run-rate, not observed history";
export declare function validateDecisionTimelineProjection(p: Partial<DecisionTimelineProjection>): {
    valid: boolean;
    errors: string[];
};
export declare function validateTimelineProjectionRequest(r: Partial<TimelineProjectionRequest>): {
    valid: boolean;
    errors: string[];
    rejection_id?: string;
};
export declare function assertAmbientParity(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
export declare function assertAmbientMovementPresent(p: DecisionTimelineProjection, ambientUpliftPp: number): {
    ok: boolean;
    violations: string[];
};
export declare function assertAttributableIsDifferenceOnly(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
export declare function assertAllocationConserves(p: DecisionTimelineProjection, ambientPp: number, interventionPp: number): {
    ok: boolean;
    violations: string[];
};
export declare function assertNoObservedHistory(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
export declare function assertPostCampaignEmpty(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
export declare function assertEnvelopeMonotone(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
/**
 * U3 / I7 at the envelope layer. A point can be null in the series and still be asserted
 * by a band drawn over it: a post-campaign envelope centred on the identity draws
 * reversion, and an effect envelope centred on zero draws convergence. Both are causal
 * claims CDI-02 does not make, so no envelope may extend past the modelled phases.
 */
export declare function assertEnvelopeWithinModelledPhases(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
/**
 * I14. A signal CDI-02 already consumed as an ambient driver is inside
 * ambient_component_pp; rendering it as an additional effect counts the same weather
 * twice.
 */
export declare function assertContextSignalsNotDoubleCounted(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
export declare function assertUnavailableLensNamesInput(p: DecisionTimelineProjection): {
    ok: boolean;
    violations: string[];
};
/**
 * CDI-04's rule, reused rather than redefined (design gate §5.1). CDI-05 defines no
 * second evidence taxonomy and no second implementation of one, so upstream changes to
 * the strength order cannot silently diverge here.
 */
export declare const weakestStrength: typeof weakestEvidenceStrength;
