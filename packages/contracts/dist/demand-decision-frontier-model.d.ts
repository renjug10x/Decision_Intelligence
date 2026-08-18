/**
 * CogniX Demand Decision Frontier (DDF-01) Domain Model
 * Transport-neutral types, contracts, and validation helpers for Demand Decision Frontier,
 * Forecast Stability Intelligence, Decision Gap Intelligence, Decision Window, and Decision Regret.
 *
 * Domain Ownership: Demand Observability & Decision Intelligence (DDF-01)
 * Governed by: DEMAND_OBSERVABILITY_MODEL.md & ARCHITECTURE_DECISIONS.md (ADR-040..ADR-043)
 */
import { DecisionScenarioParameters } from './decision-state-model';
import { ContextualisedDecisionOutlook } from './intent-fusion-model';
export type ForecastStabilityState = 'STABLE' | 'WATCH' | 'DETERIORATING' | 'INDETERMINATE';
export type RevisionRiskLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'INDETERMINATE';
export type RevisionDirection = 'UPWARD' | 'DOWNWARD' | 'BALANCED' | 'INDETERMINATE';
export type StabilityTrendDirection = 'IMPROVING' | 'STABLE' | 'DECREASING' | 'INDETERMINATE';
export interface ForecastStabilityAssessment {
    stability_score: number | null;
    stability_state: ForecastStabilityState;
    trend_direction: StabilityTrendDirection;
    revision_risk: RevisionRiskLevel;
    /**
     * ADR-040 — probability that the outlook undergoes a material revision.
     * A MODELLED expected value derived from observed signal divergence. It is never a
     * calibrated probability and never a statistical prediction interval. `null` when
     * signal evidence is insufficient (status `INDETERMINATE`).
     */
    material_revision_probability_pct: number | null;
    /**
     * Mean `confidence` of the contributing `EnterpriseSignal` records — how much weight the
     * evidence itself carries, distinct from how far it has diverged. This is what the regret
     * model uses to weight whether the emerging demand level is realised. `null` when INDETERMINATE.
     */
    evidence_confidence_pct: number | null;
    likely_revision_direction: RevisionDirection;
    /** Unsigned magnitudes. Direction is carried by `likely_revision_direction`, never by the sign. */
    likely_revision_magnitude_min_pct: number;
    likely_revision_magnitude_max_pct: number;
    /**
     * Probability-weighted expected revision applied to the emerging demand frontier (AC-DDF-14).
     * Signed: negative where the evidence points downward. Zero when `INDETERMINATE`.
     */
    expected_revision_pct: number;
    contributing_signal_refs: string[];
    evidence_provenance: Record<string, string | number>;
    confidence_distinction_statement: string;
    status: 'VALID' | 'INDETERMINATE';
    indeterminate_reason?: string;
    synthetic_demo: boolean;
}
export interface DemandFrontierTrajectoryPoint {
    date: string;
    day_index: number;
    historical_actual: number | null;
    baseline_forecast: number | null;
    contextualised_demand: number | null;
    emerging_demand_frontier: number | null;
    executable_demand_frontier: number | null;
    simulated_demand_frontier?: number | null;
}
/**
 * The four demand quantities of `DEMAND_OBSERVABILITY_MODEL.md` §3, never collapsed.
 * Every percentage below is expressed against the SAME denominator — `base_demand_units`
 * — so that `emerging_frontier_pct − executable_frontier_pct` is arithmetically identical
 * to `exposed_demand_units / base_demand_units`. This identity is what AC-DDF-27 requires
 * and is asserted in the test suite.
 */
export interface DemandFrontierSeries {
    trajectory: DemandFrontierTrajectoryPoint[];
    /** Horizon-scaled un-promoted demand base. The denominator for every `_pct` on this artefact. */
    base_demand_units: number;
    horizon_days: number;
    baseline_lift_pct: number;
    commercial_intent_lift_pct: number;
    observed_signal_lift_pct: number;
    contextualised_outlook_pct: number;
    emerging_frontier_pct: number;
    executable_frontier_pct: number;
    /** Units behind each percentage, on the shared base. */
    baseline_demand_units: number;
    contextualised_demand_units: number;
    emerging_demand_units: number;
    executable_demand_units: number;
    basis_class: 'MODELLED_DEMO_ASSUMPTION' | 'DERIVED_FROM_CONSTRAINTS' | 'SYNTHETIC_OBSERVED';
}
/**
 * Declared unit economics. Both figures are `MODELLED_DEMO_ASSUMPTION`.
 * `revenue_per_unit_gbp` reuses the WP10-C `financial_exposure_gbp` per-unit basis read-only;
 * no second economic constant is introduced.
 */
export interface DemandUnitEconomics {
    revenue_per_unit_gbp: number;
    gross_margin_per_unit_gbp: number;
    margin_rate_pct: number;
    /**
     * `DERIVED_FROM_PROJECTION` where the value is the projection's own revenue ÷ units over the
     * same horizon, so money on this surface reconciles with the revenue KPI beside it.
     */
    revenue_per_unit_basis: 'DERIVED_FROM_PROJECTION' | 'MODELLED_DEMO_ASSUMPTION';
    /** The margin rate is always a declared modelled assumption — the estate holds no cost data. */
    basis: 'MODELLED_DEMO_ASSUMPTION';
}
export interface ContributingConstraint {
    constraint_id: string;
    name: string;
    description: string;
    impact_units: number;
    impact_pp: number;
    rank: number;
    provenance_basis: 'MODELLED_DEMO_ASSUMPTION' | 'DECLARED_OPERATIONAL_CONSTRAINT';
}
export interface DemandDecisionGap {
    emerging_demand_units: number;
    executable_demand_units: number;
    exposed_demand_units: number;
    /** Shared denominator for `exposed_demand_pp`. Equals `DemandFrontierSeries.base_demand_units`. */
    base_demand_units: number;
    emerging_demand_pct: number;
    executable_demand_pct: number;
    exposed_demand_pp: number;
    /**
     * Gross commercial value of demand the organisation cannot currently serve —
     * `exposed_demand_units × revenue_per_unit_gbp`. This is REVENUE exposure, not margin,
     * not regret, and not captured value. Surfaces must label it as revenue.
     */
    revenue_at_risk_gbp: number;
    /**
     * Gross margin forgone on the same exposed units — `exposed_demand_units × gross_margin_per_unit_gbp`.
     * Always the smaller figure; it is what an intervention can actually recover.
     */
    margin_at_risk_gbp: number;
    unit_economics: DemandUnitEconomics;
    risk_state: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affected_products: string[];
    affected_regions: string[];
    contributing_constraints: ContributingConstraint[];
    basis_class: 'DERIVED_FROM_CONSTRAINTS';
    reconciliation_evidence: string;
}
export type DecisionWindowState = 'OPEN' | 'CLOSING_SOON' | 'RESTRICTED' | 'INDETERMINATE';
export interface DemandDecisionWindow {
    window_state: DecisionWindowState;
    /**
     * ADR-042 — the scenario clock the window is measured FROM. A synthetic demonstration
     * scenario must never be counted down against real civil time, so `remaining_hours` is
     * always `deadline_iso − scenario_now_iso`, never `deadline_iso − Date.now()`.
     * `null` only when the window is `INDETERMINATE`.
     */
    scenario_now_iso: string | null;
    scenario_now_display: string | null;
    deadline_iso: string | null;
    deadline_display: string | null;
    /** Computed from the two timestamps above. Never a literal. `null` when INDETERMINATE. */
    remaining_hours: number | null;
    declared_constraint_name: string | null;
    declared_by: string | null;
    /** States the clock the contractual deadline is expressed in, and its UK local offset. */
    timezone_note: string | null;
    provenance_basis: 'MODELLED_DEMO_ASSUMPTION' | 'DECLARED_OPERATIONAL_CONSTRAINT' | 'INDETERMINATE';
    explanation: string;
    is_indeterminate: boolean;
}
export interface DecisionRegretAlternative {
    action_type: 'ACT_NOW' | 'WAIT' | 'DO_NOTHING';
    action_name: string;
    description: string;
    /** Units of exposed demand this alternative makes executable. */
    units_recovered: number;
    /** Gross margin on `units_recovered`, before the cost of the action. */
    margin_recovered_gbp: number;
    /** What this alternative puts at risk: committed spend, or revenue left exposed. */
    downside_exposure_gbp: number;
    /** Probability-weighted margin less probability-weighted cost. The basis of the comparison. */
    expected_decision_value_gbp: number;
    /**
     * `best_expected_value_gbp − expected_decision_value_gbp`. Regret is RELATIVE, is zero for
     * the best alternative, and is never negative. It is not exposed revenue, forecast error,
     * the Decision Gap, or lost margin under another name.
     */
    expected_regret_gbp: number;
    residual_gap_units: number;
    residual_gap_pp: number;
    feasibility_status: 'FEASIBLE' | 'GATED_BY_READINESS' | 'INSUFFICIENT_HEADROOM';
    gating_reasons?: string[];
    what_it_captures: string;
    what_it_risks: string;
    what_it_forgoes: string;
}
export interface DemandDecisionRegret {
    alternatives: {
        act_now: DecisionRegretAlternative;
        wait: DecisionRegretAlternative;
        do_nothing: DecisionRegretAlternative;
    };
    recommended_action: 'ACT_NOW' | 'WAIT' | 'DO_NOTHING' | 'CHOICE_REQUIRED';
    separation_significant: boolean;
    /** Expected decision value of the best alternative. Every regret is measured against this. */
    best_expected_value_gbp: number;
    /** `best_expected_value_gbp − second_best`. Below `separation_threshold_gbp` no winner is named. */
    separation_gbp: number;
    separation_threshold_gbp: number;
    /**
     * The one input set all three alternatives are computed from (AC-DDF-21).
     * No alternative may introduce a coefficient that is not listed here.
     */
    shared_inputs_summary: {
        exposed_demand_units: number;
        emerging_demand_units: number;
        executable_units: number;
        capturable_units: number;
        revenue_per_unit_gbp: number;
        gross_margin_per_unit_gbp: number;
        /** Cost of goods written off if committed stock is not sold — the price of over-committing. */
        unsold_cost_per_unit_gbp: number;
        intervention_cost_gbp: number;
        demand_materialises_probability_pct: number;
        lead_time_erosion_pct: number;
    };
    valuation_basis: 'MODELLED_EXPECTED_VALUE';
    /** Plain-language statement of how regret was derived, for on-surface explainability. */
    regret_definition: string;
}
export interface DemandInterventionScenario {
    intervention_id: string;
    intervention_name: string;
    lever_type: 'SUPPLIER_CAPACITY_FLEX' | 'SAFETY_STOCK_BUFFER' | 'PROMO_DEPTH_MODERATION' | 'CROSS_PROMO_REBALANCE';
    description: string;
    rationale: string;
    parameter_modifications: Partial<DecisionScenarioParameters> & {
        additional_capacity_units?: number;
    };
    /** Units of exposed demand this lever can make executable within the Decision Window. */
    expected_units_recovered: number;
    /** `expected_units_recovered × revenue_per_unit_gbp` — the revenue those units carry. */
    expected_revenue_recovered_gbp: number;
    /** `expected_units_recovered × gross_margin_per_unit_gbp` — what the business actually keeps. */
    expected_margin_recovered_gbp: number;
    residual_gap_units: number;
    residual_gap_pp: number;
    risk_state_after: 'LOW' | 'MEDIUM' | 'HIGH';
    /** Cost of deploying the lever. A modelled demo assumption, netted off in the regret model. */
    intervention_cost_gbp: number;
    evidence_basis: string[];
    is_actionable: boolean;
    gated_reason?: string;
}
/**
 * Every named input the surface can show, classified so that no synthetic value can
 * masquerade as client telemetry (AC-DDF-25). `SYNTHETIC_OBSERVED` is the Level-0
 * `cognix-world` observation class — it is deliberately NOT the governed bare `OBSERVED`.
 */
export type DemandInputProvenanceClass = 'SYNTHETIC_OBSERVED' | 'DERIVED_FROM_DECISION_STATE' | 'MODELLED_DEMO_ASSUMPTION' | 'DECLARED_OPERATIONAL_CONSTRAINT';
export interface DemandAssumptionRecord {
    key: string;
    label: string;
    value: string;
    provenance_class: DemandInputProvenanceClass;
    source: string;
}
export interface DemandDecisionFrontierEvaluation {
    evaluation_id: string;
    tenant_id: string;
    session_id: string;
    timestamp: string;
    scenario_parameters: DecisionScenarioParameters;
    forecast_stability: ForecastStabilityAssessment;
    demand_frontier: DemandFrontierSeries;
    decision_gap: DemandDecisionGap;
    decision_window: DemandDecisionWindow;
    decision_regret: DemandDecisionRegret;
    recommended_intervention: DemandInterventionScenario;
    /**
     * Present only while a simulation is active. It is a MODELLED recomputation of this
     * evaluation under the lever's parameters. Nothing here was executed: no supplier was
     * contacted, no order placed, no allocation confirmed and no SLA altered.
     */
    simulated_intervention?: DemandInterventionScenario & {
        active: boolean;
        is_modelled_only: true;
        recomputed_gap: DemandDecisionGap;
        recomputed_regret: DemandDecisionRegret;
        recomputed_frontier: DemandFrontierSeries;
        /** Movement between the live evaluation and the modelled one, for honest before/after copy. */
        gap_closed_units: number;
        gap_closed_pp: number;
        residual_gap_units: number;
        residual_gap_pp: number;
        margin_recovered_gbp: number;
        outcome_statement: string;
    };
    intent_fusion_outlook: ContextualisedDecisionOutlook;
    /** Full inventory of named inputs and their provenance class (AC-DDF-25). */
    assumptions: DemandAssumptionRecord[];
    provenance: Record<string, string | number>;
    synthetic_demo: boolean;
}
