"use strict";
/**
 * CogniX CDI-07B — Campaign Pre-Mortem, Prediction vs Reality & Closed Learning Loop
 *
 * Three artefacts, three questions, three lifecycles. None re-decides; none writes to the
 * decision contract. Frozen in docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_DESIGN_GATE.md §§3–11.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_ELIGIBILITY_CONDITION_IDS = exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_DISCLOSURE = exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_NOT_SIGNIFICANCE = exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_CONFIGURABLE = exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_UNCALIBRATED = exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_CALIBRATION = exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_N = exports.METRIC_CORRESPONDENT_SIGNAL_TYPES = exports.COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT = exports.PREDICTION_ENVELOPE_REQUIRED_INPUT = exports.QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT = exports.OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT = exports.PATTERN_PROMOTION_REQUIRED_INPUT = exports.SYNTHETIC_OBSERVATION_DISCLOSURE = exports.PATTERN_TELEMETRY_DISCLOSURE = exports.SINGLE_CASE_DISCLOSURE = exports.NOT_A_DECISION_VERDICT_DISCLOSURE = exports.DERIVED_IMPACT_SCOPE_DISCLOSURE = exports.sha256Hex = exports.canonicalJson = exports.assertTenantSessionCoherent = exports.isObservationIndependentSourceType = exports.OBSERVATION_INDEPENDENT_SOURCE_TYPES = void 0;
exports.assertNoInventedRiskPrecision = assertNoInventedRiskPrecision;
exports.assertNoDurationSemantics = assertNoDurationSemantics;
exports.assertPreMortemProposesNoAlternative = assertPreMortemProposesNoAlternative;
exports.assertErrorOnlyWhenLikeForLike = assertErrorOnlyWhenLikeForLike;
exports.assertNoSuccessFailureVerdict = assertNoSuccessFailureVerdict;
exports.assertObservationAuthorityConjunction = assertObservationAuthorityConjunction;
exports.determineObservationAuthority = determineObservationAuthority;
exports.assertSyntheticNeverPresentedAsReal = assertSyntheticNeverPresentedAsReal;
exports.assertEligibilityIsConjunction = assertEligibilityIsConjunction;
exports.assertNoPatternWrite = assertNoPatternWrite;
exports.assertNoWp10dTelemetryCopied = assertNoWp10dTelemetryCopied;
exports.assertGrainResolves = assertGrainResolves;
exports.requiredGrainDimensions = requiredGrainDimensions;
exports.normalizeGrainToken = normalizeGrainToken;
exports.entityCoversSingleDimension = entityCoversSingleDimension;
exports.observationAuthorityBlocksLikeForLike = observationAuthorityBlocksLikeForLike;
exports.validateCampaignPreMortem = validateCampaignPreMortem;
exports.validatePredictionOutcomeComparison = validatePredictionOutcomeComparison;
exports.validateLearningCandidate = validateLearningCandidate;
exports.validateLearningCase = validateLearningCase;
const campaign_decision_contract_model_1 = require("./campaign-decision-contract-model");
const external_signal_connector_model_1 = require("./external-signal-connector-model");
Object.defineProperty(exports, "OBSERVATION_INDEPENDENT_SOURCE_TYPES", { enumerable: true, get: function () { return external_signal_connector_model_1.OBSERVATION_INDEPENDENT_SOURCE_TYPES; } });
Object.defineProperty(exports, "isObservationIndependentSourceType", { enumerable: true, get: function () { return external_signal_connector_model_1.isObservationIndependentSourceType; } });
var campaign_decision_contract_model_2 = require("./campaign-decision-contract-model");
Object.defineProperty(exports, "assertTenantSessionCoherent", { enumerable: true, get: function () { return campaign_decision_contract_model_2.assertTenantSessionCoherent; } });
Object.defineProperty(exports, "canonicalJson", { enumerable: true, get: function () { return campaign_decision_contract_model_2.canonicalJson; } });
Object.defineProperty(exports, "sha256Hex", { enumerable: true, get: function () { return campaign_decision_contract_model_2.sha256Hex; } });
// ---------------------------------------------------------------------------
// Constants — disclosures and capability declarations
// ---------------------------------------------------------------------------
/** §3.4 — mandatory on every derived-impact failure mode and once on the pre-mortem. */
exports.DERIVED_IMPACT_SCOPE_DISCLOSURE = 'This failure mode is grounded in the Shared Decision State scenario parameters, which are not the ' +
    'parameters this decision was contracted on. It indicates a condition in the surrounding scenario, ' +
    'not a recomputation of the contracted play\'s economics.';
/** §5.6 — mandatory wherever a comparison or prediction error is shown. */
exports.NOT_A_DECISION_VERDICT_DISCLOSURE = 'This compares what was predicted against what was observed. It is evidence about the prediction, ' +
    'not a judgement of the decision. A decision made on the best declared evidence available can still ' +
    'be followed by an outcome the model did not anticipate.';
/** §6.4 — mandatory on every LearningCase. */
exports.SINGLE_CASE_DISCLOSURE = 'This is one observed case at one grain, under one set of declared constraints. It is evidence that ' +
    'this happened once. It is not evidence of a rate, a general effect, or what will happen next time.';
/** §7.2 — mandatory on every LearningPatternReference. */
exports.PATTERN_TELEMETRY_DISCLOSURE = 'This pattern\'s occurrence, similarity, confidence and success-rate figures are uncalibrated ' +
    'demonstration telemetry published by the learning service. They did not contribute to this case\'s ' +
    'eligibility and are shown as context only.';
/** §4.4 — mandatory when synthetic_demo is true on an observation. */
exports.SYNTHETIC_OBSERVATION_DISCLOSURE = 'This observation comes from a reference connector that emits demonstration data. It is not a ' +
    'real-world outcome and must not be read, cited or exported as one.';
/** Derived from mapCategoryToSourceType — re-exported from external-signal-connector-model (§8.3 / X1). */
// OBSERVATION_INDEPENDENT_SOURCE_TYPES + isObservationIndependentSourceType imported & re-exported above.
exports.PATTERN_PROMOTION_REQUIRED_INPUT = {
    field: 'independent_eligible_learning_case_series',
    grain: 'per situation signature, at least N independent eligible LearningCases from distinct decisions, ' +
        'distinct contracted windows and distinct authoritative observations, plus a WP10-D pattern write ' +
        'path carrying a calibration status for every published telemetry metric',
    why_required: 'a pattern asserts that something generalises. WP10-D exposes no pattern write path, and its ' +
        'seeded telemetry already claims occurrence counts its own supporting_memory_ids do not support, ' +
        'so promoting a single case would both fabricate a rate and write into a shape with nowhere to ' +
        'record how that rate was derived',
    inadmissible_substitutes: [
        'one eligible LearningCase promoted directly to a pattern',
        'repeated observations of the same decision counted as independent occurrences',
        'an LLM or embedding similarity judgement that two situations are the same signature',
        'reusing an existing pattern_confidence as though it were calibrated',
        'an intervention_success_rate computed from a single case',
        'synthetic demonstration observations counted toward N'
    ],
    enables: 'LEARNING_PATTERN_PROMOTION',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
exports.OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT = {
    field: 'observed_counterfactual_series',
    grain: 'per contracted decision grain, a control or holdout cohort observed over the same window on the ' +
        'same basis, declared before execution',
    why_required: 'the contracted headline prediction is attributable — counterfactual-differenced, excluding ' +
        'ambient drivers — while every available observation is gross. Differencing them would charge ' +
        'the campaign with ambient movement it never claimed to cause',
    inadmissible_substitutes: [
        'the gross observed delta treated as attributable',
        'subtracting a modelled ambient subtotal from a gross observation',
        'a prior period used as a counterfactual without a declared design',
        'apportioning a broader-grain observation onto the decision grain'
    ],
    enables: 'OBSERVED_COUNTERFACTUAL_COMPARISON',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
/** §9 — QUANTITATIVE_DECISION_HALF_LIFE remains AWAITING at this work package. */
exports.QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT = {
    field: 'observed_decision_validity_outcome_series',
    grain: 'per resolved decision, per assumption, with the observed instant at which the assumption ceased to hold',
    why_required: 'CDI-07B observes outcomes, not assumptions ceasing to hold, and every observation this estate can ' +
        'currently supply is synthetic demonstration data. A duration, decay rate or expiry claim would be ' +
        'a lab constant presented as a measurement',
    inadmissible_substitutes: [
        'a fixed default such as 36 hours',
        'an exponential or linear decay curve fitted to no observations',
        'campaign duration, forecast horizon, or planned_end minus the reference instant',
        'signal confidence or quality read as a validity percentage',
        'CDI-04 confidence band converted to a remaining-time estimate',
        'the count of fired triggers scaled into a duration',
        'outcome prediction error interpreted as assumption decay'
    ],
    enables: 'QUANTITATIVE_DECISION_HALF_LIFE',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
exports.PREDICTION_ENVELOPE_REQUIRED_INPUT = {
    field: 'server_side_contract_registration_receipt',
    grain: 'per contract, an instant the caller does not author, comparable against a server-side observation ingestion receipt',
    why_required: 'digest immutability proves the envelope was not edited; it does not prove it was declared before the outcome. created_as_of is caller-supplied (C-INV-9) and cannot serve.',
    inadmissible_substitutes: [
        'the observed value itself, or any envelope fitted to the series it adjudicates',
        'a CDI-05 TimelineConfidenceEnvelope band',
        'a CDI-04 ConfidenceBand converted to a percentage',
        'a symmetric ±X% lab default',
        'created_as_of, or any caller-supplied instant, read as pre-declaration',
        'contract_digest verification read as proof of temporal precedence'
    ],
    enables: 'PRE_DECLARATION_WITNESSED_ENVELOPE',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
exports.COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT = {
    field: 'composite_grain_observation',
    grain: 'one observation whose declared grain key equals the contracted required dimension set',
    why_required: 'a contracted composite grain requires an observation whose explicit composite key matches the required dimension set exactly. Marginal observations cannot be combined without ungrounded apportionment.',
    inadmissible_substitutes: [
        'a jointly-covering set of marginal observations combined into a joint cell',
        'a broader-grain observation narrowed to the contracted grain',
        'a single SKU treated as resolving a multi-SKU sku_scope',
        'any proportional, independence or share-based allocation across dimensions'
    ],
    enables: 'OBSERVED_COUNTERFACTUAL_COMPARISON',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
exports.METRIC_CORRESPONDENT_SIGNAL_TYPES = {
    VOLUME: ['ORDER_VELOCITY_ACCELERATION', 'CATEGORY_DEMAND_ACCELERATION'],
    REVENUE: [],
    CONTRIBUTION: [],
    WASTE_REDUCTION: [],
    AVAILABILITY: []
};
/** Owner ruling X3 — frozen contract semantic is N > 1; initial policy value is 3. */
exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_N = 3;
exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_CALIBRATION = 'UNCALIBRATED_LAB_DEFAULT';
/** Owner ruling X3 — three mandatory labels published alongside N. */
exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_UNCALIBRATED = 'UNCALIBRATED — not fitted to any observed outcome series.';
exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_CONFIGURABLE = 'CONFIGURABLE FUTURE POLICY — a governance setting, not a contract semantic.';
exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_LABEL_NOT_SIGNIFICANCE = 'NOT STATISTICAL SIGNIFICANCE — it is not a power calculation, a confidence level or a sample-size ' +
    'rule, and it must never be described, rendered or documented as one.';
exports.LEARNING_PATTERN_PROMOTION_THRESHOLD_DISCLOSURE = 'Three eligible cases is an uncalibrated demonstration policy threshold, configurable in future ' +
    'governance. It is not a statistical significance test and does not establish that a pattern ' +
    'generalises.';
exports.LEARNING_ELIGIBILITY_CONDITION_IDS = [
    'LE-1',
    'LE-2',
    'LE-3',
    'LE-4',
    'LE-5',
    'LE-6',
    'LE-7',
    'LE-8'
];
// ---------------------------------------------------------------------------
// Prohibited vocabulary (gate §3.3, §9.4)
// ---------------------------------------------------------------------------
const INVENTED_RISK_PRECISION_KEY_RE = /likelihood|probability|p_fail|impact_score|severity_score|risk_score|risk_rating|expected_loss|confidence_pct|criticality|priority_value/i;
const INVENTED_RISK_PRECISION_VALUE_RE = /likelihood|probability|p_fail|impact_score|severity_score|risk_score|risk_rating|expected_loss|confidence_pct|criticality|priority_value/i;
/** CDI-07B §9.4 additions beyond CDI-07A §5.7 — accuracy / verdict vocabulary. */
const CDI07B_PROHIBITED_KEY_RE = /accuracy_pct|error_pct|hit_rate|success_rate|mape|grade|scorecard/i;
const CDI07B_PROHIBITED_VALUE_RE = /accuracy_pct|error_pct|hit_rate|success_rate|mape|grade|scorecard/i;
const SUCCESS_FAILURE_KEY_RE = /\bsuccess\b|\bfailure\b/i;
const SUCCESS_FAILURE_VALUE_RE = /\b(success|failure|accurate|inaccurate)\b/i;
const ALTERNATIVE_PROPOSAL_KEY_RE = /selected_play|alternative_play|recommended_play|suggested_play|better_play|next_play|different_depth|different_window|change_contract|edit_contract|withdraw_contract|supersede_contract/i;
const WP10D_TELEMETRY_KEY_RE = /pattern_confidence|situation_similarity|historical_occurrences|intervention_success_rate/i;
const PATTERN_WRITE_KEY_RE = /create_pattern|write_pattern|register_pattern|mint_pattern|new_pattern|promote_to_pattern/i;
// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------
function isLearningRequiredAuthoritativeInput(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        obj.status === 'AWAITING_AUTHORITATIVE_SOURCE' &&
        typeof obj.enables === 'string');
}
function collectKeys(obj, out = []) {
    if (isLearningRequiredAuthoritativeInput(obj))
        return out;
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            for (const item of obj)
                collectKeys(item, out);
        }
        else {
            for (const [k, v] of Object.entries(obj)) {
                out.push(k);
                collectKeys(v, out);
            }
        }
    }
    return out;
}
function collectStringValues(obj, out = []) {
    if (isLearningRequiredAuthoritativeInput(obj))
        return out;
    if (typeof obj === 'string') {
        out.push(obj);
        return out;
    }
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            for (const item of obj)
                collectStringValues(item, out);
        }
        else {
            for (const v of Object.values(obj)) {
                collectStringValues(v, out);
            }
        }
    }
    return out;
}
// ---------------------------------------------------------------------------
// Assert helpers
// ---------------------------------------------------------------------------
/** §3.3 — KEY and VALUE scan for invented risk precision. */
function assertNoInventedRiskPrecision(payload) {
    const keys = collectKeys(payload);
    if (keys.some(k => INVENTED_RISK_PRECISION_KEY_RE.test(k)))
        return false;
    const values = collectStringValues(payload);
    if (values.some(v => INVENTED_RISK_PRECISION_VALUE_RE.test(v)))
        return false;
    return true;
}
/**
 * §9.4 — wraps CDI-07A assertNoDurationSemantics and extends with CDI-07B prohibited vocabulary.
 * Re-exported from campaign-decision-contract-model via a local wrapper so validators inherit
 * CDI-07A duration scans unchanged.
 */
function assertNoDurationSemantics(payload) {
    if (!(0, campaign_decision_contract_model_1.assertNoDurationSemantics)(payload))
        return false;
    const keys = collectKeys(payload);
    if (keys.some(k => CDI07B_PROHIBITED_KEY_RE.test(k)))
        return false;
    if (keys.some(k => INVENTED_RISK_PRECISION_KEY_RE.test(k)))
        return false;
    const values = collectStringValues(payload);
    if (values.some(v => CDI07B_PROHIBITED_VALUE_RE.test(v)))
        return false;
    if (values.some(v => INVENTED_RISK_PRECISION_VALUE_RE.test(v)))
        return false;
    return true;
}
/** §3.6 / AC-P8 — resilience never proposes an alternative play or contract change. */
function assertPreMortemProposesNoAlternative(payload) {
    return !collectKeys(payload).some(k => ALTERNATIVE_PROPOSAL_KEY_RE.test(k));
}
/** L-INV-5 / RJ-R3 — PredictionError only on LIKE_FOR_LIKE comparisons. */
function assertErrorOnlyWhenLikeForLike(comparisons) {
    for (const c of comparisons) {
        if (c.comparability === 'LIKE_FOR_LIKE') {
            if (!c.error)
                return false;
        }
        else if (c.error !== undefined) {
            return false;
        }
    }
    return true;
}
/** §5.5 / RJ-R4 — SUCCESS and FAILURE are refused as vocabulary. */
function assertNoSuccessFailureVerdict(payload) {
    const keys = collectKeys(payload);
    if (keys.some(k => SUCCESS_FAILURE_KEY_RE.test(k)))
        return false;
    const values = collectStringValues(payload);
    if (values.some(v => SUCCESS_FAILURE_VALUE_RE.test(v)))
        return false;
    return true;
}
/**
 * §4.3 — seven-condition conjunction for AUTHORITATIVE_EXTERNAL.
 *
 * 1. synthetic_demo === false on the signal AND on the originating connector descriptor
 * 2. source_type ∈ OBSERVATION_INDEPENDENT_SOURCE_TYPES
 * 3. connector_id resolves in the ESF-3 registry with status AVAILABLE
 * 4. provenance.envelope_id and provenance.connector_id both present
 * 5. observed_at parses and is not before contracted planned_start
 * 6. metrics_supplied === true
 * 7. entity resolves to the decision grain (assertGrainResolves)
 *
 * Failing 1 → SYNTHETIC_DEMONSTRATION.
 * Failing 2 with scenario-derived lineage → SCENARIO_DERIVED.
 * Failing 3 or 4 → UNATTRIBUTED.
 * Failing 5, 6 or 7 leaves authority class intact but blocks LIKE_FOR_LIKE.
 */
function assertObservationAuthorityConjunction(observation, context) {
    const expected = determineObservationAuthority(observation, context);
    return observation.authority === expected;
}
function determineObservationAuthority(observation, context) {
    // RB-3 — X1 requires the synthetic test to be evaluated first and independently, over every
    // synthetic flag on the chain. A provenance-only synthetic marker previously survived it.
    if (observation.synthetic_demo ||
        observation.provenance.synthetic_demo ||
        context.connector_synthetic_demo) {
        return 'SYNTHETIC_DEMONSTRATION';
    }
    if (context.scenario_derived_lineage ||
        observation.provenance.origin === 'ESF-1_SIMULATION' ||
        observation.provenance.origin === 'WP10-C_SCENARIO' ||
        !(0, external_signal_connector_model_1.isObservationIndependentSourceType)(observation.source_type)) {
        return 'SCENARIO_DERIVED';
    }
    if (!context.connector_resolves ||
        context.connector_status !== 'AVAILABLE' ||
        !observation.provenance.envelope_id ||
        !observation.provenance.connector_id) {
        return 'UNATTRIBUTED';
    }
    return 'AUTHORITATIVE_EXTERNAL';
}
/** L-INV-3 — synthetic observations must carry disclosure and never AUTHORITATIVE_EXTERNAL. */
function assertSyntheticNeverPresentedAsReal(observation) {
    if (!observation.synthetic_demo && !observation.provenance.synthetic_demo)
        return true;
    if (observation.authority === 'AUTHORITATIVE_EXTERNAL')
        return false;
    if (observation.provenance.synthetic_disclosure !== exports.SYNTHETIC_OBSERVATION_DISCLOSURE) {
        return false;
    }
    return true;
}
/** §6.3 — eligible is the conjunction of all eight LE-* conditions; never a score. */
function assertEligibilityIsConjunction(eligibility) {
    if (eligibility.determined_by !== 'deterministic_conjunction')
        return false;
    if (eligibility.conditions.length !== exports.LEARNING_ELIGIBILITY_CONDITION_IDS.length)
        return false;
    const ids = eligibility.conditions.map(c => c.condition_id).sort();
    const expected = [...exports.LEARNING_ELIGIBILITY_CONDITION_IDS].sort();
    if (ids.some((id, i) => id !== expected[i]))
        return false;
    const allMet = eligibility.conditions.every(c => c.met);
    if (eligibility.eligible !== allMet)
        return false;
    for (const c of eligibility.conditions) {
        if (!c.met && (!c.unmet_reason || c.unmet_reason.trim().length === 0))
            return false;
    }
    return true;
}
/** RJ-L2 / L-INV-10 — no pattern write vocabulary on CDI-07B artefacts. */
function assertNoPatternWrite(payload) {
    return !collectKeys(payload).some(k => PATTERN_WRITE_KEY_RE.test(k));
}
/** L-INV-9 / B8 — WP10-D telemetry must not be copied onto CDI-07B artefacts. */
function assertNoWp10dTelemetryCopied(payload) {
    return !collectKeys(payload).some(k => WP10D_TELEMETRY_KEY_RE.test(k));
}
/**
 * §5.4.1 / CDI-08 Z4 — deterministic fail-closed grain resolution.
 * An observation resolves only when:
 * 1. Single dimension (no grain_key): entity_type/entity_id covers exactly the single required dimension.
 * 2. Composite grain (grain_key): exact set equality on dimensions + exact token identity on all dimensions.
 */
function assertGrainResolves(observation, comparison_invariants) {
    const required = requiredGrainDimensions(comparison_invariants);
    if (required.length === 0)
        return false;
    if (!observation.grain_key) {
        if (required.length !== 1)
            return false;
        return entityCoversSingleDimension(observation, required[0], comparison_invariants);
    }
    // Composite key present:
    const obsDims = observation.grain_key.dimensions;
    if (!obsDims || !Array.isArray(obsDims) || obsDims.length === 0)
        return false;
    // Set equality on dimensions:
    const obsDimNames = obsDims.map(d => d.dimension);
    if (obsDimNames.length !== required.length)
        return false;
    const reqSet = new Set(required);
    if (obsDimNames.some(d => !reqSet.has(d)))
        return false;
    const obsSet = new Set(obsDimNames);
    if (required.some(d => !obsSet.has(d)))
        return false;
    // Exact token identity for each dimension:
    for (const entry of obsDims) {
        switch (entry.dimension) {
            case 'category':
                if (!comparison_invariants.category?.trim() ||
                    normalizeGrainToken(entry.token) !== normalizeGrainToken(comparison_invariants.category)) {
                    return false;
                }
                break;
            case 'region':
                if (!comparison_invariants.region?.trim() ||
                    normalizeGrainToken(entry.token) !== normalizeGrainToken(comparison_invariants.region)) {
                    return false;
                }
                break;
            case 'sku': {
                const skuScope = comparison_invariants.sku_scope || [];
                if (skuScope.length === 0)
                    return false;
                const expectedSkuToken = skuScope
                    .map(normalizeGrainToken)
                    .sort()
                    .join('|');
                const obsSkuTokens = entry.token
                    .split(/[|,\s]+/)
                    .filter(Boolean)
                    .map(normalizeGrainToken)
                    .sort()
                    .join('|');
                if (obsSkuTokens !== expectedSkuToken) {
                    return false;
                }
                break;
            }
            case 'customer_segment':
                if (!comparison_invariants.customer_segment?.trim() ||
                    normalizeGrainToken(entry.token) !==
                        normalizeGrainToken(comparison_invariants.customer_segment)) {
                    return false;
                }
                break;
            default:
                return false;
        }
    }
    return true;
}
function requiredGrainDimensions(invariants) {
    const dims = [];
    if (invariants.category?.trim())
        dims.push('category');
    if (invariants.region?.trim())
        dims.push('region');
    if (invariants.sku_scope?.length)
        dims.push('sku');
    if (invariants.customer_segment?.trim())
        dims.push('customer_segment');
    return dims;
}
function normalizeGrainToken(value) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}
function entityCoversSingleDimension(observation, dimension, invariants) {
    // RB-4 — exact token identity only. Substring containment admitted BROADER entities
    // ("Fresh Dairy and Frozen", "National Fresh Dairy") as resolving a narrower contracted
    // grain, which is apportionment of a broader observation by another name.
    switch (dimension) {
        case 'category':
            return (observation.entity_type === 'CATEGORY' &&
                normalizeGrainToken(observation.entity_id) === normalizeGrainToken(invariants.category));
        case 'region':
            return (observation.entity_type === 'REGION' &&
                normalizeGrainToken(observation.entity_id) === normalizeGrainToken(invariants.region));
        case 'sku': {
            // In single dimension single-entity mode:
            if (invariants.sku_scope.length !== 1)
                return false;
            return (observation.entity_type === 'SKU' &&
                normalizeGrainToken(invariants.sku_scope[0]) === normalizeGrainToken(observation.entity_id));
        }
        case 'customer_segment':
            return false;
        default:
            return false;
    }
}
function observationAuthorityBlocksLikeForLike(observation, context) {
    if (determineObservationAuthority(observation, context) !== 'AUTHORITATIVE_EXTERNAL') {
        return true;
    }
    if (context.planned_start) {
        const observedAt = Date.parse(observation.observed_at);
        const start = Date.parse(context.planned_start);
        if (Number.isNaN(observedAt) || Number.isNaN(start) || observedAt < start)
            return true;
    }
    if (!observation.provenance.metrics_supplied)
        return true;
    if (!assertGrainResolves(observation, context.comparison_invariants))
        return true;
    return false;
}
// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------
function validateCampaignPreMortem(p) {
    const errors = [];
    if (!p.pre_mortem_id)
        errors.push('pre_mortem_id is required');
    if (!p.tenant_id)
        errors.push('tenant_id is required');
    if (!p.session_id)
        errors.push('session_id is required');
    if (!p.contract_id)
        errors.push('contract_id is required');
    if (!p.contract_digest)
        errors.push('contract_digest is required');
    if (!p.decision_basis_digest)
        errors.push('decision_basis_digest is required');
    if (p.calculation_mode !== 'deterministic_pre_mortem') {
        errors.push('calculation_mode must be deterministic_pre_mortem');
    }
    if (!(0, campaign_decision_contract_model_1.assertTenantSessionCoherent)(p)) {
        errors.push('tenant_id and session_id must be coherent');
    }
    if (!assertNoInventedRiskPrecision(p)) {
        errors.push('invented risk precision vocabulary present (RJ-P5)');
    }
    if (!assertNoDurationSemantics(p)) {
        errors.push('duration / prohibited vocabulary present (RJ-L3)');
    }
    if (!assertPreMortemProposesNoAlternative(p)) {
        errors.push('pre-mortem proposes an alternative or contract change (RJ-P8)');
    }
    if (!assertNoPatternWrite(p)) {
        errors.push('pattern write vocabulary present (RJ-L2)');
    }
    if (!assertNoWp10dTelemetryCopied(p)) {
        errors.push('WP10-D telemetry copied onto pre-mortem (L-INV-9)');
    }
    const hasDerivedImpact = p.failure_modes.some(f => f.derived_impact_ref !== undefined);
    if (hasDerivedImpact) {
        if (p.derived_impact_scope_disclosure !== exports.DERIVED_IMPACT_SCOPE_DISCLOSURE) {
            errors.push('derived_impact_scope_disclosure must match DERIVED_IMPACT_SCOPE_DISCLOSURE verbatim');
        }
    }
    for (const mode of p.failure_modes) {
        if ((mode.consequence_order === 'SECOND_ORDER' || mode.consequence_order === 'THIRD_ORDER') &&
            !mode.follows_from_failure_mode_id) {
            errors.push(`failure mode ${mode.failure_mode_id}: RJ-P4 — missing follows_from_failure_mode_id`);
        }
        if (mode.derived_impact_ref) {
            if (mode.grounding !== 'STRUCTURAL') {
                errors.push(`failure mode ${mode.failure_mode_id}: derived impact must be STRUCTURAL`);
            }
            if (mode.derived_impact_ref.scope_disclosure !== exports.DERIVED_IMPACT_SCOPE_DISCLOSURE) {
                errors.push(`failure mode ${mode.failure_mode_id}: scope_disclosure must be verbatim §3.4`);
            }
        }
    }
    const resilienceByMode = new Map();
    for (const r of p.resilience) {
        const list = resilienceByMode.get(r.failure_mode_id) ?? [];
        list.push(r);
        resilienceByMode.set(r.failure_mode_id, list);
    }
    for (const mode of p.failure_modes) {
        const rows = resilienceByMode.get(mode.failure_mode_id) ?? [];
        if (rows.length === 0) {
            errors.push(`failure mode ${mode.failure_mode_id}: missing resilience row with no_known_mitigation`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function validatePredictionOutcomeComparison(c) {
    const errors = [];
    if (!c.comparison_id)
        errors.push('comparison_id is required');
    if (!c.tenant_id)
        errors.push('tenant_id is required');
    if (!c.session_id)
        errors.push('session_id is required');
    if (!c.contract_id)
        errors.push('contract_id is required');
    if (!c.contract_digest)
        errors.push('contract_digest is required');
    if (!c.as_of)
        errors.push('as_of is required (RJ-R1)');
    if (c.calculation_mode !== 'deterministic_prediction_comparison') {
        errors.push('calculation_mode must be deterministic_prediction_comparison');
    }
    if (c.not_a_decision_verdict_disclosure !== exports.NOT_A_DECISION_VERDICT_DISCLOSURE) {
        errors.push('not_a_decision_verdict_disclosure must match NOT_A_DECISION_VERDICT_DISCLOSURE verbatim');
    }
    if (!(0, campaign_decision_contract_model_1.assertTenantSessionCoherent)(c, ...c.observations)) {
        errors.push('tenant/session incoherent across comparison and observations');
    }
    if (!assertNoDurationSemantics(c)) {
        errors.push('duration / prohibited vocabulary present (RJ-L3)');
    }
    if (!assertNoSuccessFailureVerdict(c)) {
        errors.push('SUCCESS / FAILURE vocabulary present (RJ-R4)');
    }
    if (!assertNoPatternWrite(c)) {
        errors.push('pattern write vocabulary present (RJ-L2)');
    }
    if (!assertNoWp10dTelemetryCopied(c)) {
        errors.push('WP10-D telemetry copied onto comparison (L-INV-9)');
    }
    if (!assertErrorOnlyWhenLikeForLike(c.comparisons)) {
        errors.push('PredictionError present on non-LIKE_FOR_LIKE comparison (RJ-R3)');
    }
    const hasSynthetic = c.observations.some(o => o.synthetic_demo || o.provenance.synthetic_demo);
    if (hasSynthetic && c.synthetic_disclosure !== exports.SYNTHETIC_OBSERVATION_DISCLOSURE) {
        errors.push('synthetic_disclosure required when any observation is synthetic');
    }
    for (const o of c.observations) {
        if (!assertSyntheticNeverPresentedAsReal(o)) {
            errors.push(`observation ${o.observation_id}: synthetic presented as real (L-INV-3)`);
        }
    }
    // Required-input publication is keyed on `field`, not `enables`. `enables` is a
    // LearningCapability and is not unique across declarations —
    // COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT and OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT both
    // enable OBSERVED_COUNTERFACTUAL_COMPARISON, so keying on it lets either satisfy the other's
    // check and opens a fail-closed validator. `field` is the declaration's identity.
    const publishedFields = new Set((c.unavailable_capabilities ?? []).map(u => u.field));
    if (!publishedFields.has(exports.OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT.field)) {
        errors.push('OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT must be published on every comparison');
    }
    if (!publishedFields.has(exports.PREDICTION_ENVELOPE_REQUIRED_INPUT.field)) {
        errors.push('PREDICTION_ENVELOPE_REQUIRED_INPUT must be published on every comparison');
    }
    if (!publishedFields.has(exports.COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT.field)) {
        errors.push('COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT must be published on every comparison');
    }
    return { valid: errors.length === 0, errors };
}
function validateLearningCandidate(candidate) {
    const errors = [];
    if (!candidate.candidate_id)
        errors.push('candidate_id is required');
    if (!candidate.tenant_id)
        errors.push('tenant_id is required');
    if (!candidate.session_id)
        errors.push('session_id is required');
    if (!candidate.contract_id)
        errors.push('contract_id is required');
    if (!candidate.contract_digest)
        errors.push('contract_digest is required');
    if (!candidate.comparison_id)
        errors.push('comparison_id is required');
    if (!(0, campaign_decision_contract_model_1.assertTenantSessionCoherent)(candidate)) {
        errors.push('tenant_id and session_id must be coherent');
    }
    if (!assertEligibilityIsConjunction(candidate.eligibility)) {
        errors.push('eligibility must be a deterministic eight-condition conjunction');
    }
    if (!candidate.eligibility.eligible && candidate.learning_case) {
        errors.push('ineligible candidate must not carry learning_case (RJ-L1)');
    }
    if (!candidate.eligibility.eligible && candidate.blocked_by.length === 0) {
        errors.push('ineligible candidate must name blocked_by conditions');
    }
    if (!assertNoDurationSemantics(candidate)) {
        errors.push('duration / prohibited vocabulary present (RJ-L3)');
    }
    if (!assertNoPatternWrite(candidate)) {
        errors.push('pattern write vocabulary present (RJ-L2)');
    }
    if (!assertNoWp10dTelemetryCopied(candidate)) {
        errors.push('WP10-D telemetry copied onto candidate (L-INV-9)');
    }
    if (candidate.learning_case) {
        const nested = validateLearningCase(candidate.learning_case);
        if (!nested.valid)
            errors.push(...nested.errors.map(e => `learning_case: ${e}`));
    }
    return { valid: errors.length === 0, errors };
}
function validateLearningCase(lc) {
    const errors = [];
    if (!lc.learning_case_id)
        errors.push('learning_case_id is required');
    if (!lc.tenant_id)
        errors.push('tenant_id is required');
    if (!lc.contract_id)
        errors.push('contract_id is required');
    if (!lc.contract_digest)
        errors.push('contract_digest is required');
    if (!lc.comparison_id)
        errors.push('comparison_id is required');
    if (lc.single_case_disclosure !== exports.SINGLE_CASE_DISCLOSURE) {
        errors.push('single_case_disclosure must match SINGLE_CASE_DISCLOSURE verbatim');
    }
    if (lc.validity_basis.comparability !== 'LIKE_FOR_LIKE') {
        errors.push('validity_basis.comparability must be LIKE_FOR_LIKE on a case');
    }
    if (lc.validity_basis.observation_authority !== 'AUTHORITATIVE_EXTERNAL') {
        errors.push('validity_basis.observation_authority must be AUTHORITATIVE_EXTERNAL on a case');
    }
    if (!assertEligibilityIsConjunction(lc.validity_basis.eligibility)) {
        errors.push('validity_basis.eligibility must be the full conjunction');
    }
    if (!lc.validity_basis.grain_statement?.trim()) {
        errors.push('validity_basis.grain_statement is required');
    }
    if (!lc.applicability_constraints.length) {
        errors.push('applicability_constraints must not be empty');
    }
    if (!assertNoDurationSemantics(lc)) {
        errors.push('duration / prohibited vocabulary present (RJ-L3)');
    }
    if (!assertNoPatternWrite(lc)) {
        errors.push('pattern write vocabulary present (RJ-L2)');
    }
    if (!assertNoWp10dTelemetryCopied(lc)) {
        errors.push('WP10-D telemetry copied onto learning case (L-INV-9)');
    }
    for (const ref of lc.pattern_refs) {
        if (ref.telemetry_disclosure !== exports.PATTERN_TELEMETRY_DISCLOSURE) {
            errors.push(`pattern ref ${ref.pattern_id}: telemetry_disclosure must be verbatim §7.2`);
        }
    }
    return { valid: errors.length === 0, errors };
}
