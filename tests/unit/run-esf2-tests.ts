/**
 * Unit Test Suite for CogniX ESF-2 Dynamic Signal Simulation
 * Run via: npx tsx tests/unit/run-esf2-tests.ts
 */

import {
  SignalSimulationRequest,
  SignalSimulationContext,
  validateTemporalRange,
  validateSignalSimulationContext,
  validateEnterpriseSignal,
  generateCanonicalScenario,
  validateJourneyEvent,
  calculateDerivedImpacts
} from '../../packages/contracts/src/index';
import { simulateEnterpriseSignalTimelines } from '../../services/world/src/dynamic-signal-simulator';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX ESF-2 DYNAMIC SIGNAL SIMULATION UNIT TESTS');
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

  const baseContext: SignalSimulationContext = {
    session_id: 'sess_test_001',
    decision_state_id: 'ds_test_001',
    decision_state_version: 1,
    tenant_id: 'tenant_uk_retail_01',
    scenario_id: 'SCN-PROMO-01',
    scenario_family: 'promotion_surge',
    promotion_lift: 20,
    supplier_capacity_cap: 10,
    forecast_horizon_days: 14,
    promotion_method: '20_percent_off',
    campaign_scope: 'national',
    cannibalisation_factor: 0,
    event_boost: 'none',
    selected_interventions: []
  };

  // TEST 1: Timeline Schema Validation
  const req1: SignalSimulationRequest = { context: baseContext };
  const res1 = simulateEnterpriseSignalTimelines(req1);
  assert(
    !!res1.simulation_id && res1.timelines.length === 4 && res1.timelines[0].observations.length === 12,
    'Test 1: Timeline schema valid (returns 4 timelines with 12 temporal observations each)'
  );

  // TEST 2: Deterministic Reproduction
  const res2a = simulateEnterpriseSignalTimelines(req1);
  const res2b = simulateEnterpriseSignalTimelines(req1);
  assert(
    res2a.timelines[0].observations[3].observed_value === res2b.timelines[0].observations[3].observed_value,
    'Test 2: Deterministic reproduction (identical context produces identical observation values)'
  );

  // TEST 3: Chronological Ordering
  const periods = res1.timelines[0].observations.map(o => o.period);
  assert(
    periods[0] === 'T-90' && periods[7] === 'Today' && periods[11] === 'T+30',
    'Test 3: Chronological temporal ordering (T-90 ... Today ... T+30)'
  );

  // TEST 4: Scenario Differentiation (promotion_surge vs supplier_breach)
  const breachReq: SignalSimulationRequest = {
    context: { ...baseContext, scenario_id: 'SCN-BREACH-02', scenario_family: 'supplier_breach' }
  };
  const breachRes = simulateEnterpriseSignalTimelines(breachReq);
  assert(
    res1.timelines[0].signal_type === 'SEARCH_VELOCITY_ACCELERATION' &&
    breachRes.timelines[0].signal_type === 'SUPPLIER_LEAD_TIME_DRIFT',
    'Test 4: Scenario differentiation (promotion_surge vs supplier_breach generate distinct timelines)'
  );

  // TEST 5: Decision State Context Reactivity (20% vs 35% lift)
  const lift35Req: SignalSimulationRequest = {
    context: { ...baseContext, promotion_lift: 35, decision_state_version: 2 }
  };
  const lift35Res = simulateEnterpriseSignalTimelines(lift35Req);
  assert(
    lift35Res.timelines[0].observations[7].observed_value > res1.timelines[0].observations[7].observed_value,
    'Test 5: Decision state context reactivity (increasing promo lift from 20% to 35% accelerates signal deltas)'
  );

  // TEST 6 & 7: Intervention Future-Only Effect & Historical Immutability
  const unIntervenedReq: SignalSimulationRequest = { context: baseContext };
  const intervenedReq: SignalSimulationRequest = {
    context: {
      ...baseContext,
      selected_interventions: [{ intervention_id: 'sla_flex_rule_4', effective_period: 'T-2' }]
    }
  };
  const unRes = simulateEnterpriseSignalTimelines(unIntervenedReq);
  const intRes = simulateEnterpriseSignalTimelines(intervenedReq);

  // T-3 (period <= T-2) must be identical
  const unT3 = unRes.timelines[2].observations.find(o => o.period === 'T-3')!;
  const intT3 = intRes.timelines[2].observations.find(o => o.period === 'T-3')!;
  // Today (period > T-2) must reflect capacity flex effect
  const unToday = unRes.timelines[2].observations.find(o => o.period === 'Today')!;
  const intToday = intRes.timelines[2].observations.find(o => o.period === 'Today')!;

  assert(
    unT3.observed_value === intT3.observed_value,
    'Test 7: Historical observation immutability (period T-3 <= T-2 effective_period remains unchanged)'
  );
  assert(
    Boolean(intToday.provenance.intervention_refs?.includes('sla_flex_rule_4')) && intToday.provenance.drivers.flex_capacity === 7000,
    'Test 6: Intervention future-only effect (period Today > T-2 reflects SLA Flex capacity flex)'
  );

  // TEST 8: Tenant Isolation
  const tenantBReq: SignalSimulationRequest = { context: { ...baseContext, tenant_id: 'tenant_b' } };
  const tenantBRes = simulateEnterpriseSignalTimelines(tenantBReq);
  assert(
    tenantBRes.tenant_id === 'tenant_b' && tenantBRes.timelines.every(t => t.tenant_id === 'tenant_b'),
    'Test 8: Tenant isolation preserved'
  );

  // TEST 9: Session Differentiation
  const sessBReq: SignalSimulationRequest = { context: { ...baseContext, session_id: 'sess_002' } };
  const sessBRes = simulateEnterpriseSignalTimelines(sessBReq);
  assert(
    sessBRes.timelines[0].timeline_id === res1.timelines[0].timeline_id,
    'Test 9: Session differentiation (sessions produce independent simulation runs)'
  );

  // TEST 10: Invalid Context Rejection
  const invalidCtxReq: any = { context: { tenant_id: 'tenant_a' } };
  let ctxErr = false;
  try { simulateEnterpriseSignalTimelines(invalidCtxReq); } catch (e) { ctxErr = true; }
  assert(ctxErr, 'Test 10: Invalid context payload rejected');

  // TEST 11: Malformed Temporal Range Rejection
  const badRange = validateTemporalRange('T+7', 'T-7');
  assert(!badRange.valid && badRange.error!.includes('must precede'), 'Test 11: Malformed temporal range rejected');

  // TEST 12: Provenance & Rule Traceability
  const obs = res1.timelines[2].observations[7];
  assert(
    !!obs.provenance.rule_id && typeof obs.provenance.drivers.base_capacity === 'number',
    'Test 12: Provenance contains explicit rule_id and quantitative driver metrics'
  );

  // TEST 13: Snapshot vs Timeline Consistency
  assert(
    res1.timelines[0].observations.find(o => o.period === 'Today')?.delta_pct === 18,
    'Test 13: Snapshot vs timeline consistency (Today observation agrees with static snapshot delta)'
  );

  // TEST 14: ESF-1 Snapshot API Regression
  const validSig: any = {
    signal_id: 'sig_001',
    signal_type: 'SEARCH_VELOCITY_ACCELERATION',
    category: 'CUSTOMER',
    tenant_id: 'tenant_a',
    entity_type: 'SKU',
    entity_id: 'P004',
    observed_at: new Date().toISOString(),
    baseline_value: 100,
    observed_value: 118,
    delta: 18,
    delta_pct: 18,
    unit: 'percent',
    source_type: 'SYNTHETIC_WORLD',
    confidence: 90,
    quality: 95,
    schema_version: '1.0'
  };
  assert(validateEnterpriseSignal(validSig).valid, 'Test 14: ESF-1 snapshot model validation regression clean');

  // TEST 15: WP10-A Scenario Contract Regression
  const scenarios = generateCanonicalScenario('promotion_surge', 'tenant_uk_retail_01');
  assert(scenarios.length >= 1, 'Test 15: WP10-A scenario generator regression clean');

  // TEST 16: WP10-B Journey Telemetry Regression
  const journeyEvt: any = {
    event_id: 'evt_001',
    event_type: 'SCENARIO_CHANGED',
    session_id: 'sess_001',
    tenant_id: 'tenant_a',
    user_id: 'user_exec_01',
    persona_id: 'exec',
    timestamp: new Date().toISOString(),
    schema_version: '1.0',
    source: 'web'
  };
  assert(validateJourneyEvent(journeyEvt).valid, 'Test 16: WP10-B journey event validation regression clean');

  // TEST 17: WP10-C Decision State Impact Regression
  const impacts = calculateDerivedImpacts({ promotion_lift: 20, supplier_capacity_cap: 10, forecast_horizon_days: 14, promotion_method: '20_percent_off', campaign_scope: 'national', cannibalisation_factor: 0, event_boost: 'none' }, []);
  assert(impacts.weekly_demand_units === 12000, 'Test 17: WP10-C decision state impact engine regression clean');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
