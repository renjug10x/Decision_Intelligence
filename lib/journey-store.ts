/**
 * CogniX Journey Telemetry Store (In-Memory Diagnostic Buffer)
 * 
 * Bounded diagnostic store supporting telemetry ingestion, session sequence reconstruction,
 * and event validation for WP10-B.
 */

import { JourneyEvent, validateJourneyEvent } from '@/packages/contracts/src/index';

const MAX_EVENT_BUFFER_SIZE = 1000;
const eventBuffer: JourneyEvent[] = [];
const sessionSequences: Record<string, number> = {};

export function ingestJourneyEvent(event: JourneyEvent): { success: boolean; event_id: string; correlation_id: string; errors?: string[] } {
  // Validate schema & privacy rules
  const validation = validateJourneyEvent(event);
  if (!validation.valid) {
    return {
      success: false,
      event_id: event.event_id || 'invalid',
      correlation_id: event.correlation_id || 'unknown',
      errors: validation.errors
    };
  }

  // Idempotency Check: Don't duplicate exact event_id if already present
  const existing = eventBuffer.find(e => e.event_id === event.event_id);
  if (existing) {
    return {
      success: true,
      event_id: event.event_id,
      correlation_id: event.correlation_id || 'corr_idempotent'
    };
  }

  // Calculate & assign session sequence number
  const currentSeq = (sessionSequences[event.session_id] || 0) + 1;
  sessionSequences[event.session_id] = currentSeq;
  event.sequence_number = event.sequence_number || currentSeq;

  // Add to ring buffer (fifo evictions)
  if (eventBuffer.length >= MAX_EVENT_BUFFER_SIZE) {
    eventBuffer.shift();
  }
  eventBuffer.push(event);

  return {
    success: true,
    event_id: event.event_id,
    correlation_id: event.correlation_id || `corr_${Math.random().toString(36).substr(2, 9)}`
  };
}

export function queryJourneyEvents(filter?: {
  session_id?: string;
  tenant_id?: string;
  event_type?: string;
  limit?: number;
}): JourneyEvent[] {
  let results = [...eventBuffer];

  if (filter?.session_id) {
    results = results.filter(e => e.session_id === filter.session_id);
  }
  if (filter?.tenant_id) {
    results = results.filter(e => e.tenant_id === filter.tenant_id);
  }
  if (filter?.event_type) {
    results = results.filter(e => e.event_type === filter.event_type);
  }

  // Sort descending by timestamp
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const limit = filter?.limit || 50;
  return results.slice(0, limit);
}

export function getSessionEvents(sessionId: string): JourneyEvent[] {
  const sessionEvents = eventBuffer.filter(e => e.session_id === sessionId);
  // Sort ascending by sequence_number
  sessionEvents.sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
  return sessionEvents;
}

export function clearJourneyEvents(): void {
  eventBuffer.length = 0;
  Object.keys(sessionSequences).forEach(key => delete sessionSequences[key]);
}
