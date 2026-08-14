"use strict";
/**
 * CogniX Journey Telemetry Domain Model & Event Catalogue
 * Shared contract for interaction telemetry, session reconstruction, and telemetry validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJourneyEvent = validateJourneyEvent;
function validateJourneyEvent(event) {
    const errors = [];
    if (!event.event_id)
        errors.push('Missing required field: event_id');
    if (!event.event_type)
        errors.push('Missing required field: event_type');
    if (!event.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!event.user_id)
        errors.push('Missing required field: user_id');
    if (!event.session_id)
        errors.push('Missing required field: session_id');
    if (!event.timestamp)
        errors.push('Missing required field: timestamp');
    if (!event.schema_version)
        errors.push('Missing required field: schema_version');
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
