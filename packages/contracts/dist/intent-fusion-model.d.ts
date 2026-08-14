/**
 * CogniX Intent Fusion Intelligence Model
 * Transport-neutral contracts for forecast contextualisation and multi-source intent-signal reconciliation.
 */
export interface ForecastContribution {
    source_system: string;
    source_type: 'ENTERPRISE_WORLD' | 'EXTERNAL_PLANNING_SYSTEM' | 'PROPRIETARY_FORECAST';
    baseline_lift_pct: number;
    confidence: number;
}
export interface IntentContribution {
    commercial_intent_id: string;
    intent_effect_pct: number;
    promotion_type: string;
    discount_depth: number;
}
export interface SignalContribution {
    observed_signal_effect_pct: number;
    signal_count: number;
    signal_refs: string[];
    simulation_id?: string;
}
export interface IntentFusionRequest {
    tenant_id: string;
    session_id: string;
    commercial_intent_id?: string;
    decision_state_id?: string;
    decision_state_version?: number;
    baseline_forecast_lift_pct?: number;
    include_signal_simulation?: boolean;
}
export interface ContextualisedDecisionOutlook {
    fusion_id: string;
    tenant_id: string;
    session_id: string;
    commercial_intent_id: string;
    decision_state_id: string;
    decision_state_version: number;
    baseline_forecast: ForecastContribution;
    commercial_intent: IntentContribution;
    observed_signals: SignalContribution;
    interaction_adjustment_pct: number;
    contextualised_outlook_pct: number;
    supplier_capacity_cap_pct: number;
    potential_commitment_gap_pp: number;
    calculation_mode: 'deterministic_demo_decomposition';
    confidence: number;
    provenance: Record<string, string | number>;
    timestamp: string;
    schema_version: string;
}
export declare function validateIntentFusionRequest(req: Partial<IntentFusionRequest>): {
    valid: boolean;
    errors: string[];
};
