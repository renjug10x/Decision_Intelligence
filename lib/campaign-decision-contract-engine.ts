/**
 * CogniX CDI-07A — Decision Contract Engine
 *
 * Pure, deterministic creation and validity assessment. Zero React. Zero LLM.
 * Never recomputes frontier economics. Never mutates a contract on assessment.
 * Frozen in docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md §§3–7.
 */

import {
  CampaignIntent,
  OutcomeFrontier,
  StrategyPlay,
  DecisionContract,
  DecisionContractBasis,
  DecisionResolution,
  DecisionAssumption,
  DecisionTrigger,
  DecisionValidityAssessment,
  DecisionValidityState,
  TriggerEvaluation,
  TriggerEffect,
  RejectedAlternative,
  RejectionCause,
  SnapshotValue,
  BoundArtefactRef,
  ScenarioZeroContractRecord,
  ContractCreationRequest,
  ContractEvidenceRef,
  SignalValidityReference,
  HalfLifeBasis,
  UnassessableAssumption,
  ComparisonSetInvariants,
  ConstraintElimination,
  DeclaredConstraint,
  EvidenceStrength,
  ConfidenceBand,
  ReadinessVeto,
  SCENARIO_ZERO_FRAMING,
  NON_PROMOTION_REQUIRED_INPUT,
  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT,
  NOT_A_PREDICTION_DISCLOSURE,
  SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE,
  SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE,
  ATTRIBUTION_UNAVAILABLE_DISCLOSURE,
  isWorldDrivenAdmissibleSourceType,
  SNAPSHOT_AUTHORITY_DISCLOSURE,
  DECISION_BASIS_DIGEST_INPUTS,
  canonicalJson,
  sha256Hex,
  computeDecisionBasisDigest,
  computeContractDigest,
  validateContractCreationRequest,
  validateDecisionContract,
  validateDecisionValidityAssessment,
  assertBasisTranscribedNotRecomputed,
  assertStableHasPositiveEvidence,
  assertTenantSessionCoherent,
  contractEvidenceStrengthFloor
} from '../packages/contracts/src/index';
import {
  decisionContractStore,
  toContractReference
} from './decision-contract-store';

const SCHEMA_VERSION = '1.0';
const ENGINE_VERSION = 'cdi07a_decision_contract_engine_v1';
const LAB_THRESHOLD_BASIS =
  'UNCALIBRATED_LAB_DEFAULT — demonstration threshold; not fitted to observed decision outcomes';

export interface DecisionValidityArgs {
  contract: DecisionContract;
  as_of: string;
  current_campaign_intent?: CampaignIntent;
  current_frontier?: OutcomeFrontier;
  current_decision_state?: { decision_state_id: string; state_version: number };
  signal_observations?: Array<{
    signal_type: string;
    entity_id: string;
    value: number;
    delta_pct: number;
    decision_state_version: number;
    /**
     * Gate §7.4 / CDI-07B X1 — provenance of the observation. WORLD_DRIVEN requires
     * source_type ∈ OBSERVATION_INDEPENDENT_SOURCE_TYPES and synthetic_demo !== true.
     */
    source_type?: string;
    /** X1 — synthetic provenance can never establish WORLD_DRIVEN. */
    synthetic_demo?: boolean;
  }>;
}

export interface WithdrawDecisionContractArgs {
  contract_id: string;
  tenant_id: string;
  session_id: string;
  withdrawal: NonNullable<DecisionContract['withdrawal']>;
}

function reject(rejection_id: string, message: string): never {
  throw Object.assign(new Error(message), { rejection_id });
}

/** sha256 of canonicalJson(obj). Used for BoundArtefactRef digests and trigger contracted digests. */
export function artefactDigest(obj: unknown): string {
  return sha256Hex(canonicalJson(obj));
}

/** Intent binding digest — excludes lifecycle fields that must not read as content drift (gate §4.5). */
function intentBindingDigest(intent: CampaignIntent): string {
  const {
    updated_at: _u,
    registered_at: _r,
    created_at: _c,
    provenance: _p,
    ...body
  } = intent as CampaignIntent & { created_at?: string };
  void _u;
  void _r;
  void _c;
  void _p;
  return artefactDigest(body);
}

/**
 * Frontier binding digest — content-derived, deterministic across runs. Elides run-marker
 * fields (evaluation_id, timestamp) and volatile per-run ids that embed Date.now(). AC-12
 * requires byte-identical contract_id across separate processes with identical inputs;
 * anchoring the binding on content and not the run marker is how that guarantee holds.
 */
function frontierBindingDigest(frontier: OutcomeFrontier): string {
  const clone = JSON.parse(JSON.stringify(frontier));
  delete clone.timestamp;
  for (const p of clone.plays || []) {
    delete p.evaluation_id;
    if (p.readiness_reference) {
      delete p.readiness_reference.readiness_id;
    }
  }
  return artefactDigest(clone);
}

/**
 * Play binding digest — content-derived. Same rationale as frontier binding: keeps the
 * digest anchored on the play's economics and provenance rather than on run-marker fields.
 */
function playBindingDigest(play: StrategyPlay): string {
  const clone = JSON.parse(JSON.stringify(play));
  delete clone.evaluation_id;
  if (clone.readiness_reference) {
    delete clone.readiness_reference.readiness_id;
  }
  return artefactDigest(clone);
}

/**
 * Readiness binding digest — content-derived, elides the run-marker readiness_id (which
 * embeds a timestamp from the readiness engine). AC-12 determinism requirement.
 */
function readinessBindingDigest(ref: NonNullable<StrategyPlay['readiness_reference']>): string {
  const clone = JSON.parse(JSON.stringify(ref));
  delete clone.readiness_id;
  return artefactDigest(clone);
}

function comparisonInvariantsFromIntent(intent: CampaignIntent): ComparisonSetInvariants {
  return {
    category: intent.campaign_intent.category,
    sku_scope: [...intent.campaign_intent.sku_scope],
    region: intent.audience_market.region,
    customer_segment: intent.audience_market.customer_segment || '',
    timing_mode: intent.audience_market.timing_mode,
    planned_start: intent.audience_market.planned_start || null,
    planned_end: intent.audience_market.planned_end || null,
    objective_type: intent.campaign_intent.objective_type,
    primary_metric: intent.baseline_objective.primary_metric,
    target_direction: intent.baseline_objective.target_direction,
    tenant_id: intent.tenant_id,
    session_id: intent.session_id
  };
}

function playOutcomeSnapshots(play: StrategyPlay): SnapshotValue[] {
  return play.outcomes.axes.map(axis => ({
    source_field_path: axis.source_field_path,
    source_package: 'CDI-06' as const,
    value: axis.value,
    unit: axis.axis_id === 'contribution_delta_gbp' ? 'gbp' : 'pp',
    strength: axis.strength,
    restated: false as const
  }));
}

function decompositionSnapshots(play: StrategyPlay): SnapshotValue[] {
  return [
    {
      source_field_path: 'play.decomposition.ambient_group.subtotal_pp',
      source_package: 'CDI-05',
      value: play.decomposition.ambient_group.subtotal_pp,
      unit: 'pp',
      strength: play.evidence_strength_floor,
      restated: false as const
    },
    {
      source_field_path: 'play.decomposition.intervention_group.subtotal_pp',
      source_package: 'CDI-05',
      value: play.decomposition.intervention_group.subtotal_pp,
      unit: 'pp',
      strength: play.evidence_strength_floor,
      restated: false as const
    }
  ];
}

function readinessSnapshots(play: StrategyPlay): SnapshotValue[] | undefined {
  const ref = play.readiness_reference;
  if (!ref) return undefined;
  const out: SnapshotValue[] = [
    {
      source_field_path: 'play.readiness_reference.state',
      source_package: 'CDI-04',
      value: ref.state,
      strength: play.evidence_strength_floor,
      restated: false
    }
  ];
  for (const veto of ref.vetoes || []) {
    out.push({
      source_field_path: `play.readiness_reference.vetoes.${veto.veto_id}`,
      source_package: 'CDI-04',
      value: veto.veto_id,
      strength: play.evidence_strength_floor,
      restated: false
    });
  }
  return out;
}

function boundRef(
  artefact: BoundArtefactRef['artefact'],
  id: string,
  digest: string,
  reproducible: boolean,
  run_marker?: string
): BoundArtefactRef {
  const ref: BoundArtefactRef = { artefact, id, digest, reproducible };
  if (run_marker) ref.run_marker = run_marker;
  return ref;
}

function counterfactualBindingDigest(play: StrategyPlay): string {
  return artefactDigest({
    counterfactual_id: play.counterfactual_id,
    axes: play.outcomes.axes.map(a => ({
      axis_id: a.axis_id,
      value: a.value,
      source_field_path: a.source_field_path
    })),
    ambient: play.ambient_frame
  });
}

function causalBindingDigest(play: StrategyPlay): string {
  return artefactDigest({
    causal_id: play.causal_id,
    decomposition: {
      ambient_group_subtotal_pp: play.decomposition.ambient_group.subtotal_pp,
      intervention_group_subtotal_pp: play.decomposition.intervention_group.subtotal_pp
    },
    ambient: play.ambient_frame
  });
}

function rejectionCauseForPlay(
  play: StrategyPlay,
  frontier: OutcomeFrontier,
  route: DecisionResolution['route']
): {
  cause: RejectionCause;
  elimination?: ConstraintElimination;
  dominated_by?: string[];
  veto?: ReadinessVeto;
} {
  if (play.admissibility === 'EXCLUDED_ECONOMICS_INCOMPLETE') {
    return { cause: 'EXCLUDED_ECONOMICS_INCOMPLETE' };
  }
  if (play.admissibility === 'INADMISSIBLE_MODEL_INTEGRITY') {
    return { cause: 'INADMISSIBLE_MODEL_INTEGRITY' };
  }
  if (play.admissibility === 'INADMISSIBLE_UNSTATED_MECHANIC') {
    return { cause: 'INADMISSIBLE_UNSTATED_MECHANIC' };
  }
  if (
    play.admissibility === 'INADMISSIBLE_VETOED' ||
    play.readiness_reference?.state === 'DO_NOT_PROCEED'
  ) {
    return {
      cause: 'READINESS_VETOED',
      veto: play.readiness_reference?.vetoes?.[0]
    };
  }
  const elimination = frontier.selection?.eliminations?.find(e => e.play_id === play.play_id);
  if (elimination) {
    return { cause: 'REMOVED_BY_DECLARED_CONSTRAINT', elimination };
  }
  const dom = frontier.dominance.find(d => d.play_id === play.play_id);
  if (dom && dom.participation === 'ASSESSED' && dom.dominated_by.length > 0) {
    return { cause: 'PARETO_DOMINATED', dominated_by: [...dom.dominated_by] };
  }
  if (route === 'HUMAN_RESOLVED') {
    return { cause: 'NOT_CHOSEN_BY_RESOLVER' };
  }
  return { cause: 'NOT_CHOSEN_BY_RESOLVER' };
}

function buildRejectedAlternatives(
  frontier: OutcomeFrontier,
  selectedPlayId: string,
  resolution: DecisionResolution
): RejectedAlternative[] {
  const rejected: RejectedAlternative[] = [];
  for (const play of frontier.plays) {
    if (play.play_id === selectedPlayId) continue;

    const isScenarioZero = play.play_kind === 'DO_NOTHING';
    if (isScenarioZero) {
      // Scenario 0 has its own record; only appear here when a resolver declined a candidate.
      const wasCandidate =
        frontier.frontier_play_ids.includes(play.play_id) ||
        (resolution.route === 'HUMAN_RESOLVED' && play.admissibility === 'ADMISSIBLE');
      if (!wasCandidate) continue;
    }

    const detail = rejectionCauseForPlay(play, frontier, resolution.route);
    const alt: RejectedAlternative = {
      play_id: play.play_id,
      label: play.label,
      play_kind: play.play_kind,
      cause: detail.cause,
      outcome_snapshot: playOutcomeSnapshots(play)
    };
    if (detail.elimination) alt.elimination = detail.elimination;
    if (detail.dominated_by) alt.dominated_by = detail.dominated_by;
    if (detail.veto) alt.veto = detail.veto;
    rejected.push(alt);
  }
  return rejected.sort((a, b) => a.play_id.localeCompare(b.play_id));
}

function buildScenarioZeroRecord(
  frontier: OutcomeFrontier,
  selectedPlayId: string
): ScenarioZeroContractRecord {
  const zeroRef = frontier.scenario_zero;
  const zeroPlay =
    frontier.plays.find(p => p.play_id === zeroRef?.play_id) ||
    frontier.plays.find(p => p.play_kind === 'DO_NOTHING');
  if (!zeroPlay || !zeroRef) {
    reject('RJ-C7', 'RJ-C7: SCENARIO_ZERO_ABSENT');
  }
  return {
    play_id: zeroPlay.play_id,
    was_selected: zeroPlay.play_id === selectedPlayId,
    dominated: zeroRef.dominated,
    dominated_by: [...zeroRef.dominated_by],
    outcome_snapshot: playOutcomeSnapshots(zeroPlay),
    framing: SCENARIO_ZERO_FRAMING
  };
}

function expectedSourceMap(play: StrategyPlay): Map<string, string | number | boolean | null> {
  const map = new Map<string, string | number | boolean | null>();
  for (const axis of play.outcomes.axes) {
    map.set(axis.source_field_path, axis.value);
  }
  map.set(
    'play.decomposition.ambient_group.subtotal_pp',
    play.decomposition.ambient_group.subtotal_pp
  );
  map.set(
    'play.decomposition.intervention_group.subtotal_pp',
    play.decomposition.intervention_group.subtotal_pp
  );
  if (play.readiness_reference) {
    map.set('play.readiness_reference.state', play.readiness_reference.state);
    for (const veto of play.readiness_reference.vetoes || []) {
      map.set(`play.readiness_reference.vetoes.${veto.veto_id}`, veto.veto_id);
    }
  }
  return map;
}

function resolveResolution(
  request: ContractCreationRequest
): DecisionResolution {
  const { frontier, resolution } = request;

  if (resolution.route === 'CONSTRAINT_RESOLVED') {
    if (frontier.selection?.status !== 'SELECTED' || !frontier.selection.selected_play_id) {
      reject('RJ-C2', 'RJ-C2: DECISION_NOT_RESOLVED');
    }
    if (
      resolution.selected_play_id &&
      resolution.selected_play_id !== frontier.selection.selected_play_id
    ) {
      reject(
        'RJ-C2',
        'RJ-C2: DECISION_NOT_RESOLVED — selected_play_id must match frontier.selection.selected_play_id'
      );
    }
    return {
      route: 'CONSTRAINT_RESOLVED',
      selected_play_id: frontier.selection.selected_play_id,
      selection_status: frontier.selection.status,
      selection_basis: frontier.selection.selection_basis,
      constraints_in_force: frontier.selection.constraints_in_force
        ? [...frontier.selection.constraints_in_force]
        : [],
      eliminations: frontier.selection.eliminations
        ? [...frontier.selection.eliminations]
        : []
    };
  }

  if (resolution.route === 'HUMAN_RESOLVED') {
    const resolvedBy = resolution.resolved_by?.trim() || '';
    if (!resolvedBy) {
      reject('RJ-C2', 'RJ-C2: DECISION_NOT_RESOLVED — HUMAN_RESOLVED requires resolved_by');
    }
    if (!resolution.selected_play_id?.trim()) {
      reject('RJ-C2', 'RJ-C2: DECISION_NOT_RESOLVED — HUMAN_RESOLVED requires selected_play_id');
    }
    // A HUMAN_RESOLVED contract must be auditable as who decided, what was selected, why, and at
    // what reference instant. `resolved_by` is the who, `selected_play_id` the what,
    // `created_as_of` the instant; the resolver's own reason is the why and is not optional.
    if (!resolution.resolution_statement?.trim()) {
      reject(
        'RJ-C2',
        'RJ-C2: DECISION_NOT_RESOLVED — HUMAN_RESOLVED requires a non-empty resolution_statement'
      );
    }

    // The set the resolver was choosing from, as displayed. `frontier_play_ids` omits a dominated
    // Scenario 0 (gate §1.3 K5) even though CDI-06 §6.4 keeps it displayed and first-class, so a
    // displayed, admissible selection outside that set is added rather than silently dropped —
    // otherwise the contract records a resolver picking a play absent from its own choice set.
    const presented = [...frontier.frontier_play_ids];
    const selectedPlay = frontier.plays.find(p => p.play_id === resolution.selected_play_id);
    if (
      selectedPlay &&
      selectedPlay.admissibility === 'ADMISSIBLE' &&
      !presented.includes(selectedPlay.play_id)
    ) {
      presented.push(selectedPlay.play_id);
    }
    const scenarioZeroPlay = frontier.plays.find(p => p.play_kind === 'DO_NOTHING');
    if (
      scenarioZeroPlay &&
      scenarioZeroPlay.admissibility === 'ADMISSIBLE' &&
      !presented.includes(scenarioZeroPlay.play_id)
    ) {
      presented.push(scenarioZeroPlay.play_id);
    }
    presented.sort((a, b) => a.localeCompare(b));

    const contradicts =
      frontier.selection?.status === 'SELECTED' &&
      Boolean(frontier.selection.selected_play_id) &&
      frontier.selection.selected_play_id !== resolution.selected_play_id;

    return {
      route: 'HUMAN_RESOLVED',
      selected_play_id: resolution.selected_play_id,
      resolved_by: resolvedBy,
      resolution_statement: resolution.resolution_statement,
      presented_alternatives: presented,
      contradicts_constraint_selection: contradicts || undefined,
      constraints_in_force: frontier.selection?.constraints_in_force
        ? [...frontier.selection.constraints_in_force]
        : undefined,
      eliminations: frontier.selection?.eliminations
        ? [...frontier.selection.eliminations]
        : undefined
    };
  }

  reject('RJ-C2', 'RJ-C2: DECISION_NOT_RESOLVED');
}

function buildAssumptionsAndTriggers(args: {
  frontier: OutcomeFrontier;
  play: StrategyPlay;
  resolution: DecisionResolution;
  comparisonInvariantsDigest: string;
  constraints: DeclaredConstraint[];
}): { assumptions: DecisionAssumption[]; triggers: DecisionTrigger[] } {
  const { frontier, play, resolution, comparisonInvariantsDigest, constraints } = args;
  const assumptions: DecisionAssumption[] = [];
  const triggers: DecisionTrigger[] = [];

  const tIntentId = 'T-INTENT-comparison_invariants';
  triggers.push({
    trigger_id: tIntentId,
    trigger_class: 'T-INTENT',
    assumption_id: 'A-DECISION_QUESTION',
    statement:
      'The decision question (category, region, SKU scope, segment, timing, objective) has changed',
    field_path: 'comparison_invariants',
    contracted_value: comparisonInvariantsDigest,
    direction: 'DIFFERS',
    threshold: 0,
    threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT',
    threshold_basis: LAB_THRESHOLD_BASIS,
    on_fire: 'REASSESS_REQUIRED',
    on_fire_disclosure:
      'The framing of the decision has moved. A person should reassess against the current intent.'
  });

  assumptions.push({
    assumption_id: 'A-AMBIENT_FRAME',
    assumption_class: 'AMBIENT_FRAME',
    statement:
      'The decision was resolved under ARF-A with enterprise signals excluded from the counterfactual',
    basis_field_path: 'OutcomeFrontier.ambient_frame.mode',
    source_package: 'CDI-06',
    held_at_resolution: frontier.ambient_frame?.mode ?? play.ambient_frame.mode,
    strength: play.evidence_strength_floor,
    load_bearing: true,
    trigger_ids: [],
    not_evaluable_reason:
      'No signal context was supplied at contract creation; T-SIGNAL is not bound at this baseline'
  });

  assumptions.push({
    assumption_id: 'A-DECISION_QUESTION',
    assumption_class: 'DECISION_QUESTION',
    statement:
      'The question was about this category, region, SKU scope, segment, timing and objective',
    basis_field_path: 'OutcomeFrontier.comparison_invariants',
    source_package: 'CDI-06',
    held_at_resolution: comparisonInvariantsDigest,
    strength: play.evidence_strength_floor,
    load_bearing: true,
    trigger_ids: [tIntentId]
  });

  if (constraints.length > 0) {
    const constraintsDigest = artefactDigest(constraints);
    const tConstraintId = 'T-CONSTRAINT-declared_set';
    triggers.push({
      trigger_id: tConstraintId,
      trigger_class: 'T-CONSTRAINT',
      assumption_id: 'A-DECLARED_CONSTRAINT',
      statement: 'A declared constraint in force at resolution is absent or its bound differs',
      field_path: 'FrontierSelection.constraints_in_force',
      contracted_value: constraintsDigest,
      direction: 'DIFFERS',
      threshold: 0,
      threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT',
      threshold_basis: LAB_THRESHOLD_BASIS,
      on_fire: 'REASSESS_REQUIRED',
      on_fire_disclosure:
        'The constraint set that resolved this decision has moved. Reassess before acting on it.'
    });
    for (const c of constraints) {
      assumptions.push({
        assumption_id: `A-DECLARED_CONSTRAINT-${c.constraint_id}`,
        assumption_class: 'DECLARED_CONSTRAINT',
        statement: c.statement,
        basis_field_path: `FrontierSelection.constraints_in_force.${c.constraint_id}`,
        source_package: 'CDI-06',
        held_at_resolution: c.bound_value ?? c.constraint_id,
        strength: 'DECLARED_INPUT',
        load_bearing: resolution.route === 'CONSTRAINT_RESOLVED',
        trigger_ids: [tConstraintId]
      });
    }
  } else {
    assumptions.push({
      assumption_id: 'A-DECLARED_CONSTRAINT',
      assumption_class: 'DECLARED_CONSTRAINT',
      statement: 'No declared constraints were in force at resolution',
      basis_field_path: 'FrontierSelection.constraints_in_force',
      source_package: 'CDI-06',
      held_at_resolution: null,
      strength: 'DECLARED_INPUT',
      load_bearing: false,
      trigger_ids: [],
      not_evaluable_reason: 'No constraints were declared at resolution'
    });
  }

  assumptions.push({
    assumption_id: 'A-CHOICE_SET',
    assumption_class: 'CHOICE_SET',
    statement:
      'The alternatives considered were those the declared generation policy produced at this version',
    basis_field_path: 'OutcomeFrontier.generation_policy.policy_version',
    source_package: 'CDI-06',
    held_at_resolution: frontier.generation_policy.policy_version,
    strength: 'SEEDED_ASSUMPTION',
    load_bearing: false,
    trigger_ids: [],
    not_evaluable_reason:
      'Choice-set regeneration is not reassessed at this baseline; policy version is recorded only'
  });

  const unavailableDigest = artefactDigest(
    [...(play.outcomes.unavailable || [])].sort((a, b) =>
      a.dimension_id.localeCompare(b.dimension_id)
    )
  );
  const tEvidenceId = 'T-EVIDENCE-unavailable_dimensions';
  triggers.push({
    trigger_id: tEvidenceId,
    trigger_class: 'T-EVIDENCE',
    assumption_id: 'A-ECONOMICS_COMPLETENESS',
    statement:
      'A dimension that was NOT_AVAILABLE at resolution has become available, changing the choice-set economics',
    field_path: 'unavailable_at_decision',
    contracted_value: unavailableDigest,
    direction: 'DIFFERS',
    threshold: 0,
    threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT',
    threshold_basis: LAB_THRESHOLD_BASIS,
    on_fire: 'REASSESS_REQUIRED',
    on_fire_disclosure:
      'Evidence that was unavailable when this was decided is now present. Reassess the economics.'
  });

  assumptions.push({
    assumption_id: 'A-ECONOMICS_COMPLETENESS',
    assumption_class: 'ECONOMICS_COMPLETENESS',
    statement:
      'Revenue, availability and non-promotion execution cost were unavailable and did not participate',
    basis_field_path: 'unavailable_at_decision',
    source_package: 'CDI-06',
    held_at_resolution: unavailableDigest,
    strength: play.evidence_strength_floor,
    load_bearing: true,
    trigger_ids: [tEvidenceId]
  });

  if (play.readiness_reference) {
    const tReadinessId = 'T-READINESS-state';
    triggers.push({
      trigger_id: tReadinessId,
      trigger_class: 'T-READINESS',
      assumption_id: 'A-READINESS_CONDITION',
      statement: 'A contracted readiness condition is unmet, or a new veto fires',
      field_path: 'play.readiness_reference.state',
      contracted_value: play.readiness_reference.state,
      direction: 'DIFFERS',
      threshold: 0,
      threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT',
      threshold_basis: LAB_THRESHOLD_BASIS,
      readiness_trigger_ref: play.readiness_reference.conditions?.[0]
        ? {
            dimension: play.readiness_reference.conditions[0].dimension,
            field_path: 'play.readiness_reference.state'
          }
        : undefined,
      on_fire: 'DEGRADED',
      on_fire_disclosure:
        'Readiness status for the contracted play has moved. Economics are unchanged; status is not.'
    });

    const loadBearing = (play.readiness_reference.conditions || []).some(
      c => c.blocking_if_unmet === 'DO_NOT_PROCEED'
    );
    assumptions.push({
      assumption_id: 'A-READINESS_CONDITION',
      assumption_class: 'READINESS_CONDITION',
      statement: play.readiness_reference.headline,
      basis_field_path: 'play.readiness_reference.state',
      source_package: 'CDI-04',
      held_at_resolution: play.readiness_reference.state,
      strength: play.evidence_strength_floor,
      load_bearing: loadBearing,
      trigger_ids: [tReadinessId]
    });
  }

  return { assumptions, triggers };
}

function buildBasis(
  intent: CampaignIntent,
  frontier: OutcomeFrontier,
  play: StrategyPlay,
  resolution: DecisionResolution
): DecisionContractBasis {
  const ambient = frontier.ambient_frame ?? play.ambient_frame;
  const outcome_snapshot = playOutcomeSnapshots(play);
  const decomposition_snapshot = decompositionSnapshots(play);
  const readiness_snapshot = readinessSnapshots(play);

  const basis: DecisionContractBasis = {
    campaign_intent_ref: boundRef(
      'CAMPAIGN_INTENT',
      intent.campaign_intent_id,
      intentBindingDigest(intent),
      true
    ),
    frontier_ref: boundRef('OUTCOME_FRONTIER', frontier.frontier_id, frontierBindingDigest(frontier), false),
    selected_play_ref: boundRef('STRATEGY_PLAY', play.play_id, playBindingDigest(play), false),
    counterfactual_ref: boundRef(
      'COUNTERFACTUAL',
      play.counterfactual_id,
      counterfactualBindingDigest(play),
      false,
      play.evaluation_id
    ),
    causal_ref: boundRef(
      'CAUSAL',
      play.causal_id,
      causalBindingDigest(play),
      false,
      play.evaluation_id
    ),
    outcome_snapshot,
    decomposition_snapshot,
    rejected_alternatives: buildRejectedAlternatives(frontier, play.play_id, resolution),
    scenario_zero: buildScenarioZeroRecord(frontier, play.play_id),
    comparison_invariants: { ...frontier.comparison_invariants },
    ambient_frame: { ...ambient },
    unavailable_at_decision: [...(play.outcomes.unavailable || [])],
    generation_policy_version: frontier.generation_policy.policy_version,
    dominance_epsilon: { ...frontier.dominance_epsilon }
  };

  if (play.readiness_reference) {
    basis.readiness_ref = boundRef(
      'READINESS',
      play.readiness_reference.readiness_id,
      readinessBindingDigest(play.readiness_reference),
      false
    );
    basis.readiness_snapshot = readiness_snapshot;
  }

  const check = assertBasisTranscribedNotRecomputed(
    [...outcome_snapshot, ...decomposition_snapshot, ...(readiness_snapshot || [])],
    expectedSourceMap(play)
  );
  if (!check.ok) {
    reject('RJ-C6', `RJ-C6: BASIS_TRANSCRIPTION_FAILURE — ${check.errors.join('; ')}`);
  }

  return basis;
}

function evidenceRefsFromBasis(
  basis: DecisionContractBasis,
  play: StrategyPlay
): ContractEvidenceRef[] {
  const refs: ContractEvidenceRef[] = [];
  for (const s of [
    ...basis.outcome_snapshot,
    ...basis.decomposition_snapshot,
    ...(basis.readiness_snapshot || [])
  ]) {
    if (s.value === null) continue;
    refs.push({
      source_package: s.source_package,
      field_path: s.source_field_path,
      value: s.value,
      strength: s.strength,
      synthetic_demo: play.synthetic_demo,
      disclosure: SNAPSHOT_AUTHORITY_DISCLOSURE
    });
  }
  return refs;
}

function confidenceFromFloor(floor: EvidenceStrength): ConfidenceBand {
  if (floor === 'OBSERVED' || floor === 'DERIVED') return 'HIGH';
  if (floor === 'DERIVED_KNOWN_DISCONTINUITY' || floor === 'DECLARED_INPUT') return 'MODERATE';
  if (floor === 'SEEDED_ASSUMPTION' || floor === 'PROXY') return 'LOW';
  return 'INSUFFICIENT';
}

function computeContractId(args: {
  campaign_intent_id: string;
  decision_basis_digest: string;
  selected_play_id: string;
  route: string;
  resolver: string;
  version: number;
}): string {
  return sha256Hex(
    canonicalJson([
      args.campaign_intent_id,
      args.decision_basis_digest,
      args.selected_play_id,
      args.route,
      args.resolver || '',
      args.version
    ])
  );
}

/**
 * Create an immutable DecisionContract from a supplied frontier and resolution.
 * Never calls registerCampaignIntent. Never uses Date.now().
 */
export function createDecisionContract(request: ContractCreationRequest): DecisionContract {
  if (!request.created_as_of) {
    reject('RJ-C2', 'created_as_of is required');
  }
  if (!request.frontier) {
    reject('RJ-C1', 'RJ-C1: FRONTIER_NOT_EMITTED');
  }

  // E1
  if (request.frontier.frontier_status !== 'EMITTED') {
    reject('RJ-C1', 'RJ-C1: FRONTIER_NOT_EMITTED');
  }

  // E2
  if (
    !assertTenantSessionCoherent(
      { tenant_id: request.tenant_id, session_id: request.session_id },
      { tenant_id: request.frontier.tenant_id, session_id: request.frontier.session_id },
      {
        tenant_id: request.campaign_intent.tenant_id,
        session_id: request.campaign_intent.session_id
      },
      ...(request.supersedes
        ? [
            {
              tenant_id: request.supersedes.tenant_id,
              session_id: request.supersedes.session_id
            }
          ]
        : [])
    )
  ) {
    reject('RJ-C4', 'RJ-C4: TENANT_SESSION_MISMATCH');
  }

  const resolution = resolveResolution(request);
  const enrichedRequest: ContractCreationRequest = { ...request, resolution };

  const validation = validateContractCreationRequest(enrichedRequest);
  if (!validation.valid) {
    reject(
      validation.rejection_id || 'RJ-C2',
      validation.errors.join('; ') || 'Contract creation request invalid'
    );
  }

  const play = request.frontier.plays.find(p => p.play_id === resolution.selected_play_id);
  if (!play) {
    reject('RJ-C5', 'RJ-C5: PLAY_NOT_IN_FRONTIER');
  }

  // E9 — scenario_zero present on frontier (validator also checks DO_NOTHING)
  if (!request.frontier.scenario_zero) {
    reject('RJ-C7', 'RJ-C7: SCENARIO_ZERO_ABSENT');
  }

  const basis = buildBasis(request.campaign_intent, request.frontier, play, resolution);
  const decision_basis_digest = computeDecisionBasisDigest(basis);

  const constraints: DeclaredConstraint[] =
    resolution.constraints_in_force ||
    request.frontier.selection?.constraints_in_force ||
    [];
  const comparisonInvariantsDigest = artefactDigest(basis.comparison_invariants);
  const { assumptions, triggers } = buildAssumptionsAndTriggers({
    frontier: request.frontier,
    play,
    resolution,
    comparisonInvariantsDigest,
    constraints
  });

  const active = decisionContractStore.getActiveForSession(
    request.tenant_id,
    request.session_id
  );

  // RJ-C8 — active contract must be named in supersedes
  if (active) {
    if (!request.supersedes || request.supersedes.contract_id !== active.contract_id) {
      reject('RJ-C8', 'RJ-C8: ACTIVE_CONTRACT_NOT_SUPERSEDED');
    }
    const priorDigest = computeContractDigest(active);
    if (
      request.supersedes.contract_digest &&
      request.supersedes.contract_digest !== priorDigest
    ) {
      reject('RJ-C4', 'RJ-C4: DIGEST_MISMATCH — supersedes.contract_digest does not match prior');
    }
  }

  const contract_version = request.supersedes
    ? request.supersedes.contract_version + 1
    : active
      ? active.contract_version + 1
      : 1;

  const resolver =
    resolution.route === 'HUMAN_RESOLVED' ? resolution.resolved_by || '' : '';

  const contract_id = computeContractId({
    campaign_intent_id: request.campaign_intent.campaign_intent_id,
    decision_basis_digest,
    selected_play_id: resolution.selected_play_id,
    route: resolution.route,
    resolver,
    version: contract_version
  });

  const evidence_refs = evidenceRefsFromBasis(basis, play);
  const strengths: EvidenceStrength[] = [
    ...basis.outcome_snapshot.map(s => s.strength),
    ...basis.decomposition_snapshot.map(s => s.strength),
    ...(basis.readiness_snapshot || []).map(s => s.strength),
    ...assumptions.map(a => a.strength),
    ...evidence_refs.map(e => e.strength)
  ];
  const evidence_strength_floor = contractEvidenceStrengthFloor(
    strengths.length ? strengths : [play.evidence_strength_floor]
  );

  const contract: DecisionContract = {
    contract_id,
    contract_version,
    status: 'ACTIVE',
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    decision_basis_digest,
    basis,
    resolution,
    assumptions,
    triggers,
    unavailable_capabilities: [
      { ...QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT },
      {
        field: 'independent_world_driven_signal_observation',
        grain: 'per signal observation with provenance independent of decision_state_version',
        why_required:
          'WORLD_DRIVEN signal attribution requires an observation source independent of Shared Decision State scenario parameters; ESF-3 external connectors are out of CDI-07A scope',
        inadmissible_substitutes: [
          'ESF-1/ESF-2 re-simulation under an unchanged decision_state_version',
          'lab-default movement treated as world drift'
        ],
        enables: 'WORLD_DRIVEN_SIGNAL_ATTRIBUTION',
        status: 'AWAITING_AUTHORITATIVE_SOURCE'
      }
    ],
    evidence_refs,
    evidence_strength_floor,
    confidence_band: play.confidence_band || confidenceFromFloor(evidence_strength_floor),
    calculation_mode: 'deterministic_decision_contract',
    synthetic_demo: request.frontier.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-07A',
      decision_basis_digest_inputs: DECISION_BASIS_DIGEST_INPUTS.join('|'),
      intent_digest_excludes: 'updated_at|registered_at|created_at|provenance',
      snapshot_authority: SNAPSHOT_AUTHORITY_DISCLOSURE,
      non_promotion_required_input: NON_PROMOTION_REQUIRED_INPUT.field
    },
    created_as_of: request.created_as_of
  };

  if (request.supersedes) {
    contract.supersedes = { ...request.supersedes };
  }

  const contractValidation = validateDecisionContract(contract);
  if (!contractValidation.valid) {
    reject('RJ-C6', `Contract validation failed: ${contractValidation.errors.join('; ')}`);
  }

  if (active && request.supersedes) {
    const by = toContractReference(contract);
    decisionContractStore.markSuperseded(
      active.contract_id,
      request.tenant_id,
      request.session_id,
      by
    );
  }

  return decisionContractStore.create(contract);
}

/**
 * Gate §6.3 / §7.4 — a T-SIGNAL trigger defaults to WATCH. It may reach DEGRADED only when the
 * assumption it is bound to is load-bearing AND the movement was not caused by our own scenario
 * parameters. SCENARIO_DRIVEN movement is capped at WATCH unconditionally: it says the world
 * moved when only our parameters did.
 */
function effectForEvaluation(
  trigger: DecisionTrigger,
  evaln: TriggerEvaluation,
  assumptions: DecisionAssumption[]
): TriggerEffect | null {
  if (evaln.outcome !== 'FIRED') return null;
  let effect = trigger.on_fire;
  if (trigger.trigger_class === 'T-SIGNAL') {
    if (evaln.movement_attribution === 'SCENARIO_DRIVEN') {
      effect = 'WATCH';
    } else {
      const loadBearing = assumptions.some(
        a => a.assumption_id === trigger.assumption_id && a.load_bearing
      );
      if (!loadBearing) effect = 'WATCH';
    }
  }
  return effect;
}

function evaluateTrigger(
  trigger: DecisionTrigger,
  args: DecisionValidityArgs
): TriggerEvaluation {
  const { contract, current_campaign_intent, current_frontier, current_decision_state, signal_observations } =
    args;

  if (trigger.trigger_class === 'T-INTENT') {
    if (!current_campaign_intent) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'current_campaign_intent not supplied'
      };
    }
    if (
      current_campaign_intent.tenant_id !== contract.tenant_id ||
      current_campaign_intent.session_id !== contract.session_id
    ) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'current_campaign_intent tenant/session mismatch'
      };
    }
    const observed = artefactDigest(comparisonInvariantsFromIntent(current_campaign_intent));
    if (observed === trigger.contracted_value) {
      return { trigger_id: trigger.trigger_id, outcome: 'NOT_FIRED', observed_value: observed };
    }
    return {
      trigger_id: trigger.trigger_id,
      outcome: 'FIRED',
      observed_value: observed,
      statement: `Comparison-set invariants digest moved from ${String(trigger.contracted_value)} to ${observed}`
    };
  }

  if (trigger.trigger_class === 'T-CONSTRAINT') {
    if (!current_frontier) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'current_frontier not supplied — constraint set cannot be observed'
      };
    }
    const current = current_frontier.selection?.constraints_in_force || [];
    const observed = artefactDigest(current);
    if (observed === trigger.contracted_value) {
      return { trigger_id: trigger.trigger_id, outcome: 'NOT_FIRED', observed_value: observed };
    }
    return {
      trigger_id: trigger.trigger_id,
      outcome: 'FIRED',
      observed_value: observed,
      statement: 'Declared constraint set differs from the contracted set'
    };
  }

  if (trigger.trigger_class === 'T-READINESS') {
    if (!current_frontier) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'current_frontier not supplied — readiness cannot be observed'
      };
    }
    const play = current_frontier.plays.find(
      p => p.play_id === contract.resolution.selected_play_id
    );
    if (!play?.readiness_reference) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'selected play readiness_reference absent on current_frontier'
      };
    }
    const observed = play.readiness_reference.state;
    const newVeto =
      (play.readiness_reference.vetoes || []).length >
      (contract.basis.readiness_snapshot || []).filter(s =>
        s.source_field_path.includes('vetoes')
      ).length;

    if (observed === trigger.contracted_value && !newVeto) {
      return { trigger_id: trigger.trigger_id, outcome: 'NOT_FIRED', observed_value: observed };
    }
    return {
      trigger_id: trigger.trigger_id,
      outcome: 'FIRED',
      observed_value: observed,
      statement: newVeto
        ? `New readiness veto present; state is ${observed}`
        : `Readiness state moved from ${String(trigger.contracted_value)} to ${observed}`
    };
  }

  if (trigger.trigger_class === 'T-EVIDENCE') {
    if (!current_frontier) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'current_frontier not supplied — unavailable dimensions cannot be observed'
      };
    }
    const play = current_frontier.plays.find(
      p => p.play_id === contract.resolution.selected_play_id
    );
    if (!play) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'selected play absent from current_frontier'
      };
    }
    const observed = artefactDigest(
      [...(play.outcomes.unavailable || [])].sort((a, b) =>
        a.dimension_id.localeCompare(b.dimension_id)
      )
    );
    if (observed === trigger.contracted_value) {
      return { trigger_id: trigger.trigger_id, outcome: 'NOT_FIRED', observed_value: observed };
    }
    return {
      trigger_id: trigger.trigger_id,
      outcome: 'FIRED',
      observed_value: observed,
      statement: 'Unavailable-at-decision dimension set has changed'
    };
  }

  if (trigger.trigger_class === 'T-SIGNAL') {
    const signalRef = trigger.signal_ref;
    if (!signalRef) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: 'signal_ref absent on trigger',
        movement_attribution: 'ATTRIBUTION_UNAVAILABLE'
      };
    }
    const obs = (signal_observations || []).find(
      o => o.signal_type === signalRef.signal_type && o.entity_id === signalRef.entity_id
    );
    if (!obs) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'UNASSESSABLE',
        unassessable_reason: `signal observation not supplied for ${signalRef.signal_type}/${signalRef.entity_id}`,
        movement_attribution: 'ATTRIBUTION_UNAVAILABLE'
      };
    }

    // Gate §7.4 Asymmetry 2 + CDI-07B X1.
    // Synthetic test is evaluated BEFORE and independently of the source-type test.
    // A version change is our own parameter change — SCENARIO_DRIVEN.
    // WORLD_DRIVEN requires non-synthetic + source_type ∈ OBSERVATION_INDEPENDENT_SOURCE_TYPES.
    let attribution: TriggerEvaluation['movement_attribution'] = 'ATTRIBUTION_UNAVAILABLE';
    const contractedVersion = signalRef.contracted_decision_state_version;
    const observedVersion =
      current_decision_state?.state_version ?? obs.decision_state_version;
    if (obs.synthetic_demo === true) {
      attribution = 'ATTRIBUTION_UNAVAILABLE';
    } else if (
      current_decision_state?.state_version !== undefined ||
      obs.decision_state_version !== undefined
    ) {
      if (observedVersion !== contractedVersion) {
        attribution = 'SCENARIO_DRIVEN';
      } else if (
        isWorldDrivenAdmissibleSourceType(obs.source_type, {
          synthetic_demo: obs.synthetic_demo
        })
      ) {
        attribution = 'WORLD_DRIVEN';
      }
    }

    const moved =
      Math.abs(obs.delta_pct - signalRef.contracted_delta_pct) >
      (signalRef.movement_threshold_pct || 0);

    if (!moved) {
      return {
        trigger_id: trigger.trigger_id,
        outcome: 'NOT_FIRED',
        observed_value: obs.delta_pct,
        movement_attribution: attribution,
        statement: SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE
      };
    }

    const statementParts = [
      SIGNAL_EXCLUDED_FROM_DECISION_DISCLOSURE,
      `Signal ${signalRef.signal_type} delta_pct moved from ${signalRef.contracted_delta_pct} to ${obs.delta_pct}`
    ];
    if (attribution === 'SCENARIO_DRIVEN') {
      statementParts.push(SCENARIO_DRIVEN_MOVEMENT_DISCLOSURE);
    } else if (attribution === 'ATTRIBUTION_UNAVAILABLE') {
      statementParts.push(ATTRIBUTION_UNAVAILABLE_DISCLOSURE);
    }

    return {
      trigger_id: trigger.trigger_id,
      outcome: 'FIRED',
      observed_value: obs.delta_pct,
      movement_attribution: attribution,
      statement: statementParts.join(' ')
    };
  }

  return {
    trigger_id: trigger.trigger_id,
    outcome: 'UNASSESSABLE',
    unassessable_reason: `Unknown trigger class ${trigger.trigger_class}`
  };
}

function deriveValidityState(
  triggers: DecisionTrigger[],
  evaluations: TriggerEvaluation[],
  assumptions: DecisionAssumption[]
): {
  state: DecisionValidityState;
  determining_trigger_id?: string;
  determining_assumption_id?: string;
  unassessable_assumptions: UnassessableAssumption[];
} {
  const byId = new Map(evaluations.map(e => [e.trigger_id, e]));
  let reassessTrig: DecisionTrigger | undefined;
  let degradedTrig: DecisionTrigger | undefined;
  let watchTrig: DecisionTrigger | undefined;
  const unassessable_assumptions: UnassessableAssumption[] = [];
  const seenAssumption = new Set<string>();

  for (const trigger of triggers) {
    const ev = byId.get(trigger.trigger_id);
    if (!ev) continue;
    if (ev.outcome === 'UNASSESSABLE') {
      if (!seenAssumption.has(trigger.assumption_id)) {
        seenAssumption.add(trigger.assumption_id);
        unassessable_assumptions.push({
          assumption_id: trigger.assumption_id,
          reason: ev.unassessable_reason || 'trigger unassessable'
        });
      }
      continue;
    }
    const effect = effectForEvaluation(trigger, ev, assumptions);
    if (!effect) continue;
    if (effect === 'REASSESS_REQUIRED' && !reassessTrig) reassessTrig = trigger;
    else if (effect === 'DEGRADED' && !degradedTrig) degradedTrig = trigger;
    else if (effect === 'WATCH' && !watchTrig) watchTrig = trigger;
  }

  // Gate §5.4 property 3 — `unassessable_assumptions[]` is published on every assessment
  // regardless of state. An assumption declared with a `not_evaluable_reason` and no evaluable
  // trigger could not be assessed, so it belongs here: omitting it converts "we could not check"
  // into "it has not moved", which is the fabrication the INDETERMINATE precedence exists to stop.
  for (const a of assumptions) {
    if (seenAssumption.has(a.assumption_id)) continue;
    if (a.trigger_ids.length === 0 && a.not_evaluable_reason) {
      seenAssumption.add(a.assumption_id);
      unassessable_assumptions.push({
        assumption_id: a.assumption_id,
        reason: a.not_evaluable_reason
      });
    }
  }

  if (reassessTrig) {
    return {
      state: 'REASSESS_REQUIRED',
      determining_trigger_id: reassessTrig.trigger_id,
      determining_assumption_id: reassessTrig.assumption_id,
      unassessable_assumptions
    };
  }
  if (degradedTrig) {
    return {
      state: 'DEGRADED',
      determining_trigger_id: degradedTrig.trigger_id,
      determining_assumption_id: degradedTrig.assumption_id,
      unassessable_assumptions
    };
  }
  if (watchTrig) {
    return {
      state: 'WATCH',
      determining_trigger_id: watchTrig.trigger_id,
      determining_assumption_id: watchTrig.assumption_id,
      unassessable_assumptions
    };
  }
  if (unassessable_assumptions.length > 0 || evaluations.length === 0) {
    return { state: 'INDETERMINATE', unassessable_assumptions };
  }
  if (evaluations.every(e => e.outcome === 'UNASSESSABLE')) {
    return { state: 'INDETERMINATE', unassessable_assumptions };
  }
  return { state: 'STABLE', unassessable_assumptions };
}

/**
 * Recompute validity at a caller-supplied as_of. Never mutates the contract or the store.
 * Never uses Date.now().
 */
export function assessDecisionValidity(args: DecisionValidityArgs): DecisionValidityAssessment {
  const { contract, as_of } = args;
  if (!as_of) {
    throw Object.assign(new Error('as_of is required'), { rejection_id: 'RJ-C2' });
  }

  const evaluations = contract.triggers.map(t => evaluateTrigger(t, args));
  const derived = deriveValidityState(contract.triggers, evaluations, contract.assumptions);

  let state = derived.state;

  // Probe STABLE evidence before freezing assessment_id
  const probe: DecisionValidityAssessment = {
    assessment_id: 'probe',
    contract_id: contract.contract_id,
    contract_version: contract.contract_version,
    tenant_id: contract.tenant_id,
    session_id: contract.session_id,
    state,
    as_of,
    half_life_basis: {
      determining_trigger_id: derived.determining_trigger_id,
      determining_assumption_id: derived.determining_assumption_id,
      triggers_evaluated: evaluations,
      unassessable_assumptions: [...derived.unassessable_assumptions],
      not_a_prediction_disclosure: NOT_A_PREDICTION_DISCLOSURE,
      quantitative_measure: { ...QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT }
    },
    signal_refs: [],
    evidence_refs: [],
    evidence_strength_floor: contract.evidence_strength_floor,
    confidence_band: contract.confidence_band,
    synthetic_demo: contract.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    provenance: {},
    calculation_mode: 'deterministic_decision_validity'
  };

  const unassessable = [...derived.unassessable_assumptions];
  if (state === 'STABLE' && !assertStableHasPositiveEvidence(probe)) {
    state = 'INDETERMINATE';
    unassessable.push({
      assumption_id: 'STABLE_EVIDENCE',
      reason: 'STABLE requires every trigger NOT_FIRED with observed_value; evidence insufficient'
    });
  }

  const half_life_basis: HalfLifeBasis = {
    determining_trigger_id: derived.determining_trigger_id,
    determining_assumption_id: derived.determining_assumption_id,
    triggers_evaluated: evaluations,
    unassessable_assumptions: unassessable,
    not_a_prediction_disclosure: NOT_A_PREDICTION_DISCLOSURE,
    quantitative_measure: { ...QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT }
  };

  const assessment_id = sha256Hex(
    canonicalJson([
      contract.contract_id,
      contract.contract_version,
      as_of,
      state,
      evaluations.map(e => ({
        trigger_id: e.trigger_id,
        outcome: e.outcome,
        observed_value: e.observed_value ?? null,
        movement_attribution: e.movement_attribution ?? null
      }))
    ])
  );

  const signal_refs: SignalValidityReference[] = contract.triggers
    .filter(t => t.trigger_class === 'T-SIGNAL' && t.signal_ref)
    .map(t => t.signal_ref!);

  const assessment: DecisionValidityAssessment = {
    assessment_id,
    contract_id: contract.contract_id,
    contract_version: contract.contract_version,
    tenant_id: contract.tenant_id,
    session_id: contract.session_id,
    state,
    as_of,
    half_life_basis,
    signal_refs,
    evidence_refs: [...contract.evidence_refs],
    evidence_strength_floor: contract.evidence_strength_floor,
    confidence_band: contract.confidence_band,
    synthetic_demo: contract.synthetic_demo,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-07A',
      calculation: 'deterministic_decision_validity',
      precedence: 'REASSESS_REQUIRED>DEGRADED>WATCH>INDETERMINATE>STABLE'
    },
    calculation_mode: 'deterministic_decision_validity'
  };

  const validation = validateDecisionValidityAssessment(assessment);
  if (!validation.valid) {
    if (assessment.state === 'STABLE') {
      assessment.state = 'INDETERMINATE';
    }
    const retry = validateDecisionValidityAssessment(assessment);
    if (!retry.valid) {
      throw Object.assign(new Error(retry.errors.join('; ')), {
        rejection_id: 'RJ-C6'
      });
    }
  }

  return assessment;
}

/**
 * Human withdrawal wrapper. Never auto-withdraws from validity state.
 */
export function withdrawDecisionContract(
  args: WithdrawDecisionContractArgs
): DecisionContract | null {
  return decisionContractStore.markWithdrawn(
    args.contract_id,
    args.tenant_id,
    args.session_id,
    args.withdrawal
  );
}
