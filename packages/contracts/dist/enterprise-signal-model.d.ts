/**
 * CogniX Enterprise Signal Fabric Model
 * Transport-neutral types, signal taxonomy, source classification, temporal models, and validation helpers.
 */
export type SignalCategory = 'CUSTOMER' | 'COMMERCIAL' | 'DEMAND' | 'SUPPLY' | 'INVENTORY' | 'FULFILMENT' | 'LOGISTICS' | 'FINANCIAL';
export type SignalEntityType = 'TENANT' | 'REGION' | 'CATEGORY' | 'SKU' | 'SUPPLIER' | 'DC' | 'FULFILMENT_CENTRE' | 'CAMPAIGN' | 'DELIVERY_SLOT' | 'CUSTOMER_SEGMENT';
export type SignalSourceType = 'SYNTHETIC_WORLD' | 'EXTERNAL_CONNECTOR' | 'ENTERPRISE_SYSTEM' | 'PLANNING_SYSTEM' | 'COMMERCE_TELEMETRY' | 'SUPPLIER_SYSTEM' | 'FULFILMENT_SYSTEM' | 'MANUAL_BUSINESS_INPUT' | 'ML_DERIVED';
export type CanonicalSignalType = 'SEARCH_VELOCITY_ACCELERATION' | 'PRODUCT_ENGAGEMENT_ACCELERATION' | 'BASKET_ADD_ACCELERATION' | 'CAMPAIGN_RESPONSE_ACCELERATION' | 'SLOT_BOOKING_PRESSURE' | 'ORDER_VELOCITY_ACCELERATION' | 'REGIONAL_DEMAND_SHIFT' | 'CATEGORY_DEMAND_ACCELERATION' | 'FORECAST_DIVERGENCE' | 'SUPPLIER_LEAD_TIME_DRIFT' | 'SUPPLIER_CAPACITY_PRESSURE' | 'ASN_VARIANCE' | 'REPLENISHMENT_DELAY' | 'STOCK_COVER_DECLINE' | 'REGIONAL_INVENTORY_SURPLUS' | 'PROJECTED_STOCKOUT_RISK' | 'PERISHABLE_AGEING_PRESSURE' | 'CFC_THROUGHPUT_PRESSURE' | 'LABOUR_UTILISATION_PRESSURE' | 'PICK_RATE_DEGRADATION' | 'FULFILMENT_QUEUE_GROWTH' | 'DELIVERY_SLOT_SATURATION' | 'TRANSPORT_CAPACITY_PRESSURE' | 'MARGIN_COMPRESSION' | 'PROMOTION_CANNIBALISATION' | 'LOGISTICS_COST_ESCALATION' | 'INCREMENTAL_REVENUE_OPPORTUNITY' | 'WEATHER_TEMPERATURE_ANOMALY' | 'WEATHER_PRECIPITATION_SHIFT' | 'COMPETITOR_CAMPAIGN_LAUNCH' | 'LOCAL_EVENT_DEMAND_SURGE' | 'PAYDAY_CALENDAR_EFFECT' | 'DEMOGRAPHIC_MISSION_SHIFT';
export type SimulationPeriod = 'T-90' | 'T-30' | 'T-7' | 'T-5' | 'T-3' | 'T-2' | 'T-1' | 'Today' | 'T+1' | 'T+3' | 'T+7' | 'T+30';
export declare const ORDERED_SIMULATION_PERIODS: SimulationPeriod[];
export interface EnterpriseSignal {
    signal_id: string;
    signal_type: CanonicalSignalType;
    category: SignalCategory;
    tenant_id: string;
    domain_id?: string;
    scenario_id?: string;
    entity_type: SignalEntityType;
    entity_id: string;
    observed_at: string;
    effective_at: string;
    baseline_value: number;
    observed_value: number;
    delta: number;
    delta_pct: number;
    unit: string;
    source_type: SignalSourceType;
    source_system: string;
    confidence: number;
    quality: number;
    provenance: Record<string, string>;
    synthetic_demo: boolean;
    schema_version: string;
}
export interface SignalSimulationIntervention {
    intervention_id: string;
    effective_period: SimulationPeriod;
}
export interface SignalSimulationContext {
    session_id: string;
    decision_state_id: string;
    decision_state_version: number;
    tenant_id: string;
    scenario_id: string;
    scenario_family?: string;
    /** Explicit 0 means no promotional pressure. Omit/undefined → simulator defaults to 20. */
    promotion_lift?: number;
    supplier_capacity_cap: number;
    forecast_horizon_days: number;
    promotion_method: string;
    campaign_scope: 'national' | 'regional' | 'phased';
    cannibalisation_factor: number;
    event_boost: string;
    selected_interventions: SignalSimulationIntervention[];
}
export interface EnterpriseSignalObservation {
    period: SimulationPeriod;
    observed_at: string;
    effective_at: string;
    baseline_value: number;
    observed_value: number;
    delta: number;
    delta_pct: number;
    unit: string;
    confidence: number;
    quality: number;
    provenance: {
        rule_id: string;
        drivers: Record<string, number | string | boolean>;
        source_signal_refs?: string[];
        decision_state_version: number;
        intervention_refs?: string[];
        generator_version: string;
    };
}
export interface EnterpriseSignalTimeline {
    timeline_id: string;
    signal_type: CanonicalSignalType;
    category: SignalCategory;
    tenant_id: string;
    scenario_id: string;
    entity_type: SignalEntityType;
    entity_id: string;
    unit: string;
    synthetic_demo: boolean;
    schema_version: string;
    observations: EnterpriseSignalObservation[];
}
export interface SignalSimulationRequest {
    context: SignalSimulationContext;
    temporal_range?: {
        from: SimulationPeriod;
        to: SimulationPeriod;
    };
}
export interface SignalSimulationResponse {
    simulation_id: string;
    tenant_id: string;
    scenario_id: string;
    decision_state_id: string;
    decision_state_version: number;
    generator_version: string;
    timelines: EnterpriseSignalTimeline[];
    timestamp: string;
}
export declare function validateTemporalRange(from: SimulationPeriod, to: SimulationPeriod): {
    valid: boolean;
    error?: string;
};
export declare function validateEnterpriseSignal(signal: Partial<EnterpriseSignal>): {
    valid: boolean;
    errors: string[];
};
export declare function validateSignalSimulationContext(context: Partial<SignalSimulationContext>): {
    valid: boolean;
    errors: string[];
};
