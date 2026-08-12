import { ingestJourneyEvent, queryJourneyEvents, getSessionEvents, clearJourneyEvents } from '../../lib/journey-store';
import { validateJourneyEvent, JourneyEvent } from '../../packages/contracts/src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

console.log('=== RUNNING WP10-B JOURNEY TELEMETRY TESTS ===\n');

clearJourneyEvents();

// Test 1: Valid event
const validEvent: JourneyEvent = {
  event_id: 'evt_test_01',
  event_type: 'SESSION_STARTED',
  tenant_id: 'tenant_uk_retail_01',
  user_id: 'demo_user',
  persona_id: 'exec',
  session_id: 'ses_unit_test_1',
  timestamp: new Date().toISOString(),
  schema_version: '1.0',
  synthetic_demo: true
};

const res1 = ingestJourneyEvent(validEvent);
assert(res1.success === true, 'Valid event is accepted');
assert(res1.event_id === 'evt_test_01', 'Event ID returned accurately');

const sessionEvts = getSessionEvents('ses_unit_test_1');
assert(sessionEvts.length === 1, 'Session contains 1 event');
assert(sessionEvts[0].sequence_number === 1, 'Sequence number is 1');

// Test 2: Invalid event
const invalidEvent = {
  event_id: 'evt_bad',
  event_type: 'SCENARIO_CHANGED'
} as any;

const validation = validateJourneyEvent(invalidEvent);
assert(validation.valid === false, 'Invalid event schema rejected');

const res2 = ingestJourneyEvent(invalidEvent);
assert(res2.success === false, 'Ingest returns failure for invalid event');

// Test 3: Security violation
const sensitiveEvent: JourneyEvent = {
  event_id: 'evt_sec_01',
  event_type: 'SCENARIO_CHANGED',
  tenant_id: 'tenant_uk_retail_01',
  user_id: 'demo_user',
  session_id: 'ses_sec',
  timestamp: new Date().toISOString(),
  schema_version: '1.0',
  metadata: { apiKey: 'AIzaSy_Secret_Key_Example' }
};

const validationSec = validateJourneyEvent(sensitiveEvent);
assert(validationSec.valid === false, 'Security violation detected for API key in payload');

// Test 4: Sequence increment
clearJourneyEvents();
const sessionId = 'ses_seq_test';

ingestJourneyEvent({
  event_id: 'evt_1',
  event_type: 'SESSION_STARTED',
  tenant_id: 'tenant_uk_retail_01',
  user_id: 'demo_user',
  session_id: sessionId,
  timestamp: new Date().toISOString(),
  schema_version: '1.0'
});

ingestJourneyEvent({
  event_id: 'evt_2',
  event_type: 'EXPERIMENT_OPENED',
  tenant_id: 'tenant_uk_retail_01',
  user_id: 'demo_user',
  session_id: sessionId,
  timestamp: new Date().toISOString(),
  schema_version: '1.0'
});

const seq = getSessionEvents(sessionId);
assert(seq.length === 2, 'Session sequence holds 2 events');
assert(seq[0].sequence_number === 1, 'Event 1 sequence is 1');
assert(seq[1].sequence_number === 2, 'Event 2 sequence is 2');

// Test 5: Tenant filtering
ingestJourneyEvent({
  event_id: 'e_tenant_A',
  event_type: 'DOMAIN_SELECTED',
  tenant_id: 'tenant_A',
  user_id: 'demo_user',
  session_id: 's_tenant',
  timestamp: new Date().toISOString(),
  schema_version: '1.0'
});

const tenantAEvts = queryJourneyEvents({ tenant_id: 'tenant_A' });
assert(tenantAEvts.length === 1, 'Query filtered correctly by tenant_id');

// Test 6: Idempotency
ingestJourneyEvent({
  event_id: 'evt_repeat_01',
  event_type: 'PORTFOLIO_OPENED',
  tenant_id: 'tenant_uk_retail_01',
  user_id: 'demo_user',
  session_id: 'ses_repeat',
  timestamp: new Date().toISOString(),
  schema_version: '1.0'
});

ingestJourneyEvent({
  event_id: 'evt_repeat_01',
  event_type: 'PORTFOLIO_OPENED',
  tenant_id: 'tenant_uk_retail_01',
  user_id: 'demo_user',
  session_id: 'ses_repeat',
  timestamp: new Date().toISOString(),
  schema_version: '1.0'
});

const repeatEvts = getSessionEvents('ses_repeat');
assert(repeatEvts.length === 1, 'Idempotent ingestion prevents duplicate event_id');

console.log('\n✅ ALL WP10-B JOURNEY TELEMETRY TESTS PASSED SUCCESSFULLY!\n');
