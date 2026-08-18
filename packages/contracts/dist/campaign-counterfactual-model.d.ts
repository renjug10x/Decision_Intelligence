/**
 * CogniX Campaign Decision Intelligence — Counterfactual & Causal Models (CDI-02)
 *
 * Domain separation:
 *   Current Baseline → Expected Without Intervention → Predicted With Intervention
 *
 * Causal demand contributions reconcile to the predicted intervention trajectory.
 * CDI-01 placeholder provenance (`cdi01_placeholder_default`) must never be treated
 * as stated commercial intent or attributed as causal campaign inputs.
 */
import { CampaignIntent, InterventionPosture } from './campaign-intent-model';
export type TrajectoryMetricUnit = 'units' | 'percent_baseline' | 'gbp';
export interface DemandTrajectoryPoint {
    label: 'CURRENT_BASELINE' | 'EXPECTED_WITHOUT_INTERVENTION' | 'PREDICTED_WITH_INTERVENTION';
    volume_units: number;
    volume_index_pct: number;
    contribution_gbp: number;
    /**
     * Per-unit contribution used for this trajectory. Promoted units carry an eroded
     * unit contribution, so a deeper discount does not mechanically increase value.
     */
    unit_contribution_gbp: number;
    waste_units: number;
    confidence: number;
}
export interface CampaignDeltaSummary {
    volume_delta_units: number;
    volume_delta_pct: number;
    contribution_delta_gbp: number;
    waste_delta_units: number;
    /**
     * Demand attributable to the intervention itself, in percentage points.
     * Excludes ambient drivers (intrinsic drift, external signals) that occur with or
     * without the campaign. This — not `total_predicted_uplift_pp` — is what the campaign causes.
     */
    attributable_uplift_pp: number;
    /** True when predicted ≈ without-intervention (Do Nothing / undecided / no stated mechanic) */
    intervention_indistinguishable_from_do_nothing: boolean;
}
export interface CounterfactualBaseline {
    counterfactual_id: string;
    campaign_intent_id: string;
    tenant_id: string;
    session_id: string;
    intervention_posture: InterventionPosture;
    category: string;
    sku_scope: string[];
    region: string;
    current_baseline: DemandTrajectoryPoint;
    expected_without_intervention: DemandTrajectoryPoint;
    predicted_with_intervention: DemandTrajectoryPoint;
    campaign_delta: CampaignDeltaSummary;
    horizon_days: number;
    calculation_mode: 'deterministic_demo_counterfactual';
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
    timestamp: string;
}
export type CausalDriverId = 'intrinsic_demand' | 'mechanic_response' | 'non_promotion_response' | 'audience_response' | 'channel_response' | 'place_response' | 'temporal_response' | 'external_signal_response' | 'portfolio_effects' | 'interaction_residual';
/**
 * Whether a driver acts on the world regardless of the campaign (`ambient`) or only
 * because an intervention is made (`intervention`).
 *
 * This distinction is what makes the counterfactual honest: ambient drivers belong to
 * BOTH the without-intervention and with-intervention paths, so they cancel out of the
 * Campaign Delta and are never credited to the campaign. "Do nothing" therefore means
 * *no intervention*, not *no external change* — the world keeps moving.
 */
export type CausalDriverClass = 'ambient' | 'intervention';
export interface CausalDriverContribution {
    driver_id: CausalDriverId;
    driver_class: CausalDriverClass;
    label: string;
    contribution_pp: number;
    attributed: boolean;
    rationale: string;
    evidence_refs: string[];
}
export interface CausalDemandContribution {
    causal_id: string;
    campaign_intent_id: string;
    tenant_id: string;
    session_id: string;
    intervention_posture: InterventionPosture;
    /**
     * Total predicted demand index movement vs CURRENT_BASELINE, in pp.
     * Equals `ambient_uplift_pp + intervention_uplift_pp`. NOT the campaign's effect —
     * use `intervention_uplift_pp` (or `campaign_delta.attributable_uplift_pp`) for that.
     */
    total_predicted_uplift_pp: number;
    /** Drift + external signals: happens with or without the campaign. */
    ambient_uplift_pp: number;
    /** Demand caused by the intervention itself. Zero for DO_NOTHING / UNDECIDED. */
    intervention_uplift_pp: number;
    drivers: CausalDriverContribution[];
    /**
     * Sum of contribution_pp across ALL drivers — attributed or not. Summing only the
     * attributed rows would let a non-zero unattributed driver vanish from both sides of
     * the check, so reconciliation would pass while silently dropping demand.
     */
    reconciled_sum_pp: number;
    reconciliation_ok: boolean;
    signal_simulation_id?: string;
    placeholder_fields_excluded: string[];
    calculation_mode: 'deterministic_demo_causal';
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
    timestamp: string;
}
export interface CampaignEvaluationRequest {
    tenant_id: string;
    session_id: string;
    campaign_intent_id?: string;
    /** Optional inline intent — otherwise loaded from CDI-01 store */
    campaign_intent?: CampaignIntent;
    include_signals?: boolean;
    /**
     * Optional CDI-03 resolved temporal uplift (pp). When supplied, replaces the flat
     * FIND_BEST_WINDOW dampener in temporal_response. Omitted → CDI-02 default behaviour.
     */
    resolved_temporal_uplift_pp?: number;
    opportunity_window_id?: string;
}
export interface CampaignEvaluationResponse {
    evaluation_id: string;
    tenant_id: string;
    session_id: string;
    campaign_intent_id: string;
    counterfactual: CounterfactualBaseline;
    causal: CausalDemandContribution;
    timestamp: string;
    schema_version: string;
}
export declare function validateCounterfactualBaseline(baseline: Partial<CounterfactualBaseline>): {
    valid: boolean;
    errors: string[];
};
export declare function validateCausalDemandContribution(causal: Partial<CausalDemandContribution>): {
    valid: boolean;
    errors: string[];
};
export declare function validateCampaignEvaluationRequest(request: Partial<CampaignEvaluationRequest>): {
    valid: boolean;
    errors: string[];
};
