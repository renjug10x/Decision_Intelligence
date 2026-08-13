/**
 * Unit Test Suite for CogniX ESF-1 Enterprise Signal Foundation
 * Run via: npx tsx tests/unit/run-signal-tests.ts
 */

import { validateEnterpriseSignal, EnterpriseSignal } from '../../packages/contracts/src/index';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';

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
    scenario_id: 'SCN-PROMO-01',
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
  const snapshot1 = generateSyntheticSignalSnapshot('promotion_surge', 'tenant_uk_retail_01', 'SCN-PROMO-01');
  const snapshot2 = generateSyntheticSignalSnapshot('promotion_surge', 'tenant_uk_retail_01', 'SCN-PROMO-01');
  assert(
    snapshot1.length === 5 && snapshot1.length === snapshot2.length && snapshot1[0].signal_type === snapshot2[0].signal_type,
    'Test 3: Signal snapshot generator is deterministic and reproducible'
  );

  // TEST 4: Scenario Differentiation (promotion_surge vs supplier_breach)
  const promoSignals = generateSyntheticSignalSnapshot('promotion_surge', 'tenant_uk_retail_01', 'SCN-PROMO-01');
  const breachSignals = generateSyntheticSignalSnapshot('supplier_breach', 'tenant_uk_retail_01', 'SCN-BREACH-02');
  const promoTypes = promoSignals.map(s => s.signal_type);
  const breachTypes = breachSignals.map(s => s.signal_type);
  assert(
    promoTypes.includes('SEARCH_VELOCITY_ACCELERATION') && breachTypes.includes('SUPPLIER_LEAD_TIME_DRIFT'),
    'Test 4: Scenarios generate distinct, domain-coherent signal sets'
  );

  // TEST 5: Tenant Scope Preservation
  const tenantASignals = generateSyntheticSignalSnapshot('promotion_surge', 'tenant_a', 'SCN-PROMO-01');
  assert(
    tenantASignals.every(s => s.tenant_id === 'tenant_a'),
    'Test 5: Synthetic signals correctly preserve tenant_id scope'
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
