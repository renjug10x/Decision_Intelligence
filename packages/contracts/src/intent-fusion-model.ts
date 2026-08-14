/**
 * CogniX Intent Fusion Intelligence Model
 * Transport-neutral contracts for forecast contextualisation and multi-source intent-signal reconciliation.
 */

export interface ForecastContribution {
  source_system: string;              // e.g. 'cognix_synthetic_world' or 'blue_yonder_demand_planning'
  source_type: 'ENTERPRISE_WORLD' | 'EXTERNAL_PLANNING_SYSTEM' | 'PROPRIETARY_FORECAST';
  baseline_lift_pct: number;          // e.g. 12
  confidence: number;                 // e.g. 90
}

export interface IntentContribution {
  commercial_intent_id: string;
  intent_effect_pct: number;          // e.g. 7
  promotion_type: string;             // e.g. 20_percent_off
  discount_depth: number;             // e.g. 20
}

export interface SignalContribution {
  observed_signal_effect_pct: number; // e.g. 3
  signal_count: number;               // e.g. 3
  signal_refs: string[];              // e.g. ['sig_ps_001', 'sig_ps_002', 'sig_ps_003']
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
  fusion_id: string;                  // fus_<uuid>
  tenant_id: string;
  session_id: string;
  commercial_intent_id: string;
  decision_state_id: string;
  decision_state_version: number;
  
  // Decomposed contributions
  baseline_forecast: ForecastContribution;
  commercial_intent: IntentContribution;
  observed_signals: SignalContribution;
  
  // Contextualised Result
  interaction_adjustment_pct: number; // 0 for demo decomposition
  contextualised_outlook_pct: number;  // 12 + 7 + 3 + 0 = 22%
  
  // Capacity & Commitment Analysis
  supplier_capacity_cap_pct: number;  // e.g. 10%
  potential_commitment_gap_pp: number; // 22 - 10 = 12 pp gap
  
  calculation_mode: 'deterministic_demo_decomposition';
  confidence: number;                 // 0-100 e.g. 91
  provenance: Record<string, string | number>;
  timestamp: string;                  // ISO 8601 UTC
  schema_version: string;             // "1.0"
}

export function validateIntentFusionRequest(req: Partial<IntentFusionRequest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!req.tenant_id) errors.push('Missing required field: tenant_id');
  if (!req.session_id) errors.push('Missing required field: session_id');

  return { valid: errors.length === 0, errors };
}
