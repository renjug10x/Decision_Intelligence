/**
 * CogniX CDI-07A — Decision Contract & Decision Half-Life
 *
 * A DecisionContract records a resolved decision and the exact basis on which it was
 * resolved. It never recomputes, re-ranks, or judges. Validity is a separate artefact
 * recomputed on demand at a caller-supplied as_of.
 *
 * Frozen in docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md §§2–9.
 */
import { ConfidenceBand, EvidenceStrength, ThresholdCalibrationStatus, ReadinessState, ReadinessVeto, ReadinessCondition, ReadinessDimensionId } from './campaign-readiness-model';
import { ComparisonSetInvariants, AmbientFrameStamp, UnavailableOutcomeDimension, ConstraintElimination, DeclaredConstraint, SelectionStatus, SelectionBasis, PlayKind, StrategyPlay, OutcomeFrontier } from './campaign-frontier-model';
import { CanonicalSignalType, SignalEntityType, SimulationPeriod } from './enterprise-signal-model';
import { CampaignIntent } from './campaign-intent-model';
/**
 * Gate §8.1 — CDI-04 / CDI-06 / ESF imports are bound here by use. The symbols below are
 * referenced so the dependency is load-bearing rather than a dangling import list:
 * evidence floor, Scenario 0 framing, readiness condition/state shapes.
 */
export declare const CDI07A_BOUND_EVIDENCE_STRENGTH_ORDER: EvidenceStrength[];
export declare const CDI07A_BOUND_SCENARIO_ZERO_FRAMING = "Do Nothing means no intervention. It does not mean no change \u2014 ambient demand movement continues either way, and is shown here.";
export type Cdi07aBoundReadinessCondition = ReadinessCondition;
export type Cdi07aBoundReadinessState = ReadinessState;
export type DecisionContractStatus = 'ACTIVE' | 'SUPERSEDED' | 'WITHDRAWN';
export type DecisionResolutionRoute = 'CONSTRAINT_RESOLVED' | 'HUMAN_RESOLVED';
export type RejectionCause = 'PARETO_DOMINATED' | 'REMOVED_BY_DECLARED_CONSTRAINT' | 'READINESS_VETOED' | 'EXCLUDED_ECONOMICS_INCOMPLETE' | 'INADMISSIBLE_MODEL_INTEGRITY' | 'INADMISSIBLE_UNSTATED_MECHANIC' | 'NOT_CHOSEN_BY_RESOLVER';
export type AssumptionClass = 'AMBIENT_FRAME' | 'DECISION_QUESTION' | 'DECLARED_CONSTRAINT' | 'READINESS_CONDITION' | 'CHOICE_SET' | 'ECONOMICS_COMPLETENESS';
export type TriggerClass = 'T-INTENT' | 'T-CONSTRAINT' | 'T-READINESS' | 'T-SIGNAL' | 'T-EVIDENCE';
export type TriggerEffect = 'WATCH' | 'DEGRADED' | 'REASSESS_REQUIRED';
export type TriggerOutcome = 'NOT_FIRED' | 'FIRED' | 'UNASSESSABLE';
export type DecisionValidityState = 'STABLE' | 'WATCH' | 'DEGRADED' | 'REASSESS_REQUIRED' | 'INDETERMINATE';
export type SignalMovementAttribution = 
/** decision_state_version changed between contract and assessment — our own parameter change. */
'SCENARIO_DRIVEN'
/** decision_state_version identical and the signal still moved — requires an independent source. */
 | 'WORLD_DRIVEN'
/** Version could not be resolved at either end. */
 | 'ATTRIBUTION_UNAVAILABLE';
/**
 * CDI-07A capabilities unlocked by an authoritative input. Additive and local: the CDI-05
 * `RequiredAuthoritativeInput.enables` union stays a `TimelineLens` and is not widened
 * (CDI-06 owner addendum R1 precedent).
 */
export type ValidityCapability = 'QUANTITATIVE_DECISION_HALF_LIFE' | 'WORLD_DRIVEN_SIGNAL_ATTRIBUTION';
/**
 * Structurally identical to the CDI-05 `RequiredAuthoritativeInput` — same provenance
 * semantics, same field names, same `status` — but `enables` names a CDI-07A validity
 * capability rather than a timeline lens. Declared locally so no upstream contract is edited.
 */
export interface ContractRequiredAuthoritativeInput {
    field: string;
    grain: string;
    why_required: string;
    inadmissible_substitutes: string[];
    enables: ValidityCapability;
    status: 'AWAITING_AUTHORITATIVE_SOURCE';
}
/**
 * Local twin of CDI-04 `ReadinessEvidenceRef` — same shape, wider `source_package` so a
 * contract can cite CDI-04/05/06 without widening the upstream union.
 */
export interface ContractEvidenceRef {
    source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06' | 'WP10-C' | 'ESF-1' | 'ESF-2';
    field_path: string;
    value: string | number | boolean;
    strength: EvidenceStrength;
    synthetic_demo: boolean;
    disclosure?: string;
}
export interface BoundArtefactRef {
    artefact: 'CAMPAIGN_INTENT' | 'OUTCOME_FRONTIER' | 'STRATEGY_PLAY' | 'COUNTERFACTUAL' | 'CAUSAL' | 'READINESS' | 'DECOMPOSITION';
    /** The stable identifier published by the owning package. */
    id: string;
    /** sha256 of the canonicalised artefact as it stood when the decision was resolved. */
    digest: string;
    /** True only for identifiers proven stable (gate §1.3 K3). */
    reproducible: boolean;
    /** Recorded because it names the run; never used to compare, resolve or re-derive. */
    run_marker?: string;
}
export interface SnapshotValue {
    /** Exact path in the owning package's payload. The owner remains authoritative. */
    source_field_path: string;
    source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06';
    value: number | string | boolean | null;
    unit?: string;
    strength: EvidenceStrength;
    /** Always false. Present so the guarantee is machine-checkable, not merely stated. */
    restated: false;
}
export interface RejectedAlternative {
    play_id: string;
    label: string;
    play_kind: PlayKind;
    cause: RejectionCause;
    /** For REMOVED_BY_DECLARED_CONSTRAINT — the CDI-06 elimination, copied verbatim. */
    elimination?: ConstraintElimination;
    /** For PARETO_DOMINATED — the dominating play ids, copied verbatim. */
    dominated_by?: string[];
    /** For READINESS_VETOED — the CDI-04 veto, copied verbatim. */
    veto?: ReadinessVeto;
    outcome_snapshot: SnapshotValue[];
}
export interface ScenarioZeroContractRecord {
    play_id: string;
    was_selected: boolean;
    dominated: boolean;
    dominated_by: string[];
    outcome_snapshot: SnapshotValue[];
    /** CDI-06 SCENARIO_ZERO_FRAMING, imported verbatim. */
    framing: string;
}
export interface DecisionContractBasis {
    campaign_intent_ref: BoundArtefactRef;
    frontier_ref: BoundArtefactRef;
    selected_play_ref: BoundArtefactRef;
    counterfactual_ref: BoundArtefactRef;
    causal_ref: BoundArtefactRef;
    readiness_ref?: BoundArtefactRef;
    /** Verbatim copies. Transcription only — C-INV-4. */
    outcome_snapshot: SnapshotValue[];
    decomposition_snapshot: SnapshotValue[];
    readiness_snapshot?: SnapshotValue[];
    rejected_alternatives: RejectedAlternative[];
    scenario_zero: ScenarioZeroContractRecord;
    comparison_invariants: ComparisonSetInvariants;
    ambient_frame: AmbientFrameStamp;
    unavailable_at_decision: UnavailableOutcomeDimension[];
    generation_policy_version: string;
    dominance_epsilon: Record<string, number>;
}
export interface DecisionResolution {
    route: DecisionResolutionRoute;
    selected_play_id: string;
    /** R1 only — copied verbatim from FrontierSelection. Never re-derived. */
    selection_status?: SelectionStatus;
    selection_basis?: SelectionBasis;
    constraints_in_force?: DeclaredConstraint[];
    eliminations?: ConstraintElimination[];
    /** R2 only — mandatory, never defaulted, never inferred from a session or a header. */
    resolved_by?: string;
    resolution_statement?: string;
    /** R2 only — the survivor set the resolver was choosing from, as displayed. */
    presented_alternatives?: string[];
    /** R2 only — true when the resolver picked against the constraint chain's own survivor. */
    contradicts_constraint_selection?: boolean;
}
export interface ContractWithdrawal {
    withdrawn_by: string;
    statement: string;
    withdrawn_as_of: string;
    prompted_by_assessment_id?: string;
}
export interface DecisionAssumption {
    assumption_id: string;
    assumption_class: AssumptionClass;
    statement: string;
    basis_field_path: string;
    source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06' | 'ESF-1' | 'ESF-2';
    held_at_resolution: string | number | boolean | null;
    strength: EvidenceStrength;
    load_bearing: boolean;
    trigger_ids: string[];
    /** Required when trigger_ids is empty — why it cannot be evaluated at this baseline. */
    not_evaluable_reason?: string;
}
export interface SignalValidityReference {
    signal_type: CanonicalSignalType;
    entity_type: SignalEntityType;
    entity_id: string;
    timeline_id?: string;
    contracted_period: SimulationPeriod;
    contracted_value: number;
    contracted_delta_pct: number;
    contracted_confidence: number;
    contracted_quality: number;
    contracted_decision_state_id: string;
    contracted_decision_state_version: number;
    movement_threshold_pct: number;
    threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT';
    threshold_basis: string;
}
export interface DecisionTrigger {
    trigger_id: string;
    trigger_class: TriggerClass;
    assumption_id: string;
    statement: string;
    /** Shape aligned to ReadinessChangeTrigger — same field names, same meanings. */
    field_path: string;
    contracted_value: string | number | boolean | null;
    direction: 'INCREASE' | 'DECREASE' | 'BECOMES_TRUE' | 'BECOMES_FALSE' | 'DIFFERS';
    threshold?: string | number;
    threshold_calibration: ThresholdCalibrationStatus;
    threshold_basis?: string;
    /** T-READINESS only — the CDI-04 trigger this defers to. Never a reimplementation. */
    readiness_trigger_ref?: {
        dimension: ReadinessDimensionId;
        field_path: string;
        threshold_id?: string;
    };
    /** T-SIGNAL only — gate §7.2. */
    signal_ref?: SignalValidityReference;
    on_fire: TriggerEffect;
    on_fire_disclosure: string;
}
export interface TriggerEvaluation {
    trigger_id: string;
    outcome: TriggerOutcome;
    /** Absent when UNASSESSABLE — never defaulted to the contracted value. */
    observed_value?: string | number | boolean | null;
    unassessable_reason?: string;
    statement?: string;
    /** T-SIGNAL only — whether the movement came from the world or from our own scenario. */
    movement_attribution?: SignalMovementAttribution;
}
export interface UnassessableAssumption {
    assumption_id: string;
    reason: string;
}
export interface HalfLifeBasis {
    determining_trigger_id?: string;
    determining_assumption_id?: string;
    triggers_evaluated: TriggerEvaluation[];
    unassessable_assumptions: UnassessableAssumption[];
    /** Mandatory, verbatim from NOT_A_PREDICTION_DISCLOSURE. */
    not_a_prediction_disclosure: string;
    quantitative_measure: ContractRequiredAuthoritativeInput;
}
/**
 * Recomputed on demand at a caller-supplied as_of. Never written back to the contract.
 * No duration, countdown, expiry, decay or remaining-percentage fields — C-INV-9.
 */
export interface DecisionValidityAssessment {
    assessment_id: string;
    contract_id: string;
    contract_version: number;
    tenant_id: string;
    session_id: string;
    state: DecisionValidityState;
    /** Caller-supplied reference instant. Never Date.now(). */
    as_of: string;
    half_life_basis: HalfLifeBasis;
    /** Signal refs that were evaluated for this assessment. */
    signal_refs: SignalValidityReference[];
    evidence_refs: ContractEvidenceRef[];
    evidence_strength_floor: EvidenceStrength;
    confidence_band: ConfidenceBand;
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
    calculation_mode: 'deterministic_decision_validity';
}
/** Local structural twin — CDI-06 R1 / CDI-07A §8.2 precedent. Avoids a module cycle:
 *  campaign-learning-loop-model already imports this file, so QuantityBasis cannot be imported back. */
export type ContractQuantityBasis = 'ATTRIBUTABLE' | 'GROSS' | 'MODELLED_MONETARY';
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
export declare const SNAPSHOT_PATH_PREDICTED_BASIS: Readonly<Record<string, ContractQuantityBasis>>;
export interface DeclaredPredictionEnvelope {
    envelope_id: string;
    /** Must equal a source_field_path present in basis.outcome_snapshot or basis.decomposition_snapshot. */
    applies_to_field_path: string;
    /** Signed, in `unit`, relative to the predicted value. lower <= 0 <= upper is NOT required. */
    lower: number;
    upper: number;
    /** Must equal the snapshot's unit at applies_to_field_path. */
    unit: string;
    /** Must equal the predicted basis for that path. */
    basis: ContractQuantityBasis;
    /** Named accountable human. Mandatory, never defaulted, never inferred from session or header. */
    declared_by: string;
    /** Why this tolerance. Mandatory. */
    declaration_statement: string;
    /** Closed single members — these are not statistical intervals and must never render as one. */
    tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE';
    derivation: 'HUMAN_DECLARED';
    /** Z2. Only ESF-6 can raise this above NONE. */
    pre_declaration_witness: 'NONE' | 'SERVER_REGISTRATION_RECEIPT';
}
export interface DecisionContract {
    /** Content-derived — never time-derived (C-INV-3). */
    contract_id: string;
    contract_version: number;
    status: DecisionContractStatus;
    tenant_id: string;
    session_id: string;
    /**
     * Owner ruling — decision basis integrity. Immutable, content-derived, computed over the
     * canonical inputs in DECISION_BASIS_DIGEST_INPUTS / gate §2.8. It BINDS the basis; it does
     * not REPLACE any source reference — every BoundArtefactRef remains published in `basis`.
     */
    decision_basis_digest: string;
    basis: DecisionContractBasis;
    resolution: DecisionResolution;
    assumptions: DecisionAssumption[];
    triggers: DecisionTrigger[];
    /** CDI-08 / Z1. Covered by contract_digest. NOT an input to decision_basis_digest.
     *  Never inferred from observed outcomes. Never derived from a CDI-04/CDI-05 confidence band. */
    prediction_envelopes: DeclaredPredictionEnvelope[];
    supersedes?: DecisionContractReference;
    superseded_by?: DecisionContractReference;
    withdrawal?: ContractWithdrawal;
    unavailable_capabilities: ContractRequiredAuthoritativeInput[];
    evidence_refs: ContractEvidenceRef[];
    evidence_strength_floor: EvidenceStrength;
    confidence_band: ConfidenceBand;
    calculation_mode: 'deterministic_decision_contract';
    synthetic_demo: boolean;
    schema_version: string;
    provenance: Record<string, string>;
    /** Caller-supplied reference instant. Never an input to validity age arithmetic (C-INV-9). */
    created_as_of: string;
}
export interface DecisionContractReference {
    contract_id: string;
    contract_version: number;
    /** sha256 of the canonicalised immutable contract body. */
    contract_digest: string;
    decision_basis_digest: string;
    tenant_id: string;
    session_id: string;
    status: DecisionContractStatus;
}
/**
 * Creation request. The frontier and intent are supplied by the caller — creation never
 * re-runs CDI-01/CDI-06 to obtain them (C-INV-1, §3.5).
 */
export interface ContractCreationRequest {
    tenant_id: string;
    session_id: string;
    frontier: OutcomeFrontier;
    campaign_intent: CampaignIntent;
    resolution: DecisionResolution;
    created_as_of: string;
    supersedes?: DecisionContractReference;
    prediction_envelopes?: DeclaredPredictionEnvelope[];
}
/**
 * Immutable contract body for `contract_digest`. Lifecycle fields that may change after
 * creation (`status`, `superseded_by`, `withdrawal`) are excluded so a superseded contract's
 * digest equals what it was while active.
 */
export type ImmutableContractBody = Omit<DecisionContract, 'status' | 'superseded_by' | 'withdrawal'>;
/**
 * The sixteen canonical inputs to `decision_basis_digest`, in fixed order (gate §2.8).
 * Labels only — the digest algorithm reads the live basis fields in this sequence.
 */
export declare const DECISION_BASIS_DIGEST_INPUTS: readonly string[];
export declare const QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT: ContractRequiredAuthoritativeInput;
/** Mandatory disclosure wherever validity is surfaced (gate §5.5). */
export declare const NOT_A_PREDICTION_DISCLOSURE: string;
/** Asymmetry 1 disclosure on every T-SIGNAL evaluation (gate §7.4). */
export declare const SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE: string;
/** Asymmetry 2 disclosure when movement is SCENARIO_DRIVEN (gate §7.4). */
export declare const SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE = "This signal moved because the scenario parameters changed, not because the world did.";
/**
 * Asymmetry 2 disclosure when movement cannot be attributed (gate §7.4).
 * WORLD_DRIVEN requires an observation source independent of Shared Decision State, which
 * CDI-07A does not take a dependency on. Absent one, the honest answer is that we could not
 * tell world movement from our own parameter change — never a fabricated WORLD_DRIVEN claim.
 */
export declare const ATTRIBUTION_UNAVAILABLE_DISCLOSURE: string;
/**
 * Gate §7.4 / CDI-07B X1 — provenances that may establish WORLD_DRIVEN when non-synthetic.
 * Prefer OBSERVATION_INDEPENDENT_SOURCE_TYPES / isWorldDrivenAdmissibleSourceType.
 * Retained as the historical single literal for EXTERNAL_CONNECTOR-only call sites.
 */
export declare const WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE = "EXTERNAL_CONNECTOR";
/**
 * X1 — synthetic provenance can never establish WORLD_DRIVEN. Source-type test is independent
 * and evaluated only after synthetic is ruled out.
 */
export declare function isWorldDrivenAdmissibleSourceType(sourceType: string | undefined, opts?: {
    synthetic_demo?: boolean;
}): boolean;
/** Snapshot authority statement (gate §2.6). */
export declare const SNAPSHOT_AUTHORITY_DISCLOSURE: string;
/**
 * Lexicographic object keys at every depth; `null` preserved; `undefined` omitted.
 * Arrays keep element order (callers must pre-sort where the digest requires an order key).
 */
export declare function canonicalJson(value: unknown): string;
export declare function sha256Hex(s: string): string;
/**
 * sha256 over the §2.8 sixteen-input tuple under canonicalJson rules.
 * Excludes run_marker, evaluation_id, created_as_of, status, resolution, assumptions,
 * triggers, provenance and evidence_refs — those are facts about the contract, not the basis.
 */
export declare function computeDecisionBasisDigest(basis: DecisionContractBasis): string;
/**
 * sha256 of the immutable contract body. Distinct from `decision_basis_digest`.
 * Omits lifecycle fields that may change after creation (`status`, `superseded_by`,
 * `withdrawal`) so a superseded contract's digest equals what it was while active.
 */
export declare function computeContractDigest(contract: ImmutableContractBody | DecisionContract): string;
/**
 * C-INV-9 / §5.7 — KEY and VALUE scans for duration / countdown / expiry vocabulary.
 * Scoped to the prohibited patterns in the gate so imported constants such as
 * SCENARIO_ZERO_FRAMING (which contain no duration vocabulary) do not false-positive.
 */
export declare function assertNoDurationSemantics(payload: unknown): boolean;
/** AC-27 — no hidden score / weight / composite / ranking / utility scalar, even unused. */
export declare function assertNoHiddenValidityScalar(payload: unknown): boolean;
/**
 * Owner ruling W2 — STABLE requires positive supporting evidence: every trigger NOT_FIRED
 * with a populated observed_value, and unassessable_assumptions empty. An empty trigger set
 * is absence of evidence, not stability.
 */
export declare function assertStableHasPositiveEvidence(assessment: DecisionValidityAssessment): boolean;
/**
 * §5.4 — INDETERMINATE outranks STABLE. Any unassessable assumption with state STABLE is illegal.
 */
export declare function assertIndeterminateOutranksStable(assessment: DecisionValidityAssessment): boolean;
/**
 * E6 / U4 firewall — returns true iff the play is contractable (not excluded economics).
 * Non-promotion with EXCLUDED_ECONOMICS_INCOMPLETE is never contractable by any route.
 */
export declare function assertNonPromotionNotContractable(play: Pick<StrategyPlay, 'admissibility' | 'play_kind'>): boolean;
/**
 * Resolution must be attributed — R1 SELECTED, or R2 a named resolver (never defaulted) who
 * stated their reason. A HUMAN_RESOLVED contract has to be auditable as who decided, what was
 * selected and why; `created_as_of` carries the caller-supplied reference instant.
 */
export declare function assertResolutionAttributed(resolution: DecisionResolution): boolean;
/** Scenario 0 is mandatory on every contract basis (§9.3). */
export declare function assertScenarioZeroRecorded(basis: DecisionContractBasis): boolean;
/** Evidence strength floor across snapshot / assumption / evidence strengths — CDI-04 helper. */
export declare function contractEvidenceStrengthFloor(strengths: EvidenceStrength[]): EvidenceStrength;
/** C-INV-7 — validity never names an alternative play. */
export declare function assertValidityProposesNoAlternative(assessment: DecisionValidityAssessment): boolean;
/** C-INV-7 — validity never restates an economic value. */
export declare function assertValidityReadNoEconomics(assessment: DecisionValidityAssessment): boolean;
/**
 * §7.4 — every assessed T-SIGNAL evaluation must carry a movement attribution.
 * UNASSESSABLE may omit it or use ATTRIBUTION_UNAVAILABLE; never fabricate WORLD_DRIVEN.
 */
export declare function assertSignalMovementAttributed(evaluation: TriggerEvaluation): boolean;
/** C-INV-10 — every reference agrees on tenant_id and session_id. */
export declare function assertTenantSessionCoherent(...ids: Array<{
    tenant_id: string;
    session_id: string;
}>): boolean;
/**
 * C-INV-11 — decision_basis_digest binds the basis and replaces no source reference.
 * All BoundArtefactRef ids must remain published and must not equal the digest.
 */
export declare function assertBasisDigestReplacesNoReference(basis: DecisionContractBasis, digest: string): boolean;
/**
 * Determinism check: identical basis inputs yield a byte-identical digest across two
 * recomputations (AC-52). Permanent regression, not a one-off check.
 */
export declare function assertBasisDigestDeterministic(basis: DecisionContractBasis): boolean;
/**
 * C-INV-5 / §4.1 — A DecisionContract has no mutation path for basis, resolution,
 * assumptions or triggers. There is no PATCH. Status may only move
 * ACTIVE → SUPERSEDED | WITHDRAWN, recorded as new facts, never as edits to the
 * immutable body. This helper compares the immutable digests of two snapshots:
 * they must be byte-identical whenever only a lifecycle transition occurred.
 */
export declare function assertContractImmutable(before: DecisionContract, after: DecisionContract): boolean;
/**
 * C-INV-4 — Snapshot values are transcribed, not derived. Exact equality against the
 * source artefact map; any rounding, unit conversion, aggregation or renaming fails.
 */
export declare function assertBasisTranscribedNotRecomputed(snapshots: SnapshotValue[], sourceValues: Map<string, string | number | boolean | null> | Record<string, string | number | boolean | null>): {
    ok: boolean;
    errors: string[];
};
export declare function validateDecisionContract(c: DecisionContract): {
    valid: boolean;
    errors: string[];
};
export declare function validateDecisionValidityAssessment(a: DecisionValidityAssessment): {
    valid: boolean;
    errors: string[];
};
export declare function validateContractCreationRequest(r: Partial<ContractCreationRequest>): {
    valid: boolean;
    errors: string[];
    rejection_id?: string;
};
