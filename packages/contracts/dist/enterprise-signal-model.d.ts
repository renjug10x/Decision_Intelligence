/**
 * CogniX Enterprise Signal Fabric Model
 * Transport-neutral types, signal taxonomy, source classification, and validation helpers.
 */
export type SignalCategory = 'CUSTOMER' | 'COMMERCIAL' | 'DEMAND' | 'SUPPLY' | 'INVENTORY' | 'FULFILMENT' | 'LOGISTICS' | 'FINANCIAL';
export type SignalEntityType = 'TENANT' | 'REGION' | 'CATEGORY' | 'SKU' | 'SUPPLIER' | 'DC' | 'FULFILMENT_CENTRE' | 'CAMPAIGN' | 'DELIVERY_SLOT' | 'CUSTOMER_SEGMENT';
export type SignalSourceType = 'SYNTHETIC_WORLD' | 'EXTERNAL_CONNECTOR' | 'ENTERPRISE_SYSTEM' | 'PLANNING_SYSTEM' | 'COMMERCE_TELEMETRY' | 'SUPPLIER_SYSTEM' | 'FULFILMENT_SYSTEM' | 'MANUAL_BUSINESS_INPUT' | 'ML_DERIVED';
export type CanonicalSignalType = 'SEARCH_VELOCITY_ACCELERATION' | 'PRODUCT_ENGAGEMENT_ACCELERATION' | 'BASKET_ADD_ACCELERATION' | 'CAMPAIGN_RESPONSE_ACCELERATION' | 'SLOT_BOOKING_PRESSURE' | 'ORDER_VELOCITY_ACCELERATION' | 'REGIONAL_DEMAND_SHIFT' | 'CATEGORY_DEMAND_ACCELERATION' | 'FORECAST_DIVERGENCE' | 'SUPPLIER_LEAD_TIME_DRIFT' | 'SUPPLIER_CAPACITY_PRESSURE' | 'ASN_VARIANCE' | 'REPLENISHMENT_DELAY' | 'STOCK_COVER_DECLINE' | 'REGIONAL_INVENTORY_SURPLUS' | 'PROJECTED_STOCKOUT_RISK' | 'PERISHABLE_AGEING_PRESSURE' | 'CFC_THROUGHPUT_PRESSURE' | 'LABOUR_UTILISATION_PRESSURE' | 'PICK_RATE_DEGRADATION' | 'FULFILMENT_QUEUE_GROWTH' | 'DELIVERY_SLOT_SATURATION' | 'TRANSPORT_CAPACITY_PRESSURE' | 'MARGIN_COMPRESSION' | 'PROMOTION_CANNIBALISATION' | 'LOGISTICS_COST_ESCALATION' | 'INCREMENTAL_REVENUE_OPPORTUNITY';
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
export declare function validateEnterpriseSignal(signal: Partial<EnterpriseSignal>): {
    valid: boolean;
    errors: string[];
};
