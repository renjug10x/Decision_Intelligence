/**
 * CogniX Shared Decision State Domain Model
 * Transport-neutral types, command registry, deterministic calculations, and schema definitions.
 */
export type DecisionCommandType = 'SET_PROMOTION_LIFT' | 'SET_SUPPLIER_CAPACITY_CAP' | 'SET_FORECAST_HORIZON' | 'SET_PROMOTION_METHOD' | 'SET_CAMPAIGN_SCOPE' | 'SET_CANNIBALISATION_FACTOR' | 'SET_EVENT_BOOST' | 'SELECT_INTERVENTION' | 'DESELECT_INTERVENTION' | 'REGISTER_COMMERCIAL_INTENT' | 'REGISTER_CAMPAIGN_INTENT' | 'REGISTER_DECISION_CONTRACT' | 'RESET_SCENARIO';
export interface DecisionScenarioParameters {
    promotion_lift: number;
    supplier_capacity_cap: number;
    forecast_horizon_days: number;
    promotion_method: string;
    campaign_scope: 'national' | 'regional' | 'phased';
    cannibalisation_factor: number;
    event_boost: string;
}
export interface DecisionDerivedImpacts {
    weekly_demand_units: number;
    supplier_capacity_units: number;
    commitment_gap_units: number;
    delivery_risk_pct: number;
    financial_exposure_gbp: number;
    dc_overtime_hours: number;
    margin_erosion_pct: number;
    stockout_probability_pct: number;
}
export interface DecisionStateVersionRecord {
    version: number;
    timestamp: string;
    command_type: DecisionCommandType;
    changed_fields: string[];
    triggering_event_id?: string;
    previous_version: number;
}
export interface DecisionState {
    decision_state_id: string;
    tenant_id: string;
    session_id: string;
    domain_id: string;
    persona_id: string;
    scenario_id: string;
    scenario_family: string;
    state_version: number;
    created_at: string;
    updated_at: string;
    scenario_parameters: DecisionScenarioParameters;
    enterprise_signals: string[];
    constraints: string[];
    selected_interventions: string[];
    commercial_intent_ref?: string;
    campaign_intent_ref?: string;
    /** CDI-07A W1 — plain string reference only; contract content lives in CDI-07A store. */
    decision_contract_ref?: string;
    derived_impacts: DecisionDerivedImpacts;
    history: DecisionStateVersionRecord[];
    provenance: Record<string, string>;
    synthetic_demo: boolean;
}
export interface TransitionCommandPayload {
    command_type: DecisionCommandType;
    expected_version: number;
    payload: Record<string, any>;
    source_component?: string;
}
export interface DecisionStateTransitionResult {
    status: 'success' | 'conflict' | 'error';
    decision_state_id: string;
    previous_version: number;
    new_version: number;
    command_type: DecisionCommandType;
    changed_fields: string[];
    derived_impacts: DecisionDerivedImpacts;
    state: DecisionState;
    warnings?: string[];
    error?: string;
}
/**
 * Deterministic Derived Impact Engine
 * Pure function: Calculates exact cross-functional business consequences from parameters & interventions.
 */
export declare function calculateDerivedImpacts(params: DecisionScenarioParameters, interventions: string[]): DecisionDerivedImpacts;
export declare function validateDecisionStateCommand(cmd: Partial<TransitionCommandPayload>): {
    valid: boolean;
    errors: string[];
};
