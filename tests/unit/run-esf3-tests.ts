/**
 * Unit Test Suite for CogniX ESF-3 External Signal Connector Contract
 * Run via: npx tsx tests/unit/run-esf3-tests.ts
 */

import {
  validateEnterpriseSignal,
  validateExternalSignalEnvelope,
  validateExternalSignalIngestRequest,
  validateExternalSignalConnectorDescriptor,
  normaliseEnvelopeToEnterpriseSignal,
  mapCategoryToSourceType,
  ExternalSignalEnvelope,
  ExternalSignalIngestRequest,
  generateCanonicalScenario,
  validateCommercialIntent,
  SignalSimulationRequest
} from '../../packages/contracts/src/index';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';
import { simulateEnterpriseSignalTimelines } from '../../services/world/src/dynamic-signal-simulator';
import {
  adaptReferenceObservation,
  assertConnectorRegistryIntegrity,
  ingestExternalSignals,
  listExternalSignalConnectors,
  listIngestedExternalSignals,
  resetExternalSignalIngestStore,
  REFERENCE_CONNECTOR_REGISTRY,
  getExternalSignalConnector
} from '../../services/world/src/external-signal-connector';

function runTests() {
  console.log('====================================================');
  console.log('COGNIX ESF-3 EXTERNAL SIGNAL CONNECTOR UNIT TESTS');
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

  resetExternalSignalIngestStore();

  // TEST 1: Registry covers all provider-neutral categories
  const integrity = assertConnectorRegistryIntegrity();
  const categories = new Set(listExternalSignalConnectors().map(c => c.category));
  assert(
    integrity.valid && categories.size === 7,
    'Test 1: Connector registry covers all 7 provider-neutral categories',
    integrity.errors.join('; ')
  );

  // TEST 2: Descriptor validation accepts registry entries
  const descResult = validateExternalSignalConnectorDescriptor(REFERENCE_CONNECTOR_REGISTRY[0]);
  assert(descResult.valid, 'Test 2: Connector descriptor contract validation accepts registry entry');

  // TEST 3: Valid envelope accepted
  const validEnvelope: ExternalSignalEnvelope = {
    envelope_id: 'env_test_planning_001',
    connector_id: 'conn_planning_ref_01',
    category: 'PLANNING',
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_esf3_01',
    scenario_id: 'SCN-PROMO-01',
    signal_type: 'FORECAST_DIVERGENCE',
    entity_type: 'REGION',
    entity_id: 'North West',
    observed_at: '2026-08-15T08:00:00.000Z',
    baseline_value: 100,
    observed_value: 112,
    unit: 'percent_baseline',
    provider_payload_ref: 'pref_planning_opaque_001',
    source_system: 'reference_planning_adapter',
    synthetic_demo: true,
    schema_version: '1.0'
  };
  const envVal = validateExternalSignalEnvelope(validEnvelope);
  assert(envVal.valid, 'Test 3: Valid external envelope accepted', envVal.errors.join(', '));

  // TEST 4: Malformed envelope rejected
  const malformed: any = { envelope_id: 'env_bad', confidence: 200, raw_payload: { secret: true } };
  const malVal = validateExternalSignalEnvelope(malformed);
  assert(
    !malVal.valid && malVal.errors.length >= 3,
    'Test 4: Malformed / unsupported envelope rejected (incl. raw payload guard)'
  );

  // TEST 5: Provider-neutral normalisation preserves provenance & synthetic marker
  const norm = normaliseEnvelopeToEnterpriseSignal(validEnvelope);
  assert(
    norm.ok === true &&
      norm.ok &&
      norm.signal.source_type === 'PLANNING_SYSTEM' &&
      norm.signal.provenance.connector_id === 'conn_planning_ref_01' &&
      norm.signal.provenance.provider_payload_ref === 'pref_planning_opaque_001' &&
      norm.signal.synthetic_demo === true &&
      !JSON.stringify(norm.signal).includes('raw_payload'),
    'Test 5: Normalisation preserves provenance, source mapping, and synthetic identity without vendor leakage'
  );

  // TEST 6: Reference adapter maps observation → envelope deterministically
  const adaptedA = adaptReferenceObservation({
    connector_id: 'conn_commerce_ref_01',
    tenant_id: 'tenant_uk_retail_01',
    signal_type: 'BASKET_ADD_ACCELERATION',
    entity_type: 'CATEGORY',
    entity_id: 'Fresh Dairy',
    observed_at: '2026-08-15T08:00:00.000Z',
    baseline_value: 100,
    observed_value: 118,
    unit: 'percent',
    envelope_id: 'env_commerce_det_01'
  });
  const adaptedB = adaptReferenceObservation({
    connector_id: 'conn_commerce_ref_01',
    tenant_id: 'tenant_uk_retail_01',
    signal_type: 'BASKET_ADD_ACCELERATION',
    entity_type: 'CATEGORY',
    entity_id: 'Fresh Dairy',
    observed_at: '2026-08-15T08:00:00.000Z',
    baseline_value: 100,
    observed_value: 118,
    unit: 'percent',
    envelope_id: 'env_commerce_det_01'
  });
  assert(
    adaptedA.ok &&
      adaptedB.ok &&
      adaptedA.ok &&
      adaptedB.ok &&
      adaptedA.envelope.envelope_id === adaptedB.envelope.envelope_id &&
      adaptedA.envelope.synthetic_demo === true,
    'Test 6: Reference adapter is deterministic and marks synthetic_demo=true'
  );

  // TEST 7: Unsupported signal type for connector rejected by adapter
  const unsupported = adaptReferenceObservation({
    connector_id: 'conn_weather_ref_01',
    tenant_id: 'tenant_uk_retail_01',
    signal_type: 'SUPPLIER_LEAD_TIME_DRIFT',
    entity_type: 'REGION',
    entity_id: 'North West',
    observed_at: '2026-08-15T08:00:00.000Z',
    baseline_value: 10,
    observed_value: 14,
    unit: 'hours'
  });
  assert(!unsupported.ok, 'Test 7: Unsupported signal type for connector category is rejected');

  // TEST 8: Ingest request validation
  const ingestReq: ExternalSignalIngestRequest = {
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_esf3_01',
    envelopes: [validEnvelope]
  };
  const ingestVal = validateExternalSignalIngestRequest(ingestReq);
  assert(ingestVal.valid, 'Test 8: Ingest request contract validation passes');

  // TEST 9: Ingest normalises and stores with tenant/session boundaries
  resetExternalSignalIngestStore();
  const ingestResult = ingestExternalSignals(ingestReq);
  const stored = listIngestedExternalSignals('tenant_uk_retail_01', 'sess_esf3_01');
  const otherTenant = listIngestedExternalSignals('tenant_other', 'sess_esf3_01');
  assert(
    ingestResult.accepted_count === 1 &&
      ingestResult.rejected_count === 0 &&
      stored.length === 1 &&
      stored[0].tenant_id === 'tenant_uk_retail_01' &&
      otherTenant.length === 0,
    'Test 9: Ingest preserves tenant/session boundaries'
  );

  // TEST 10: Tenant mismatch rejection
  const crossTenant = ingestExternalSignals({
    tenant_id: 'tenant_uk_retail_01',
    envelopes: [{ ...validEnvelope, envelope_id: 'env_cross', tenant_id: 'tenant_other' }]
  });
  assert(
    crossTenant.accepted_count === 0 &&
      crossTenant.rejected_count === 1 &&
      crossTenant.rejections[0].reason.includes('Tenant boundary'),
    'Test 10: Cross-tenant envelope rejected'
  );

  // TEST 11: Unknown connector rejected
  const unknownConn = ingestExternalSignals({
    tenant_id: 'tenant_uk_retail_01',
    envelopes: [{ ...validEnvelope, envelope_id: 'env_unknown', connector_id: 'conn_does_not_exist' }]
  });
  assert(
    unknownConn.accepted_count === 0 && unknownConn.rejections[0].reason.includes('Unknown'),
    'Test 11: Unknown connector_id rejected'
  );

  // TEST 12: Vendor alias resolves to provider-neutral reference connector (not hard dependency)
  const aliased = getExternalSignalConnector('vendor_blue_yonder_ref');
  assert(
    !!aliased && aliased.connector_id === 'conn_planning_ref_01' && aliased.provider_id === 'reference_planning',
    'Test 12: Vendor alias is reference-only and resolves to provider-neutral planning connector'
  );

  // TEST 13: Category → source_type mapping is provider-neutral
  assert(
    mapCategoryToSourceType('COMMERCE') === 'COMMERCE_TELEMETRY' &&
      mapCategoryToSourceType('WEATHER') === 'EXTERNAL_CONNECTOR' &&
      mapCategoryToSourceType('OPERATIONAL_TELEMETRY') === 'FULFILMENT_SYSTEM',
    'Test 13: Category to SignalSourceType mapping is provider-neutral'
  );

  // TEST 14: Contextual categories (weather/events/competitive/demographic) normalise cleanly
  const weatherAdapted = adaptReferenceObservation({
    connector_id: 'conn_weather_ref_01',
    tenant_id: 'tenant_uk_retail_01',
    signal_type: 'WEATHER_TEMPERATURE_ANOMALY',
    entity_type: 'REGION',
    entity_id: 'North West',
    observed_at: '2026-08-15T08:00:00.000Z',
    baseline_value: 18,
    observed_value: 26,
    unit: 'celsius',
    envelope_id: 'env_weather_001'
  });
  const weatherNorm =
    weatherAdapted.ok && weatherAdapted.ok
      ? normaliseEnvelopeToEnterpriseSignal(weatherAdapted.envelope)
      : { ok: false as const, errors: ['adapter failed'] };
  assert(
    weatherNorm.ok === true &&
      weatherNorm.ok &&
      weatherNorm.signal.signal_type === 'WEATHER_TEMPERATURE_ANOMALY' &&
      weatherNorm.signal.source_type === 'EXTERNAL_CONNECTOR',
    'Test 14: Weather contextual signal normalises into canonical EnterpriseSignal'
  );

  // TEST 15: Canonical EnterpriseSignal validation on ingested output
  const sigCheck = validateEnterpriseSignal(ingestResult.signals[0]);
  assert(sigCheck.valid, 'Test 15: Ingested signal satisfies EnterpriseSignal contract', sigCheck.errors.join(', '));

  // TEST 16: ESF-1 snapshot regression
  const snapshot = generateSyntheticSignalSnapshot('promotion_surge', 'tenant_uk_retail_01', 'SCN-PROMO-01');
  assert(
    snapshot.length === 5 && snapshot.every(s => s.source_type === 'SYNTHETIC_WORLD' && s.synthetic_demo === true),
    'Test 16: ESF-1 synthetic snapshot regression clean'
  );

  // TEST 17: ESF-2 simulation regression
  const simReq: SignalSimulationRequest = {
    context: {
      session_id: 'sess_esf3_reg',
      decision_state_id: 'ds_esf3_reg',
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
    }
  };
  const simRes = simulateEnterpriseSignalTimelines(simReq);
  assert(
    simRes.timelines.length === 4 && simRes.timelines[0].observations.length === 12,
    'Test 17: ESF-2 dynamic simulation regression clean'
  );

  // TEST 18: IFI-01 Commercial Intent contract regression
  const intentCheck = validateCommercialIntent({
    commercial_intent_id: 'intent_esf3_reg',
    tenant_id: 'tenant_uk_retail_01',
    session_id: 'sess_esf3_reg',
    category: 'Fresh Dairy',
    sku_scope: ['P004'],
    region: 'North West',
    promotion_type: '20_percent_off',
    discount_depth: 20,
    planned_start: '2026-08-20T00:00:00.000Z',
    planned_end: '2026-08-27T00:00:00.000Z',
    expected_uplift: 25,
    source_system: 'cognix_promotion_planner',
    source_type: 'PROMOTION_PLANNER',
    created_at: '2026-08-15T08:00:00.000Z',
    provenance: { test: 'esf3' },
    synthetic_demo: true,
    schema_version: '1.0'
  });
  assert(intentCheck.valid, 'Test 18: IFI-01 Commercial Intent regression clean');

  // TEST 19: WP10-A scenario regression
  const scenarios = generateCanonicalScenario('promotion_surge', 'tenant_uk_retail_01');
  assert(scenarios.length >= 1, 'Test 19: WP10-A scenario generation regression clean');

  // TEST 20: Credential leakage guard on envelope
  const leaky = validateExternalSignalEnvelope({
    ...validEnvelope,
    provenance: { key: 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P67' }
  });
  assert(
    !leaky.valid && leaky.errors.some(e => e.includes('Security violation')),
    'Test 20: Security guardrail detects credential leak in envelope provenance'
  );

  // TEST 21: Session isolation when the request omits session_id but envelopes carry one.
  // Signals must be stored under their owning session, never in the tenant-wide bucket.
  resetExternalSignalIngestStore();
  const sessionScoped = ingestExternalSignals({
    tenant_id: 'tenant_uk_retail_01',
    envelopes: [{ ...validEnvelope, envelope_id: 'env_sess_a_001', session_id: 'sess_A' }]
  });
  const sessA = listIngestedExternalSignals('tenant_uk_retail_01', 'sess_A');
  const sessB = listIngestedExternalSignals('tenant_uk_retail_01', 'sess_B');
  assert(
    sessionScoped.accepted_count === 1 && sessA.length === 1 && sessB.length === 0,
    'Test 21: Envelope-declared session scopes storage — no cross-session visibility',
    `sess_A=${sessA.length}, sess_B=${sessB.length}`
  );

  // TEST 22: Genuinely session-less signals stay tenant-wide and remain visible to session reads
  resetExternalSignalIngestStore();
  const { session_id: _omitted, ...sessionlessEnvelope } = validEnvelope;
  ingestExternalSignals({
    tenant_id: 'tenant_uk_retail_01',
    envelopes: [{ ...sessionlessEnvelope, envelope_id: 'env_tenant_wide_001' } as ExternalSignalEnvelope]
  });
  assert(
    listIngestedExternalSignals('tenant_uk_retail_01').length === 1 &&
      listIngestedExternalSignals('tenant_uk_retail_01', 'sess_any').length === 1,
    'Test 22: Session-less connector signals remain tenant-wide and readable from any session'
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
