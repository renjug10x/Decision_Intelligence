import { ingestJourneyEvent, queryJourneyEvents, getSessionEvents, clearJourneyEvents } from '../../lib/journey-store';
import { validateJourneyEvent, JourneyEvent } from '../../packages/contracts/src/index';

describe('WP10-B Journey Telemetry Foundation Unit Tests', () => {
  beforeEach(() => {
    clearJourneyEvents();
  });

  test('Valid journey event is accepted and assigned sequence number', () => {
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

    const res = ingestJourneyEvent(validEvent);
    expect(res.success).toBe(true);
    expect(res.event_id).toBe('evt_test_01');

    const sessionEvts = getSessionEvents('ses_unit_test_1');
    expect(sessionEvts.length).toBe(1);
    expect(sessionEvts[0].sequence_number).toBe(1);
  });

  test('Malformed event lacking required fields is rejected', () => {
    const invalidEvent = {
      event_id: 'evt_bad',
      event_type: 'SCENARIO_CHANGED'
    } as any;

    const validation = validateJourneyEvent(invalidEvent);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);

    const res = ingestJourneyEvent(invalidEvent);
    expect(res.success).toBe(false);
    expect(res.errors).toBeDefined();
  });

  test('Security violation: Event with sensitive credential payload is rejected', () => {
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

    const validation = validateJourneyEvent(sensitiveEvent);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Security Violation'))).toBe(true);
  });

  test('Session sequence numbers increment deterministically', () => {
    const sessionId = 'ses_seq_test';

    const evt1: JourneyEvent = {
      event_id: 'evt_1',
      event_type: 'SESSION_STARTED',
      tenant_id: 'tenant_uk_retail_01',
      user_id: 'demo_user',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      schema_version: '1.0'
    };

    const evt2: JourneyEvent = {
      event_id: 'evt_2',
      event_type: 'EXPERIMENT_OPENED',
      tenant_id: 'tenant_uk_retail_01',
      user_id: 'demo_user',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      schema_version: '1.0'
    };

    ingestJourneyEvent(evt1);
    ingestJourneyEvent(evt2);

    const seq = getSessionEvents(sessionId);
    expect(seq.length).toBe(2);
    expect(seq[0].sequence_number).toBe(1);
    expect(seq[1].sequence_number).toBe(2);
    expect(seq[0].event_type).toBe('SESSION_STARTED');
    expect(seq[1].event_type).toBe('EXPERIMENT_OPENED');
  });

  test('Query filtering by tenant_id and event_type', () => {
    ingestJourneyEvent({
      event_id: 'e1',
      event_type: 'DOMAIN_SELECTED',
      tenant_id: 'tenant_A',
      user_id: 'demo_user',
      session_id: 's1',
      timestamp: new Date().toISOString(),
      schema_version: '1.0'
    });

    ingestJourneyEvent({
      event_id: 'e2',
      event_type: 'PERSONA_SELECTED',
      tenant_id: 'tenant_B',
      user_id: 'demo_user',
      session_id: 's2',
      timestamp: new Date().toISOString(),
      schema_version: '1.0'
    });

    const tenantAEvts = queryJourneyEvents({ tenant_id: 'tenant_A' });
    expect(tenantAEvts.length).toBe(1);
    expect(tenantAEvts[0].event_type).toBe('DOMAIN_SELECTED');
  });

  test('Idempotency: Repeated ingestion of same event_id does not duplicate', () => {
    const event: JourneyEvent = {
      event_id: 'evt_repeat_01',
      event_type: 'PORTFOLIO_OPENED',
      tenant_id: 'tenant_uk_retail_01',
      user_id: 'demo_user',
      session_id: 'ses_repeat',
      timestamp: new Date().toISOString(),
      schema_version: '1.0'
    };

    ingestJourneyEvent(event);
    ingestJourneyEvent(event);

    const events = getSessionEvents('ses_repeat');
    expect(events.length).toBe(1);
  });
});
