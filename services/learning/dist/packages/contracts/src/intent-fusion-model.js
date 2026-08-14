"use strict";
/**
 * CogniX Intent Fusion Intelligence Model
 * Transport-neutral contracts for forecast contextualisation and multi-source intent-signal reconciliation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIntentFusionRequest = validateIntentFusionRequest;
function validateIntentFusionRequest(req) {
    const errors = [];
    if (!req.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!req.session_id)
        errors.push('Missing required field: session_id');
    return { valid: errors.length === 0, errors };
}
