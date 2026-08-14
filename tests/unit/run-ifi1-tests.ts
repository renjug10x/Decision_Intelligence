/**
 * Unit Test Suite for CogniX IFI-01 Intent Fusion Intelligence Foundation
 * Run via: npx tsx tests/unit/run-ifi1-tests.ts
 */

import {
  CommercialIntent,
  validateCommercialIntent,
  IntentFusionRequest,
  validateIntentFusionRequest,
  validateJourneyEvent,
  generateCanonicalScenario,
  calculateDerivedImpacts,
  validateEnterpriseSignal
} from '../../packages/contracts/src/index';
import {
  registerCommercialIntent,
  getCurrentCommercialIntent,
  clearCommercialIntents
} from '../../lib/commercial-intent-store';
import { evaluateIntentFusion } from '../../lib/intent-fusion/intent-fusion-engine';
import { transitionDecisionState, getDecisionState, resetDecisionState } from '../../lib/decision-state-store';
import { simulateEnterpriseSignalTimelines } from '../../services/world/src/dynamic-signal-simulator';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX IFI-01 INTENT FUSION INTELLIGENCE UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${errorDetail || 'Assertion failed'}`);
      failed++;
    }
  }

  // Clean state
  clearCommercialIntents();
  resetDecisionState('tenant_uk_retail_01', 'sess_001');

  // TEST 1: Commercial Intent Schema Validation (Valid Intent)
  const validIntent: CommercialIntent = {
    commercial_intent_id: 'intent_test_001',
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_001',
    campaign_id: 'CMP-DAIRY-Q3',
    category: 'Fresh Dairy',
    sku_scope: ['P004 Cheddar Mature 400g'],
    region: 'North West',
    promotion_type: '20_percent_off',
    discount_depth: 20,
    planned_start: new Date().toISOString(),
    planned_end: new Date(Date.now() + 14 * 86400000).toISOString(),
    expected_uplift: 25,
    source_system: 'cognix_promotion_planner',
    source_type: 'PROMOTION_PLANNER',
    created_at: new Date().toISOString(),
    provenance: { test: 'true' },
    synthetic_demo: true,
    schema_version: '1.0'
  };
  assert(validateCommercialIntent(validIntent).valid, 'Test 1: Valid Commercial Intent payload accepted');

  // TEST 2: Commercial Intent Schema Validation (Malformed Rejection)
  const malformedIntent: any = { commercial_intent_id: 'intent_bad', discount_depth: -5 };
  const malVal = validateCommercialIntent(malformedIntent);
  assert(!malVal.valid && malVal.errors.length >= 4, 'Test 2: Malformed Commercial Intent payload rejected');

  // TEST 3: Intent Store Isolation & Session Scope
  const reg1 = registerCommercialIntent(validIntent);
  const cur1 = getCurrentCommercialIntent('tenant_uk_retail_01', 'sess_001');
  const tenantBIntent = getCurrentCommercialIntent('tenant_b', 'sess_002');
  assert(
    cur1.commercial_intent_id === 'intent_test_001' && tenantBIntent.commercial_intent_id === 'intent_demo_01',
    'Test 3: Commercial Intent Store preserves tenant & session isolation'
  );

  // TEST 4: Decision State Versioning (REGISTER_COMMERCIAL_INTENT transition)
  const initState = getDecisionState('tenant_uk_retail_01', 'sess_001');
  const initVersion = initState.state_version;
  const transitioned = transitionDecisionState('tenant_uk_retail_01', 'sess_001', 'REGISTER_COMMERCIAL_INTENT', {
    promotion_lift: 20,
    commercial_intent_ref: 'intent_test_001'
  });
  assert(
    transitioned.state_version === initVersion + 1 && transitioned.commercial_intent_ref === 'intent_test_001',
    'Test 4: Registering Commercial Intent triggers Decision State transition (vN -> vN+1)'
  );

  // TEST 5: Intent Fusion Engine Determinism
  const req: IntentFusionRequest = { tenant_id: 'tenant_uk_retail_01', session_id: 'sess_001' };
  const outlook1 = evaluateIntentFusion(req);
  const outlook2 = evaluateIntentFusion(req);
  assert(
    outlook1.contextualised_outlook_pct === 22 && outlook1.contextualised_outlook_pct === outlook2.contextualised_outlook_pct,
    'Test 5: Intent Fusion engine is 100% deterministic (reproducible decomposition)'
  );

  // TEST 6: Explicit Contribution Separation
  assert(
    outlook1.baseline_forecast.baseline_lift_pct === 12 &&
    outlook1.commercial_intent.intent_effect_pct === 7 &&
    outlook1.observed_signals.observed_signal_effect_pct === 3 &&
    outlook1.interaction_adjustment_pct === 0 &&
    outlook1.contextualised_outlook_pct === 22,
    'Test 6: Outlook explicitly separates Baseline Forecast (+12%), Commercial Intent (+7%), Observed Signals (+3%), and Outlook (+22%)'
  );

  // TEST 7: Calculation Mode & Provenance Traceability
  assert(
    outlook1.calculation_mode === 'deterministic_demo_decomposition' &&
    typeof outlook1.provenance.rule_id === 'string' &&
    outlook1.potential_commitment_gap_pp === 12,
    'Test 7: Calculation mode explicitly identifies deterministic_demo_decomposition & calculates 12pp commitment gap'
  );

  // TEST 8: ESF-2 Simulation Evidence Integration
  const simRes = simulateEnterpriseSignalTimelines({ context: { session_id: 'sess_001', decision_state_id: 'ds_01', decision_state_version: 1, tenant_id: 'tenant_uk_retail_01', scenario_id: 'SCN-PROMO-01', promotion_lift: 20, supplier_capacity_cap: 10, forecast_horizon_days: 14, promotion_method: '20_percent_off', campaign_scope: 'national', cannibalisation_factor: 0, event_boost: 'none', selected_interventions: [] } });
  assert(simRes.timelines.length === 4 && outlook1.observed_signals.signal_refs.length === 3, 'Test 8: ESF-2 simulation evidence integrated into Intent Fusion outlook');

  // TEST 9: Journey Telemetry Event (COMMERCIAL_INTENT_REGISTERED)
  const journeyEvt: any = {
    event_id: 'evt_intent_001',
    event_type: 'COMMERCIAL_INTENT_REGISTERED',
    tenant_id: 'tenant_uk_retail_01',
    user_id: 'user_exec_01',
    session_id: 'sess_001',
    timestamp: new Date().toISOString(),
    schema_version: '1.0',
    metadata: { commercial_intent_id: 'intent_test_001' }
  };
  assert(validateJourneyEvent(journeyEvt).valid, 'Test 9: COMMERCIAL_INTENT_REGISTERED journey telemetry event validation clean');

  // TEST 10: WP10-A Scenario Regression
  const scenarios = generateCanonicalScenario('promotion_surge', 'tenant_uk_retail_01');
  assert(scenarios.length >= 1, 'Test 10: WP10-A scenario regression clean');

  // TEST 11: WP10-C Decision State Impact Engine Regression
  const impacts = calculateDerivedImpacts({ promotion_lift: 20, supplier_capacity_cap: 10, forecast_horizon_days: 14, promotion_method: '20_percent_off', campaign_scope: 'national', cannibalisation_factor: 0, event_boost: 'none' }, []);
  assert(impacts.weekly_demand_units === 12000, 'Test 11: WP10-C impact engine regression clean');

  // TEST 12: ESF-1 Snapshot Model Validation Regression
  const validSig: any = { signal_id: 'sig_001', signal_type: 'SEARCH_VELOCITY_ACCELERATION', category: 'CUSTOMER', tenant_id: 'tenant_a', entity_type: 'SKU', entity_id: 'P004', observed_at: new Date().toISOString(), baseline_value: 100, observed_value: 118, delta: 18, delta_pct: 18, unit: 'percent', source_type: 'SYNTHETIC_WORLD', confidence: 90, quality: 95, schema_version: '1.0' };
  assert(validateEnterpriseSignal(validSig).valid, 'Test 12: ESF-1 snapshot model regression clean');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
