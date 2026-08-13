/**
 * CogniX Enterprise Signal Fabric Model
 * Transport-neutral types, signal taxonomy, source classification, and validation helpers.
 */

export type SignalCategory =
  | 'CUSTOMER'
  | 'COMMERCIAL'
  | 'DEMAND'
  | 'SUPPLY'
  | 'INVENTORY'
  | 'FULFILMENT'
  | 'LOGISTICS'
  | 'FINANCIAL';

export type SignalEntityType =
  | 'TENANT'
  | 'REGION'
  | 'CATEGORY'
  | 'SKU'
  | 'SUPPLIER'
  | 'DC'
  | 'FULFILMENT_CENTRE'
  | 'CAMPAIGN'
  | 'DELIVERY_SLOT'
  | 'CUSTOMER_SEGMENT';

export type SignalSourceType =
  | 'SYNTHETIC_WORLD'
  | 'EXTERNAL_CONNECTOR'
  | 'ENTERPRISE_SYSTEM'
  | 'PLANNING_SYSTEM'
  | 'COMMERCE_TELEMETRY'
  | 'SUPPLIER_SYSTEM'
  | 'FULFILMENT_SYSTEM'
  | 'MANUAL_BUSINESS_INPUT'
  | 'ML_DERIVED';

export type CanonicalSignalType =
  // Customer & Commercial
  | 'SEARCH_VELOCITY_ACCELERATION'
  | 'PRODUCT_ENGAGEMENT_ACCELERATION'
  | 'BASKET_ADD_ACCELERATION'
  | 'CAMPAIGN_RESPONSE_ACCELERATION'
  | 'SLOT_BOOKING_PRESSURE'
  // Demand
  | 'ORDER_VELOCITY_ACCELERATION'
  | 'REGIONAL_DEMAND_SHIFT'
  | 'CATEGORY_DEMAND_ACCELERATION'
  | 'FORECAST_DIVERGENCE'
  // Supply
  | 'SUPPLIER_LEAD_TIME_DRIFT'
  | 'SUPPLIER_CAPACITY_PRESSURE'
  | 'ASN_VARIANCE'
  | 'REPLENISHMENT_DELAY'
  // Inventory
  | 'STOCK_COVER_DECLINE'
  | 'REGIONAL_INVENTORY_SURPLUS'
  | 'PROJECTED_STOCKOUT_RISK'
  | 'PERISHABLE_AGEING_PRESSURE'
  // Fulfilment & Logistics
  | 'CFC_THROUGHPUT_PRESSURE'
  | 'LABOUR_UTILISATION_PRESSURE'
  | 'PICK_RATE_DEGRADATION'
  | 'FULFILMENT_QUEUE_GROWTH'
  | 'DELIVERY_SLOT_SATURATION'
  | 'TRANSPORT_CAPACITY_PRESSURE'
  // Commercial & Financial
  | 'MARGIN_COMPRESSION'
  | 'PROMOTION_CANNIBALISATION'
  | 'LOGISTICS_COST_ESCALATION'
  | 'INCREMENTAL_REVENUE_OPPORTUNITY';

export interface EnterpriseSignal {
  signal_id: string;              // sig_<uuid>
  signal_type: CanonicalSignalType;
  category: SignalCategory;
  tenant_id: string;              // e.g. tenant_uk_retail_01
  domain_id?: string;             // e.g. retail_grocery
  scenario_id?: string;           // e.g. SCN-PROMO-01
  entity_type: SignalEntityType;
  entity_id: string;              // e.g. P004, FreshDirect UK, North West
  observed_at: string;            // ISO 8601 UTC
  effective_at: string;           // ISO 8601 UTC
  baseline_value: number;
  observed_value: number;
  delta: number;
  delta_pct: number;
  unit: string;                   // e.g. 'percent', 'units', 'hours', 'gbp', 'days'
  source_type: SignalSourceType;
  source_system: string;          // e.g. 'cognix_world_generator', 'blue_yonder_demand_planning'
  confidence: number;             // 0 to 100
  quality: number;                // 0 to 100
  provenance: Record<string, string>;
  synthetic_demo: boolean;        // true
  schema_version: string;         // "1.0"
}

export function validateEnterpriseSignal(signal: Partial<EnterpriseSignal>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!signal.signal_id) errors.push('Missing required field: signal_id');
  if (!signal.signal_type) errors.push('Missing required field: signal_type');
  if (!signal.category) errors.push('Missing required field: category');
  if (!signal.tenant_id) errors.push('Missing required field: tenant_id');
  if (!signal.entity_type) errors.push('Missing required field: entity_type');
  if (!signal.entity_id) errors.push('Missing required field: entity_id');
  if (!signal.observed_at) errors.push('Missing required field: observed_at');

  if (typeof signal.confidence === 'number' && (signal.confidence < 0 || signal.confidence > 100)) {
    errors.push('confidence must be a number between 0 and 100');
  }

  if (typeof signal.quality === 'number' && (signal.quality < 0 || signal.quality > 100)) {
    errors.push('quality must be a number between 0 and 100');
  }

  // Security guardrail: zero credentials leakage
  const strPayload = JSON.stringify(signal);
  if (/AIzaSy[A-Za-z0-9_-]{33}/.test(strPayload) || /"password"\s*:\s*"[^"]+"/.test(strPayload)) {
    errors.push('Security violation: Signal payload contains credentials or sensitive tokens');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
