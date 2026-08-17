"use strict";
/**
 * CogniX CDI-07A — Decision Contract & Decision Half-Life
 *
 * A DecisionContract records a resolved decision and the exact basis on which it was
 * resolved. It never recomputes, re-ranks, or judges. Validity is a separate artefact
 * recomputed on demand at a caller-supplied as_of.
 *
 * Frozen in docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md §§2–9.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNAPSHOT_AUTHORITY_DISCLOSURE = exports.WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE = exports.ATTRIBUTION_UNAVAILABLE_DISCLOSURE = exports.SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE = exports.SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE = exports.NOT_A_PREDICTION_DISCLOSURE = exports.QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT = exports.DECISION_BASIS_DIGEST_INPUTS = exports.SNAPSHOT_PATH_PREDICTED_BASIS = exports.CDI07A_BOUND_SCENARIO_ZERO_FRAMING = exports.CDI07A_BOUND_EVIDENCE_STRENGTH_ORDER = void 0;
exports.isWorldDrivenAdmissibleSourceType = isWorldDrivenAdmissibleSourceType;
exports.canonicalJson = canonicalJson;
exports.sha256Hex = sha256Hex;
exports.computeDecisionBasisDigest = computeDecisionBasisDigest;
exports.computeContractDigest = computeContractDigest;
exports.assertNoDurationSemantics = assertNoDurationSemantics;
exports.assertNoHiddenValidityScalar = assertNoHiddenValidityScalar;
exports.assertStableHasPositiveEvidence = assertStableHasPositiveEvidence;
exports.assertIndeterminateOutranksStable = assertIndeterminateOutranksStable;
exports.assertNonPromotionNotContractable = assertNonPromotionNotContractable;
exports.assertResolutionAttributed = assertResolutionAttributed;
exports.assertScenarioZeroRecorded = assertScenarioZeroRecorded;
exports.contractEvidenceStrengthFloor = contractEvidenceStrengthFloor;
exports.assertValidityProposesNoAlternative = assertValidityProposesNoAlternative;
exports.assertValidityReadNoEconomics = assertValidityReadNoEconomics;
exports.assertSignalMovementAttributed = assertSignalMovementAttributed;
exports.assertTenantSessionCoherent = assertTenantSessionCoherent;
exports.assertBasisDigestReplacesNoReference = assertBasisDigestReplacesNoReference;
exports.assertBasisDigestDeterministic = assertBasisDigestDeterministic;
exports.assertContractImmutable = assertContractImmutable;
exports.assertBasisTranscribedNotRecomputed = assertBasisTranscribedNotRecomputed;
exports.validateDecisionContract = validateDecisionContract;
exports.validateDecisionValidityAssessment = validateDecisionValidityAssessment;
exports.validateContractCreationRequest = validateContractCreationRequest;
const crypto_1 = require("crypto");
const campaign_readiness_model_1 = require("./campaign-readiness-model");
const campaign_frontier_model_1 = require("./campaign-frontier-model");
const external_signal_connector_model_1 = require("./external-signal-connector-model");
/**
 * Gate §8.1 — CDI-04 / CDI-06 / ESF imports are bound here by use. The symbols below are
 * referenced so the dependency is load-bearing rather than a dangling import list:
 * evidence floor, Scenario 0 framing, readiness condition/state shapes.
 */
exports.CDI07A_BOUND_EVIDENCE_STRENGTH_ORDER = campaign_readiness_model_1.EVIDENCE_STRENGTH_ORDER;
exports.CDI07A_BOUND_SCENARIO_ZERO_FRAMING = campaign_frontier_model_1.SCENARIO_ZERO_FRAMING;
/**
 * CDI-08 / C-INV-ENV-2 — the closed, declared quantity basis of each snapshot path an envelope may
 * adjudicate. A `SnapshotValue` carries no basis field, so the predicted basis for a path is not
 * inferable from the snapshot; it is declared here or it is refused. Deliberately closed and
 * deliberately small: these are the paths CDI-07B actually compares
 * (`ATTRIBUTABLE_FIELD` / `GROSS_FIELD`) plus the two decomposition components that reconcile into
 * the gross sum. A path absent from this table has no declared basis, so an envelope naming it can
 * never be adjudicated and is rejected at contract creation rather than validated against a guess.
 *
 * Never widen this by pattern-matching a path string. Substring inference ('gross', 'monetary',
 * 'ambient') is exactly the fuzzy correspondence the CDI-08 gate refuses everywhere else.
 */
exports.SNAPSHOT_PATH_PREDICTED_BASIS = {
    'counterfactual.campaign_delta.attributable_uplift_pp': 'ATTRIBUTABLE',
    'play.decomposition.reconciliation.reconciled_sum_pp': 'GROSS',
    'play.decomposition.ambient_group.subtotal_pp': 'GROSS',
    'play.decomposition.intervention_group.subtotal_pp': 'GROSS'
};
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * The sixteen canonical inputs to `decision_basis_digest`, in fixed order (gate §2.8).
 * Labels only — the digest algorithm reads the live basis fields in this sequence.
 */
exports.DECISION_BASIS_DIGEST_INPUTS = [
    'campaign_intent_ref.id+digest',
    'frontier_ref.id+digest',
    'selected_play_ref.id+digest',
    'counterfactual_ref.id+digest',
    'causal_ref.id+digest',
    'readiness_ref.id+digest|null',
    'outcome_snapshot (by source_field_path)',
    'decomposition_snapshot (by source_field_path)',
    'readiness_snapshot (by source_field_path)|null',
    'comparison_invariants',
    'ambient_frame',
    'unavailable_at_decision (by dimension_id)',
    'rejected_alternatives (by play_id)',
    'scenario_zero',
    'generation_policy_version',
    'dominance_epsilon (keys sorted)'
];
exports.QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT = {
    field: 'observed_decision_validity_outcome_series',
    grain: 'per resolved decision, per assumption, with the observed instant at which the assumption ceased to hold',
    why_required: 'a duration, decay rate or expiry claim asserts that validity is a function of elapsed time; ' +
        'nothing in this estate observes decisions losing validity over time, and no threshold in ' +
        'CDI-04 or CDI-06 is calibrated, so any duration would be a lab constant presented as a measurement',
    inadmissible_substitutes: [
        'a fixed default such as 36 hours',
        'an exponential or linear decay curve fitted to no observations',
        'campaign duration, forecast horizon, or planned_end minus the reference instant',
        'signal confidence or quality read as a validity percentage',
        'CDI-04 confidence band converted to a remaining-time estimate',
        'the count of fired triggers scaled into a duration'
    ],
    enables: 'QUANTITATIVE_DECISION_HALF_LIFE',
    status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
/** Mandatory disclosure wherever validity is surfaced (gate §5.5). */
exports.NOT_A_PREDICTION_DISCLOSURE = 'CogniX does not estimate how long this decision remains valid. It reports whether the assumptions ' +
    'it was decided on still hold, and names the ones that have moved.';
/** Asymmetry 1 disclosure on every T-SIGNAL evaluation (gate §7.4). */
exports.SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE = 'This decision was resolved with enterprise signals excluded from the counterfactual, so that ' +
    'competing strategies shared one baseline. This signal movement did not change the decision\'s ' +
    'figures. It indicates that the world has moved since the decision was framed.';
/** Asymmetry 2 disclosure when movement is SCENARIO_DRIVEN (gate §7.4). */
exports.SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE = 'This signal moved because the scenario parameters changed, not because the world did.';
/**
 * Asymmetry 2 disclosure when movement cannot be attributed (gate §7.4).
 * WORLD_DRIVEN requires an observation source independent of Shared Decision State, which
 * CDI-07A does not take a dependency on. Absent one, the honest answer is that we could not
 * tell world movement from our own parameter change — never a fabricated WORLD_DRIVEN claim.
 */
exports.ATTRIBUTION_UNAVAILABLE_DISCLOSURE = 'CogniX could not distinguish movement in the world from movement caused by a change to the ' +
    'scenario parameters. No observation source independent of Shared Decision State was available.';
/**
 * Gate §7.4 / CDI-07B X1 — provenances that may establish WORLD_DRIVEN when non-synthetic.
 * Prefer OBSERVATION_INDEPENDENT_SOURCE_TYPES / isWorldDrivenAdmissibleSourceType.
 * Retained as the historical single literal for EXTERNAL_CONNECTOR-only call sites.
 */
exports.WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE = 'EXTERNAL_CONNECTOR';
/**
 * X1 — synthetic provenance can never establish WORLD_DRIVEN. Source-type test is independent
 * and evaluated only after synthetic is ruled out.
 */
function isWorldDrivenAdmissibleSourceType(sourceType, opts) {
    if (opts?.synthetic_demo === true)
        return false;
    if (!sourceType)
        return false;
    return (0, external_signal_connector_model_1.isObservationIndependentSourceType)(sourceType);
}
/** Snapshot authority statement (gate §2.6). */
exports.SNAPSHOT_AUTHORITY_DISCLOSURE = 'These values are the CDI-02 and CDI-06 outputs recorded at the moment this decision was resolved. ' +
    'The originating packages remain authoritative. Nothing here has been recalculated.';
// ---------------------------------------------------------------------------
// Prohibited vocabulary (gate §5.7, AC-21/22/27)
// ---------------------------------------------------------------------------
/** Duration / countdown / expiry keys — deliberately excludes bare `half_life` so `half_life_basis` is legal. */
const DURATION_KEY_RE = /half_life_hours|remaining_hours|hours_remaining|valid_until|valid_for|expires|expiry|ttl|countdown|decay_rate|decay_curve|validity_pct|validity_score|percent_remaining|age_hours|elapsed|time_to_live/i;
/** Value forms like "36h remaining" / "2 days left" — the UX_DESIGN_PRINCIPLES.md:163 example. */
const DURATION_VALUE_RE = /\b\d+\s*(h|hr|hrs|hours|d|days)\s*(remaining|left|to go)\b/i;
const DURATION_PHRASE_RE = /hours remaining|days remaining|\b36h\b/i;
const HIDDEN_VALIDITY_SCALAR_KEY_RE = /score|weight|composite|utility|ranking|rank_index|priority_value|volatility_index/i;
const ALTERNATIVE_PROPOSAL_KEY_RE = /selected_play|alternative_play|recommended_play|suggested_play|better_play|next_play/i;
const ECONOMIC_RESTATEMENT_KEY_RE = /contribution_delta|attributable_volume|revenue_delta|uplift_pp|axis_value|outcome_snapshot|decomposition_snapshot/i;
// ---------------------------------------------------------------------------
// Canonicalisation & digests
// ---------------------------------------------------------------------------
/**
 * Lexicographic object keys at every depth; `null` preserved; `undefined` omitted.
 * Arrays keep element order (callers must pre-sort where the digest requires an order key).
 */
function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
}
function canonicalize(value) {
    if (value === null)
        return null;
    if (value === undefined)
        return undefined;
    if (typeof value !== 'object')
        return value;
    if (Array.isArray(value)) {
        return value.map(v => (v === undefined ? null : canonicalize(v)));
    }
    const obj = value;
    const out = {};
    for (const key of Object.keys(obj).sort()) {
        if (obj[key] === undefined)
            continue;
        out[key] = canonicalize(obj[key]);
    }
    return out;
}
function sha256Hex(s) {
    return (0, crypto_1.createHash)('sha256').update(s, 'utf8').digest('hex');
}
function sortSnapshots(snapshots) {
    return [...snapshots].sort((a, b) => a.source_field_path.localeCompare(b.source_field_path));
}
function refIdDigest(ref) {
    return { id: ref.id, digest: ref.digest };
}
/**
 * sha256 over the §2.8 sixteen-input tuple under canonicalJson rules.
 * Excludes run_marker, evaluation_id, created_as_of, status, resolution, assumptions,
 * triggers, provenance and evidence_refs — those are facts about the contract, not the basis.
 */
function computeDecisionBasisDigest(basis) {
    const tuple = [
        refIdDigest(basis.campaign_intent_ref),
        refIdDigest(basis.frontier_ref),
        refIdDigest(basis.selected_play_ref),
        refIdDigest(basis.counterfactual_ref),
        refIdDigest(basis.causal_ref),
        basis.readiness_ref ? refIdDigest(basis.readiness_ref) : null,
        sortSnapshots(basis.outcome_snapshot),
        sortSnapshots(basis.decomposition_snapshot),
        basis.readiness_snapshot ? sortSnapshots(basis.readiness_snapshot) : null,
        basis.comparison_invariants,
        basis.ambient_frame,
        [...basis.unavailable_at_decision].sort((a, b) => a.dimension_id.localeCompare(b.dimension_id)),
        [...basis.rejected_alternatives].sort((a, b) => a.play_id.localeCompare(b.play_id)),
        basis.scenario_zero,
        basis.generation_policy_version,
        basis.dominance_epsilon
    ];
    return sha256Hex(canonicalJson(tuple));
}
/**
 * sha256 of the immutable contract body. Distinct from `decision_basis_digest`.
 * Omits lifecycle fields that may change after creation (`status`, `superseded_by`,
 * `withdrawal`) so a superseded contract's digest equals what it was while active.
 */
function computeContractDigest(contract) {
    const { status: _status, superseded_by: _supersededBy, withdrawal: _withdrawal, ...immutable } = contract;
    void _status;
    void _supersededBy;
    void _withdrawal;
    return sha256Hex(canonicalJson(immutable));
}
// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------
function collectKeys(obj, out = []) {
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
/**
 * C-INV-9 / §5.7 — KEY and VALUE scans for duration / countdown / expiry vocabulary.
 * Scoped to the prohibited patterns in the gate so imported constants such as
 * SCENARIO_ZERO_FRAMING (which contain no duration vocabulary) do not false-positive.
 */
function assertNoDurationSemantics(payload) {
    const keys = collectKeys(payload);
    if (keys.some(k => DURATION_KEY_RE.test(k)))
        return false;
    const values = collectStringValues(payload);
    if (values.some(v => DURATION_VALUE_RE.test(v) || DURATION_PHRASE_RE.test(v)))
        return false;
    return true;
}
/** AC-27 — no hidden score / weight / composite / ranking / utility scalar, even unused. */
function assertNoHiddenValidityScalar(payload) {
    return !collectKeys(payload).some(k => HIDDEN_VALIDITY_SCALAR_KEY_RE.test(k));
}
/**
 * Owner ruling W2 — STABLE requires positive supporting evidence: every trigger NOT_FIRED
 * with a populated observed_value, and unassessable_assumptions empty. An empty trigger set
 * is absence of evidence, not stability.
 */
function assertStableHasPositiveEvidence(assessment) {
    if (assessment.state !== 'STABLE')
        return true;
    const { triggers_evaluated, unassessable_assumptions } = assessment.half_life_basis;
    if (unassessable_assumptions.length > 0)
        return false;
    if (triggers_evaluated.length === 0)
        return false;
    return triggers_evaluated.every(t => t.outcome === 'NOT_FIRED' && t.observed_value !== undefined);
}
/**
 * §5.4 — INDETERMINATE outranks STABLE. Any unassessable assumption with state STABLE is illegal.
 */
function assertIndeterminateOutranksStable(assessment) {
    if (assessment.half_life_basis.unassessable_assumptions.length > 0 &&
        assessment.state === 'STABLE') {
        return false;
    }
    return true;
}
/**
 * E6 / U4 firewall — returns true iff the play is contractable (not excluded economics).
 * Non-promotion with EXCLUDED_ECONOMICS_INCOMPLETE is never contractable by any route.
 */
function assertNonPromotionNotContractable(play) {
    if (play.admissibility === 'EXCLUDED_ECONOMICS_INCOMPLETE')
        return false;
    if (play.play_kind === 'NON_PROMOTION')
        return false;
    return true;
}
/**
 * Resolution must be attributed — R1 SELECTED, or R2 a named resolver (never defaulted) who
 * stated their reason. A HUMAN_RESOLVED contract has to be auditable as who decided, what was
 * selected and why; `created_as_of` carries the caller-supplied reference instant.
 */
function assertResolutionAttributed(resolution) {
    if (!resolution.selected_play_id)
        return false;
    if (resolution.route === 'CONSTRAINT_RESOLVED') {
        return resolution.selection_status === 'SELECTED';
    }
    if (resolution.route === 'HUMAN_RESOLVED') {
        return (Boolean(resolution.resolved_by && resolution.resolved_by.trim().length > 0) &&
            Boolean(resolution.resolution_statement && resolution.resolution_statement.trim().length > 0));
    }
    return false;
}
/** Scenario 0 is mandatory on every contract basis (§9.3). */
function assertScenarioZeroRecorded(basis) {
    const z = basis.scenario_zero;
    return Boolean(z &&
        z.play_id &&
        typeof z.was_selected === 'boolean' &&
        typeof z.dominated === 'boolean' &&
        Array.isArray(z.dominated_by) &&
        Array.isArray(z.outcome_snapshot) &&
        typeof z.framing === 'string' &&
        z.framing.length > 0);
}
/** Evidence strength floor across snapshot / assumption / evidence strengths — CDI-04 helper. */
function contractEvidenceStrengthFloor(strengths) {
    return (0, campaign_readiness_model_1.weakestEvidenceStrength)(strengths);
}
/** C-INV-7 — validity never names an alternative play. */
function assertValidityProposesNoAlternative(assessment) {
    return !collectKeys(assessment).some(k => ALTERNATIVE_PROPOSAL_KEY_RE.test(k));
}
/** C-INV-7 — validity never restates an economic value. */
function assertValidityReadNoEconomics(assessment) {
    return !collectKeys(assessment).some(k => ECONOMIC_RESTATEMENT_KEY_RE.test(k));
}
/**
 * §7.4 — every assessed T-SIGNAL evaluation must carry a movement attribution.
 * UNASSESSABLE may omit it or use ATTRIBUTION_UNAVAILABLE; never fabricate WORLD_DRIVEN.
 */
function assertSignalMovementAttributed(evaluation) {
    if (evaluation.outcome === 'UNASSESSABLE') {
        return (evaluation.movement_attribution === undefined ||
            evaluation.movement_attribution === 'ATTRIBUTION_UNAVAILABLE');
    }
    return (evaluation.movement_attribution === 'SCENARIO_DRIVEN' ||
        evaluation.movement_attribution === 'WORLD_DRIVEN' ||
        evaluation.movement_attribution === 'ATTRIBUTION_UNAVAILABLE');
}
/** C-INV-10 — every reference agrees on tenant_id and session_id. */
function assertTenantSessionCoherent(...ids) {
    if (ids.length === 0)
        return true;
    const { tenant_id, session_id } = ids[0];
    if (!tenant_id || !session_id)
        return false;
    return ids.every(x => x.tenant_id === tenant_id && x.session_id === session_id);
}
/**
 * C-INV-11 — decision_basis_digest binds the basis and replaces no source reference.
 * All BoundArtefactRef ids must remain published and must not equal the digest.
 */
function assertBasisDigestReplacesNoReference(basis, digest) {
    if (!digest)
        return false;
    const refs = [
        basis.campaign_intent_ref,
        basis.frontier_ref,
        basis.selected_play_ref,
        basis.counterfactual_ref,
        basis.causal_ref,
        ...(basis.readiness_ref ? [basis.readiness_ref] : [])
    ];
    for (const r of refs) {
        if (!r.id || !r.digest)
            return false;
        if (r.id === digest)
            return false;
    }
    return true;
}
/**
 * Determinism check: identical basis inputs yield a byte-identical digest across two
 * recomputations (AC-52). Permanent regression, not a one-off check.
 */
function assertBasisDigestDeterministic(basis) {
    return computeDecisionBasisDigest(basis) === computeDecisionBasisDigest(basis);
}
/**
 * C-INV-5 / §4.1 — A DecisionContract has no mutation path for basis, resolution,
 * assumptions or triggers. There is no PATCH. Status may only move
 * ACTIVE → SUPERSEDED | WITHDRAWN, recorded as new facts, never as edits to the
 * immutable body. This helper compares the immutable digests of two snapshots:
 * they must be byte-identical whenever only a lifecycle transition occurred.
 */
function assertContractImmutable(before, after) {
    return (before.contract_id === after.contract_id &&
        before.decision_basis_digest === after.decision_basis_digest &&
        computeContractDigest(before) === computeContractDigest(after) &&
        canonicalJson(before.basis) === canonicalJson(after.basis) &&
        canonicalJson(before.resolution) === canonicalJson(after.resolution) &&
        canonicalJson(before.assumptions) === canonicalJson(after.assumptions) &&
        canonicalJson(before.triggers) === canonicalJson(after.triggers));
}
/**
 * C-INV-4 — Snapshot values are transcribed, not derived. Exact equality against the
 * source artefact map; any rounding, unit conversion, aggregation or renaming fails.
 */
function assertBasisTranscribedNotRecomputed(snapshots, sourceValues) {
    const errors = [];
    const map = sourceValues instanceof Map
        ? sourceValues
        : new Map(Object.entries(sourceValues));
    for (const s of snapshots) {
        if (s.restated !== false) {
            errors.push(`${s.source_field_path}: restated must be false`);
        }
        if (!s.source_field_path) {
            errors.push('snapshot missing source_field_path');
            continue;
        }
        if (!s.source_package) {
            errors.push(`${s.source_field_path}: missing source_package`);
        }
        if (!map.has(s.source_field_path)) {
            errors.push(`${s.source_field_path}: source value missing`);
            continue;
        }
        const src = map.get(s.source_field_path);
        if (src !== s.value) {
            errors.push(`${s.source_field_path}: transcribed ${JSON.stringify(s.value)} !== source ${JSON.stringify(src)}`);
        }
    }
    return { ok: errors.length === 0, errors };
}
// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------
function validateDecisionContract(c) {
    const errors = [];
    if (!c.contract_id)
        errors.push('contract_id is required');
    if (!c.tenant_id)
        errors.push('tenant_id is required');
    if (!c.session_id)
        errors.push('session_id is required');
    if (!c.decision_basis_digest)
        errors.push('decision_basis_digest is required');
    if (!c.basis)
        errors.push('basis is required');
    if (!c.resolution)
        errors.push('resolution is required');
    if (!c.created_as_of)
        errors.push('created_as_of is required');
    if (c.calculation_mode !== 'deterministic_decision_contract') {
        errors.push('calculation_mode must be deterministic_decision_contract');
    }
    if (c.status !== 'ACTIVE' && c.status !== 'SUPERSEDED' && c.status !== 'WITHDRAWN') {
        errors.push('status must be ACTIVE | SUPERSEDED | WITHDRAWN (no EXPIRED)');
    }
    if (c.basis) {
        if (!assertScenarioZeroRecorded(c.basis)) {
            errors.push('scenario_zero must be recorded on every contract basis');
        }
        for (const ref of [
            c.basis.campaign_intent_ref,
            c.basis.frontier_ref,
            c.basis.selected_play_ref,
            c.basis.counterfactual_ref,
            c.basis.causal_ref,
            c.basis.readiness_ref
        ]) {
            if (!ref)
                continue;
            if (!ref.id || !ref.digest) {
                errors.push(`BoundArtefactRef ${ref.artefact} requires id and digest`);
            }
        }
        for (const s of [
            ...c.basis.outcome_snapshot,
            ...c.basis.decomposition_snapshot,
            ...(c.basis.readiness_snapshot ?? [])
        ]) {
            if (s.restated !== false) {
                errors.push(`${s.source_field_path}: restated must be false`);
            }
        }
        const recomputed = computeDecisionBasisDigest(c.basis);
        if (c.decision_basis_digest !== recomputed) {
            errors.push('decision_basis_digest does not match recomputed basis digest');
        }
        if (!assertBasisDigestReplacesNoReference(c.basis, c.decision_basis_digest)) {
            errors.push('decision_basis_digest must not replace any BoundArtefactRef');
        }
    }
    if (c.resolution && !assertResolutionAttributed(c.resolution)) {
        errors.push('resolution is not attributed (RJ-C2)');
    }
    if (!assertNoDurationSemantics(c)) {
        errors.push('Duration / countdown / expiry vocabulary present in contract payload');
    }
    if (!assertNoHiddenValidityScalar(c)) {
        errors.push('Hidden validity scalar vocabulary present in contract payload');
    }
    const hasHalfLifeCapability = (c.unavailable_capabilities ?? []).some(u => u.enables === 'QUANTITATIVE_DECISION_HALF_LIFE');
    if (!hasHalfLifeCapability) {
        errors.push('QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT must be published on every contract');
    }
    // CDI-08 / C-INV-ENV-1…5
    if (!Array.isArray(c.prediction_envelopes)) {
        errors.push('prediction_envelopes must be an array on every contract (may be empty, never absent)');
    }
    else {
        const seenPaths = new Set();
        const allSnapshots = [
            ...(c.basis?.outcome_snapshot || []),
            ...(c.basis?.decomposition_snapshot || [])
        ];
        for (const env of c.prediction_envelopes) {
            if (!env.envelope_id || !env.envelope_id.trim()) {
                errors.push('envelope_id is required');
            }
            if (!env.declared_by || !env.declared_by.trim()) {
                errors.push('declared_by is required and cannot be empty (C-INV-ENV-4)');
            }
            if (!env.declaration_statement || !env.declaration_statement.trim()) {
                errors.push('declaration_statement is required and cannot be empty (C-INV-ENV-4)');
            }
            if (!Number.isFinite(env.lower) || !Number.isFinite(env.upper)) {
                errors.push('envelope lower and upper bounds must be finite numbers (C-INV-ENV-3)');
            }
            else if (env.lower > env.upper) {
                errors.push('envelope lower bound must be <= upper bound (C-INV-ENV-3)');
            }
            else if (env.lower === 0 && env.upper === 0) {
                errors.push('envelope lower and upper bounds cannot both be zero (C-INV-ENV-3)');
            }
            if (env.tolerance_kind !== 'DECLARED_ACCEPTANCE_TOLERANCE') {
                errors.push("tolerance_kind must be 'DECLARED_ACCEPTANCE_TOLERANCE'");
            }
            if (env.derivation !== 'HUMAN_DECLARED') {
                errors.push("derivation must be 'HUMAN_DECLARED'");
            }
            if (env.pre_declaration_witness !== 'NONE') {
                errors.push("pre_declaration_witness must be 'NONE' at contract declaration; a caller cannot assert a server witness (C-INV-ENV-6)");
            }
            if (seenPaths.has(env.applies_to_field_path)) {
                errors.push(`At most one envelope permitted per applies_to_field_path: ${env.applies_to_field_path} (C-INV-ENV-5)`);
            }
            seenPaths.add(env.applies_to_field_path);
            const targetSnap = allSnapshots.find(s => s.source_field_path === env.applies_to_field_path);
            if (!targetSnap) {
                errors.push(`Envelope applies_to_field_path ${env.applies_to_field_path} does not resolve to a published basis snapshot (C-INV-ENV-1)`);
            }
            else {
                const snapUnit = targetSnap.unit || 'pp';
                const envUnit = env.unit || 'pp';
                const normSnapUnit = snapUnit === 'percent' ? 'pp' : snapUnit;
                const normEnvUnit = envUnit === 'percent' ? 'pp' : envUnit;
                if (normSnapUnit !== normEnvUnit) {
                    errors.push(`Envelope unit ${env.unit} does not match snapshot unit ${targetSnap.unit} (C-INV-ENV-2)`);
                }
                const expectedBasis = exports.SNAPSHOT_PATH_PREDICTED_BASIS[targetSnap.source_field_path];
                if (!expectedBasis) {
                    errors.push(`Envelope applies_to_field_path ${env.applies_to_field_path} has no declared predicted basis in SNAPSHOT_PATH_PREDICTED_BASIS; a tolerance that cannot be adjudicated is refused (C-INV-ENV-2)`);
                }
                else if (env.basis !== expectedBasis) {
                    errors.push(`Envelope basis ${env.basis} does not match predicted basis ${expectedBasis} (C-INV-ENV-2)`);
                }
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateDecisionValidityAssessment(a) {
    const errors = [];
    if (!a.assessment_id)
        errors.push('assessment_id is required');
    if (!a.contract_id)
        errors.push('contract_id is required');
    if (!a.tenant_id)
        errors.push('tenant_id is required');
    if (!a.session_id)
        errors.push('session_id is required');
    if (!a.as_of)
        errors.push('as_of is required');
    if (!a.half_life_basis)
        errors.push('half_life_basis is required');
    if (a.calculation_mode !== 'deterministic_decision_validity') {
        errors.push('calculation_mode must be deterministic_decision_validity');
    }
    const states = [
        'STABLE',
        'WATCH',
        'DEGRADED',
        'REASSESS_REQUIRED',
        'INDETERMINATE'
    ];
    if (!states.includes(a.state)) {
        errors.push('state must be a DecisionValidityState');
    }
    if (a.half_life_basis) {
        if (a.half_life_basis.not_a_prediction_disclosure !== exports.NOT_A_PREDICTION_DISCLOSURE) {
            errors.push('not_a_prediction_disclosure must match NOT_A_PREDICTION_DISCLOSURE verbatim');
        }
        if (a.half_life_basis.quantitative_measure?.enables !== 'QUANTITATIVE_DECISION_HALF_LIFE') {
            errors.push('quantitative_measure must declare QUANTITATIVE_DECISION_HALF_LIFE');
        }
        for (const t of a.half_life_basis.triggers_evaluated) {
            if (t.outcome === 'UNASSESSABLE' && t.observed_value !== undefined) {
                errors.push(`TriggerEvaluation ${t.trigger_id}: UNASSESSABLE must not carry observed_value`);
            }
        }
    }
    if (!assertStableHasPositiveEvidence(a)) {
        errors.push('STABLE requires positive supporting evidence (W2)');
    }
    if (!assertIndeterminateOutranksStable(a)) {
        errors.push('INDETERMINATE outranks STABLE — unassessable assumptions cannot yield STABLE');
    }
    if (!assertValidityProposesNoAlternative(a)) {
        errors.push('Validity must not propose an alternative play');
    }
    if (!assertValidityReadNoEconomics(a)) {
        errors.push('Validity must not restate economic values');
    }
    if (!assertNoDurationSemantics(a)) {
        errors.push('Duration / countdown / expiry vocabulary present in assessment payload');
    }
    if (!assertNoHiddenValidityScalar(a)) {
        errors.push('Hidden validity scalar vocabulary present in assessment payload');
    }
    return { valid: errors.length === 0, errors };
}
function validateContractCreationRequest(r) {
    const errors = [];
    if (!r.tenant_id)
        errors.push('tenant_id is required');
    if (!r.session_id)
        errors.push('session_id is required');
    if (!r.created_as_of)
        errors.push('created_as_of is required');
    if (!r.campaign_intent)
        errors.push('campaign_intent is required');
    if (!r.resolution)
        errors.push('resolution is required');
    if (!r.frontier) {
        return {
            valid: false,
            errors: [...errors, 'RJ-C1: FRONTIER_NOT_EMITTED'],
            rejection_id: 'RJ-C1'
        };
    }
    // E1
    if (r.frontier.frontier_status !== 'EMITTED') {
        return {
            valid: false,
            errors: ['RJ-C1: FRONTIER_NOT_EMITTED'],
            rejection_id: 'RJ-C1'
        };
    }
    // E2
    const parties = [
        { tenant_id: r.tenant_id, session_id: r.session_id },
        { tenant_id: r.frontier.tenant_id, session_id: r.frontier.session_id }
    ];
    if (r.campaign_intent) {
        parties.push({
            tenant_id: r.campaign_intent.tenant_id,
            session_id: r.campaign_intent.session_id
        });
    }
    if (r.supersedes) {
        parties.push({ tenant_id: r.supersedes.tenant_id, session_id: r.supersedes.session_id });
    }
    if (!assertTenantSessionCoherent(...parties)) {
        return {
            valid: false,
            errors: ['RJ-C4: TENANT_SESSION_MISMATCH'],
            rejection_id: 'RJ-C4'
        };
    }
    // E4
    if (!r.resolution || !assertResolutionAttributed(r.resolution)) {
        return {
            valid: false,
            errors: ['RJ-C2: DECISION_NOT_RESOLVED'],
            rejection_id: 'RJ-C2'
        };
    }
    if (r.resolution.route === 'CONSTRAINT_RESOLVED' &&
        r.frontier.selection?.status !== 'SELECTED') {
        return {
            valid: false,
            errors: ['RJ-C2: DECISION_NOT_RESOLVED'],
            rejection_id: 'RJ-C2'
        };
    }
    // E5
    const play = r.frontier.plays?.find(p => p.play_id === r.resolution.selected_play_id);
    if (!play) {
        return {
            valid: false,
            errors: ['RJ-C5: PLAY_NOT_IN_FRONTIER'],
            rejection_id: 'RJ-C5'
        };
    }
    // E6 — U4 firewall
    if (!assertNonPromotionNotContractable(play) ||
        play.admissibility !== 'ADMISSIBLE') {
        const detail = play.admissibility === 'EXCLUDED_ECONOMICS_INCOMPLETE' ||
            play.play_kind === 'NON_PROMOTION'
            ? `RJ-C3: PLAY_NOT_CONTRACTABLE (NON_PROMOTION_REQUIRED_INPUT: ${campaign_frontier_model_1.NON_PROMOTION_REQUIRED_INPUT.field})`
            : 'RJ-C3: PLAY_NOT_CONTRACTABLE';
        return { valid: false, errors: [detail], rejection_id: 'RJ-C3' };
    }
    // E7
    if (play.readiness_reference?.state === 'DO_NOT_PROCEED') {
        const veto = play.readiness_reference.vetoes?.[0];
        const vetoDetail = veto
            ? ` veto=${veto.veto_id} basis=${veto.veto_basis}`
            : '';
        return {
            valid: false,
            errors: [`RJ-C3: PLAY_VETOED${vetoDetail}`],
            rejection_id: 'RJ-C3'
        };
    }
    // E9
    const hasScenarioZero = Boolean(r.frontier.scenario_zero) ||
        (r.frontier.plays ?? []).some(p => p.play_kind === 'DO_NOTHING');
    if (!hasScenarioZero) {
        return {
            valid: false,
            errors: ['RJ-C7: SCENARIO_ZERO_ABSENT'],
            rejection_id: 'RJ-C7'
        };
    }
    if (!assertNoDurationSemantics(r)) {
        errors.push('Duration / countdown vocabulary present in creation request');
    }
    if (!assertNoHiddenValidityScalar(r)) {
        errors.push('Hidden validity scalar vocabulary present in creation request');
    }
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    return { valid: true, errors: [] };
}
