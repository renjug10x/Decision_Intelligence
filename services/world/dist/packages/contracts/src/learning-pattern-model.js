"use strict";
/**
 * CogniX Enterprise Learning Pattern Domain Model
 * Transport-neutral contracts, taxonomy, and validation helpers for generalised organizational learning.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnterpriseLearningPattern = validateEnterpriseLearningPattern;
function validateEnterpriseLearningPattern(pattern) {
    const errors = [];
    if (!pattern.pattern_id)
        errors.push('Missing required field: pattern_id');
    if (!pattern.pattern_name)
        errors.push('Missing required field: pattern_name');
    if (!pattern.pattern_type)
        errors.push('Missing required field: pattern_type');
    if (typeof pattern.situation_similarity !== 'number' || pattern.situation_similarity < 0 || pattern.situation_similarity > 100) {
        errors.push('situation_similarity must be a number between 0 and 100');
    }
    if (typeof pattern.pattern_confidence !== 'number' || pattern.pattern_confidence < 0 || pattern.pattern_confidence > 100) {
        errors.push('pattern_confidence must be a number between 0 and 100');
    }
    if (typeof pattern.intervention_success_rate !== 'number' || pattern.intervention_success_rate < 0 || pattern.intervention_success_rate > 100) {
        errors.push('intervention_success_rate must be a number between 0 and 100');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
