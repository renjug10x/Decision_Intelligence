/**
 * CogniX Intent Fusion Intelligence Engine
 * Reconciles baseline forecast context, Commercial Intent, observed Enterprise Signals, and Decision State into a Contextualised Decision Outlook.
 * 
 * Domain Ownership: Intent Fusion Domain (lib/intent-fusion)
 * Architectural Rule: 100% pure calculative logic outside React components.
 */

import {
  IntentFusionRequest,
  ContextualisedDecisionOutlook,
  CommercialIntent
} from '../../packages/contracts/src/index';
import { getCurrentCommercialIntent } from '../commercial-intent-store';
import { getDecisionState } from '../decision-state-store';

export function evaluateIntentFusion(request: IntentFusionRequest): ContextualisedDecisionOutlook {
  const tenantId = request.tenant_id || 'tenant_uk_retail_01';
  const sessionId = request.session_id || 'sess_001';

  // 1. Get active Commercial Intent
  const intent: CommercialIntent = request.commercial_intent_id
    ? (getCurrentCommercialIntent(tenantId, sessionId) || getCurrentCommercialIntent(tenantId, sessionId))
    : getCurrentCommercialIntent(tenantId, sessionId);

  // 2. Get active Shared Decision State
  const decisionState = getDecisionState(tenantId, sessionId);

  // 3. Decomposition Components
  const baselineLiftPct = typeof request.baseline_forecast_lift_pct === 'number' ? request.baseline_forecast_lift_pct : 12;
  const intentEffectPct = Math.round((intent.discount_depth || 20) * 0.35); // 20% discount depth -> +7% intent effect
  const signalEffectPct = 3; // +3% observed search velocity & basket add signals
  const interactionAdjustmentPct = 0; // 0% for demo decomposition

  const contextualisedOutlookPct = baselineLiftPct + intentEffectPct + signalEffectPct + interactionAdjustmentPct; // 12 + 7 + 3 = 22%
  const supplierCapacityCapPct = 10; // +10% max allocation headroom
  const commitmentGapPp = contextualisedOutlookPct - supplierCapacityCapPct; // 22 - 10 = 12 pp gap

  const now = new Date().toISOString();
  const fusionId = `fus_${Math.random().toString(36).substr(2, 9)}`;

  return {
    fusion_id: fusionId,
    tenant_id: tenantId,
    session_id: sessionId,
    commercial_intent_id: intent.commercial_intent_id,
    decision_state_id: decisionState.decision_state_id,
    decision_state_version: decisionState.state_version,

    baseline_forecast: {
      source_system: 'cognix_synthetic_world',
      source_type: 'ENTERPRISE_WORLD',
      baseline_lift_pct: baselineLiftPct,
      confidence: 90
    },
    commercial_intent: {
      commercial_intent_id: intent.commercial_intent_id,
      intent_effect_pct: intentEffectPct,
      promotion_type: intent.promotion_type,
      discount_depth: intent.discount_depth
    },
    observed_signals: {
      observed_signal_effect_pct: signalEffectPct,
      signal_count: 3,
      signal_refs: ['sig_ps_001', 'sig_ps_002', 'sig_ps_003'],
      simulation_id: 'sig_sim_demo_01'
    },

    interaction_adjustment_pct: interactionAdjustmentPct,
    contextualised_outlook_pct: contextualisedOutlookPct,
    supplier_capacity_cap_pct: supplierCapacityCapPct,
    potential_commitment_gap_pp: commitmentGapPp,

    calculation_mode: 'deterministic_demo_decomposition',
    confidence: 91,
    provenance: {
      engine: 'cognix_intent_fusion_engine_v1',
      scenario_id: decisionState.scenario_id,
      decision_state_version: decisionState.state_version,
      rule_id: 'IF-RULE-DECOMPOSITION-V1'
    },
    timestamp: now,
    schema_version: '1.0'
  };
}
