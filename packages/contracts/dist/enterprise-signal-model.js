"use strict";
/**
 * CogniX Enterprise Signal Fabric Model
 * Transport-neutral types, signal taxonomy, source classification, temporal models, and validation helpers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDERED_SIMULATION_PERIODS = void 0;
exports.validateTemporalRange = validateTemporalRange;
exports.validateEnterpriseSignal = validateEnterpriseSignal;
exports.validateSignalSimulationContext = validateSignalSimulationContext;
exports.ORDERED_SIMULATION_PERIODS = [
    'T-90',
    'T-30',
    'T-7',
    'T-5',
    'T-3',
    'T-2',
    'T-1',
    'Today',
    'T+1',
    'T+3',
    'T+7',
    'T+30'
];
function validateTemporalRange(from, to) {
    const fromIndex = exports.ORDERED_SIMULATION_PERIODS.indexOf(from);
    const toIndex = exports.ORDERED_SIMULATION_PERIODS.indexOf(to);
    if (fromIndex === -1)
        return { valid: false, error: `Invalid 'from' period: ${from}` };
    if (toIndex === -1)
        return { valid: false, error: `Invalid 'to' period: ${to}` };
    if (fromIndex > toIndex)
        return { valid: false, error: `Invalid temporal range: 'from' (${from}) must precede or equal 'to' (${to})` };
    return { valid: true };
}
function validateEnterpriseSignal(signal) {
    const errors = [];
    if (!signal.signal_id)
        errors.push('Missing required field: signal_id');
    if (!signal.signal_type)
        errors.push('Missing required field: signal_type');
    if (!signal.category)
        errors.push('Missing required field: category');
    if (!signal.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!signal.entity_type)
        errors.push('Missing required field: entity_type');
    if (!signal.entity_id)
        errors.push('Missing required field: entity_id');
    if (!signal.observed_at)
        errors.push('Missing required field: observed_at');
    if (typeof signal.confidence === 'number' && (signal.confidence < 0 || signal.confidence > 100)) {
        errors.push('confidence must be a number between 0 and 100');
    }
    if (typeof signal.quality === 'number' && (signal.quality < 0 || signal.quality > 100)) {
        errors.push('quality must be a number between 0 and 100');
    }
    // Security guardrail: zero credentials leakage
    const strPayload = JSON.stringify(signal);
    if (/AIzaSy[A-Za-z0-9_-]{33}/.test(strPayload) || /"password"\s*:\s*"[^"]+"/.test(strPayload)) {
        errors.push('Security violation: Signal payload contains credentials or sensitive tokens');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
function validateSignalSimulationContext(context) {
    const errors = [];
    if (!context.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!context.scenario_id)
        errors.push('Missing required field: scenario_id');
    if (!context.session_id)
        errors.push('Missing required field: session_id');
    if (!context.decision_state_id)
        errors.push('Missing required field: decision_state_id');
    if (typeof context.decision_state_version !== 'number')
        errors.push('Missing required field: decision_state_version');
    if (typeof context.promotion_lift !== 'number')
        errors.push('Missing required field: promotion_lift');
    return {
        valid: errors.length === 0,
        errors
    };
}
