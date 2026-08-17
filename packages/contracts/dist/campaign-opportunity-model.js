"use strict";
/**
 * CogniX Campaign Decision Intelligence — Opportunity Window & Micro-Market Models (CDI-03)
 *
 * Answers: When should we intervene? Where should we intervene?
 * Deterministic, explainable evaluation over Enterprise World / store seed data.
 * Does not invent promotional mechanics from CONSIDER_PROMOTION alone.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOpportunityWindowEvaluation = validateOpportunityWindowEvaluation;
exports.validateMicroMarketOpportunity = validateMicroMarketOpportunity;
exports.validateOpportunityDiscoveryRequest = validateOpportunityDiscoveryRequest;
function validateOpportunityWindowEvaluation(evaluation) {
    const errors = [];
    if (!evaluation.evaluation_id)
        errors.push('Missing evaluation_id');
    if (!evaluation.campaign_intent_id)
        errors.push('Missing campaign_intent_id');
    if (!evaluation.tenant_id)
        errors.push('Missing tenant_id');
    if (!evaluation.session_id)
        errors.push('Missing session_id');
    if (!Array.isArray(evaluation.candidates) || evaluation.candidates.length === 0) {
        errors.push('candidates must be a non-empty array');
    }
    if (!evaluation.recommended_window_id)
        errors.push('Missing recommended_window_id');
    if (typeof evaluation.resolved_temporal_uplift_pp !== 'number') {
        errors.push('Missing resolved_temporal_uplift_pp');
    }
    if (!evaluation.discovery_anchor?.anchor_date || !evaluation.discovery_anchor?.disclosure) {
        errors.push('Missing discovery_anchor disclosure');
    }
    if (typeof evaluation.synthetic_demo !== 'boolean')
        errors.push('Missing synthetic_demo');
    return { valid: errors.length === 0, errors };
}
function validateMicroMarketOpportunity(evaluation) {
    const errors = [];
    if (!evaluation.evaluation_id)
        errors.push('Missing evaluation_id');
    if (!evaluation.campaign_intent_id)
        errors.push('Missing campaign_intent_id');
    if (!evaluation.tenant_id)
        errors.push('Missing tenant_id');
    if (!evaluation.session_id)
        errors.push('Missing session_id');
    if (!Array.isArray(evaluation.stores) || evaluation.stores.length === 0) {
        errors.push('stores must be a non-empty array');
    }
    if (typeof evaluation.synthetic_demo !== 'boolean')
        errors.push('Missing synthetic_demo');
    // Every store must have explainable reasons
    for (const store of evaluation.stores || []) {
        if (!store.store_id)
            errors.push('Store missing store_id');
        if (!Array.isArray(store.inclusion_reasons) && !Array.isArray(store.exclusion_reasons)) {
            errors.push(`Store ${store.store_id} missing explainable reasons`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateOpportunityDiscoveryRequest(request) {
    const errors = [];
    if (!request.tenant_id)
        errors.push('Missing tenant_id');
    if (!request.session_id)
        errors.push('Missing session_id');
    if (!request.campaign_intent_id && !request.campaign_intent) {
        errors.push('Provide campaign_intent_id or campaign_intent');
    }
    return { valid: errors.length === 0, errors };
}
