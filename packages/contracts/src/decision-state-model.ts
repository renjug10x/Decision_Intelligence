/**
 * CogniX Shared Decision State Domain Model
 * Transport-neutral types, command registry, deterministic calculations, and schema definitions.
 */

import { CanonicalScenario } from './canonical-scenario-model';
import {
  scenarioInScope,
  inScopeWeeklyPopulationUnits,
  inScopeRealisedRevenuePerUnitGbp
} from './scenario-scope';

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
  | 'REGISTER_COMMERCIAL_INTENT'
  | 'REGISTER_CAMPAIGN_INTENT'
  | 'REGISTER_DECISION_CONTRACT'
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

/**
 * The OPENING POSITION of a decision state, derived from the scenario it is for.
 *
 * Wave-1 convergence (R-31). This was `DEFAULT_SCENARIO_PARAMS` in `lib/decision-state-store.ts`:
 * a module constant declaring `promotion_lift: 20`, `forecast_horizon_days: 14`,
 * `promotion_method: '20_percent_off'` and `campaign_scope: 'national'`. Those are the REFERENCE
 * scenario's committed terms, and while it was the only registered scenario they were also simply
 * correct.
 *
 * With three certified scenarios and a selector to reach them they are correct for one and wrong
 * for two: `SCN-CHILLED-SALMON-002` commits 10% over 14 days, `SCN-BAKERY-SOURDOUGH-003` commits
 * 10% over 7 days in one region. Every session opened on the reference scenario's plan whatever it
 * had selected, and Restart returned it there — "Restart restores Fresh Dairy unconditionally",
 * which is the defect Gate B's scenario-specific reset condition exists to catch.
 *
 * This is the same class of defect as `R-27`, in the one layer `SCI-03` had no reason to reach:
 * `R-27` was about ENGINES resolving against the reference scenario, and this is the SESSION's
 * opening position doing the same. `SCI-03` had no selector to expose it and `SCI-04` authored no
 * scenario content, so neither lane could have found it alone.
 *
 * Every field is DERIVED from the record, never restated. Nothing here declares economics.
 */
export function scenarioOpeningDecisionParameters(scenario: CanonicalScenario): DecisionScenarioParameters {
  const depth = scenario.economics.promotion_depth_pct;
  return {
    /* The depth the scenario's plan is COMMITTED to — the position a reader arrives at. */
    promotion_lift: depth,
    /*
     * Standing supplier headroom above un-promoted demand, as a percentage. The record declares
     * it as an index (1.10 = base plus 10%), and this parameter is that headroom.
     */
    supplier_capacity_cap: Math.round((scenario.supply.supplier_capacity_index - 1) * 1000) / 10,
    forecast_horizon_days: scenario.calendar.forecast_horizon_days,
    promotion_method: `${depth}_percent_off`,
    /*
     * Where the committed intervention runs, mapped from the scenario's own market scope rather
     * than assumed national. A store-cluster scope is a phased rollout in this vocabulary.
     */
    campaign_scope:
      scenario.identity.market_scope === 'NATIONAL' ? 'national'
      : scenario.identity.market_scope === 'REGION' ? 'regional'
      : 'phased',
    /*
     * Zero, and not because there is no cannibalisation: the declared depth responses are already
     * NET of it, so adding a factor here would count it twice.
     */
    cannibalisation_factor: 0,
    event_boost: 'none'
  };
}

/** The opening position for the scenario the current computation is for (layer C). */
export function inScopeOpeningDecisionParameters(): DecisionScenarioParameters {
  return scenarioOpeningDecisionParameters(scenarioInScope());
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
  enterprise_signals: string[]; // Canonical Enterprise Signal reference IDs (e.g. ['sig_ps_001', 'sig_ps_002']) owned by Enterprise World
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
 * Share of base weekly demand the buffer-optimisation lever releases. Declared here because it
 * is a property of this engine's lever set, not of the retail scenario. Previously 500 units
 * against a 10,000-unit population — the same 5%.
 */
export const BUFFER_OPTIMISATION_RATE_PCT = 5;

const safeShare = (n: number, d: number) => (d > 0 ? n / d : 0);

/**
 * Deterministic Derived Impact Engine
 * Pure function: Calculates exact cross-functional business consequences from parameters & interventions.
 */
export function calculateDerivedImpacts(
  params: DecisionScenarioParameters,
  interventions: string[]
): DecisionDerivedImpacts {
  /*
   * The population these impacts are computed on IS the canonical scenario's un-promoted
   * weekly demand. It used to be an abstract 10,000 units belonging to no product, region
   * or price, which is how this surface came to publish pounds that the Demand journey had
   * never heard of. Nothing here is declared: every quantity below is a ratio of the
   * scenario, so the whole engine rescales from one number.
   */
  const scenario = scenarioInScope();
  const BASE_DEMAND = inScopeWeeklyPopulationUnits();
  const BASE_SUPPLIER_CAPACITY = BASE_DEMAND;

  // 1. Demand Lift
  const weekly_demand_units = Math.round(BASE_DEMAND * (1 + params.promotion_lift / 100));

  // 2. Base Capacity & Interventions. The flex clause releases a declared SHARE of base
  //    weekly demand; the buffer lever releases a smaller share of the same base.
  const flexUnits = interventions.includes('SLA_FLEX_RULE_4')
    ? BASE_DEMAND * (scenario.supply.supplier_flex_rate_pct / 100)
    : 0;
  const bufferUnits = interventions.includes('BUFFER_OPTIMISATION_R002')
    ? BASE_DEMAND * (BUFFER_OPTIMISATION_RATE_PCT / 100)
    : 0;
  const supplier_capacity_units = Math.round(BASE_SUPPLIER_CAPACITY * (1 + params.supplier_capacity_cap / 100)) + Math.round(flexUnits) + Math.round(bufferUnits);

  // 3. Commitment Gap
  const commitment_gap_units = Math.max(0, weekly_demand_units - supplier_capacity_units);

  // 4. Delivery Risk (% breach risk)
  const baseRisk = Math.min(95, Math.round((commitment_gap_units / Math.max(1, weekly_demand_units)) * 100 * 2.5));
  const delivery_risk_pct = interventions.includes('SLA_FLEX_RULE_4') ? Math.max(5, baseRisk - 30) : baseRisk;

  /*
   * 5. Financial exposure. Revenue we cannot transact on the units we cannot serve, less the
   *    share customers recover on a substitute line. Derived from the scenario's own realised
   *    price — the previous £120 per unit was 58x the shelf price of the product in question.
   */
  const retained_share = 1 - (scenario.economics.substitution_recovery_pct / 100);
  const financial_exposure_gbp = Math.round(
    commitment_gap_units * inScopeRealisedRevenuePerUnitGbp() * retained_share
  );

  // 6. DC Overtime (Ripple 2nd order)
  const scopeMultiplier = params.campaign_scope === 'national' ? 1.0 : params.campaign_scope === 'regional' ? 0.6 : 0.75;
  const dc_overtime_hours = Math.round(12 + (params.promotion_lift * 0.4) * scopeMultiplier);

  // 7. Margin Erosion (% 3rd order)
  const baseErosion = 1.2 + (params.promotion_lift / 15) * 1.0 * scopeMultiplier + (params.cannibalisation_factor * 0.1);
  const margin_erosion_pct = Number(baseErosion.toFixed(1));

  /*
   * 8. Stockout probability, scaled against the gap as a SHARE of weekly demand rather than
   *    against a raw count. A count-based rule pinned to a 10,000-unit population saturated at
   *    92% the moment the scenario was resized.
   */
  const gap_share = safeShare(commitment_gap_units, weekly_demand_units);
  const stockout_probability_pct = commitment_gap_units > 0
    ? Math.min(92, Math.round(40 + gap_share * 100 * 1.2))
    : 5;

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

  if (cmd.command_type === 'REGISTER_DECISION_CONTRACT') {
    if (typeof cmd.payload?.decision_contract_ref !== 'string' || !cmd.payload.decision_contract_ref) {
      errors.push('decision_contract_ref must be a non-empty string');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
