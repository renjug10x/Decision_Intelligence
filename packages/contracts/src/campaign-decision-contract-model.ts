/**
 * CogniX CDI-07A — Decision Contract & Decision Half-Life
 *
 * A DecisionContract records a resolved decision and the exact basis on which it was
 * resolved. It never recomputes, re-ranks, or judges. Validity is a separate artefact
 * recomputed on demand at a caller-supplied as_of.
 *
 * Frozen in docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md §§2–9.
 */

import { createHash } from 'crypto';
import {
  ConfidenceBand,
  EvidenceStrength,
  EVIDENCE_STRENGTH_ORDER,
  ThresholdCalibrationStatus,
  ReadinessState,
  ReadinessVeto,
  ReadinessCondition,
  ReadinessDimensionId,
  weakestEvidenceStrength
} from './campaign-readiness-model';
import {
  ComparisonSetInvariants,
  AmbientFrameStamp,
  UnavailableOutcomeDimension,
  ConstraintElimination,
  DeclaredConstraint,
  SelectionStatus,
  SelectionBasis,
  PlayKind,
  StrategyPlay,
  OutcomeFrontier,
  SCENARIO_ZERO_FRAMING,
  NON_PROMOTION_REQUIRED_INPUT
} from './campaign-frontier-model';
import {
  CanonicalSignalType,
  SignalEntityType,
  SimulationPeriod
} from './enterprise-signal-model';
import { CampaignIntent } from './campaign-intent-model';

/**
 * Gate §8.1 — CDI-04 / CDI-06 / ESF imports are bound here by use. The symbols below are
 * referenced so the dependency is load-bearing rather than a dangling import list:
 * evidence floor, Scenario 0 framing, readiness condition/state shapes.
 */
export const CDI07A_BOUND_EVIDENCE_STRENGTH_ORDER = EVIDENCE_STRENGTH_ORDER;
export const CDI07A_BOUND_SCENARIO_ZERO_FRAMING = SCENARIO_ZERO_FRAMING;
export type Cdi07aBoundReadinessCondition = ReadinessCondition;
export type Cdi07aBoundReadinessState = ReadinessState;

// ---------------------------------------------------------------------------
// §2 — Decision Contract domain model
// ---------------------------------------------------------------------------

export type DecisionContractStatus = 'ACTIVE' | 'SUPERSEDED' | 'WITHDRAWN';

export type DecisionResolutionRoute = 'CONSTRAINT_RESOLVED' | 'HUMAN_RESOLVED';

export type RejectionCause =
  | 'PARETO_DOMINATED'
  | 'REMOVED_BY_DECLARED_CONSTRAINT'
  | 'READINESS_VETOED'
  | 'EXCLUDED_ECONOMICS_INCOMPLETE'
  | 'INADMISSIBLE_MODEL_INTEGRITY'
  | 'INADMISSIBLE_UNSTATED_MECHANIC'
  | 'NOT_CHOSEN_BY_RESOLVER';

export type AssumptionClass =
  | 'AMBIENT_FRAME'
  | 'DECISION_QUESTION'
  | 'DECLARED_CONSTRAINT'
  | 'READINESS_CONDITION'
  | 'CHOICE_SET'
  | 'ECONOMICS_COMPLETENESS';

export type TriggerClass = 'T-INTENT' | 'T-CONSTRAINT' | 'T-READINESS' | 'T-SIGNAL' | 'T-EVIDENCE';

export type TriggerEffect = 'WATCH' | 'DEGRADED' | 'REASSESS_REQUIRED';

export type TriggerOutcome = 'NOT_FIRED' | 'FIRED' | 'UNASSESSABLE';

export type DecisionValidityState =
  | 'STABLE'
  | 'WATCH'
  | 'DEGRADED'
  | 'REASSESS_REQUIRED'
  | 'INDETERMINATE';

export type SignalMovementAttribution =
  /** decision_state_version changed between contract and assessment — our own parameter change. */
  | 'SCENARIO_DRIVEN'
  /** decision_state_version identical and the signal still moved — requires an independent source. */
  | 'WORLD_DRIVEN'
  /** Version could not be resolved at either end. */
  | 'ATTRIBUTION_UNAVAILABLE';

/**
 * CDI-07A capabilities unlocked by an authoritative input. Additive and local: the CDI-05
 * `RequiredAuthoritativeInput.enables` union stays a `TimelineLens` and is not widened
 * (CDI-06 owner addendum R1 precedent).
 */
export type ValidityCapability =
  | 'QUANTITATIVE_DECISION_HALF_LIFE'
  | 'WORLD_DRIVEN_SIGNAL_ATTRIBUTION';

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
  artefact:
    | 'CAMPAIGN_INTENT'
    | 'OUTCOME_FRONTIER'
    | 'STRATEGY_PLAY'
    | 'COUNTERFACTUAL'
    | 'CAUSAL'
    | 'READINESS'
    | 'DECOMPOSITION';
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
}

/**
 * Immutable contract body for `contract_digest`. Lifecycle fields that may change after
 * creation (`status`, `superseded_by`, `withdrawal`) are excluded so a superseded contract's
 * digest equals what it was while active.
 */
export type ImmutableContractBody = Omit<
  DecisionContract,
  'status' | 'superseded_by' | 'withdrawal'
>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The sixteen canonical inputs to `decision_basis_digest`, in fixed order (gate §2.8).
 * Labels only — the digest algorithm reads the live basis fields in this sequence.
 */
export const DECISION_BASIS_DIGEST_INPUTS: readonly string[] = [
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

export const QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT: ContractRequiredAuthoritativeInput = {
  field: 'observed_decision_validity_outcome_series',
  grain:
    'per resolved decision, per assumption, with the observed instant at which the assumption ceased to hold',
  why_required:
    'a duration, decay rate or expiry claim asserts that validity is a function of elapsed time; ' +
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
export const NOT_A_PREDICTION_DISCLOSURE =
  'CogniX does not estimate how long this decision remains valid. It reports whether the assumptions ' +
  'it was decided on still hold, and names the ones that have moved.';

/** Asymmetry 1 disclosure on every T-SIGNAL evaluation (gate §7.4). */
export const SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE =
  'This decision was resolved with enterprise signals excluded from the counterfactual, so that ' +
  'competing strategies shared one baseline. This signal movement did not change the decision\'s ' +
  'figures. It indicates that the world has moved since the decision was framed.';

/** Asymmetry 2 disclosure when movement is SCENARIO_DRIVEN (gate §7.4). */
export const SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE =
  'This signal moved because the scenario parameters changed, not because the world did.';

/**
 * Asymmetry 2 disclosure when movement cannot be attributed (gate §7.4).
 * WORLD_DRIVEN requires an observation source independent of Shared Decision State, which
 * CDI-07A does not take a dependency on. Absent one, the honest answer is that we could not
 * tell world movement from our own parameter change — never a fabricated WORLD_DRIVEN claim.
 */
export const ATTRIBUTION_UNAVAILABLE_DISCLOSURE =
  'CogniX could not distinguish movement in the world from movement caused by a change to the ' +
  'scenario parameters. No observation source independent of Shared Decision State was available.';

/**
 * Gate §7.4 — the only provenance that makes WORLD_DRIVEN attribution truthful at any baseline.
 * ESF-3 external connectors carry it; ESF-1/ESF-2 re-simulation never does.
 */
export const WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE = 'EXTERNAL_CONNECTOR';

/** Snapshot authority statement (gate §2.6). */
export const SNAPSHOT_AUTHORITY_DISCLOSURE =
  'These values are the CDI-02 and CDI-06 outputs recorded at the moment this decision was resolved. ' +
  'The originating packages remain authoritative. Nothing here has been recalculated.';

// ---------------------------------------------------------------------------
// Prohibited vocabulary (gate §5.7, AC-21/22/27)
// ---------------------------------------------------------------------------

/** Duration / countdown / expiry keys — deliberately excludes bare `half_life` so `half_life_basis` is legal. */
const DURATION_KEY_RE =
  /half_life_hours|remaining_hours|hours_remaining|valid_until|valid_for|expires|expiry|ttl|countdown|decay_rate|decay_curve|validity_pct|validity_score|percent_remaining|age_hours|elapsed|time_to_live/i;

/** Value forms like "36h remaining" / "2 days left" — the UX_DESIGN_PRINCIPLES.md:163 example. */
const DURATION_VALUE_RE =
  /\b\d+\s*(h|hr|hrs|hours|d|days)\s*(remaining|left|to go)\b/i;

const DURATION_PHRASE_RE = /hours remaining|days remaining|\b36h\b/i;

const HIDDEN_VALIDITY_SCALAR_KEY_RE =
  /score|weight|composite|utility|ranking|rank_index|priority_value|volatility_index/i;

const ALTERNATIVE_PROPOSAL_KEY_RE =
  /selected_play|alternative_play|recommended_play|suggested_play|better_play|next_play/i;

const ECONOMIC_RESTATEMENT_KEY_RE =
  /contribution_delta|attributable_volume|revenue_delta|uplift_pp|axis_value|outcome_snapshot|decomposition_snapshot/i;

// ---------------------------------------------------------------------------
// Canonicalisation & digests
// ---------------------------------------------------------------------------

/**
 * Lexicographic object keys at every depth; `null` preserved; `undefined` omitted.
 * Arrays keep element order (callers must pre-sort where the digest requires an order key).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(v => (v === undefined ? null : canonicalize(v)));
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    if (obj[key] === undefined) continue;
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function sortSnapshots(snapshots: SnapshotValue[]): SnapshotValue[] {
  return [...snapshots].sort((a, b) => a.source_field_path.localeCompare(b.source_field_path));
}

function refIdDigest(ref: BoundArtefactRef): { id: string; digest: string } {
  return { id: ref.id, digest: ref.digest };
}

/**
 * sha256 over the §2.8 sixteen-input tuple under canonicalJson rules.
 * Excludes run_marker, evaluation_id, created_as_of, status, resolution, assumptions,
 * triggers, provenance and evidence_refs — those are facts about the contract, not the basis.
 */
export function computeDecisionBasisDigest(basis: DecisionContractBasis): string {
  const tuple: unknown[] = [
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
    [...basis.unavailable_at_decision].sort((a, b) =>
      a.dimension_id.localeCompare(b.dimension_id)
    ),
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
export function computeContractDigest(
  contract: ImmutableContractBody | DecisionContract
): string {
  const {
    status: _status,
    superseded_by: _supersededBy,
    withdrawal: _withdrawal,
    ...immutable
  } = contract as DecisionContract;
  void _status;
  void _supersededBy;
  void _withdrawal;
  return sha256Hex(canonicalJson(immutable));
}

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

function collectKeys(obj: unknown, out: string[] = []): string[] {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) collectKeys(item, out);
    } else {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out.push(k);
        collectKeys(v, out);
      }
    }
  }
  return out;
}

function collectStringValues(obj: unknown, out: string[] = []): string[] {
  if (typeof obj === 'string') {
    out.push(obj);
    return out;
  }
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) collectStringValues(item, out);
    } else {
      for (const v of Object.values(obj as Record<string, unknown>)) {
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
export function assertNoDurationSemantics(payload: unknown): boolean {
  const keys = collectKeys(payload);
  if (keys.some(k => DURATION_KEY_RE.test(k))) return false;
  const values = collectStringValues(payload);
  if (values.some(v => DURATION_VALUE_RE.test(v) || DURATION_PHRASE_RE.test(v))) return false;
  return true;
}

/** AC-27 — no hidden score / weight / composite / ranking / utility scalar, even unused. */
export function assertNoHiddenValidityScalar(payload: unknown): boolean {
  return !collectKeys(payload).some(k => HIDDEN_VALIDITY_SCALAR_KEY_RE.test(k));
}

/**
 * Owner ruling W2 — STABLE requires positive supporting evidence: every trigger NOT_FIRED
 * with a populated observed_value, and unassessable_assumptions empty. An empty trigger set
 * is absence of evidence, not stability.
 */
export function assertStableHasPositiveEvidence(
  assessment: DecisionValidityAssessment
): boolean {
  if (assessment.state !== 'STABLE') return true;
  const { triggers_evaluated, unassessable_assumptions } = assessment.half_life_basis;
  if (unassessable_assumptions.length > 0) return false;
  if (triggers_evaluated.length === 0) return false;
  return triggers_evaluated.every(
    t => t.outcome === 'NOT_FIRED' && t.observed_value !== undefined
  );
}

/**
 * §5.4 — INDETERMINATE outranks STABLE. Any unassessable assumption with state STABLE is illegal.
 */
export function assertIndeterminateOutranksStable(
  assessment: DecisionValidityAssessment
): boolean {
  if (
    assessment.half_life_basis.unassessable_assumptions.length > 0 &&
    assessment.state === 'STABLE'
  ) {
    return false;
  }
  return true;
}

/**
 * E6 / U4 firewall — returns true iff the play is contractable (not excluded economics).
 * Non-promotion with EXCLUDED_ECONOMICS_INCOMPLETE is never contractable by any route.
 */
export function assertNonPromotionNotContractable(
  play: Pick<StrategyPlay, 'admissibility' | 'play_kind'>
): boolean {
  if (play.admissibility === 'EXCLUDED_ECONOMICS_INCOMPLETE') return false;
  if (play.play_kind === 'NON_PROMOTION') return false;
  return true;
}

/**
 * Resolution must be attributed — R1 SELECTED, or R2 a named resolver (never defaulted) who
 * stated their reason. A HUMAN_RESOLVED contract has to be auditable as who decided, what was
 * selected and why; `created_as_of` carries the caller-supplied reference instant.
 */
export function assertResolutionAttributed(resolution: DecisionResolution): boolean {
  if (!resolution.selected_play_id) return false;
  if (resolution.route === 'CONSTRAINT_RESOLVED') {
    return resolution.selection_status === 'SELECTED';
  }
  if (resolution.route === 'HUMAN_RESOLVED') {
    return (
      Boolean(resolution.resolved_by && resolution.resolved_by.trim().length > 0) &&
      Boolean(resolution.resolution_statement && resolution.resolution_statement.trim().length > 0)
    );
  }
  return false;
}

/** Scenario 0 is mandatory on every contract basis (§9.3). */
export function assertScenarioZeroRecorded(basis: DecisionContractBasis): boolean {
  const z = basis.scenario_zero;
  return Boolean(
    z &&
      z.play_id &&
      typeof z.was_selected === 'boolean' &&
      typeof z.dominated === 'boolean' &&
      Array.isArray(z.dominated_by) &&
      Array.isArray(z.outcome_snapshot) &&
      typeof z.framing === 'string' &&
      z.framing.length > 0
  );
}

/** Evidence strength floor across snapshot / assumption / evidence strengths — CDI-04 helper. */
export function contractEvidenceStrengthFloor(
  strengths: EvidenceStrength[]
): EvidenceStrength {
  return weakestEvidenceStrength(strengths);
}

/** C-INV-7 — validity never names an alternative play. */
export function assertValidityProposesNoAlternative(
  assessment: DecisionValidityAssessment
): boolean {
  return !collectKeys(assessment).some(k => ALTERNATIVE_PROPOSAL_KEY_RE.test(k));
}

/** C-INV-7 — validity never restates an economic value. */
export function assertValidityReadNoEconomics(
  assessment: DecisionValidityAssessment
): boolean {
  return !collectKeys(assessment).some(k => ECONOMIC_RESTATEMENT_KEY_RE.test(k));
}

/**
 * §7.4 — every assessed T-SIGNAL evaluation must carry a movement attribution.
 * UNASSESSABLE may omit it or use ATTRIBUTION_UNAVAILABLE; never fabricate WORLD_DRIVEN.
 */
export function assertSignalMovementAttributed(evaluation: TriggerEvaluation): boolean {
  if (evaluation.outcome === 'UNASSESSABLE') {
    return (
      evaluation.movement_attribution === undefined ||
      evaluation.movement_attribution === 'ATTRIBUTION_UNAVAILABLE'
    );
  }
  return (
    evaluation.movement_attribution === 'SCENARIO_DRIVEN' ||
    evaluation.movement_attribution === 'WORLD_DRIVEN' ||
    evaluation.movement_attribution === 'ATTRIBUTION_UNAVAILABLE'
  );
}

/** C-INV-10 — every reference agrees on tenant_id and session_id. */
export function assertTenantSessionCoherent(
  ...ids: Array<{ tenant_id: string; session_id: string }>
): boolean {
  if (ids.length === 0) return true;
  const { tenant_id, session_id } = ids[0];
  if (!tenant_id || !session_id) return false;
  return ids.every(x => x.tenant_id === tenant_id && x.session_id === session_id);
}

/**
 * C-INV-11 — decision_basis_digest binds the basis and replaces no source reference.
 * All BoundArtefactRef ids must remain published and must not equal the digest.
 */
export function assertBasisDigestReplacesNoReference(
  basis: DecisionContractBasis,
  digest: string
): boolean {
  if (!digest) return false;
  const refs: BoundArtefactRef[] = [
    basis.campaign_intent_ref,
    basis.frontier_ref,
    basis.selected_play_ref,
    basis.counterfactual_ref,
    basis.causal_ref,
    ...(basis.readiness_ref ? [basis.readiness_ref] : [])
  ];
  for (const r of refs) {
    if (!r.id || !r.digest) return false;
    if (r.id === digest) return false;
  }
  return true;
}

/**
 * Determinism check: identical basis inputs yield a byte-identical digest across two
 * recomputations (AC-52). Permanent regression, not a one-off check.
 */
export function assertBasisDigestDeterministic(basis: DecisionContractBasis): boolean {
  return computeDecisionBasisDigest(basis) === computeDecisionBasisDigest(basis);
}

/**
 * C-INV-5 / §4.1 — A DecisionContract has no mutation path for basis, resolution,
 * assumptions or triggers. There is no PATCH. Status may only move
 * ACTIVE → SUPERSEDED | WITHDRAWN, recorded as new facts, never as edits to the
 * immutable body. This helper compares the immutable digests of two snapshots:
 * they must be byte-identical whenever only a lifecycle transition occurred.
 */
export function assertContractImmutable(
  before: DecisionContract,
  after: DecisionContract
): boolean {
  return (
    before.contract_id === after.contract_id &&
    before.decision_basis_digest === after.decision_basis_digest &&
    computeContractDigest(before) === computeContractDigest(after) &&
    canonicalJson(before.basis) === canonicalJson(after.basis) &&
    canonicalJson(before.resolution) === canonicalJson(after.resolution) &&
    canonicalJson(before.assumptions) === canonicalJson(after.assumptions) &&
    canonicalJson(before.triggers) === canonicalJson(after.triggers)
  );
}

/**
 * C-INV-4 — Snapshot values are transcribed, not derived. Exact equality against the
 * source artefact map; any rounding, unit conversion, aggregation or renaming fails.
 */
export function assertBasisTranscribedNotRecomputed(
  snapshots: SnapshotValue[],
  sourceValues:
    | Map<string, string | number | boolean | null>
    | Record<string, string | number | boolean | null>
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const map =
    sourceValues instanceof Map
      ? sourceValues
      : new Map<string, string | number | boolean | null>(Object.entries(sourceValues));

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
      errors.push(
        `${s.source_field_path}: transcribed ${JSON.stringify(s.value)} !== source ${JSON.stringify(src)}`
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateDecisionContract(
  c: DecisionContract
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!c.contract_id) errors.push('contract_id is required');
  if (!c.tenant_id) errors.push('tenant_id is required');
  if (!c.session_id) errors.push('session_id is required');
  if (!c.decision_basis_digest) errors.push('decision_basis_digest is required');
  if (!c.basis) errors.push('basis is required');
  if (!c.resolution) errors.push('resolution is required');
  if (!c.created_as_of) errors.push('created_as_of is required');
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
      if (!ref) continue;
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

  const hasHalfLifeCapability = (c.unavailable_capabilities ?? []).some(
    u => u.enables === 'QUANTITATIVE_DECISION_HALF_LIFE'
  );
  if (!hasHalfLifeCapability) {
    errors.push('QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT must be published on every contract');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDecisionValidityAssessment(
  a: DecisionValidityAssessment
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!a.assessment_id) errors.push('assessment_id is required');
  if (!a.contract_id) errors.push('contract_id is required');
  if (!a.tenant_id) errors.push('tenant_id is required');
  if (!a.session_id) errors.push('session_id is required');
  if (!a.as_of) errors.push('as_of is required');
  if (!a.half_life_basis) errors.push('half_life_basis is required');
  if (a.calculation_mode !== 'deterministic_decision_validity') {
    errors.push('calculation_mode must be deterministic_decision_validity');
  }

  const states: DecisionValidityState[] = [
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
    if (
      a.half_life_basis.not_a_prediction_disclosure !== NOT_A_PREDICTION_DISCLOSURE
    ) {
      errors.push('not_a_prediction_disclosure must match NOT_A_PREDICTION_DISCLOSURE verbatim');
    }
    if (
      a.half_life_basis.quantitative_measure?.enables !== 'QUANTITATIVE_DECISION_HALF_LIFE'
    ) {
      errors.push('quantitative_measure must declare QUANTITATIVE_DECISION_HALF_LIFE');
    }
    for (const t of a.half_life_basis.triggers_evaluated) {
      if (t.outcome === 'UNASSESSABLE' && t.observed_value !== undefined) {
        errors.push(
          `TriggerEvaluation ${t.trigger_id}: UNASSESSABLE must not carry observed_value`
        );
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

export function validateContractCreationRequest(
  r: Partial<ContractCreationRequest>
): { valid: boolean; errors: string[]; rejection_id?: string } {
  const errors: string[] = [];

  if (!r.tenant_id) errors.push('tenant_id is required');
  if (!r.session_id) errors.push('session_id is required');
  if (!r.created_as_of) errors.push('created_as_of is required');
  if (!r.campaign_intent) errors.push('campaign_intent is required');
  if (!r.resolution) errors.push('resolution is required');

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
  const parties: Array<{ tenant_id: string; session_id: string }> = [
    { tenant_id: r.tenant_id!, session_id: r.session_id! },
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
  if (!r.resolution || !assertResolutionAttributed(r.resolution as DecisionResolution)) {
    return {
      valid: false,
      errors: ['RJ-C2: DECISION_NOT_RESOLVED'],
      rejection_id: 'RJ-C2'
    };
  }
  if (
    r.resolution.route === 'CONSTRAINT_RESOLVED' &&
    r.frontier.selection?.status !== 'SELECTED'
  ) {
    return {
      valid: false,
      errors: ['RJ-C2: DECISION_NOT_RESOLVED'],
      rejection_id: 'RJ-C2'
    };
  }

  // E5
  const play = r.frontier.plays?.find(p => p.play_id === r.resolution!.selected_play_id);
  if (!play) {
    return {
      valid: false,
      errors: ['RJ-C5: PLAY_NOT_IN_FRONTIER'],
      rejection_id: 'RJ-C5'
    };
  }

  // E6 — U4 firewall
  if (
    !assertNonPromotionNotContractable(play) ||
    play.admissibility !== 'ADMISSIBLE'
  ) {
    const detail =
      play.admissibility === 'EXCLUDED_ECONOMICS_INCOMPLETE' ||
      play.play_kind === 'NON_PROMOTION'
        ? `RJ-C3: PLAY_NOT_CONTRACTABLE (NON_PROMOTION_REQUIRED_INPUT: ${NON_PROMOTION_REQUIRED_INPUT.field})`
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
  const hasScenarioZero =
    Boolean(r.frontier.scenario_zero) ||
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
