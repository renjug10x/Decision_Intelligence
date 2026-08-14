"use strict";
/**
 * CogniX Enterprise Memory Domain Model
 * Transport-neutral contracts, types, and validation helpers for specific organizational precedents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnterpriseMemoryCase = validateEnterpriseMemoryCase;
function validateEnterpriseMemoryCase(caseObj) {
    const errors = [];
    if (!caseObj.memory_id)
        errors.push('Missing required field: memory_id');
    if (!caseObj.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!caseObj.situation_summary)
        errors.push('Missing required field: situation_summary');
    if (!caseObj.decision_taken)
        errors.push('Missing required field: decision_taken');
    if (!caseObj.expected_outcome)
        errors.push('Missing required field: expected_outcome');
    if (!caseObj.actual_outcome)
        errors.push('Missing required field: actual_outcome');
    return {
        valid: errors.length === 0,
        errors
    };
}
