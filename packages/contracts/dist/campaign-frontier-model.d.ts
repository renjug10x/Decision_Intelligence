/**
 * CogniX CDI-06 — Multi-Objective Outcome Frontier & Competing Strategies
 *
 * Frozen in docs/reports/COGNIX_CDI_06_OUTCOME_FRONTIER_DESIGN_GATE.md.
 * Exactly two Pareto axes. No weights, utilities, or hidden ranking.
 * ARF-A (SIGNALS_EXCLUDED) is the only emitting ambient frame.
 */
import { ConfidenceBand, EvidenceStrength, EVIDENCE_STRENGTH_ORDER, ReadinessEvidenceRef, ReadinessVeto, ReadinessCondition, ReadinessState, CommercialToleranceAssessment, EconomicTolerance, weakestEvidenceStrength } from './campaign-readiness-model';
import { DemandDecomposition, RequiredAuthoritativeInput, REVENUE_REQUIRED_INPUT } from './campaign-timeline-model';
import { CampaignEvaluationResponse } from './campaign-counterfactual-model';
export type PlayKind = 'DO_NOTHING' | 'PROMOTION' | 'NON_PROMOTION';
export type PlayAdmissibility = 'ADMISSIBLE' | 'INADMISSIBLE_UNSTATED_MECHANIC' | 'INADMISSIBLE_MODEL_INTEGRITY' | 'INADMISSIBLE_AMBIENT_FRAME' | 'INADMISSIBLE_VETOED' | 'EXCLUDED_ECONOMICS_INCOMPLETE';
export type EconomicsCompleteness = 'COMPLETE_ON_ADMITTED_AXES' | 'DEMAND_MODELLED_COST_UNMODELLED';
export type AmbientFrameMode = 'SIGNALS_EXCLUDED' | 'SIGNALS_SHARED';
export type AxisAvailability = 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_ADMISSIBLE_AS_AXIS';
export type AxisDirection = 'MAXIMISE' | 'MINIMISE';
export type AxisId = 'attributable_volume_uplift_pp' | 'contribution_delta_gbp';
export type SelectionStatus = 'SELECTED' | 'CHOICE_REQUIRED' | 'NO_ADMISSIBLE_PLAY';
export type SelectionBasis = 'UNIQUELY_ADMISSIBLE_UNDER_DECLARED_CONSTRAINTS' | 'BALANCED_UNDER_DECLARED_CONSTRAINTS';
export type FrontierStatus = 'EMITTED' | 'NOT_EMITTED';
export type NotEmittedReason = 'ANCHOR_MODEL_INTEGRITY_FAILURE' | 'AMBIENT_FRAME_DIVERGENCE' | 'SCENARIO_ZERO_ABSENT';
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
    kind: 'MAX_CONTRIBUTION_SACRIFICE' | 'OBJECTIVE_CLASS_VALUE_CREATION' | 'MINIMUM_ATTRIBUTABLE_UPLIFT';
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
export declare const MUTABLE_PLAY_DELTA_FIELDS: readonly string[];
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
    axis_values: {
        attributable_volume_uplift_pp: number;
        contribution_delta_gbp: number;
    };
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
export declare const DOMINANCE_EPSILON: Record<AxisId, number>;
/**
 * Owner addendum R5. The basis is the causal model's resolution, not any observed value
 * set: waste is not calibrated finely enough across intervention depths to carry a
 * Pareto trade-off, so admitting it as an axis would imply a trade-off the model does
 * not support. Nothing here rests on waste taking particular values.
 */
export declare const WASTE_ANNOTATION_DISCLOSURE: string;
export declare const WASTE_ADMISSIBLE_WHEN = "the causal waste model gains depth-resolved calibration sufficient for trade-off optimisation";
export declare const SCENARIO_ZERO_FRAMING = "Do Nothing means no intervention. It does not mean no change \u2014 ambient demand movement continues either way, and is shown here.";
export declare const NON_PROMOTION_DISCLOSURE: string;
export declare const NON_PROMOTION_REQUIRED_INPUT: FrontierRequiredAuthoritativeInput;
export declare const AVAILABILITY_REQUIRED_INPUT: FrontierRequiredAuthoritativeInput;
/** Declared build-time depth grid (U5 open constants; shape frozen). Spans contribution breakeven. */
export declare const DEFAULT_DEPTH_GRID_PCT: readonly [5, 10, 15, 20, 30];
export declare const PLAY_GENERATION_POLICY: PlayGenerationPolicy;
export declare const ADMITTED_AXES: OutcomeAxisDeclaration[];
export declare const CONTROLLED_PLAY_LABELS: readonly ["Do Nothing", "Your Stated Plan", "Shallow Depth Promotion", "Moderate Depth Promotion", "Deep Discount Promotion", "Non-Promotion Alternative"];
/**
 * Numeric key paths permitted on a StrategyPlay (R7). Anything numeric outside this set
 * is an unauthorised scalar: it could order plays, and a denylist of suggestive names
 * would not catch it. Every entry here is evidence carried from an upstream package, and
 * none participates in dominance — `assertWasteNotInDominance` and the dominance
 * recomputation tests are what hold that second claim up.
 */
export declare const ALLOWED_PLAY_NUMERIC_PATHS: readonly string[];
export declare function numericPathsOf(obj: unknown, root: string): string[];
/**
 * R7 — allowlist, not denylist. Any numeric leaf on a play outside
 * `ALLOWED_PLAY_NUMERIC_PATHS` is reported, whatever it is called.
 */
export declare function assertNoUnauthorisedNumericScalar(frontier: OutcomeFrontier): {
    ok: boolean;
    violations: string[];
};
export declare function validateFrontierRequest(r: Partial<FrontierEvaluationRequest>): {
    valid: boolean;
    errors: string[];
    rejection_id?: string;
};
export declare function validateOutcomeFrontier(frontier: OutcomeFrontier): {
    valid: boolean;
    errors: string[];
};
export declare function assertAmbientFrameShared(plays: StrategyPlay[], expected?: AmbientFrameStamp): {
    ok: boolean;
    divergences: AmbientFrameDivergenceReport[];
};
export declare function assertNoSyntheticOutcome(play: StrategyPlay, evaluation: CampaignEvaluationResponse): {
    ok: boolean;
    errors: string[];
};
export declare function assertNoHiddenAggregate(frontier: OutcomeFrontier): boolean;
export declare function assertScenarioZeroPresent(frontier: OutcomeFrontier): boolean;
export declare function assertDominatedScenarioZeroStillShown(frontier: OutcomeFrontier): boolean;
export declare function assertNonPromotionNotRanked(frontier: OutcomeFrontier): boolean;
export declare function assertReadinessDidNotRewriteEconomics(play: StrategyPlay, evaluation: CampaignEvaluationResponse): boolean;
export declare function assertSelectionRefusesWhenAmbiguous(selection: FrontierSelection): boolean;
/**
 * R4 — only genuinely human-declared constraints count toward the uniqueness claim.
 * A `DERIVED_FROM_STATED_OBJECTIVE` constraint still removes plays and still appears in
 * `constraints_in_force`; it simply cannot be one of the two opposing declarations that
 * make "Balanced" a statement about what a human asked for.
 */
export declare function assertBalancedLabelLegitimate(frontier: OutcomeFrontier): {
    ok: boolean;
    reason?: string;
};
/** R4 — a derived constraint must never carry a fabricated human attribution. */
export declare function assertNoFabricatedDeclaration(frontier: OutcomeFrontier): {
    ok: boolean;
    violations: string[];
};
/**
 * R3 — a tie is canonical equality of the two published axis values, never transitive
 * epsilon-nearness. Groups must be disjoint, and no tied pair may stand in a dominance
 * relation.
 */
export declare function assertTieSemantics(frontier: OutcomeFrontier): {
    ok: boolean;
    violations: string[];
};
/**
 * R6 — ambient-frame equality is necessary but not sufficient. Every play must confine
 * its delta to the declared mutable set, and every comparison input outside that set
 * must be identical across the comparison set.
 */
export declare function assertComparisonSetIntegrity(frontier: OutcomeFrontier): {
    ok: boolean;
    violations: string[];
};
/** Every play's artefact ids must identify that play, not merely the anchor. */
export declare function assertPlayArtefactsDistinct(frontier: OutcomeFrontier): {
    ok: boolean;
    violations: string[];
};
/** Waste is disclosed, never optimised: it may not appear as an admitted axis (R5). */
export declare function assertWasteNotInDominance(frontier: OutcomeFrontier): {
    ok: boolean;
    violations: string[];
};
export declare function promotionDepthLabel(depth: number): string;
export { REVENUE_REQUIRED_INPUT, weakestEvidenceStrength, EVIDENCE_STRENGTH_ORDER };
