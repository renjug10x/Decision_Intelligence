"use strict";
/**
 * CogniX Commercial Intent Domain Model
 * Transport-neutral contracts, taxonomy, and validation helpers for planned business actions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommercialIntent = validateCommercialIntent;
function validateCommercialIntent(intent) {
    const errors = [];
    if (!intent.commercial_intent_id)
        errors.push('Missing required field: commercial_intent_id');
    if (!intent.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!intent.session_id)
        errors.push('Missing required field: session_id');
    if (!intent.category)
        errors.push('Missing required field: category');
    if (!intent.region)
        errors.push('Missing required field: region');
    if (!intent.promotion_type)
        errors.push('Missing required field: promotion_type');
    if (typeof intent.discount_depth !== 'number' || intent.discount_depth < 0) {
        errors.push('discount_depth must be a non-negative number');
    }
    if (!intent.planned_start)
        errors.push('Missing required field: planned_start');
    if (!intent.planned_end)
        errors.push('Missing required field: planned_end');
    if (intent.planned_start && intent.planned_end && new Date(intent.planned_start) > new Date(intent.planned_end)) {
        errors.push('planned_start must precede or equal planned_end');
    }
    // Security Guardrail: credential leakage prevention
    const str = JSON.stringify(intent);
    if (/AIzaSy[A-Za-z0-9_-]{33}/.test(str) || /"password"\s*:\s*"[^"]+"/.test(str)) {
        errors.push('Security violation: CommercialIntent payload contains sensitive credentials');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
