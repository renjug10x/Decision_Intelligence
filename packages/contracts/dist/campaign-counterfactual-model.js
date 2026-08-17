"use strict";
/**
 * CogniX Campaign Decision Intelligence — Counterfactual & Causal Models (CDI-02)
 *
 * Domain separation:
 *   Current Baseline → Expected Without Intervention → Predicted With Intervention
 *
 * Causal demand contributions reconcile to the predicted intervention trajectory.
 * CDI-01 placeholder provenance (`cdi01_placeholder_default`) must never be treated
 * as stated commercial intent or attributed as causal campaign inputs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCounterfactualBaseline = validateCounterfactualBaseline;
exports.validateCausalDemandContribution = validateCausalDemandContribution;
exports.validateCampaignEvaluationRequest = validateCampaignEvaluationRequest;
function validateCounterfactualBaseline(baseline) {
    const errors = [];
    if (!baseline.counterfactual_id)
        errors.push('Missing counterfactual_id');
    if (!baseline.campaign_intent_id)
        errors.push('Missing campaign_intent_id');
    if (!baseline.tenant_id)
        errors.push('Missing tenant_id');
    if (!baseline.session_id)
        errors.push('Missing session_id');
    if (!baseline.current_baseline)
        errors.push('Missing current_baseline');
    if (!baseline.expected_without_intervention)
        errors.push('Missing expected_without_intervention');
    if (!baseline.predicted_with_intervention)
        errors.push('Missing predicted_with_intervention');
    if (!baseline.campaign_delta)
        errors.push('Missing campaign_delta');
    if (typeof baseline.synthetic_demo !== 'boolean')
        errors.push('Missing synthetic_demo');
    // The trajectory must reconcile to the causal decomposition, not merely be labelled by it.
    const { expected_without_intervention: without, predicted_with_intervention: predicted } = baseline;
    if (without && predicted && baseline.campaign_delta) {
        const trajectoryGap = Number((predicted.volume_index_pct - without.volume_index_pct).toFixed(2));
        const claimed = baseline.campaign_delta.attributable_uplift_pp;
        if (typeof claimed !== 'number') {
            errors.push('Missing campaign_delta.attributable_uplift_pp');
        }
        else if (Math.abs(trajectoryGap - claimed) > 0.05) {
            errors.push(`Campaign delta does not reconcile: predicted − without = ${trajectoryGap}pp but ` +
                `attributable_uplift_pp = ${claimed}pp`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateCausalDemandContribution(causal) {
    const errors = [];
    if (!causal.causal_id)
        errors.push('Missing causal_id');
    if (!causal.campaign_intent_id)
        errors.push('Missing campaign_intent_id');
    if (!Array.isArray(causal.drivers) || causal.drivers.length === 0) {
        errors.push('drivers must be a non-empty array');
    }
    if (typeof causal.total_predicted_uplift_pp !== 'number') {
        errors.push('Missing total_predicted_uplift_pp');
    }
    if (typeof causal.reconciliation_ok !== 'boolean') {
        errors.push('Missing reconciliation_ok');
    }
    if (causal.reconciliation_ok === false) {
        errors.push('Causal drivers do not reconcile to total_predicted_uplift_pp');
    }
    if (Array.isArray(causal.drivers)) {
        // An unattributed driver must contribute nothing. Otherwise demand is being applied
        // to the trajectory while being presented to the user as excluded.
        const leaking = causal.drivers.filter(d => !d.attributed && d.contribution_pp !== 0);
        if (leaking.length > 0) {
            errors.push(`Unattributed drivers carry non-zero contribution: ${leaking.map(d => d.driver_id).join(', ')}`);
        }
        const missingClass = causal.drivers.filter(d => d.driver_class !== 'ambient' && d.driver_class !== 'intervention');
        if (missingClass.length > 0) {
            errors.push(`Drivers missing driver_class: ${missingClass.map(d => d.driver_id).join(', ')}`);
        }
        if (typeof causal.ambient_uplift_pp === 'number' &&
            typeof causal.intervention_uplift_pp === 'number' &&
            typeof causal.total_predicted_uplift_pp === 'number') {
            const split = causal.ambient_uplift_pp + causal.intervention_uplift_pp;
            if (Math.abs(split - causal.total_predicted_uplift_pp) > 0.005) {
                errors.push(`ambient_uplift_pp + intervention_uplift_pp (${split.toFixed(2)}) does not equal ` +
                    `total_predicted_uplift_pp (${causal.total_predicted_uplift_pp.toFixed(2)})`);
            }
        }
        else {
            errors.push('Missing ambient_uplift_pp / intervention_uplift_pp split');
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateCampaignEvaluationRequest(request) {
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
