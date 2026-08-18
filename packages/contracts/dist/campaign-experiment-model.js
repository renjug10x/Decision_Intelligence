"use strict";
/**
 * CogniX Campaign Decision Intelligence — Campaign Decision Experiment Model
 * Transport-neutral contracts, types, comparison models, and execution brief definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_COMPARISON_EXPERIMENTS = exports.MIN_COMPARISON_EXPERIMENTS = void 0;
exports.mapReadinessStateToVerdict = mapReadinessStateToVerdict;
exports.formatContributionGbp = formatContributionGbp;
exports.formatDemandPct = formatDemandPct;
exports.readinessVerdictLabel = readinessVerdictLabel;
exports.validateCampaignDecisionExperiment = validateCampaignDecisionExperiment;
exports.validateExperimentComparison = validateExperimentComparison;
exports.validateExecutionBrief = validateExecutionBrief;
/**
 * CDI-04 reports readiness as GO / CONDITIONAL_GO / REVIEW / DO_NOT_PROCEED. A preserved
 * experiment must carry that verdict as the engine issued it — collapsing REVIEW or
 * DO_NOT_PROCEED into "Ready" would make history claim an operational clearance that was
 * never given. An unassessed decision is recorded as unassessed, not as ready.
 */
function mapReadinessStateToVerdict(state) {
    switch (state) {
        case 'GO':
            return 'READY';
        case 'CONDITIONAL_GO':
            return 'CONDITIONAL';
        case 'REVIEW':
            return 'REVIEW';
        case 'DO_NOT_PROCEED':
            return 'DO_NOT_PROCEED';
        default:
            return 'NOT_ASSESSED';
    }
}
/** Sign belongs outside the currency symbol: a loss reads as -£316, never £-316. */
function formatContributionGbp(gbp) {
    const rounded = Math.round(gbp);
    return `${rounded < 0 ? '-' : '+'}£${Math.abs(rounded).toLocaleString()}`;
}
function formatDemandPct(pct) {
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
function readinessVerdictLabel(verdict) {
    switch (verdict) {
        case 'READY':
            return 'Ready';
        case 'CONDITIONAL':
            return 'Conditional';
        case 'REVIEW':
            return 'Review required';
        case 'DO_NOT_PROCEED':
            return 'Do Not Proceed';
        default:
            return 'Not assessed';
    }
}
/** A comparison weighs a decision against alternatives; below two there is nothing to weigh. */
exports.MIN_COMPARISON_EXPERIMENTS = 2;
/**
 * Above four, a comparison stops being a decision aid and becomes a spreadsheet: the reader
 * can no longer hold the alternatives in mind at once, which is the only thing this surface
 * is for.
 */
exports.MAX_COMPARISON_EXPERIMENTS = 4;
function validateCampaignDecisionExperiment(exp) {
    const errors = [];
    if (!exp.experiment_id)
        errors.push('Missing required field: experiment_id');
    if (!exp.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!exp.session_id)
        errors.push('Missing required field: session_id');
    if (!exp.campaign_intent_id)
        errors.push('Missing required field: campaign_intent_id');
    if (!exp.category)
        errors.push('Missing required field: category');
    if (!exp.region)
        errors.push('Missing required field: region');
    if (!exp.decision_recommendation)
        errors.push('Missing required field: decision_recommendation');
    if (typeof exp.incremental_demand_pct !== 'number')
        errors.push('incremental_demand_pct must be a number');
    if (typeof exp.contribution_impact_gbp !== 'number')
        errors.push('contribution_impact_gbp must be a number');
    // Array fields are checked at write time because every reader joins them. A payload whose
    // sku_scope arrived as a string was accepted and then broke each render that called .join —
    // permanently, since the record is immutable once preserved, so the execution brief for that
    // experiment could never be produced again.
    const arrayFields = [
        ['sku_scope', exp.sku_scope],
        ['major_constraints', exp.major_constraints],
        ['activation_channels', exp.activation_channels]
    ];
    for (const [name, value] of arrayFields) {
        if (value === undefined)
            continue;
        if (!Array.isArray(value)) {
            errors.push(`${name} must be an array of strings when provided`);
            continue;
        }
        if (value.some(entry => typeof entry !== 'string')) {
            errors.push(`${name} must contain only strings`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateExperimentComparison(comp) {
    const errors = [];
    if (!Array.isArray(comp.experiments)) {
        errors.push('Missing experiments array');
    }
    else {
        if (comp.experiments.length < exports.MIN_COMPARISON_EXPERIMENTS) {
            errors.push(`A comparison needs at least ${exports.MIN_COMPARISON_EXPERIMENTS} experiments`);
        }
        if (comp.experiments.length > exports.MAX_COMPARISON_EXPERIMENTS) {
            errors.push(`A comparison holds at most ${exports.MAX_COMPARISON_EXPERIMENTS} experiments`);
        }
    }
    if (!comp.dimensions || !Array.isArray(comp.dimensions)) {
        errors.push('Missing dimensions array');
    }
    else if (Array.isArray(comp.experiments)) {
        // A dimension row that does not carry one value per experiment would render columns
        // against the wrong experiment — a silent misattribution, not a formatting bug.
        const mismatched = comp.dimensions.filter(d => (d.values || []).length !== comp.experiments.length);
        if (mismatched.length > 0) {
            errors.push(`Dimension rows must carry one value per compared experiment: ${mismatched
                .map(d => d.dimension)
                .join(', ')}`);
        }
    }
    if (!comp.synthesis)
        errors.push('Missing synthesis');
    return { valid: errors.length === 0, errors };
}
function validateExecutionBrief(brief) {
    const errors = [];
    if (!brief.brief_id)
        errors.push('Missing brief_id');
    if (!brief.experiment_id)
        errors.push('Missing experiment_id');
    if (!brief.proposal)
        errors.push('Missing proposal');
    if (!brief.rationale)
        errors.push('Missing rationale');
    if (!brief.expected_impact)
        errors.push('Missing expected_impact');
    if (!brief.next_step)
        errors.push('Missing next_step');
    return { valid: errors.length === 0, errors };
}
