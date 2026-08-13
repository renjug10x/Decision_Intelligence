"use strict";
/**
 * CogniX Enterprise Signal Fabric Model
 * Transport-neutral types, signal taxonomy, source classification, and validation helpers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnterpriseSignal = validateEnterpriseSignal;
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
