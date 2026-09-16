/**
 * Unit Test Suite for CogniX ESF-1 Enterprise Signal Foundation
 * Run via: npx tsx tests/unit/run-signal-tests.ts
 */

import { validateEnterpriseSignal, EnterpriseSignal, CANONICAL_SCENARIO } from '../../packages/contracts/src/index';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';
import { SECOND_SCENARIO } from '../fixtures/scenario/second-scenario';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX ESF-1 ENTERPRISE SIGNAL UNIT TEST SUITE');
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

  // TEST 1: Schema Validation (Valid Signal)
  const validSig: EnterpriseSignal = {
    signal_id: 'sig_test_001',
    signal_type: 'SEARCH_VELOCITY_ACCELERATION',
    category: 'CUSTOMER',
    tenant_id: 'tenant_uk_retail_01',
    domain_id: 'retail_grocery',
    scenario_id: CANONICAL_SCENARIO.identity.scenario_id,
    entity_type: 'CATEGORY',
    entity_id: 'Fresh Dairy',
    observed_at: new Date().toISOString(),
    effective_at: new Date().toISOString(),
    baseline_value: 100,
    observed_value: 118,
    delta: 18,
    delta_pct: 18,
    unit: 'percent',
    source_type: 'SYNTHETIC_WORLD',
    source_system: 'cognix_world_generator',
    confidence: 90,
    quality: 95,
    provenance: { generator: 'test' },
    synthetic_demo: true,
    schema_version: '1.0'
  };
  const valResult = validateEnterpriseSignal(validSig);
  assert(valResult.valid, 'Test 1: Valid signal payload accepted', valResult.errors.join(', '));

  // TEST 2: Schema Validation (Malformed Signal Rejected)
  const malformedSig: any = { signal_id: 'sig_test_002', confidence: 150 };
  const malResult = validateEnterpriseSignal(malformedSig);
  assert(!malResult.valid && malResult.errors.length >= 4, 'Test 2: Malformed signal payload rejected with multiple errors');

  // TEST 3: Deterministic Generator - Reproducibility
  const snapshot1 = generateSyntheticSignalSnapshot(CANONICAL_SCENARIO, 'tenant_uk_retail_01');
  const snapshot2 = generateSyntheticSignalSnapshot(CANONICAL_SCENARIO, 'tenant_uk_retail_01');
  assert(
    snapshot1.length === 5 && snapshot1.length === snapshot2.length && snapshot1[0].signal_type === snapshot2[0].signal_type,
    'Test 3: Signal snapshot generator is deterministic and reproducible'
  );
  /*
   * ADR-078. Two consecutive reads must be byte-identical INCLUDING their timestamps. This
   * is the assertion the civil-time stamp made impossible: `observed_at` and `effective_at`
   * were the only fields that moved between two otherwise identical snapshots, which left
   * freshness permanently zero and made Refresh look inert.
   */
  assert(
    JSON.stringify(snapshot1) === JSON.stringify(snapshot2),
    'Test 3b: Two consecutive reads are byte-identical, timestamps included (scenario clock, not civil time)'
  );

  // TEST 4: Scenario Differentiation (promotion_surge vs supplier_breach)
  const promoSignals = generateSyntheticSignalSnapshot(CANONICAL_SCENARIO, 'tenant_uk_retail_01');
  const breachSignals = generateSyntheticSignalSnapshot(SECOND_SCENARIO, 'tenant_uk_retail_01');
  const promoTypes = promoSignals.map(s => s.signal_type);
  const breachTypes = breachSignals.map(s => s.signal_type);
  assert(
    promoTypes.includes('SEARCH_VELOCITY_ACCELERATION') && breachTypes.includes('SUPPLIER_LEAD_TIME_DRIFT'),
    'Test 4: Scenarios generate distinct, domain-coherent signal sets'
  );

  // TEST 5: Tenant Scope Preservation
  const tenantASignals = generateSyntheticSignalSnapshot(CANONICAL_SCENARIO, 'tenant_a');
  assert(
    tenantASignals.every(s => s.tenant_id === 'tenant_a'),
    'Test 5: Synthetic signals correctly preserve tenant_id scope'
  );

  // TEST 5b: Scenario identity and supplier coherence (ADR-077, residual R-20)
  /*
   * The signal fabric used to publish SUPPLIER_CAPACITY_PRESSURE against FreshDirect UK
   * while the connected journey's economics named Cheshire Cheese Co. One decision cannot
   * have two suppliers, and a flex notice served on the wrong party is not a decision.
   */
  const supplierSignal = promoSignals.find(s => s.signal_type === 'SUPPLIER_CAPACITY_PRESSURE');
  assert(
    !!supplierSignal && supplierSignal.entity_id === CANONICAL_SCENARIO.supply.supplier_name,
    'Test 5b: The supplier named in the signals is the supplier named in the economics',
    `${supplierSignal?.entity_id} vs ${CANONICAL_SCENARIO.supply.supplier_name}`
  );
  assert(
    promoSignals.every(s => s.scenario_id === CANONICAL_SCENARIO.identity.scenario_id),
    'Test 5c: Every signal carries the scenario identity it was generated for'
  );
  assert(
    promoSignals.every(s => s.observed_at <= `${CANONICAL_SCENARIO.calendar.observed_history_end_date}T23:59:59.999Z`),
    'Test 5d: No observation is stamped after the scenario clock, so freshness is a real reading'
  );

  // TEST 6: Security Guardrail against Credential Leakage
  const leakySig: any = {
    ...validSig,
    provenance: { key: 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P67' }
  };
  const leakResult = validateEnterpriseSignal(leakySig);
  assert(!leakResult.valid && leakResult.errors.some(e => e.includes('Security violation')), 'Test 6: Security guardrail detects credential leak in provenance');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
