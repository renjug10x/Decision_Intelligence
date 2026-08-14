/**
 * CogniX Enterprise Signal Fabric Model
 * Transport-neutral types, signal taxonomy, source classification, temporal models, and validation helpers.
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

export type SimulationPeriod =
  | 'T-90'
  | 'T-30'
  | 'T-7'
  | 'T-5'
  | 'T-3'
  | 'T-2'
  | 'T-1'
  | 'Today'
  | 'T+1'
  | 'T+3'
  | 'T+7'
  | 'T+30';

export const ORDERED_SIMULATION_PERIODS: SimulationPeriod[] = [
  'T-90',
  'T-30',
  'T-7',
  'T-5',
  'T-3',
  'T-2',
  'T-1',
  'Today',
  'T+1',
  'T+3',
  'T+7',
  'T+30'
];

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
  unit: string;                   // e.g. 'percent', 'units', 'hours', 'days'
  source_type: SignalSourceType;
  source_system: string;          // e.g. 'cognix_world_generator', 'blue_yonder_demand_planning'
  confidence: number;             // 0 to 100
  quality: number;                // 0 to 100
  provenance: Record<string, string>;
  synthetic_demo: boolean;        // true
  schema_version: string;         // "1.0"
}

export interface SignalSimulationIntervention {
  intervention_id: string;           // e.g. 'sla_flex_rule_4'
  effective_period: SimulationPeriod; // e.g. 'T-2'
}

export interface SignalSimulationContext {
  session_id: string;
  decision_state_id: string;
  decision_state_version: number;
  tenant_id: string;
  scenario_id: string;
  scenario_family?: string;
  promotion_lift: number;
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

export function validateTemporalRange(from: SimulationPeriod, to: SimulationPeriod): { valid: boolean; error?: string } {
  const fromIndex = ORDERED_SIMULATION_PERIODS.indexOf(from);
  const toIndex = ORDERED_SIMULATION_PERIODS.indexOf(to);

  if (fromIndex === -1) return { valid: false, error: `Invalid 'from' period: ${from}` };
  if (toIndex === -1) return { valid: false, error: `Invalid 'to' period: ${to}` };
  if (fromIndex > toIndex) return { valid: false, error: `Invalid temporal range: 'from' (${from}) must precede or equal 'to' (${to})` };

  return { valid: true };
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

export function validateSignalSimulationContext(context: Partial<SignalSimulationContext>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.tenant_id) errors.push('Missing required field: tenant_id');
  if (!context.scenario_id) errors.push('Missing required field: scenario_id');
  if (!context.session_id) errors.push('Missing required field: session_id');
  if (!context.decision_state_id) errors.push('Missing required field: decision_state_id');
  if (typeof context.decision_state_version !== 'number') errors.push('Missing required field: decision_state_version');
  if (typeof context.promotion_lift !== 'number') errors.push('Missing required field: promotion_lift');

  return {
    valid: errors.length === 0,
    errors
  };
}
