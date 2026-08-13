/**
 * CogniX Journey Telemetry Client & Session Manager
 * 
 * Centralized, non-blocking telemetry tracking client for browser UI components.
 * Enforces tenant, session, persona, domain, correlation, and schema enrichment.
 */

import { CanonicalEventType, JourneyEvent, TrackEventPayload } from '@/packages/contracts/src/index';

const SESSION_STORAGE_KEY = 'cognix_journey_session_id';
const DEFAULT_TENANT = 'tenant_uk_retail_01';
const DEFAULT_USER = 'demo_user';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ses_ssr_default';
  
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `ses_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function resetSessionId(): string {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
  return getOrCreateSessionId();
}

let activeTenantId = DEFAULT_TENANT;
let activePersonaId = 'exec';
let activeDomainId = 'retail_grocery';

export function updateTelemetryContext(context: { tenant_id?: string; persona_id?: string; domain_id?: string }) {
  if (context.tenant_id) activeTenantId = context.tenant_id;
  if (context.persona_id) activePersonaId = context.persona_id;
  if (context.domain_id) activeDomainId = context.domain_id;
}

export async function trackJourneyEvent(payload: TrackEventPayload): Promise<void> {
  const sessionId = getOrCreateSessionId();
  const eventId = `evt_${Math.random().toString(36).substr(2, 9)}`;

  const fullEvent: JourneyEvent = {
    event_id: eventId,
    event_type: payload.event_type,
    tenant_id: payload.tenant_id || activeTenantId,
    user_id: payload.user_id || DEFAULT_USER,
    persona_id: payload.persona_id || activePersonaId,
    session_id: payload.session_id || sessionId,
    domain_id: payload.domain_id || activeDomainId,
    experiment_id: payload.experiment_id,
    solution_id: payload.solution_id,
    scenario_id: payload.scenario_id,
    decision_id: payload.decision_id,
    timestamp: new Date().toISOString(),
    source: payload.source || 'UI',
    page: payload.page,
    previous_state: payload.previous_state,
    new_state: payload.new_state,
    metadata: payload.metadata,
    correlation_id: payload.correlation_id || `corr_${Math.random().toString(36).substr(2, 9)}`,
    causation_id: payload.causation_id,
    schema_version: '1.0',
    data_classification: 'synthetic_demo',
    synthetic_demo: true
  };

  // Browser Non-Blocking Async Ingestion
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/v1/journey/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fullEvent)
      }).catch(err => {
        console.warn(`[JourneyClient] Telemetry submission failed silently: ${err.message}`);
      });
    } catch (err: any) {
      console.warn(`[JourneyClient] Telemetry submit error: ${err.message}`);
    }
  }
}

// Debounce helper for slider/continuous inputs
const debounceTimers: Record<string, NodeJS.Timeout> = {};

export function debouncedTrackJourneyEvent(key: string, payload: TrackEventPayload, delayMs: number = 500): void {
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }
  debounceTimers[key] = setTimeout(() => {
    trackJourneyEvent(payload);
    delete debounceTimers[key];
  }, delayMs);
}
