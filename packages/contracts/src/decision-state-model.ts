/**
 * CogniX Shared Decision State Domain Model
 * Transport-neutral types, command registry, deterministic calculations, and schema definitions.
 */

export type DecisionCommandType =
  | 'SET_PROMOTION_LIFT'
  | 'SET_SUPPLIER_CAPACITY_CAP'
  | 'SET_FORECAST_HORIZON'
  | 'SET_PROMOTION_METHOD'
  | 'SET_CAMPAIGN_SCOPE'
  | 'SET_CANNIBALISATION_FACTOR'
  | 'SET_EVENT_BOOST'
  | 'SELECT_INTERVENTION'
  | 'DESELECT_INTERVENTION'
  | 'RESET_SCENARIO';

export interface DecisionScenarioParameters {
  promotion_lift: number;          // e.g. 20 (percent)
  supplier_capacity_cap: number;   // e.g. 10 (percent)
  forecast_horizon_days: number;   // e.g. 14 (days)
  promotion_method: string;        // e.g. '20_percent_off'
  campaign_scope: 'national' | 'regional' | 'phased';
  cannibalisation_factor: number;  // e.g. 0 to 20 percent
  event_boost: string;             // e.g. 'none', 'bank_holiday', 'heatwave'
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
export function calculateDerivedImpacts(
  params: DecisionScenarioParameters,
  interventions: string[]
): DecisionDerivedImpacts {
  const BASE_DEMAND = 10000;
  const BASE_SUPPLIER_CAPACITY = 10000;

  // 1. Demand Lift
  const weekly_demand_units = Math.round(BASE_DEMAND * (1 + params.promotion_lift / 100));

  // 2. Base Capacity & Interventions (e.g. SLA flex adds 1,200 units)
  const flexUnits = interventions.includes('SLA_FLEX_RULE_4') ? 1200 : 0;
  const bufferUnits = interventions.includes('BUFFER_OPTIMISATION_R002') ? 500 : 0;
  const supplier_capacity_units = Math.round(BASE_SUPPLIER_CAPACITY * (1 + params.supplier_capacity_cap / 100)) + flexUnits + bufferUnits;

  // 3. Commitment Gap
  const commitment_gap_units = Math.max(0, weekly_demand_units - supplier_capacity_units);

  // 4. Delivery Risk (% breach risk)
  const baseRisk = Math.min(95, Math.round((commitment_gap_units / Math.max(1, weekly_demand_units)) * 100 * 2.5));
  const delivery_risk_pct = interventions.includes('SLA_FLEX_RULE_4') ? Math.max(5, baseRisk - 30) : baseRisk;

  // 5. Financial Exposure (£120 per OOS unit)
  const financial_exposure_gbp = commitment_gap_units * 120;

  // 6. DC Overtime (Ripple 2nd order)
  const scopeMultiplier = params.campaign_scope === 'national' ? 1.0 : params.campaign_scope === 'regional' ? 0.6 : 0.75;
  const dc_overtime_hours = Math.round(12 + (params.promotion_lift * 0.4) * scopeMultiplier);

  // 7. Margin Erosion (% 3rd order)
  const baseErosion = 1.2 + (params.promotion_lift / 15) * 1.0 * scopeMultiplier + (params.cannibalisation_factor * 0.1);
  const margin_erosion_pct = Number(baseErosion.toFixed(1));

  // 8. Stockout Probability
  const stockout_probability_pct = commitment_gap_units > 0 ? Math.min(92, Math.round(40 + (commitment_gap_units / 100))) : 5;

  return {
    weekly_demand_units,
    supplier_capacity_units,
    commitment_gap_units,
    delivery_risk_pct,
    financial_exposure_gbp,
    dc_overtime_hours,
    margin_erosion_pct,
    stockout_probability_pct
  };
}

export function validateDecisionStateCommand(cmd: Partial<TransitionCommandPayload>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!cmd.command_type) errors.push('Missing required field: command_type');
  if (typeof cmd.expected_version !== 'number') errors.push('Missing or invalid expected_version');

  if (cmd.command_type === 'SET_PROMOTION_LIFT') {
    const val = cmd.payload?.promotion_lift;
    if (typeof val !== 'number' || val < 0 || val > 100) {
      errors.push('promotion_lift must be a number between 0 and 100');
    }
  }

  if (cmd.command_type === 'SET_SUPPLIER_CAPACITY_CAP') {
    const val = cmd.payload?.supplier_capacity_cap;
    if (typeof val !== 'number' || val < 0 || val > 100) {
      errors.push('supplier_capacity_cap must be a number between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
