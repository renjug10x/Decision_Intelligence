"use strict";
/**
 * CogniX CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition
 *
 * Temporal rendering of a decision already computed by CDI-02.
 * FLAT_RATE_IDENTITY only — no fabricated curvature.
 * Contracts frozen in docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_DESIGN_GATE.md §8.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.weakestStrength = exports.PRE_CAMPAIGN_DISCLOSURE = exports.POST_CAMPAIGN_NOT_MODELLED = exports.REVENUE_REQUIRED_INPUT = exports.CDI02_BASE_WEEKLY_UNITS = void 0;
exports.validateDecisionTimelineProjection = validateDecisionTimelineProjection;
exports.validateTimelineProjectionRequest = validateTimelineProjectionRequest;
exports.assertAmbientParity = assertAmbientParity;
exports.assertAmbientMovementPresent = assertAmbientMovementPresent;
exports.assertAttributableIsDifferenceOnly = assertAttributableIsDifferenceOnly;
exports.assertAllocationConserves = assertAllocationConserves;
exports.assertNoObservedHistory = assertNoObservedHistory;
exports.assertPostCampaignEmpty = assertPostCampaignEmpty;
exports.assertEnvelopeMonotone = assertEnvelopeMonotone;
exports.assertEnvelopeWithinModelledPhases = assertEnvelopeWithinModelledPhases;
exports.assertContextSignalsNotDoubleCounted = assertContextSignalsNotDoubleCounted;
exports.assertUnavailableLensNamesInput = assertUnavailableLensNamesInput;
const campaign_readiness_model_1 = require("./campaign-readiness-model");
/** CDI-02 weekly rate constant mirrored for lens rendering — not a second demand model. */
exports.CDI02_BASE_WEEKLY_UNITS = 10000;
exports.REVENUE_REQUIRED_INPUT = {
    field: 'realised_unit_selling_price_gbp',
    grain: 'per SKU per period, net of promotional discount',
    why_required: 'realised campaign revenue = realised sell price × units; no other route is admissible',
    inadmissible_substitutes: [
        'RRP or list price',
        'contribution × assumed margin rate',
        'any assumed or default margin percentage'
    ],
    enables: 'REVENUE',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
exports.POST_CAMPAIGN_NOT_MODELLED = 'CogniX does not model what happens after this campaign — no persistence, decay or payback claim is asserted.';
exports.PRE_CAMPAIGN_DISCLOSURE = 'modelled run-rate, not observed history';
function approxEqual(a, b, tol = 0.05) {
    return Math.abs(a - b) <= tol;
}
function validateDecisionTimelineProjection(p) {
    const errors = [];
    if (!p.projection_id)
        errors.push('Missing projection_id');
    if (!p.campaign_intent_id)
        errors.push('Missing campaign_intent_id');
    if (!Array.isArray(p.trajectories) || p.trajectories.length !== 2) {
        errors.push('trajectories must contain exactly two series');
    }
    if (!Array.isArray(p.lenses) || p.lenses.length !== 4) {
        errors.push('lenses must contain exactly four projections');
    }
    if (p.allocation_profile !== 'FLAT_RATE_IDENTITY') {
        errors.push('allocation_profile must be FLAT_RATE_IDENTITY');
    }
    if (p.tier1 && 'total_predicted_uplift_pp' in p.tier1) {
        errors.push('Tier 1 must not contain total_predicted_uplift_pp');
    }
    const payload = JSON.stringify(p);
    if (/half_life|valid_until|remaining_hours|_expires/i.test(payload)) {
        errors.push('Half-Life semantics prohibited in CDI-05 projection');
    }
    if (/cumulative_|horizon_total|campaign_total_units/i.test(payload)) {
        errors.push('Cumulative / horizon-total quantities prohibited');
    }
    return { valid: errors.length === 0, errors };
}
function validateTimelineProjectionRequest(r) {
    const errors = [];
    if (!r.tenant_id)
        errors.push('Missing tenant_id');
    if (!r.session_id)
        errors.push('Missing session_id');
    if (!r.campaign_intent_id && !r.campaign_intent) {
        errors.push('Provide campaign_intent_id or campaign_intent');
    }
    if (r.allocation_profile_override !== undefined || r.envelope_profile_override !== undefined) {
        return {
            valid: false,
            errors: ['RJ4: allocation/envelope profile is a build-time constant and is not caller-configurable'],
            rejection_id: 'RJ4'
        };
    }
    return { valid: errors.length === 0, errors };
}
function assertAmbientParity(p) {
    const violations = [];
    const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
    const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
    if (!cf || !iv) {
        return { ok: false, violations: ['Missing trajectories'] };
    }
    for (let i = 0; i < cf.points.length; i++) {
        const a = cf.points[i];
        const b = iv.points[i];
        if (a.ambient_component_pp !== b.ambient_component_pp) {
            violations.push(`Ambient mismatch at index ${i}: ${a.ambient_component_pp} vs ${b.ambient_component_pp}`);
        }
        if (a.intervention_component_pp !== 0 && a.intervention_component_pp !== null) {
            violations.push(`Counterfactual intervention_component_pp non-zero at ${i}`);
        }
    }
    return { ok: violations.length === 0, violations };
}
function assertAmbientMovementPresent(p, ambientUpliftPp) {
    const violations = [];
    const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
    const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
    if (!cf || !iv)
        return { ok: false, violations: ['Missing trajectories'] };
    for (const t of [cf, iv]) {
        for (const pt of t.points.filter(x => x.phase === 'PRE_CAMPAIGN')) {
            if (pt.index_pct !== 100) {
                violations.push(`PRE_CAMPAIGN index_pct ${pt.index_pct} ≠ 100 (${t.kind})`);
            }
        }
    }
    const campaignCf = cf.points.filter(x => x.phase === 'CAMPAIGN');
    if (ambientUpliftPp !== 0) {
        for (const pt of campaignCf) {
            if (pt.index_pct === 100) {
                violations.push('CAMPAIGN counterfactual pinned to 100 while ambient_uplift_pp ≠ 0');
            }
            if (pt.ambient_component_pp !== ambientUpliftPp) {
                violations.push(`CAMPAIGN ambient_component_pp ${pt.ambient_component_pp} ≠ ${ambientUpliftPp}`);
            }
            if (pt.index_pct !== 100 + (pt.ambient_component_pp || 0)) {
                violations.push(`CAMPAIGN counterfactual index must be 100 + ambient`);
            }
        }
        // Within-campaign flatness
        if (campaignCf.length > 1) {
            const first = campaignCf[0].index_pct;
            if (campaignCf.some(pt => pt.index_pct !== first)) {
                violations.push('Within-CAMPAIGN ambient slope detected — FLAT_RATE_IDENTITY violated');
            }
        }
    }
    else {
        for (const pt of campaignCf) {
            if (pt.index_pct !== 100) {
                violations.push(`With ambient=0, CAMPAIGN counterfactual must be 100, got ${pt.index_pct}`);
            }
        }
    }
    // Ambient equal on both trajectories in campaign
    const campaignIv = iv.points.filter(x => x.phase === 'CAMPAIGN');
    for (let i = 0; i < campaignCf.length; i++) {
        if (campaignCf[i].ambient_component_pp !== campaignIv[i]?.ambient_component_pp) {
            violations.push(`Ambient parity fail in CAMPAIGN at ${i}`);
        }
    }
    return { ok: violations.length === 0, violations };
}
function assertAttributableIsDifferenceOnly(p) {
    const violations = [];
    const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
    const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
    if (!cf || !iv)
        return { ok: false, violations: ['Missing trajectories'] };
    for (let i = 0; i < cf.points.length; i++) {
        const a = cf.points[i];
        const b = iv.points[i];
        if (a.index_pct == null || b.index_pct == null)
            continue;
        const diff = Number((b.index_pct - a.index_pct).toFixed(4));
        const expected = b.intervention_component_pp ?? 0;
        if (!approxEqual(diff, expected)) {
            violations.push(`Difference ≠ intervention at ${i}: ${diff} vs ${expected}`);
        }
    }
    return { ok: violations.length === 0, violations };
}
function assertAllocationConserves(p, ambientPp, interventionPp) {
    const violations = [];
    const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
    const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
    if (!cf || !iv)
        return { ok: false, violations: ['Missing trajectories'] };
    const cfCamp = cf.points.filter(x => x.phase === 'CAMPAIGN');
    const ivCamp = iv.points.filter(x => x.phase === 'CAMPAIGN');
    if (cfCamp.length === 0)
        return { ok: false, violations: ['No CAMPAIGN points'] };
    // Identity: every campaign day holds the endpoint — terminal equals CDI-02
    const cfTerminal = cfCamp[cfCamp.length - 1];
    const ivTerminal = ivCamp[ivCamp.length - 1];
    if (!approxEqual(cfTerminal.ambient_component_pp ?? 0, ambientPp)) {
        violations.push(`CF terminal ambient ${cfTerminal.ambient_component_pp} ≠ ${ambientPp}`);
    }
    if (!approxEqual(ivTerminal.intervention_component_pp ?? 0, interventionPp)) {
        violations.push(`IV terminal intervention ${ivTerminal.intervention_component_pp} ≠ ${interventionPp}`);
    }
    if (!approxEqual(ivTerminal.ambient_component_pp ?? 0, ambientPp)) {
        violations.push(`IV terminal ambient ${ivTerminal.ambient_component_pp} ≠ ${ambientPp}`);
    }
    return { ok: violations.length === 0, violations };
}
function assertNoObservedHistory(p) {
    const violations = [];
    for (const t of p.trajectories) {
        for (const pt of t.points) {
            if (pt.basis === 'OBSERVED') {
                violations.push('Observed basis prohibited');
            }
            if (pt.strength === 'OBSERVED' && pt.synthetic_demo) {
                violations.push(`OBSERVED+synthetic at ${pt.period_date}`);
            }
            if (pt.phase === 'PRE_CAMPAIGN' && pt.index_pct !== 100) {
                violations.push(`PRE_CAMPAIGN not flat at 100: ${pt.index_pct}`);
            }
        }
    }
    const blob = JSON.stringify(p);
    if (/\bobserved history\b|\bactual demand\b|\bhistorical series\b/i.test(blob) &&
        !/not observed history/i.test(blob)) {
        violations.push('Language implying observed history without disclosure');
    }
    return { ok: violations.length === 0, violations };
}
function assertPostCampaignEmpty(p) {
    const violations = [];
    let postCount = 0;
    for (const t of p.trajectories) {
        for (const pt of t.points.filter(x => x.phase === 'POST_CAMPAIGN')) {
            postCount++;
            if (pt.ambient_component_pp !== null || pt.intervention_component_pp !== null || pt.index_pct !== null) {
                violations.push(`POST_CAMPAIGN has numeric components at ${pt.period_date}`);
            }
            if (!pt.not_modelled_reason) {
                violations.push(`POST_CAMPAIGN missing not_modelled_reason at ${pt.period_date}`);
            }
            if (pt.basis !== 'NOT_MODELLED_BY_CDI02') {
                violations.push(`POST_CAMPAIGN basis must be NOT_MODELLED_BY_CDI02`);
            }
        }
    }
    if (postCount === 0) {
        violations.push('POST_CAMPAIGN phase must be structurally present');
    }
    return { ok: violations.length === 0, violations };
}
function assertEnvelopeMonotone(p) {
    const violations = [];
    const check = (env, label) => {
        for (let i = 1; i < env.points.length; i++) {
            const prev = env.points[i - 1];
            const cur = env.points[i];
            const prevW = prev.upper_index_pct - prev.lower_index_pct;
            const curW = cur.upper_index_pct - cur.lower_index_pct;
            if (curW + 1e-9 < prevW) {
                violations.push(`${label} envelope narrows at index ${cur.period_index}`);
            }
        }
    };
    for (const t of p.trajectories)
        check(t.envelope, t.kind);
    check(p.attributable_effect_envelope, 'attributable_effect');
    return { ok: violations.length === 0, violations };
}
/**
 * U3 / I7 at the envelope layer. A point can be null in the series and still be asserted
 * by a band drawn over it: a post-campaign envelope centred on the identity draws
 * reversion, and an effect envelope centred on zero draws convergence. Both are causal
 * claims CDI-02 does not make, so no envelope may extend past the modelled phases.
 */
function assertEnvelopeWithinModelledPhases(p) {
    const violations = [];
    const phaseByIndex = new Map();
    for (const t of p.trajectories) {
        for (const pt of t.points)
            phaseByIndex.set(pt.period_index, pt.phase);
    }
    const check = (env, label, campaignOnly) => {
        for (const ep of env.points) {
            const phase = phaseByIndex.get(ep.period_index);
            if (phase === 'POST_CAMPAIGN') {
                violations.push(`${label} envelope asserts a band over POST_CAMPAIGN index ${ep.period_index}`);
            }
            if (campaignOnly && phase !== 'CAMPAIGN') {
                violations.push(`${label} envelope extends outside the CAMPAIGN phase at index ${ep.period_index}`);
            }
        }
    };
    for (const t of p.trajectories)
        check(t.envelope, t.kind, false);
    check(p.attributable_effect_envelope, 'attributable_effect', true);
    return { ok: violations.length === 0, violations };
}
/**
 * I14. A signal CDI-02 already consumed as an ambient driver is inside
 * ambient_component_pp; rendering it as an additional effect counts the same weather
 * twice.
 */
function assertContextSignalsNotDoubleCounted(p) {
    const violations = [];
    for (const m of p.markers.filter(x => x.marker_type === 'CONTEXT_SIGNAL')) {
        if (m.already_in_ambient !== true) {
            violations.push(`CONTEXT_SIGNAL ${m.marker_id} must declare already_in_ambient`);
        }
        if (m.ambient_driver_id !== 'external_signal_response') {
            violations.push(`CONTEXT_SIGNAL ${m.marker_id} must name its ambient driver`);
        }
    }
    return { ok: violations.length === 0, violations };
}
function assertUnavailableLensNamesInput(p) {
    const violations = [];
    const revenue = p.lenses.find(l => l.lens === 'REVENUE');
    if (!revenue) {
        violations.push('REVENUE lens missing');
    }
    else {
        if (revenue.availability !== 'NOT_AVAILABLE') {
            violations.push('REVENUE must be NOT_AVAILABLE without realised selling price');
        }
        if (revenue.strength !== 'MISSING') {
            violations.push('REVENUE strength must be MISSING');
        }
        if (!revenue.required_authoritative_input) {
            violations.push('REVENUE must publish required_authoritative_input');
        }
        if (!revenue.missing_inputs.some(m => /unit_price/i.test(m))) {
            violations.push('REVENUE missing_inputs must name unit_price_gbp');
        }
    }
    if (!p.provenance?.lenses_unavailable?.includes('REVENUE')) {
        // provenance is Record<string,string> — check lenses_unavailable key
        if (!String(p.provenance?.lenses_unavailable || '').includes('REVENUE')) {
            violations.push('provenance.lenses_unavailable must name REVENUE');
        }
    }
    return { ok: violations.length === 0, violations };
}
/**
 * CDI-04's rule, reused rather than redefined (design gate §5.1). CDI-05 defines no
 * second evidence taxonomy and no second implementation of one, so upstream changes to
 * the strength order cannot silently diverge here.
 */
exports.weakestStrength = campaign_readiness_model_1.weakestEvidenceStrength;
