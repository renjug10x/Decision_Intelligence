/**
 * CogniX Journey Telemetry Domain Model & Event Catalogue
 * Shared contract for interaction telemetry, session reconstruction, and telemetry validation.
 */

export type CanonicalEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'PORTFOLIO_OPENED'
  | 'QUESTION_EXPLORED'
  | 'EXPERIMENT_OPENED'
  | 'SOLUTION_OPENED'
  | 'DOMAIN_SELECTED'
  | 'PERSONA_SELECTED'
  | 'SCENARIO_CHANGED'
  | 'FORECAST_INSPECTED'
  | 'PATTERN_MATCHED'
  | 'PATTERN_EXPLORED'
  | 'EVIDENCE_INSPECTED'
  | 'RECOMMENDATION_VIEWED'
  | 'RECOMMENDATION_ACCEPTED'
  | 'RECOMMENDATION_REJECTED'
  | 'CONTRACT_CHECK_REQUESTED'
  | 'CONTRACT_CHECK_COMPLETED'
  | 'EXECUTION_BRIEFING_OPENED'
  | 'INTERVENTION_SELECTED'
  | 'SCENARIO_REHEARSED'
  | 'DECISION_EXECUTED'
  | 'OUTCOME_OBSERVED';

export interface JourneyEvent {
  event_id: string;
  event_type: CanonicalEventType;
  tenant_id: string;
  user_id: string;
  persona_id?: string;
  session_id: string;
  domain_id?: string;
  experiment_id?: string;
  solution_id?: string;
  scenario_id?: string;
  decision_id?: string;
  timestamp: string;
  sequence_number?: number;
  source?: string;
  page?: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  metadata?: Record<string, any>;
  correlation_id?: string;
  causation_id?: string;
  schema_version: string;
  data_classification?: string;
  synthetic_demo?: boolean;
}

export interface TrackEventPayload {
  event_type: CanonicalEventType;
  tenant_id?: string;
  user_id?: string;
  persona_id?: string;
  session_id?: string;
  domain_id?: string;
  experiment_id?: string;
  solution_id?: string;
  scenario_id?: string;
  decision_id?: string;
  source?: string;
  page?: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  metadata?: Record<string, any>;
  correlation_id?: string;
  causation_id?: string;
}

export function validateJourneyEvent(event: Partial<JourneyEvent>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.event_id) errors.push('Missing required field: event_id');
  if (!event.event_type) errors.push('Missing required field: event_type');
  if (!event.tenant_id) errors.push('Missing required field: tenant_id');
  if (!event.user_id) errors.push('Missing required field: user_id');
  if (!event.session_id) errors.push('Missing required field: session_id');
  if (!event.timestamp) errors.push('Missing required field: timestamp');
  if (!event.schema_version) errors.push('Missing required field: schema_version');

  // Security & Privacy Check: Ensure no API keys or password credentials leaked into telemetry
  const serialized = JSON.stringify(event);
  if (serialized.includes('AIzaSy') || serialized.toLowerCase().includes('password')) {
    errors.push('Security Violation: Sensitive credentials detected in event payload');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
