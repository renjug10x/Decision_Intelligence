"use strict";
/**
 * CogniX Campaign Decision Intelligence — Decision Readiness & Resilience (CDI-04)
 *
 * Six-dimension non-compensatory readiness lattice. Aggregation is a floor, never a sum.
 * Thresholds are synthetic demonstration policy and can never fire a veto.
 * Contract frozen in docs/reports/COGNIX_CDI_04_DECISION_READINESS_DESIGN_GATE.md §6.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.READINESS_THRESHOLD_POLICY = exports.READINESS_DIMENSION_ORDER = exports.WP10C_RECOVERY_LEVER_HEADROOM = exports.EVIDENCE_STRENGTH_ORDER = void 0;
exports.getThreshold = getThreshold;
exports.weakestEvidenceStrength = weakestEvidenceStrength;
exports.worseDimensionState = worseDimensionState;
exports.deriveCommercialObjectiveClass = deriveCommercialObjectiveClass;
exports.validateDecisionReadinessAssessment = validateDecisionReadinessAssessment;
exports.validateReadinessEvaluationRequest = validateReadinessEvaluationRequest;
exports.assertNoCompensation = assertNoCompensation;
exports.assertNoThresholdDerivedVeto = assertNoThresholdDerivedVeto;
exports.assertNegativeContributionNeverGo = assertNegativeContributionNeverGo;
exports.assertRecoveryLeverParity = assertRecoveryLeverParity;
const decision_state_model_1 = require("./decision-state-model");
/** Fixed ordering, strongest first. Exported so "weakest strength" is never ambiguous. */
exports.EVIDENCE_STRENGTH_ORDER = [
    'OBSERVED',
    'DERIVED',
    'DERIVED_KNOWN_DISCONTINUITY',
    'DECLARED_INPUT',
    'SEEDED_ASSUMPTION',
    'PROXY',
    'PLACEHOLDER_EXCLUDED',
    'MISSING'
];
/** WP10-C lever headrooms mirrored from decision-state-model.ts calculateDerivedImpacts. */
exports.WP10C_RECOVERY_LEVER_HEADROOM = {
    SLA_FLEX_RULE_4: 1200,
    BUFFER_OPTIMISATION_R002: 500
};
exports.READINESS_DIMENSION_ORDER = [
    'COMMERCIAL',
    'DEMAND',
    'OPERATIONAL',
    'CONTEXT',
    'CUSTOMER',
    'STRATEGIC'
];
/** Centralised synthetic demonstration policy — build-time constant; not caller-configurable. */
exports.READINESS_THRESHOLD_POLICY = {
    policy_id: 'cdi04_threshold_policy_v1',
    policy_version: '1.0.0',
    provenance: 'synthetic_demonstration_policy',
    synthetic_demo: true,
    thresholds: [
        {
            threshold_id: 'TH-C1',
            applies_to: 'COMMERCIAL',
            rule_ids: ['C6'],
            value: 0.2,
            unit: 'unit_contribution_erosion_ratio',
            effect_ceiling: 'WATCH',
            basis: 'Demo convention: value surviving only on volume',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Realised margin history'
        },
        {
            threshold_id: 'TH-C2',
            applies_to: 'COMMERCIAL',
            rule_ids: ['C7'],
            value: 0.25,
            unit: 'target_shortfall_ratio',
            effect_ceiling: 'CONSTRAINED',
            basis: 'Demo convention',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Historical target attainment variance'
        },
        {
            threshold_id: 'TH-D1',
            applies_to: 'DEMAND',
            rule_ids: ['D4'],
            value: 0.25,
            unit: 'residual_share_of_intervention_uplift',
            effect_ceiling: 'CONSTRAINED',
            basis: 'Decomposition self-explanation limit',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Observed residual distribution'
        },
        {
            threshold_id: 'TH-D2',
            applies_to: 'DEMAND',
            rule_ids: ['D5'],
            value: 0.7,
            unit: 'single_driver_share_of_intervention_uplift',
            effect_ceiling: 'WATCH',
            basis: 'Concentration convention',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Driver-share distribution'
        },
        {
            threshold_id: 'TH-O1',
            applies_to: 'OPERATIONAL',
            rule_ids: ['O3'],
            value: 70,
            unit: 'stockout_probability_pct',
            effect_ceiling: 'CONSTRAINED',
            basis: 'Demo constant — demoted from veto by ruling U1',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Real stockout outcomes'
        },
        {
            threshold_id: 'TH-O2',
            applies_to: 'OPERATIONAL',
            rule_ids: ['O3'],
            value: 50,
            unit: 'delivery_risk_pct',
            effect_ceiling: 'CONSTRAINED',
            basis: 'Demo constant — demoted from veto by ruling U1',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Real OTIF breach data'
        },
        {
            threshold_id: 'TH-O3',
            applies_to: 'OPERATIONAL',
            rule_ids: ['O5'],
            value: 0.5,
            unit: 'dc_overtime_hours_over_12h_baseline_ratio',
            effect_ceiling: 'WATCH',
            basis: 'WP10-A baseline convention',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'DC labour actuals'
        },
        {
            threshold_id: 'TH-O4',
            applies_to: 'OPERATIONAL',
            rule_ids: ['O5'],
            value: 3.0,
            unit: 'margin_erosion_pct',
            effect_ceiling: 'WATCH',
            basis: 'Demo constant',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Realised margin erosion'
        },
        {
            threshold_id: 'TH-O5',
            applies_to: 'OPERATIONAL',
            rule_ids: ['O4', 'divergence'],
            value: 5,
            unit: 'pp_lift_divergence',
            effect_ceiling: 'WATCH',
            basis: 'Model-agreement convention',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Model reconciliation history'
        },
        {
            threshold_id: 'TH-U1',
            applies_to: 'CUSTOMER',
            rule_ids: ['U3'],
            value: 0.8,
            unit: 'stores_included_over_evaluated_ratio',
            effect_ceiling: 'WATCH',
            basis: 'CDI-03 residual risk 6',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Estate-targeting norms'
        },
        {
            threshold_id: 'TH-U2',
            applies_to: 'CUSTOMER',
            rule_ids: ['U5'],
            value: 0.3,
            unit: 'availability_exclusion_share',
            effect_ceiling: 'CONSTRAINED',
            basis: 'CDI-03 proxy convention',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Real availability data'
        },
        {
            threshold_id: 'TH-X1',
            applies_to: 'CONTEXT',
            rule_ids: ['X5'],
            value: 2,
            unit: 'concurrent_adverse_contextual_signals',
            effect_ceiling: 'CONSTRAINED',
            basis: 'Demo convention',
            calibration_status: 'UNCALIBRATED_LAB_DEFAULT',
            calibration_target: 'Signal co-occurrence base rates'
        }
    ]
};
function getThreshold(thresholdId) {
    const t = exports.READINESS_THRESHOLD_POLICY.thresholds.find(x => x.threshold_id === thresholdId);
    if (!t)
        throw new Error(`Unknown readiness threshold: ${thresholdId}`);
    return t;
}
function weakestEvidenceStrength(strengths) {
    if (strengths.length === 0)
        return 'MISSING';
    let weakest = strengths[0];
    let weakestIdx = exports.EVIDENCE_STRENGTH_ORDER.indexOf(weakest);
    for (const s of strengths) {
        const idx = exports.EVIDENCE_STRENGTH_ORDER.indexOf(s);
        if (idx > weakestIdx) {
            weakest = s;
            weakestIdx = idx;
        }
    }
    return weakest;
}
const DIMENSION_STATE_RANK = {
    CLEAR: 0,
    WATCH: 1,
    CONSTRAINED: 2,
    BLOCKING: 3,
    INSUFFICIENT_EVIDENCE: 4,
    NOT_EVALUATED: 1 // treated as soft for floor display; caps handle overall
};
function worseDimensionState(a, b) {
    return DIMENSION_STATE_RANK[a] >= DIMENSION_STATE_RANK[b] ? a : b;
}
function deriveCommercialObjectiveClass(intent) {
    const metric = intent.baseline_objective.primary_metric;
    const direction = intent.baseline_objective.target_direction;
    const objective = intent.campaign_intent.objective_type;
    // Metric wins over objective label when they disagree
    if ((metric === 'CONTRIBUTION' || metric === 'REVENUE') &&
        (direction === 'INCREASE' || direction === 'PROTECT')) {
        return 'VALUE_CREATION';
    }
    if (metric === 'WASTE_REDUCTION' || metric === 'AVAILABILITY' || metric === 'VOLUME') {
        return 'VALUE_TRADE';
    }
    if (objective === 'REVENUE_ACCELERATION')
        return 'VALUE_CREATION';
    if (objective === 'INVENTORY_CLEARANCE' ||
        objective === 'MARKET_DEFENSE' ||
        objective === 'LAUNCH') {
        return 'VALUE_TRADE';
    }
    if (objective === 'OTHER')
        return 'UNCLASSIFIED';
    return 'VALUE_TRADE';
}
const READINESS_STATE_ORDER = ['GO', 'CONDITIONAL_GO', 'REVIEW', 'DO_NOT_PROCEED'];
/** Caps lower a ceiling and never raise a state (§3.4). Applied to every branch, not just all-CLEAR. */
function applyCapCeilings(state, caps) {
    let idx = READINESS_STATE_ORDER.indexOf(state);
    for (const cap of caps) {
        if (cap === 'K5' || cap === 'K6')
            idx = Math.max(idx, READINESS_STATE_ORDER.indexOf('REVIEW'));
        else if (['K1', 'K2', 'K3', 'K4', 'K7', 'K8'].includes(cap)) {
            idx = Math.max(idx, READINESS_STATE_ORDER.indexOf('CONDITIONAL_GO'));
        }
    }
    return READINESS_STATE_ORDER[idx];
}
function recomputeFloorState(dimensions, caps, hasDischargeableConstraints, hasUndischargeableConstraints) {
    const states = dimensions.map(d => d.state);
    if (states.includes('BLOCKING'))
        return 'DO_NOT_PROCEED';
    if (states.includes('INSUFFICIENT_EVIDENCE'))
        return 'REVIEW';
    if (states.includes('CONSTRAINED')) {
        if (hasUndischargeableConstraints || !hasDischargeableConstraints)
            return 'REVIEW';
        return applyCapCeilings('CONDITIONAL_GO', caps);
    }
    if (states.includes('WATCH') || states.includes('NOT_EVALUATED')) {
        return applyCapCeilings('CONDITIONAL_GO', caps);
    }
    return applyCapCeilings('GO', caps);
}
function validateDecisionReadinessAssessment(a) {
    const errors = [];
    if (!a.readiness_id)
        errors.push('Missing readiness_id');
    if (!a.campaign_intent_id)
        errors.push('Missing campaign_intent_id');
    if (!a.tenant_id)
        errors.push('Missing tenant_id');
    if (!a.session_id)
        errors.push('Missing session_id');
    if (!a.state)
        errors.push('Missing state');
    if (!Array.isArray(a.dimensions) || a.dimensions.length !== 6) {
        errors.push('dimensions must contain exactly six assessments');
    }
    else {
        const ids = a.dimensions.map(d => d.dimension);
        for (const expected of exports.READINESS_DIMENSION_ORDER) {
            if (!ids.includes(expected))
                errors.push(`Missing dimension ${expected}`);
        }
        if (new Set(ids).size !== 6)
            errors.push('Duplicate dimensions');
    }
    if (!a.threshold_policy || a.threshold_policy.provenance !== 'synthetic_demonstration_policy') {
        errors.push('threshold_policy must be present with synthetic_demonstration_policy provenance');
    }
    for (const t of a.threshold_policy?.thresholds || []) {
        if (t.effect_ceiling !== 'WATCH' && t.effect_ceiling !== 'CONSTRAINED') {
            errors.push(`Threshold ${t.threshold_id} has illegal effect_ceiling`);
        }
        if (!t.calibration_target)
            errors.push(`Threshold ${t.threshold_id} missing calibration_target`);
    }
    if (!a.commercial_tolerance)
        errors.push('Missing commercial_tolerance');
    if (a.commercial_tolerance &&
        a.commercial_tolerance.contribution_delta_gbp < 0 &&
        (a.dimensions?.find(d => d.dimension === 'COMMERCIAL')?.state === 'CLEAR' || a.state === 'GO')) {
        errors.push('Negative contribution cannot yield CLEAR Commercial or GO');
    }
    const blockingDims = (a.dimensions || []).filter(d => d.state === 'BLOCKING');
    for (const d of blockingDims) {
        if (!(a.vetoes || []).some(v => v.dimension === d.dimension)) {
            errors.push(`BLOCKING dimension ${d.dimension} missing matching veto`);
        }
    }
    for (const v of a.vetoes || []) {
        if (!(a.dimensions || []).some(d => d.dimension === v.dimension && d.state === 'BLOCKING')) {
            errors.push(`Veto ${v.veto_id} without BLOCKING dimension ${v.dimension}`);
        }
    }
    if (a.state === 'CONDITIONAL_GO') {
        const constrainedOrWatch = (a.dimensions || []).filter(d => d.state === 'CONSTRAINED' || d.state === 'WATCH');
        for (const d of constrainedOrWatch) {
            if (!(a.conditions || []).some(c => c.dimension === d.dimension && c.discharge_test)) {
                errors.push(`CONDITIONAL_GO missing discharge_test condition for ${d.dimension}`);
            }
        }
    }
    if (a.state === 'GO') {
        if ((a.conditions || []).length > 0)
            errors.push('GO cannot have open conditions');
        if ((a.vetoes || []).length > 0)
            errors.push('GO cannot have vetoes');
        if ((a.state_caps_applied || []).length > 0)
            errors.push('GO cannot have state caps');
        if (a.confidence && a.confidence.band !== 'HIGH' && a.confidence.band !== 'MODERATE') {
            errors.push('GO requires confidence band ≥ MODERATE');
        }
    }
    for (const d of a.dimensions || []) {
        for (const f of d.findings) {
            for (const e of f.evidence) {
                if (e.strength === 'OBSERVED' && e.synthetic_demo) {
                    errors.push(`Evidence ${e.field_path} cannot be OBSERVED with synthetic_demo`);
                }
            }
            if (d.state === 'CLEAR' &&
                f.severity === 'INFO' &&
                f.evidence.some(e => e.strength === 'PLACEHOLDER_EXCLUDED')) {
                errors.push('PLACEHOLDER_EXCLUDED cannot appear on CLEAR INFO findings');
            }
        }
    }
    if (a.operational_feasibility?.structurally_infeasible) {
        if (!(a.vetoes || []).some(v => v.veto_id === 'V4' && v.veto_basis === 'OPERATIONAL_INFEASIBILITY')) {
            errors.push('structurally_infeasible requires V4 OPERATIONAL_INFEASIBILITY veto');
        }
    }
    // Independent floor recompute (approximate — trusts conditions flags from payload structure)
    if (a.dimensions && a.state && a.state_caps_applied) {
        const hasDischarge = (a.conditions || []).some(c => !!c.discharge_test);
        const constrained = a.dimensions.some(d => d.state === 'CONSTRAINED');
        const undischargeable = constrained && !hasDischarge;
        const recomputed = recomputeFloorState(a.dimensions, a.state_caps_applied, hasDischarge, undischargeable);
        // Allow REVIEW vs CONDITIONAL_GO ambiguity only when conditions empty with CONSTRAINED
        if (recomputed === 'DO_NOT_PROCEED' && a.state !== 'DO_NOT_PROCEED') {
            errors.push(`state ${a.state} exceeds floor DO_NOT_PROCEED`);
        }
        if (recomputed === 'GO' && a.state !== 'GO' && a.state === 'DO_NOT_PROCEED') {
            // impossible path
        }
        if (a.state === 'GO' && recomputed !== 'GO') {
            errors.push(`state GO exceeds recomputed floor ${recomputed}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateReadinessEvaluationRequest(r) {
    const errors = [];
    if (!r.tenant_id)
        errors.push('Missing tenant_id');
    if (!r.session_id)
        errors.push('Missing session_id');
    if (!r.campaign_intent_id && !r.campaign_intent) {
        errors.push('Provide campaign_intent_id or campaign_intent');
    }
    if (r.threshold_overrides !== undefined) {
        return {
            valid: false,
            errors: ['R6: threshold policy is a build-time constant and is not caller-configurable'],
            rejection_id: 'R6'
        };
    }
    if (r.economic_tolerance) {
        if (typeof r.economic_tolerance.max_contribution_sacrifice_gbp !== 'number' ||
            r.economic_tolerance.max_contribution_sacrifice_gbp < 0) {
            errors.push('economic_tolerance.max_contribution_sacrifice_gbp must be ≥ 0');
        }
        if (!r.economic_tolerance.rationale || !r.economic_tolerance.declared_by) {
            errors.push('economic_tolerance requires rationale and declared_by');
        }
    }
    return { valid: errors.length === 0, errors };
}
function assertNoCompensation(a) {
    const violations = [];
    const states = a.dimensions.map(d => d.state);
    if (states.includes('BLOCKING') && a.state !== 'DO_NOT_PROCEED') {
        violations.push('BLOCKING present but state is not DO_NOT_PROCEED');
    }
    if (states.includes('CONSTRAINED') && a.state === 'GO') {
        violations.push('CONSTRAINED present but state is GO — compensation leak');
    }
    if (states.includes('WATCH') && a.state === 'GO') {
        violations.push('WATCH present but state is GO — compensation leak');
    }
    if (states.includes('INSUFFICIENT_EVIDENCE') && (a.state === 'GO' || a.state === 'CONDITIONAL_GO')) {
        violations.push('INSUFFICIENT_EVIDENCE cannot yield GO/CONDITIONAL_GO without REVIEW floor');
    }
    // No weighted score field may exist
    const payload = JSON.stringify(a);
    if (/weighted_score|average_readiness|composite_score/i.test(payload)) {
        violations.push('Payload contains weighted/average cross-dimension score fields');
    }
    return { ok: violations.length === 0, violations };
}
function assertNoThresholdDerivedVeto(a) {
    const violations = [];
    for (const t of a.threshold_policy.thresholds) {
        if (t.effect_ceiling !== 'WATCH' && t.effect_ceiling !== 'CONSTRAINED') {
            violations.push(`Threshold ${t.threshold_id} has illegal effect_ceiling ${t.effect_ceiling}`);
        }
    }
    for (const v of a.vetoes) {
        if (/TH-[A-Z0-9]+/.test(v.statement) || /TH-[A-Z0-9]+/.test(v.triggering_field)) {
            // Allow mentioning threshold IDs only in non-veto findings; vetoes must not be threshold-derived
            if (v.veto_basis !== 'CONTRACT_INTEGRITY' &&
                v.veto_basis !== 'STATED_OBJECTIVE_CONTRADICTION' &&
                v.veto_basis !== 'DECLARED_TOLERANCE_EXCEEDED' &&
                v.veto_basis !== 'OPERATIONAL_INFEASIBILITY' &&
                v.veto_basis !== 'NO_ADDRESSABLE_ESTATE') {
                violations.push(`Veto ${v.veto_id} has invalid veto_basis`);
            }
        }
        // Hard rule: veto_basis must be one of the five non-threshold bases
        const allowed = [
            'CONTRACT_INTEGRITY',
            'STATED_OBJECTIVE_CONTRADICTION',
            'DECLARED_TOLERANCE_EXCEEDED',
            'OPERATIONAL_INFEASIBILITY',
            'NO_ADDRESSABLE_ESTATE'
        ];
        if (!allowed.includes(v.veto_basis)) {
            violations.push(`Veto ${v.veto_id} basis ${v.veto_basis} is not a permitted non-threshold basis`);
        }
    }
    return { ok: violations.length === 0, violations };
}
function assertNegativeContributionNeverGo(a) {
    const violations = [];
    if (a.commercial_tolerance.contribution_delta_gbp < 0) {
        const commercial = a.dimensions.find(d => d.dimension === 'COMMERCIAL');
        if (commercial?.state === 'CLEAR') {
            violations.push('Negative contribution yielded CLEAR Commercial');
        }
        if (a.state === 'GO') {
            violations.push('Negative contribution yielded GO');
        }
    }
    return { ok: violations.length === 0, violations };
}
/**
 * Parity guard (design gate §2.5, acceptance criterion 10g).
 *
 * WP10-C's lever headrooms are inline literals inside calculateDerivedImpacts(), not exported
 * constants, so they cannot be compared by reference. Comparing the mirror against a second
 * copy of the same literal would be a tautology that no upstream drift could ever break.
 * Instead this probes calculateDerivedImpacts() behaviourally: it measures the capacity
 * delta each lever actually produces and asserts the mirror equals it. If WP10-C changes a
 * headroom, this fails.
 */
function assertRecoveryLeverParity() {
    const violations = [];
    const params = {
        promotion_lift: 20,
        supplier_capacity_cap: 10,
        forecast_horizon_days: 14,
        promotion_method: '20_percent_off',
        campaign_scope: 'national',
        cannibalisation_factor: 0,
        event_boost: 'none'
    };
    const baseline = (0, decision_state_model_1.calculateDerivedImpacts)(params, []).supplier_capacity_units;
    for (const [leverId, mirrored] of Object.entries(exports.WP10C_RECOVERY_LEVER_HEADROOM)) {
        const actual = (0, decision_state_model_1.calculateDerivedImpacts)(params, [leverId]).supplier_capacity_units - baseline;
        if (actual !== mirrored) {
            violations.push(`${leverId} headroom drift: CDI-04 mirror ${mirrored} vs WP10-C calculateDerivedImpacts ${actual}`);
        }
    }
    return { ok: violations.length === 0, violations };
}
