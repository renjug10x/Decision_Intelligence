/**
 * CogniX Commercial Intent Domain Model
 * Transport-neutral contracts, taxonomy, and validation helpers for planned business actions.
 */
export interface CommercialIntent {
    commercial_intent_id: string;
    tenant_id: string;
    session_id: string;
    campaign_id?: string;
    category: string;
    sku_scope: string[];
    region: string;
    customer_segment?: string;
    channel?: string;
    promotion_type: string;
    discount_depth: number;
    planned_start: string;
    planned_end: string;
    expected_uplift: number;
    campaign_objective?: string;
    media_support?: string;
    inventory_assumption?: string;
    supplier_assumption?: string;
    source_system: string;
    source_type: 'PROMOTION_PLANNER' | 'TRADE_PROMOTION_SYSTEM' | 'COMMERCIAL_ERP' | 'MANUAL_PLANNER_INPUT';
    created_at: string;
    provenance: Record<string, string>;
    synthetic_demo: boolean;
    schema_version: string;
}
export declare function validateCommercialIntent(intent: Partial<CommercialIntent>): {
    valid: boolean;
    errors: string[];
};
